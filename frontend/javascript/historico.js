import { getCurrentUser, signOut } from './session-user.js';
import { formatDemoBRL, getDemoAccount, initDepositControls, initNotificationButton } from './demo-account.js';

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function transactionView(transaction) {
  const date = new Date(transaction.date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (left, right) => left.toDateString() === right.toDateString();
  const group = sameDay(date, today) ? 'Hoje' : sameDay(date, yesterday) ? 'Ontem' : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  return { ...transaction, group, value: transaction.amount, time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), icon: transaction.type === 'deposit' ? 'arrow-down-to-line' : 'shopping-bag', filter: transaction.type };
}

function renderTransactions(filter = 'all', account = { transactions: [] }) {
  const allTransactions = account.transactions.map(transactionView);
  const visible = allTransactions.filter((item) => filter === 'all' || item.filter === filter);
  const groups = [...new Set(visible.map((item) => item.group))];
  const list = document.querySelector('#transactionList');
  list.innerHTML = groups.map((group) => {
    const groupItems = visible.filter((item) => item.group === group);
    return `<section class="transaction-group"><h2 class="transaction-group-heading">${group}<span>${groupItems.length} ${groupItems.length === 1 ? 'movimentação' : 'movimentações'}</span></h2>${groupItems.map((item) => `<article class="transaction-card"> <span class="transaction-icon ${item.type}"><i data-lucide="${item.icon}"></i></span><div class="transaction-copy"><strong>${item.title}</strong><span>${item.description}</span></div><div class="transaction-value"><strong class="${item.type === 'profit' ? 'profit' : item.type === 'loss' ? 'loss' : ''}">${item.value > 0 && item.type !== 'deposit' ? '+' : ''}${formatCurrency(item.value)}</strong><span>${item.time}</span></div></article>`).join('')}</section>`;
  }).join('') || '<p class="empty-transactions">Nenhuma movimentação encontrada para este filtro.</p>';
  window.lucide?.createIcons({ nodes: [list] });
}

function bindNavigation() {
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
  document.addEventListener('click', () => { if (menu) menu.hidden = true; toggle?.setAttribute('aria-expanded', 'false'); });
  document.querySelector('#logoutBtn')?.addEventListener('click', () => signOut());
  document.querySelector('#topbarUserName').textContent = user.fullName;
  document.querySelector('#userMenuName').textContent = user.fullName;
  document.querySelector('#userMenuEmail').textContent = user.email || '-';
}

function exportStatement(account) {
  const header = 'Data;Tipo;Transacao;Descricao;Valor;Horario';
  const rows = account.transactions.map(transactionView).map((item) => `${item.group};${item.filter};${item.title};${item.description};${formatCurrency(item.value)};${item.time}`);
  const blob = new Blob([`${header}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'moedax-extrato.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export async function initHistoryPage() {
  const user = await getCurrentUser();
  if (!user) return;
  document.querySelector('#sidebarUserName').textContent = user.fullName;
  document.querySelector('#sidebarUserRole').textContent = user.accountLabel;
  document.querySelectorAll('[data-user-initials]').forEach((element) => { element.textContent = user.initials; });
  const updateHistoryBalance = () => {
    const account = getDemoAccount(user.id);
    document.querySelector('#totalDeposited').textContent = formatDemoBRL(account.deposits.reduce((total, item) => total + item.amount, 0));
    document.querySelector('#totalInvested').textContent = formatDemoBRL(account.investedTotal);
    renderTransactions(document.querySelector('[data-history-filter].active')?.dataset.historyFilter || 'all', account);
  };
  updateHistoryBalance();
  initDepositControls(user.id, updateHistoryBalance);
  initNotificationButton();
  bindUserMenu(user);
  bindNavigation();
  renderTransactions('all', getDemoAccount(user.id));
  document.querySelectorAll('[data-history-filter]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-history-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderTransactions(button.dataset.historyFilter, getDemoAccount(user.id));
  }));
  document.querySelectorAll('[data-history-period]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-history-period]').forEach((item) => item.classList.toggle('active', item === button));
  }));
  document.querySelector('#exportHistory').addEventListener('click', () => exportStatement(getDemoAccount(user.id)));
  window.lucide?.createIcons();
}
