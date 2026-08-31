container.innerHTML = posts.map((p, index) => {
    const username = escapeHtml(p[0]);
    const lang = escapeHtml(p[1]);
    const output = p[3]; // Залишаємо HTML-теги для кольорів від сервера
    const hasInput = p[4] === 1;

    return `
        <div class="post-card" style="background: #181825; border: 1px solid #45475a; padding: 12px; border-radius: 8px; margin-top: 15px;">
            <h4 style="margin: 0 0 8px 0; color: #cdd6f4;">${username} <span style="color: #cba6f7;">(${lang})</span></h4>
            <pre style="background: #1e1e2e; padding: 10px; border-radius: 6px; overflow-x: auto; margin: 0;"><code id="out-${index}">${output}</code></pre>
            ${hasInput ? `
                <div style="margin-top: 10px; display: flex; gap: 8px;" id="input-box-${index}">
                    <input type="text" id="val-${index}" placeholder="Введіть значення..." style="flex: 1; margin: 0;">
                    <button onclick="sendInputValue(${index})" style="margin: 0;">Надіслати</button>
                </div>
            ` : ''}
        </div>
    `;
}).join('');
