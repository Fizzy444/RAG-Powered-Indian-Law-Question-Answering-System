/* ─────────────────────────────────────────
   History management (localStorage)
───────────────────────────────────────── */
const STORAGE_KEY = 'legalai_history';

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7)  return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
}

function renderHistory() {
    const history = loadHistory();
    const list    = document.getElementById('historyList');
    const empty   = document.getElementById('historyEmpty');

    const existing = list.querySelectorAll('.history-item');
    existing.forEach(el => el.remove());

    if (history.length === 0) {
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';

    history.slice().reverse().forEach(chat => {
        const item = document.createElement('div');
        item.className = 'history-item' + (chat.id === currentChatId ? ' active' : '');
        item.dataset.id = chat.id;
        item.innerHTML = `
            <div class="history-item-text">
                <div class="history-item-title">${escapeHtml(chat.title)}</div>
                <div class="history-item-time">${timeAgo(chat.createdAt)}</div>
            </div>
            <button class="history-item-del" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                </svg>
            </button>`;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.history-item-del')) return;
            loadChat(chat.id);
        });

        item.querySelector('.history-item-del').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });

        list.appendChild(item);
    });
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function loadChat(id) {
    const history = loadHistory();
    const chat    = history.find(c => c.id === id);
    if (!chat) return;

    currentChatId = id;
    currentMessages = chat.messages.slice();

    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';

    chat.messages.forEach(msg => {
        appendMessage(msg.role, msg.text);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
    renderHistory();

    if (window.innerWidth <= 640) closeSidebar();
}

function deleteChat(id) {
    let history = loadHistory();
    history = history.filter(c => c.id !== id);
    saveHistory(history);

    if (currentChatId === id) startNewChat();
    else renderHistory();
}

function startNewChat() {
    currentChatId   = generateId();
    currentMessages = [];

    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = `
        <div class="message-row bot-row">
            <div class="message-wrap">
                <div class="bot-avatar">⚖️</div>
                <div>
                    <div class="message bot-message">Hello! I am your Indian legal research assistant. Ask me anything about Indian law — statutes, case law, constitutional provisions, and more.</div>
                </div>
            </div>
        </div>`;

    renderHistory();
    document.getElementById('userInput').focus();
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function saveChatMessage(role, text) {
    let history = loadHistory();
    let chat    = history.find(c => c.id === currentChatId);

    if (!chat) {
        chat = {
            id: currentChatId,
            title: text.slice(0, 48) + (text.length > 48 ? '…' : ''),
            createdAt: Date.now(),
            messages: []
        };
        history.push(chat);
    }

    chat.messages.push({ role, text });
    if (role === 'user' && chat.messages.filter(m => m.role === 'user').length === 1) {
        chat.title = text.slice(0, 48) + (text.length > 48 ? '…' : '');
    }

    saveHistory(history);
    renderHistory();
}

/* ─────────────────────────────────────────
   DOM helpers
───────────────────────────────────────── */
function appendMessage(role, text) {
    const chatBox = document.getElementById('chatBox');

    const row = document.createElement('div');
    row.className = `message-row ${role === 'user' ? 'user-row' : 'bot-row'}`;

    if (role === 'user') {
        row.innerHTML = `
            <div class="message-wrap">
                <div class="message user-message">${escapeHtml(text)}</div>
            </div>`;
    } else {
        row.innerHTML = `
            <div class="message-wrap">
                <div class="bot-avatar">⚖️</div>
                <div>
                    <div class="message bot-message">${escapeHtml(text)}</div>
                </div>
            </div>`;
    }

    chatBox.appendChild(row);
    return row;
}

function getBotMessageEl(row) {
    return row.querySelector('.bot-message');
}

/* ─────────────────────────────────────────
   Core send logic (your original, adapted)
───────────────────────────────────────── */
async function sendQuery() {
    const input    = document.getElementById('userInput');
    const chatBox  = document.getElementById('chatBox');
    const sendBtn  = document.getElementById('sendBtn');
    const loading  = document.getElementById('loadingIndicator');
    const language = document.getElementById('languageSelect').value;
    const message  = input.value.trim();

    if (!message) return;

    input.value = '';
    sendBtn.disabled = true;

    appendMessage('user', message);
    saveChatMessage('user', message);
    chatBox.scrollTop = chatBox.scrollHeight;

    loading.style.display = 'flex';
    chatBox.scrollTop = chatBox.scrollHeight;

    const botRow = appendMessage('bot', '');
    const botMsg = getBotMessageEl(botRow);
    botMsg.style.display = 'none';

    const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message, language })
    });

    loading.style.display = 'none';
    botMsg.style.display  = '';

    if (language !== 'en') {
        botMsg.textContent = 'Translating…';
        botMsg.style.opacity = '0.5';
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let firstChunk = true;
    let fullText   = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        if (firstChunk) {
            botMsg.textContent = '';
            botMsg.style.opacity = '1';
            firstChunk = false;
        }
        botMsg.textContent += chunk;
        fullText += chunk;
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    saveChatMessage('bot', fullText);
    sendBtn.disabled = false;
    input.focus();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') sendQuery();
}

/* ─────────────────────────────────────────
   Sidebar toggle
───────────────────────────────────────── */
let sidebarOpen = true;

function closeSidebar() {
    document.getElementById('sidebar').classList.add('collapsed');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('visible');
    sidebarOpen = false;
}

function openSidebar() {
    document.getElementById('sidebar').classList.remove('collapsed');
    if (window.innerWidth <= 640) {
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.classList.add('visible');
    }
    sidebarOpen = true;
}

/* ─────────────────────────────────────────
   Mobile viewport fix (your original)
───────────────────────────────────────── */
const setMobileHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
};
window.addEventListener('resize', setMobileHeight);
setMobileHeight();

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
let currentChatId   = generateId();
let currentMessages = [];

document.addEventListener('DOMContentLoaded', () => {
    renderHistory();

    document.getElementById('sidebarToggle').addEventListener('click', () => {
        sidebarOpen ? closeSidebar() : openSidebar();
    });

    document.getElementById('newChatBtn').addEventListener('click', startNewChat);

    document.getElementById('signoutBtn').addEventListener('click', async () => {
        await fetch('/api/signout', { method: 'POST' });
        window.location.href = '/';
    });

    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);

    const userInput = document.getElementById('userInput');
    userInput.addEventListener('focus', () => {
        setTimeout(() => {
            const chatBox = document.getElementById('chatBox');
            chatBox.scrollTop = chatBox.scrollHeight;
        }, 300);
    });
});