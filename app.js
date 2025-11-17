// ------------------- Sabitler -------------------
const API_KEY_STORAGE_KEY = 'gemini_api_key';
const CHAT_HISTORY_KEY = 'alesta_chat_history_js';
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

let API_KEY = localStorage.getItem(API_KEY_STORAGE_KEY);

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
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    historyList.innerHTML = "";
    history.forEach(m => { appendMessage(m.user, "user"); appendMessage(m.ai, "ai"); });
}

function saveHistory(user, ai) {
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    history.push({ user, ai });
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
}

// ------------------- Sohbet Temizleme -------------------
clearChat.addEventListener("click", () => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    historyList.innerHTML = "";
});

// ------------------- API Çağrısı -------------------
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
        const payload = { contents: [{ parts: [{ text: message }] }], tools: [{ google_search: {} }] };
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        const parts = result?.candidates?.[0]?.content?.parts || [];
        const aiText = parts.map(p => p.text || "").join("\n");
        appendMessage(aiText, "ai");
        saveHistory(message, aiText);
        statusMessage.textContent = "";
    } catch (err) {
        console.error(err);
        statusMessage.textContent = "Hata oluştu: " + err.message;
    }

    sendBtn.disabled = false;
    chatInput.disabled = false;
});

updateUI();
