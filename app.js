const SERVER_URL = "https://codesocial-backend.onrender.com";

// Ініціалізація CodeFlask
const flask = new CodeFlask('#code-editor', {
    language: 'js',
    lineNumbers: false
});

// Автозакриття дужок і лапок під час вводу
const editorArea = document.querySelector('#code-editor textarea');

editorArea?.addEventListener("input", (e) => {
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
            const start = editorArea.selectionStart;
            const end = editorArea.selectionEnd;
            const text = flask.getCode();

            const updatedText = text.substring(0, start) + pairs[char] + text.substring(end);
            flask.updateCode(updatedText);
            
            // Повертаємо курсор між дужками/лапками
            setTimeout(() => {
                editorArea.selectionStart = editorArea.selectionEnd = start;
            }, 0);
        }
    }
});

// Кнопки швидкого вводу
function insertSymbol(symbol) {
    const text = flask.getCode();
    const start = editorArea.selectionStart || text.length;
    const end = editorArea.selectionEnd || text.length;
    
    const updatedText = text.substring(0, start) + symbol + text.substring(end);
    flask.updateCode(updatedText);
    
    setTimeout(() => {
        editorArea.focus();
        editorArea.selectionStart = editorArea.selectionEnd = start + symbol.length;
    }, 0);
}

document.getElementById("btn-colon")?.addEventListener("click", () => insertSymbol(":"));
document.getElementById("btn-open-bracket")?.addEventListener("click", () => insertSymbol("("));
document.getElementById("btn-close-bracket")?.addEventListener("click", () => insertSymbol(")"));
document.getElementById("btn-tab")?.addEventListener("click", () => insertSymbol("    "));
document.getElementById("btn-equals")?.addEventListener("click", () => insertSymbol("="));
document.getElementById("btn-quote")?.addEventListener("click", () => insertSymbol('"'));

// Завантаження дописів
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

// Публікація
document.getElementById("send-btn")?.addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim() || "Анонім";
    const language = document.getElementById("language").value;
    const code = flask.getCode().trim();
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
            flask.updateCode("");
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

const savedUser = localStorage.getItem('username');
if (savedUser && document.getElementById("username")) {
    document.getElementById("username").value = savedUser;
}
document.getElementById("username")?.addEventListener("change", (e) => {
    localStorage.setItem('username', e.target.value.trim());
});

loadPosts();
