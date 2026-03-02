async function sendQuery() {
    const input = document.getElementById('userInput');
    const chatBox = document.getElementById('chatBox');
    const language = document.getElementById('languageSelect').value; // NEW
    const message = input.value.trim();
    
    if (!message) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'message user-message';
    userMsg.textContent = message;
    chatBox.appendChild(userMsg);

    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const botMsg = document.createElement('div');
    botMsg.className = 'message bot-message';
    botMsg.textContent = '';
    chatBox.appendChild(botMsg);

    const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            query: message,
            language: language   // NEW
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        botMsg.textContent += chunk;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendQuery();
    }
}

//Mobile View Helper
const setMobileHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
};

window.addEventListener('resize', setMobileHeight);
setMobileHeight();

const userInput = document.getElementById('userInput');
userInput.addEventListener('focus', () => {
    setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
        const chatBox = document.getElementById('chatBox');
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 300);
});