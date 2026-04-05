/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let currentChatId   = null;
let sidebarOpen     = true;

/* ─────────────────────────────────────────
   ID generator
───────────────────────────────────────── */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ─────────────────────────────────────────
   Escape HTML
───────────────────────────────────────── */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/* ─────────────────────────────────────────
   Time formatting
───────────────────────────────────────── */
function timeAgo(isoString) {
    const diff = Date.now() - new Date(isoString + 'Z').getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7)  return `${d}d ago`;
    return new Date(isoString).toLocaleDateString();
}

/* ─────────────────────────────────────────
   API helpers
───────────────────────────────────────── */
async function apiGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json();
}

async function apiPost(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    return res.json();
}

async function apiDelete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
    return res.json();
}

/* ─────────────────────────────────────────
   Sidebar / history rendering
───────────────────────────────────────── */
async function renderHistory() {
    const list  = document.getElementById('historyList');
    const empty = document.getElementById('historyEmpty');

    let chats = [];
    try {
        chats = await apiGet('/api/chats');
    } catch {
        chats = [];
    }

    list.querySelectorAll('.history-item').forEach(el => el.remove());

    if (chats.length === 0) {
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';

    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'history-item' + (chat.id === currentChatId ? ' active' : '');
        item.dataset.id = chat.id;
        item.innerHTML = `
            <div class="history-item-text">
                <div class="history-item-title">${escapeHtml(chat.title)}</div>
                <div class="history-item-time">${timeAgo(chat.created_at)}</div>
            </div>
            <button class="history-item-del" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                </svg>
            </button>`;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.history-item-del')) return;
            loadChat(chat.id);
        });

        item.querySelector('.history-item-del').addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await apiDelete(`/api/chats/${chat.id}`);
            } catch { /* ignore */ }
            if (currentChatId === chat.id) startNewChat();
            else renderHistory();
        });

        list.appendChild(item);
    });
}

/* ─────────────────────────────────────────
   Load a past chat
───────────────────────────────────────── */
async function loadChat(id) {
    let messages = [];
    try {
        messages = await apiGet(`/api/chats/${id}`);
    } catch {
        return;
    }

    currentChatId = id;

    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';

    messages.forEach(msg => appendMessage(msg.role, msg.content));
    chatBox.scrollTop = chatBox.scrollHeight;

    await renderHistory();
    if (window.innerWidth <= 640) closeSidebar();
}

/* ─────────────────────────────────────────
   New chat
───────────────────────────────────────── */
function startNewChat() {
    currentChatId = generateId();

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
   Send query (your original logic, adapted)
───────────────────────────────────────── */
async function sendQuery() {
    const input    = document.getElementById('userInput');
    const chatBox  = document.getElementById('chatBox');
    const sendBtn  = document.getElementById('sendBtn');
    const loading  = document.getElementById('loadingIndicator');
    const language = document.getElementById('languageSelect').value;
    const message  = input.value.trim();

    if (!message) return;

    input.value      = '';
    sendBtn.disabled = true;

    const chatId = currentChatId;

    appendMessage('user', message);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        await apiPost(`/api/chats/${chatId}/message`, {
            role:    'user',
            content: message,
            title:   message.slice(0, 48) + (message.length > 48 ? '…' : '')
        });
        renderHistory();
    } catch { /* non-blocking */ }

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
        botMsg.textContent   = 'Translating…';
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
            botMsg.textContent   = '';
            botMsg.style.opacity = '1';
            firstChunk = false;
        }
        botMsg.textContent += chunk;
        fullText           += chunk;
        chatBox.scrollTop   = chatBox.scrollHeight;
    }

    try {
        await apiPost(`/api/chats/${chatId}/message`, {
            role:    'bot',
            content: fullText
        });
    } catch { /* non-blocking */ }

    sendBtn.disabled = false;
    input.focus();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') sendQuery();
}

/* ─────────────────────────────────────────
   Sidebar toggle
───────────────────────────────────────── */
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
document.addEventListener('DOMContentLoaded', () => {
    currentChatId = generateId();

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

    document.getElementById('userInput').addEventListener('focus', () => {
        setTimeout(() => {
            const chatBox = document.getElementById('chatBox');
            chatBox.scrollTop = chatBox.scrollHeight;
        }, 300);
    });
});