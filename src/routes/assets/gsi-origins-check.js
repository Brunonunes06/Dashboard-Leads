// Simple client-side check to detect likely missing authorized origin for Google Identity Client ID.
(function () {
  const CLIENT_ID_PLACEHOLDER = document.querySelector('[data-client_id]')?.getAttribute('data-client_id') || '';
  const recommendedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];

  function createNotice(html) {
    const container = document.getElementById('gsiOriginNotice');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = html;
    // basic styles
    container.style.position = 'relative';
    container.style.padding = '12px 16px';
    container.style.background = 'linear-gradient(90deg,#fef3c7,#fee2e2)';
    container.style.border = '1px solid #f59e0b';
    container.style.borderRadius = '8px';
    container.style.margin = '12px';
    container.style.fontSize = '13px';
  }

  const origin = window.location.origin;
  if (!CLIENT_ID_PLACEHOLDER) {
    // nothing to check
    return;
  }

  // show notice when current origin is not a recommended origin
  if (!recommendedOrigins.includes(origin)) {
    const googleConsole = 'https://console.cloud.google.com/apis/credentials';
    const docsPath = (function(){
      // try to guess relative docs path
      return window.location.origin + '/docs/GSI-setup.md';
    })();

    createNotice(`
      <strong>Aviso — Google Identity (GSI)</strong>
      <div style="margin-top:6px">A origem atual (<em>${origin}</em>) pode não estar registrada no Client ID usado pelo GSI. Se o botão de login do Google falhar, registre esta origem no Google Cloud Console.</div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
        <a href="${googleConsole}" target="_blank" rel="noreferrer noopener" class="btn btn-ghost btn-sm">Abrir Google Cloud Console</a>
        <a href="${docsPath}" target="_blank" rel="noreferrer noopener" class="btn btn-ghost btn-sm">Guia rápido (docs/GSI-setup.md)</a>
        <button id="gsiNoticeHide" class="btn btn-ghost btn-sm">Fechar</button>
      </div>
      <div style="margin-top:8px;color:#7c2d12">Client ID: <code style="background:#fff;padding:2px 6px;border-radius:4px">${CLIENT_ID_PLACEHOLDER}</code></div>
    `);

    const hideBtn = document.getElementById('gsiNoticeHide');
    if (hideBtn) hideBtn.addEventListener('click', () => {
      const c = document.getElementById('gsiOriginNotice');
      if (c) c.style.display = 'none';
    });
  }
})();
