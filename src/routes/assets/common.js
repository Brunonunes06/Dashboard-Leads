// Shared sidebar, theme toggle, toast — runs on every page
(function(){
  // ----- Theme -----
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('light', savedTheme === 'light');

  window.toggleTheme = function(){
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (window.lucide) lucide.createIcons();
  };

  // ----- Sidebar injection -----
  const navItems = [
    { href:'index.html',     icon:'layout-dashboard', label:'Dashboard' },
    { href:'leads.html',     icon:'messages-square',  label:'Conversas WhatsApp' },
    { href:'instagram.html', icon:'instagram',        label:'CRM Instagram' },
    { href:'settings.html',  icon:'settings-2',       label:'Configurar IA' },
    { href:'profile.html',   icon:'user-circle',      label:'Perfil' },
  ];
  const current = (location.pathname.split('/').pop() || 'index.html');

  const sidebarHTML = `
    <div class="sidebar-brand">
          <img src="./img/logo.jpg" alt="Logo da Marca" class="brand-mark">
      <div class="brand-text"><strong>Resposta</strong><span>SaaS de leads</span></div>
    </div>
    <nav class="nav">
      <p class="nav-section">Plataforma</p>
      ${navItems.map(n=>`<a href="${n.href}" class="${current===n.href?'active':''}"><i data-lucide="${n.icon}"></i>${n.label}</a>`).join('')}
    </nav>`;

  document.addEventListener('DOMContentLoaded', function(){
    // Inject desktop sidebar
    const sb = document.querySelector('.sidebar');
    if (sb) sb.innerHTML = sidebarHTML;

    // Inject mobile sidebar
    const mobileWrap = document.createElement('div');
    mobileWrap.className = 'sidebar-mobile';
    mobileWrap.id = 'mobileSidebar';
    mobileWrap.innerHTML = `<div class="sb-back" onclick="closeMobileSidebar()"></div><aside class="sb-panel">${sidebarHTML}</aside>`;
    document.body.appendChild(mobileWrap);

    // Inject toast root
    if (!document.getElementById('toast-root')){
      const t = document.createElement('div'); t.id='toast-root'; document.body.appendChild(t);
    }

    if (window.lucide) lucide.createIcons();
  });

  window.openMobileSidebar = function(){ document.getElementById('mobileSidebar').classList.add('open'); };
  window.closeMobileSidebar = function(){ document.getElementById('mobileSidebar').classList.remove('open'); };

  // ----- Toast -----
  window.toast = function(title, desc){
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<strong>${title}</strong>${desc?`<span>${desc}</span>`:''}`;
    root.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .2s'; setTimeout(()=>el.remove(),200); }, 3200);
  };

  // ----- Helpers -----
  window.escapeHtml = function(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); };
  window.nowLabel = function(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
})();
