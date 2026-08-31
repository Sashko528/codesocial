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
