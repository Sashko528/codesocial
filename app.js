const SERVER_URL = "https://codesocial-backend.onrender.com";

const textarea = document.getElementById("code-input");

// Автозакриття дужок та зміна кольору в полі вводу наживо
textarea?.addEventListener("input", (e) => {
    if (e.inputType === "insertText") {
        const pairs = {
            '(': ')',
            '"': '"',
            "'": "'",
            '[': ']',
            '{': '}'
        };
        
        const char = e.data;
        if (pairs[char]) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;

            textarea.value = text.substring(0, start) + pairs[char] + text.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start;
        }
    }

    const match = textarea.value.match(/color\((['"])(.*?)\1\)/);
    if (match && match[2]) {
        textarea.style.color = match[2];
    } else {
        textarea.style.color = "#a6e3a1";
    }
});

function insertSymbol(symbol) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, start) + symbol + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + symbol.length;
    textarea.focus();
}

document.getElementById("btn-colon")?.addEventListener("click", () => insertSymbol(":"));
document.getElementById("btn-open-bracket")?.addEventListener("click", () => insertSymbol("("));
document.getElementById("btn-close-bracket")?.addEventListener("click", () => insertSymbol(")"));
document.getElementById("btn-tab")?.addEventListener("click", () => insertSymbol("    "));
document.getElementById("btn-equals")?.addEventListener("click", () => insertSymbol("="));
document.getElementById("btn-quote")?.addEventListener("click", () => insertSymbol('"'));

async function loadPosts() {
    const container = document.getElementById("posts-container");
    if (!container) return;

    try {
        const res = await fetch(`${SERVER_URL}/posts`);
        if (!res.ok) throw new Error("Сервер недоступний");
        
        const posts = await res.json();
        
        if (posts.length === 0) {
            container.innerHTML = "<p style='color: #a6adc8;'>Поки немає дописів. Будь першим!</p>";
            return;
        }

        container.innerHTML = posts.map(p => `
            <div class="post-card" style="background: #181825; border: 1px solid #45475a; padding: 12px; border-radius: 8px; margin-top: 15px;">
                <h4 style="margin: 0 0 8px 0; color: #cdd6f4;">${escapeHtml(p[0])} <span style="color: #cba6f7;">(${escapeHtml(p[1])})</span></h4>
                <pre style="background: #1e1e2e; padding: 10px; border-radius: 6px; overflow-x: auto; margin: 0;"><code>${p[3]}</code></pre>
            </div>
        `).join('');
    } catch (e) {
        console.error("Помилка завантаження дописів:", e);
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.getElementById("send-btn")?.addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim() || "Анонім";
    const language = document.getElementById("language").value;
    const code = textarea.value.trim();
    const sendBtn = document.getElementById("send-btn");

    if (!code) {
        alert("Введи код!");
        return;
    }

    sendBtn.disabled = true;
    sendBtn.innerText = "Виконується...";

    try {
        const res = await fetch(`${SERVER_URL}/post`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, language, code })
        });

        if (res.ok) {
            textarea.value = "";
            textarea.style.color = "#a6e3a1";
            await loadPosts();
        } else {
            alert("Помилка при відправці на сервер!");
        }
    } catch (e) {
        alert("Не вдалося з'єднатися з сервером.");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerText = "Опублікувати";
    }
});

async function checkInviteLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite');
    
    if (inviteCode) {
        let myName = localStorage.getItem('username');
        if (!myName) {
            myName = prompt("Введи своє ім'я, щоб активувати посилання-запрошення:");
            if (myName) localStorage.setItem('username', myName);
        }

        if (myName) {
            try {
                const res = await fetch(`${SERVER_URL}/use-invite`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: myName, code: inviteCode })
                });
                const data = await res.json();
                alert(data.message);
            } catch (e) {
                alert("Помилка активації посилання.");
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

async function createInvite(type) {
    const username = document.getElementById("username").value.trim();
    if (!username) {
        alert("Введи своє ім'я перед створенням посилання!");
        return;
    }

    try {
        const res = await fetch(`${SERVER_URL}/create-invite?username=${encodeURIComponent(username)}&invite_type=${type}`, {
            method: "POST"
        });
        const data = await res.json();

        if (data.status === "ok") {
            const link = `${window.location.origin}${window.location.pathname}?invite=${data.code}`;
            navigator.clipboard.writeText(link);
            alert(`Успішно! Посилання для ${type === 'contact' ? 'контакту' : 'групи'} скопійовано:\n${link}`);
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert("Помилка під час з'єднання з сервером.");
    }
}

const savedUser = localStorage.getItem('username');
if (savedUser && document.getElementById("username")) {
    document.getElementById("username").value = savedUser;
}
document.getElementById("username")?.addEventListener("change", (e) => {
    localStorage.setItem('username', e.target.value.trim());
});

checkInviteLink();
loadPosts();
