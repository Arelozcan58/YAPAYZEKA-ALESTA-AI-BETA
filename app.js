// ------------------- Sabitler -------------------
const API_KEY_STORAGE_KEY = 'gemini_api_key';
const CHAT_HISTORY_KEY = 'alesta_chat_history_js';
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

let API_KEY = localStorage.getItem(API_KEY_STORAGE_KEY);
// Kullanıcının sağladığı YENİ API anahtarı bu satırda tanımlandı.
const USER_PROVIDED_API_KEY = "AIzaSyCx29GuY0nTYp132Yln2UqY8N4oKVNPGBs"; 


// ------------------- UI Elemanları -------------------
const keySetup = document.getElementById("key-setup");
const chatInterface = document.getElementById("chat-interface");

const keyInput = document.getElementById("key-input");
const saveKeyBtn = document.getElementById("save-key");
const toggleKeyBtn = document.getElementById("toggle-key");

const historyList = document.getElementById("history-list");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const statusMessage = document.getElementById("status-message");
const authInfo = document.getElementById("auth-info");

const themeToggle = document.getElementById("theme-toggle");
const clearChat = document.getElementById("clear-chat");
const keyStatus = document.getElementById("key-status");

// ------------------- Tema -------------------
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme-dark", document.body.classList.contains("dark"));
});
if (localStorage.getItem("theme-dark") === "true") document.body.classList.add("dark");

// ------------------- Anahtar Göster/Gizle -------------------
toggleKeyBtn.addEventListener("click", () => {
    keyInput.type = keyInput.type === "password" ? "text" : "password";
    toggleKeyBtn.textContent = keyInput.type === "password" ? "Göster" : "Gizle";
});

// ------------------- UI Güncelleme -------------------
function updateUI() {
    if (API_KEY) {
        keySetup.classList.add("hidden");
        chatInterface.classList.remove("hidden");

        authInfo.innerHTML = `<span class="px-3 py-1 bg-green-700 text-white rounded">Anahtar kayıtlı</span>
                              <button id="remove-key" class="underline ml-2 text-red-600">Kaldır</button>`;
        document.getElementById("remove-key").onclick = removeKey;
        loadHistory();
    } else {
        keySetup.classList.remove("hidden");
        chatInterface.classList.add("hidden");
        // API key yoksa, kullanıcının sağladığı anahtarı önceden doldur
        keyInput.value = USER_PROVIDED_API_KEY; 
        keyStatus.textContent = "Kaydetmek için yukarıdaki tuşa basınız.";
    }
}

// ------------------- API Key Kaydet -------------------
saveKeyBtn.addEventListener("click", () => {
    const key = keyInput.value.trim();
    if (key.startsWith("AIza") && key.length > 20) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
        API_KEY = key;
        updateUI();
    } else {
        keyStatus.textContent = "Geçerli bir API anahtarı giriniz!";
    }
});

// ------------------- Anahtar Sil -------------------
function removeKey() {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    API_KEY = null;
    historyList.innerHTML = "";
    updateUI();
}

// ------------------- Mesaj Ekle -------------------
function appendMessage(text, role) {
    const li = document.createElement("li");
    li.className = `p-3 shadow max-w-[80%] whitespace-pre-wrap ${
        role === "user" ? "self-end user-msg" : "self-start ai-msg"
    }`;
    li.innerHTML = marked.parse(text);
    historyList.appendChild(li);
    historyList.scrollTop = historyList.scrollHeight;
}

// ------------------- Geçmiş -------------------
function loadHistory() {
    // API çağrısı için formatlanmamış geçmişi yükle
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    historyList.innerHTML = "";
    // UI'da göster
    history.forEach(m => { appendMessage(m.user, "user"); appendMessage(m.ai, "ai"); });
}

function saveHistory(user, ai) {
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    history.push({ user, ai });
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
}

function getStructuredHistory(newMessage) {
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    const contents = [];

    // Geçmişi (kullanıcı ve model yanıtları) API'nin beklediği 'contents' formatına dönüştür
    history.forEach(m => {
        contents.push({ role: "user", parts: [{ text: m.user }] });
        // Eksik cevabı olan mesajları atlayarak stabiliteyi artır
        if (m.ai) {
            contents.push({ role: "model", parts: [{ text: m.ai }] });
        }
    });

    // Yeni mesajı ekle
    contents.push({ role: "user", parts: [{ text: newMessage }] });

    return contents;
}

// ------------------- Sohbet Temizleme -------------------
clearChat.addEventListener("click", () => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    historyList.innerHTML = "";
});

// ------------------- API Çağrısı (Multi-Turn Destekli) -------------------
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = "";
    appendMessage(message, "user");

    sendBtn.disabled = true;
    chatInput.disabled = true;
    statusMessage.textContent = "Alesta AI yazıyor...";

    try {
        // Multi-Turn için tüm geçmişi al ve yeni mesajı ekle
        const contents = getStructuredHistory(message);

        // API isteği payload'ını oluştur
        const payload = { 
            contents: contents, 
            config: {
                // Ek Özellik: Yanıtların yaratıcılığını/çeşitliliğini artırır (0.0-1.0 arası, 0.7 önerilir)
                temperature: 0.7 
            },
            // Ek Özellik: Google Search aracı etkin
            tools: [{ google_search: {} }] 
        };

        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        // Hata kontrolü: Eğer yanıt "error" içeriyorsa
        if (result.error) {
             throw new Error(result.error.message || "Bilinmeyen API Hatası");
        }

        const parts = result?.candidates?.[0]?.content?.parts || [];
        const aiText = parts.map(p => p.text || "").join("\n");
        appendMessage(aiText, "ai");
        saveHistory(message, aiText); // Başarılı cevabı kaydet
        statusMessage.textContent = "";
    } catch (err) {
        console.error(err);
        statusMessage.textContent = "Hata oluştu: " + err.message;
    }

    sendBtn.disabled = false;
    chatInput.disabled = false;
});

updateUI();
