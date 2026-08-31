const API_URL = "http://127.0.0.1:8000"; // заніми на свою адресу сервера при потребі

// Зберігаємо введені користувачем значення для кожної публікації за ID
const postInputsStore = {};

async function createPost() {
    const username = document.getElementById("username").value || "Анонім";
    const lang = document.getElementById("language").value;
    const code = editor.getCode(); // Якщо використовуєш CodeFlask

    if (!code.trim()) return alert("Введіть код!");

    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: username,
                code: code,
                lang: lang,
                user_inputs: []
            })
        });

        if (response.ok) {
            editor.updateCode("");
            loadPosts();
        }
    } catch (e) {
        console.error("Помилка створення допису:", e);
    }
}

async function loadPosts() {
    try {
        const res = await fetch(`${API_URL}/posts`);
        const posts = await res.json();
        renderPosts(posts);
    } catch (e) {
        console.error("Помилка завантаження дописів:", e);
    }
}

function renderPosts(posts) {
    const feed = document.getElementById("feed");
    feed.innerHTML = "<h3>Стрічка дописів</h3>";

    posts.forEach(post => {
        if (!postInputsStore[post.id]) {
            postInputsStore[post.id] = post.user_inputs || [];
        }

        const card = document.createElement("div");
        card.className = "create-post";
        card.style.marginBottom = "15px";

        // Форматуємо вивід коду з підсвіткою
        const outputHtml = formatOutput(post.output, post.id, post.code, post.lang);

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <strong style="color:#cba6f7;">${escapeHtml(post.username)}</strong>
                <span style="color:#89b4fa; font-size:12px;">${post.lang.toUpperCase()}</span>
            </div>
            <pre style="background:#313244; padding:10px; border-radius:6px; font-family:monospace; margin-bottom:10px; overflow-x:auto;"><code>${escapeHtml(post.code)}</code></pre>
            <div style="background:#11111b; padding:10px; border-radius:6px; font-family:monospace; font-size:13px;" id="output-${post.id}">
                ${outputHtml}
            </div>
        `;

        feed.appendChild(card);
    });
}

function formatOutput(output, postId, code, lang) {
    const lines = output.split("\n");
    return lines.map((line) => {
        if (line.includes("[Очікує вводу...]")) {
            return `
                <div style="display:inline-flex; gap:5px; margin-top:5px;">
                    <input type="text" id="input-field-${postId}" placeholder="Введіть значення..." style="margin-bottom:0; padding:4px 8px; font-size:12px; width:150px;">
                    <button onclick="submitInput(${postId}, '${encodeURIComponent(code)}', '${lang}')" style="padding:4px 10px; background:#a6e3a1; border:none; border-radius:4px; font-weight:bold; cursor:pointer; color:#11111b;">ОК</button>
                </div>
            `;
        }
        return `<div>${escapeHtml(line)}</div>`;
    }).join("");
}

async function submitInput(postId, encodedCode, lang) {
    const code = decodeURIComponent(encodedCode);
    const inputElement = document.getElementById(`input-field-${postId}`);
    const inputValue = inputElement.value;

    if (!inputValue) return;

    // Додаємо нове значення до масиву вводів цього допису
    if (!postInputsStore[postId]) {
        postInputsStore[postId] = [];
    }
    postInputsStore[postId].push(inputValue);

    try {
        const response = await fetch(`${API_URL}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: code,
                lang: lang,
                user_inputs: postInputsStore[postId]
            })
        });

        const data = await response.json();
        const outputContainer = document.getElementById(`output-${postId}`);
        if (outputContainer) {
            outputContainer.innerHTML = formatOutput(data.output, postId, code, lang);
        }
    } catch (e) {
        console.error("Помилка виконання коду:", e);
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Завантаження при старті
document.addEventListener("DOMContentLoaded", loadPosts);
