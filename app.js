const SERVER_URL = "https://codesocial-backend.onrender.com";

const textarea = document.getElementById("code-input");

// Функція вставки спецсимволів у позицію курсора
function insertSymbol(symbol) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, start) + symbol + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + symbol.length;
    textarea.focus();
}

// Прив'язка кнопок спецсимволів
document.getElementById("btn-colon")?.addEventListener("click", () => insertSymbol(":"));
document.getElementById("btn-open-bracket")?.addEventListener("click", () => insertSymbol("("));
document.getElementById("btn-close-bracket")?.addEventListener("click", () => insertSymbol(")"));
document.getElementById("btn-tab")?.addEventListener("click", () => insertSymbol("    "));
document.getElementById("btn-equals")?.addEventListener("click", () => insertSymbol("="));
document.getElementById("btn-quote")?.addEventListener("click", () => insertSymbol('"'));

// Завантаження збережених дописів та виводу коду з сервера
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
                <h4 style="margin: 0 0 8px 0; color: #cdd6f4;">${escapeHtml(p[0])} (${escapeHtml(p[1])})</h4>
                <pre style="background: #1e1e2e; padding: 10px; border-radius: 6px; overflow-x: auto; color: #a6e3a1;"><code>${escapeHtml(p[2])}</code></pre>
                <div style="background: #11111b; padding: 10px; border-radius: 6px; color: #89b4fa; margin-top: 8px; font-family: monospace;">
                    <b>Вивід роботи програми:</b><br>${escapeHtml(p[3])}
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Помилка завантаження дописів:", e);
    }
}

// Захист від злому через HTML-теги
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Публікація нового допису на сервер
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
            await loadPosts();
        } else {
            alert("Помилка при відправці на сервер!");
        }
    } catch (e) {
        alert("Не вдалося з'єднатися з сервером. Перевір SERVER_URL!");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerText = "Опублікувати";
    }
});

// Автоматичне завантаження дописів при відкритті сайту
loadPosts();
