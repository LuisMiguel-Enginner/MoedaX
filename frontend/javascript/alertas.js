import { getCurrentUser, signOut } from './session-user.js';
import { initDepositControls, initNotificationButton } from './demo-account.js';

const alerts = [
  { id: 1, type: 'target', icon: 'crosshair', title: 'Alvo de compra - Bitcoin', condition: 'Avisar quando o preço ficar abaixo de R$ 600.000,00', status: 'active', enabled: true },
  { id: 2, type: 'profit', icon: 'trending-up', title: 'Lucro-alvo - Ethereum', condition: 'Avisar quando o lucro atingir +15%', status: 'active', enabled: true },
  { id: 3, type: 'stop', icon: 'shield-alert', title: 'Stop-loss - Dólar americano', condition: 'Avisar se a cotação cair mais de 3%', status: 'triggered', enabled: false },
  { id: 4, type: 'volatility', icon: 'activity', title: 'Volatilidade - Euro', condition: 'Avisar em variações maiores que 2% em 1 hora', status: 'active', enabled: true },
];

const recentAlerts = [
  { type: 'stop', icon: 'shield-alert', title: 'Stop-loss - Dólar americano', condition: 'A cotação caiu 3,2%', time: 'Hoje, 09:42' },
];

function renderIcon(item) {
  return `<span class="alert-type-icon ${item.type}"><i data-lucide="${item.icon}"></i></span>`;
}

function renderAlerts(filter = 'all') {
  const list = document.querySelector('#alertList');
  const filtered = alerts.filter((item) => filter === 'all' || (filter === 'active' ? item.status === 'active' : item.status === 'triggered'));
  list.innerHTML = filtered.map((item) => `
    <article class="alert-card${item.enabled ? '' : ' is-disabled'}">
      ${renderIcon(item)}
      <div class="alert-copy"><h3>${item.title}</h3><p>${item.condition}</p></div>
      <span class="alert-status ${item.status}">${item.status === 'active' ? 'Ativo' : 'Disparado'}</span>
      <button class="alert-toggle ${item.enabled ? 'on' : ''}" type="button" data-alert-toggle="${item.id}" aria-label="${item.enabled ? 'Desativar' : 'Ativar'} alerta" aria-pressed="${item.enabled}"${item.status === 'triggered' ? ' disabled' : ''}></button>
    </article>
  `).join('') || '<p class="empty-alerts">Nenhum alerta encontrado neste filtro.</p>';
  window.lucide?.createIcons({ nodes: [list] });
}

function renderRecent() {
  document.querySelector('#recentAlertList').innerHTML = recentAlerts.map((item) => `
    <div class="recent-item">${renderIcon(item)}<div><strong>${item.title}</strong><span>${item.condition}</span></div><time>${item.time}</time></div>
  `).join('');
  window.lucide?.createIcons({ nodes: [document.querySelector('#recentAlertList')] });
}

function bindSidebar() {
  const shell = document.querySelector('.app-shell');
  const sidebar = document.querySelector('#sidebar');
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  if (localStorage.getItem('moedax_sidebar_collapsed') === '1' && !isMobile()) shell?.classList.add('sidebar-collapsed');
  document.querySelector('#sidebarBrandToggle')?.addEventListener('click', () => {
    if (isMobile()) return sidebar?.classList.toggle('open');
    shell?.classList.toggle('sidebar-collapsed');
    localStorage.setItem('moedax_sidebar_collapsed', shell?.classList.contains('sidebar-collapsed') ? '1' : '0');
  });
  document.querySelector('#sidebarExpandToggle')?.addEventListener('click', () => { shell?.classList.remove('sidebar-collapsed'); localStorage.setItem('moedax_sidebar_collapsed', '0'); });
  document.querySelector('#menuToggle')?.addEventListener('click', () => sidebar?.classList.toggle('open'));
  document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => sidebar?.classList.remove('open')));
}

function bindUserMenu(user) {
  const toggle = document.querySelector('#userMenuToggle');
  const menu = document.querySelector('#userMenu');
  toggle?.addEventListener('click', (event) => { event.stopPropagation(); menu.hidden = !menu.hidden; toggle.setAttribute('aria-expanded', String(!menu.hidden)); });
  document.addEventListener('click', () => { if (!menu) return; menu.hidden = true; toggle?.setAttribute('aria-expanded', 'false'); });
  document.querySelector('#logoutBtn')?.addEventListener('click', () => signOut());
  document.querySelector('#topbarUserName').textContent = user.fullName;
  document.querySelector('#userMenuName').textContent = user.fullName;
  document.querySelector('#userMenuEmail').textContent = user.email || '-';
}

export async function initAlertsPage() {
  const user = await getCurrentUser();
  if (!user) return;
  document.querySelector('#sidebarUserName').textContent = user.fullName;
  document.querySelector('#sidebarUserRole').textContent = user.accountLabel;
  document.querySelectorAll('[data-user-initials]').forEach((element) => { element.textContent = user.initials; });
  initDepositControls(user.id);
  initNotificationButton();
  bindUserMenu(user);
  bindSidebar();
  renderAlerts();
  renderRecent();
  document.querySelectorAll('.alert-filters button').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.alert-filters button').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); });
    renderAlerts(button.dataset.filter);
  }));
  document.querySelector('#alertList').addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-alert-toggle]');
    if (!toggle) return;
    const item = alerts.find((alert) => alert.id === Number(toggle.dataset.alertToggle));
    item.enabled = !item.enabled;
    renderAlerts(document.querySelector('.alert-filters button.active').dataset.filter);
  });
  document.querySelector('#newAlertButton').addEventListener('click', () => {
    document.querySelector('.alert-page-heading p').textContent = 'Escolha uma moeda e crie uma condição personalizada.';
    document.querySelector('#newAlertButton').classList.add('is-ready');
  });
  window.lucide?.createIcons();
}
