// app.js

// !!! BURAYI KENDİ WORKER ADRESİNİZLE GÜNCELLEYİN !!!
const WORKER_URL = 'https://yapayzeka21.ozcanarel25.workers.dev/'; 

// ------------------- SABİTLER ve UI ELEMANLARI -------------------
const CHAT_HISTORY_KEY = 'alesta_chat_history_js_v4';

const body = document.body;
const historyList = document.getElementById("history-list");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const statusMessage = document.getElementById("status-message");
const themeToggle = document.getElementById("theme-toggle");
const clearChat = document.getElementById("clear-chat");
const sunIcon = document.getElementById("sun-icon");
const moonIcon = document.getElementById("moon-icon");

let isTyping = false; 

// ------------------- YARDIMCI FONKSİYONLAR -------------------

// 1. Mesaj Ekleme Fonksiyonu
function appendMessage(text, role) {
    const li = document.createElement("li");
    li.className = `p-4 shadow-xl max-w-[85%] whitespace-pre-wrap transition-all duration-300 ${
        role === "user" ? "self-end user-msg" : "self-start ai-msg"
    }`;
    
    // marked.js ile Markdown'ı HTML'e dönüştür
    li.innerHTML = marked.parse(text); 
    historyList.appendChild(li);
    historyList.scrollTop = historyList.scrollHeight;
}

// 2. Geçmiş Kaydetme Fonksiyonu
function saveHistory(user, ai) {
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    history.push({ user, ai });
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
}

// 3. Multi-Turn için Geçmişi Hazırlama Fonksiyonu (Gemini formatı)
function getStructuredHistory(newMessage) {
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    const contents = [];

    history.forEach(m => {
        contents.push({ role: "user", parts: [{ text: m.user }] });
        if (m.ai) {
            contents.push({ role: "model", parts: [{ text: m.ai }] });
        }
    });

    contents.push({ role: "user", parts: [{ text: newMessage }] });

    return contents;
}

// 4. Geçmiş Yükleme Fonksiyonu
function loadHistory() {
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    historyList.innerHTML = "";
    
    // İlk karşılama mesajını ekle
    historyList.innerHTML = `<li class="self-start p-4 shadow-xl max-w-[85%] ai-msg">
                                <p class="font-bold">Alesta AI:</p>
                                <p class="mt-1">Merhaba! API anahtarı güvenli Worker'da gizli. Nasıl yardımcı olabilirim?</p>
                            </li>`;

    // Geçmiş mesajları yükle
    history.forEach(m => { 
        appendMessage(`**Sen:** ${m.user}`, "user"); 
        appendMessage(m.ai, "ai"); 
    });
}

// 5. Tema Fonksiyonu
function setDarkMode(isDark) {
    if (isDark) {
        body.classList.add('dark');
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark');
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
        localStorage.setItem('theme', 'light');
    }
}

// ------------------- OLAY DİNLEYİCİLERİ -------------------

themeToggle.addEventListener("click", () => {
    const isDark = body.classList.contains('dark');
    setDarkMode(!isDark);
});

clearChat.addEventListener("click", () => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    loadHistory(); 
});


// ------------------- API ÇAĞRISI (GÜVENLİ WORKER) -------------------
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isTyping) return; 

    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = "";
    appendMessage(`**Sen:** ${message}`, "user"); 

    isTyping = true;
    sendBtn.disabled = true;
    chatInput.disabled = true;
    statusMessage.textContent = "Alesta AI yazıyor... ⏳";

    // Yanıt için bekleyen balonu oluştur
    const aiLi = document.createElement("li");
    aiLi.className = `p-4 shadow-xl max-w-[85%] self-start ai-msg`;
    aiLi.innerHTML = `
        <div class="flex items-center space-x-2">
            <span class="font-bold">Alesta AI:</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">Yazılıyor...</span>
        </div>
        <div id="ai-response-text" class="mt-1"></div>
    `;
    historyList.appendChild(aiLi);
    historyList.scrollTop = historyList.scrollHeight;
    const aiResponseTextElement = aiLi.querySelector('#ai-response-text');

    try {
        const contents = getStructuredHistory(message);

        const payload = { 
            contents: contents, 
            // Model adı (gemini-2.5-flash) Worker'da sabit olarak belirlenebilir veya payload'a eklenebilir.
            // Bu haliyle, Worker'ın hangi modeli kullanacağına karar vermesini sağlıyoruz.
            tools: [{ google_search: {} }] 
        };
        
        // !!! API Anahtarı GÖNDERİLMEDEN, WORKER'A YÖNLENDİRME !!!
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!response.ok || result.error) {
            const errorMessage = result.error?.message || `API Hatası: HTTP ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const parts = result?.candidates?.[0]?.content?.parts || [];
        let aiText = parts.map(p => p.text || "").join("\n");
        
        if (!aiText) {
            aiText = "Üzgünüm, şu anda bir yanıt oluşturulamadı. (Boş yanıt alındı)";
        }
        
        saveHistory(message, aiText); 

        // Yanıtı akıcı bir şekilde yazdırma (Typing effect)
        let i = 0;
        const speed = 15;
        
        function typeWriter() {
            if (i < aiText.length) {
                const partialText = aiText.substring(0, i + 1);
                aiResponseTextElement.innerHTML = marked.parse(partialText);
                i++;
                historyList.scrollTop = historyList.scrollHeight;
                setTimeout(typeWriter, speed);
            } else {
                aiLi.querySelector('.flex').innerHTML = `<span class="font-bold">Alesta AI:</span>`;
                statusMessage.textContent = "Cevap hazır. 👍";
                isTyping = false;
                sendBtn.disabled = false;
                chatInput.disabled = false;
                chatInput.focus();
            }
        }
        typeWriter();


    } catch (err) {
        console.error(err);
        
        // Hata durumunda son mesajı güncelle
        const lastLi = historyList.lastElementChild;
        if (lastLi) {
            lastLi.innerHTML = `<span class="font-bold text-red-500">Alesta AI (HATA):</span> ${err.message}`;
        }
        statusMessage.textContent = `Hata oluştu: ${err.message.substring(0, 50)}... 🛑`;

        isTyping = false;
        sendBtn.disabled = false;
        chatInput.disabled = false;
    }
});

// Sayfa yüklendiğinde temayı ve geçmişi başlat
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setDarkMode(true);
    } else {
        setDarkMode(false);
    }
    loadHistory();
});
