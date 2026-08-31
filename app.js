const SERVER_URL = "https://codesocial-backend.onrender.com"; // Переконайся, що тут вказано твій URL

// 1. Створюємо редактор CodeFlask
const flask = new CodeFlask('#code-editor', {
    language: 'python',
    lineNumbers: false
});

// Перемикання мови підсвітки (Python / Lua)
document.getElementById("language")?.addEventListener("change", (e) => {
    const lang = e.target.value;
    flask.setType(lang === "python" ? "python" : "lua");
});

// 2. Примусово відкриваємо клавіатуру при натисканні на редактор
document.getElementById('code-editor')?.addEventListener('click', () => {
    const textarea = document.querySelector('.codeflask__textarea');
    if (textarea) {
        textarea.focus();
    }
});

// 3. Автозакриття дужок і лапок під час вводу
const getEditorTextarea = () => document.querySelector('#code-editor textarea');

document.getElementById('code-editor')?.addEventListener("input", (e) => {
    const textarea = getEditorTextarea();
    if (!textarea) return;

    if (e.inputType === "insertText") {
        const pairs = { '(': ')', '"': '"', "'": "'", '[': ']', '{': '}' };
        const char = e.data;
        
        if (pairs[char]) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = flask.getCode();

            const updatedText = text.substring(0, start) + pairs[char] + text.substring(end);
            flask.updateCode(updatedText);
            
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start;
            }, 0);
        }
    }
});

// 4. Логіка для кнопок швидкого вводу (тулбар)
function insertSymbol(symbol) {
    const textarea = getEditorTextarea();
    const text = flask.getCode();
    const start = textarea ? textarea.selectionStart : text.length;
    const end = textarea ? textarea.selectionEnd : text.length;
    
    const updatedText = text.substring(0, start) + symbol + text.substring(end);
    flask.updateCode(updatedText);
    
    setTimeout(() => {
        if (textarea) {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + symbol.length;
        }
    }, 0);
}

document.getElementById("btn-colon")?.addEventListener("click", () => insertSymbol(":"));
document.getElementById("btn-open-bracket")?.addEventListener("click", () => insertSymbol("("));
document.getElementById("btn-close-bracket")?.addEventListener("click", () => insertSymbol(")"));
document.getElementById("btn-tab")?.addEventListener("click", () => insertSymbol("    "));
document.getElementById("btn-equals")?.addEventListener("click", () => insertSymbol("="));
document.getElementById("btn-quote")?.addEventListener("click", () => insertSymbol('"'));

// 5. Функція відправки допису (Кнопка "Опублікувати")
document.getElementById("send-btn")?.addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim() || "Анонім";
    const language = document.getElementById("language").value;
    const code = flask.getCode().trim();
    const sendBtn = document.getElementById("send-btn");

    if (!code) {
        alert("Введи код перед публікацією!");
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
            flask.updateCode("");
            await loadPosts();
        } else {
            alert("Помилка виконання коду на сервері!");
        }
    } catch (e) {
        alert("Не вдалося з'єднатися з сервером.");
        console.error(e);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerText = "Опублікувати";
    }
});

// 6. Завантаження та відображення дописів у стрічці
async function loadPosts() {
    const container = document.getElementById("posts-container");
    if (!container) return;

    try {
        const res = await fetch(`${SERVER_URL}/posts`);
        if (!res.ok) throw new Error("Сервер недоступний");
        
        const posts = await res.json();
        
        if (posts.length === 0) {
            container.innerHTML = "<p style='color: #a6adc8;'>Поки немає дописів.</p>";
            return;
        }

        container.innerHTML = posts.map(p => {
            const username = escapeHtml(p[0]);
            const lang = escapeHtml(p[1]);
            const code = escapeHtml(p[2]);
            const output = p[3];
            const hasInput = p[4] === 1;

            return `
                <div class="post-card" style="background: #181825; border: 1px solid #45475a; padding: 12px; border-radius: 8px; margin-top: 15px;">
                    <h4 style="margin: 0 0 8px 0; color: #cdd6f4;">${username} <span style="color: #cba6f7;">(${lang})</span></h4>
                    <pre style="background: #1e1e2e; padding: 10px; border-radius: 6px; overflow-x: auto; margin: 0;"><code>${output}</code></pre>
                    ${hasInput ? `
                        <div style="margin-top: 10px; display: flex; gap: 8px;">
                            <input type="text" placeholder="Введіть значення..." style="flex: 1; margin: 0;">
                            <button onclick="alert('Введене значення прийнято!')" style="margin: 0;">Надіслати</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Помилка завантаження дописів:", e);
    }
}

// Захист від XSS
function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Збереження ім'я користувача
const savedUser = localStorage.getItem('username');
if (savedUser && document.getElementById("username")) {
    document.getElementById("username").value = savedUser;
}
document.getElementById("username")?.addEventListener("change", (e) => {
    localStorage.setItem('username', e.target.value.trim());
});

// Ініціалізація
document.addEventListener("DOMContentLoaded", () => {
    loadPosts();
});
