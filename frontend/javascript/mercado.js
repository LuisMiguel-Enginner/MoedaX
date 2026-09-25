import { getCurrentUser } from './session-user.js';
import { addDemoInvestment, formatDemoBRL, getDemoAccount, initDepositControls, initNotificationButton } from './demo-account.js';

const fallbackAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: 'R$ 612.340,12', change: '+3,21%', icon: '₿', color: 'btc' },
  { symbol: 'ETH', name: 'Ethereum', price: 'R$ 23.487,56', change: '+2,15%', icon: '◆', color: 'eth' },
  { symbol: 'USD', name: 'Dólar americano', price: 'R$ 5,32', change: '+0,45%', icon: '$', color: 'usd' },
  { symbol: 'EUR', name: 'Euro', price: 'R$ 6,14', change: '-0,28%', icon: '€', color: 'eur' },
];

let assets = [];
let selectedSymbol = 'BTC';
let demoBalance = 0;
const feeRate = 0.009;

function parseBRL(value) {
  const normalized = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Number(normalized) || 0;
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatAmount(value) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function assetIcon(asset) {
  return `<span class="coin-icon ${asset.color}">${asset.icon}</span>`;
}

async function loadAssets() {
  for (const url of ['/api/assets', 'http://localhost:3000/api/assets']) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.assets?.length) return data.assets;
    } catch { /* usa os valores locais quando a API estiver indisponível */ }
  }
  return fallbackAssets;
}

function getAsset(symbol) {
  return assets.find((asset) => asset.symbol === symbol) || fallbackAssets.find((asset) => asset.symbol === symbol);
}

function renderQuotes() {
  const list = document.querySelector('#quotesList');
  const quoteAssets = assets.filter((asset) => ['BTC', 'ETH', 'USD'].includes(asset.symbol));
  list.innerHTML = quoteAssets.map((asset) => {
    const change = String(asset.change || '0%');
    return `<div class="quote-row">${assetIcon(asset)}<div class="quote-info"><strong>${asset.name}</strong><small>${asset.symbol}</small></div><div class="quote-value"><strong>${asset.price}</strong><span class="quote-change ${change.startsWith('-') ? 'down' : ''}">${change}</span></div></div>`;
  }).join('');
}

function updatePurchase() {
  const asset = getAsset(selectedSymbol);
  const amountInput = document.querySelector('#investmentAmount');
  const amount = Math.max(0, Number(amountInput.value) || 0);
  const price = parseBRL(asset.price);
  const fee = amount * feeRate;
  const received = price ? amount / price : 0;

  document.querySelector('#receiveAmount').textContent = `${formatAmount(received)} ${asset.symbol}`;
  document.querySelector('#currentPrice').textContent = formatBRL(price);
  document.querySelector('#feeAmount').textContent = formatBRL(fee);
  document.querySelector('#totalAmount').textContent = formatBRL(amount + fee);
}

function bindPurchaseForm(userId, updateBalance) {
  const amountInput = document.querySelector('#investmentAmount');
  document.querySelectorAll('.asset-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      selectedSymbol = tab.dataset.asset;
      document.querySelectorAll('.asset-tab').forEach((item) => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
      });
      updatePurchase();
    });
  });

  amountInput.addEventListener('input', () => {
    document.querySelectorAll('.quick-values button').forEach((button) => button.classList.remove('selected'));
    updatePurchase();
  });

  document.querySelectorAll('.quick-values button').forEach((button) => {
    button.addEventListener('click', () => {
      amountInput.value = button.dataset.amount === 'max' ? String(demoBalance) : button.dataset.amount;
      document.querySelectorAll('.quick-values button').forEach((item) => item.classList.toggle('selected', item === button));
      updatePurchase();
    });
  });

  document.querySelector('#confirmPurchase').addEventListener('click', () => {
    const asset = getAsset(selectedSymbol);
    const amount = Math.max(0, Number(amountInput.value) || 0);
    const price = parseBRL(asset.price);
    const fee = amount * feeRate;
    if (!amount || !price) return;
    const result = addDemoInvestment(userId, {
      symbol: asset.symbol,
      name: asset.name,
      amount,
      fee,
      price,
      quantity: amount / price,
    });
    const feedback = document.querySelector('#purchaseFeedback');
    if (result.error) {
      feedback.className = 'purchase-feedback error';
      feedback.textContent = result.error;
      return;
    }
    demoBalance = result.account.balance;
    updateBalance(result.account);
    feedback.className = 'purchase-feedback';
    feedback.textContent = `Compra de ${asset.symbol} realizada. Saldo atualizado.`;
    amountInput.value = '0';
    document.querySelectorAll('.quick-values button').forEach((button) => button.classList.remove('selected'));
    updatePurchase();
  });
}

function bindSidebar() {
  const shell = document.querySelector('.app-shell');
  const sidebar = document.querySelector('#sidebar');
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  shell?.classList.remove('sidebar-collapsed');
  document.querySelector('#sidebarBrandToggle')?.addEventListener('click', () => {
    if (isMobile()) sidebar?.classList.toggle('open');
    else shell?.classList.toggle('sidebar-collapsed');
  });
  document.querySelector('#sidebarExpandToggle')?.addEventListener('click', () => shell?.classList.remove('sidebar-collapsed'));
  document.querySelector('#menuToggle')?.addEventListener('click', () => sidebar?.classList.toggle('open'));
  document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => sidebar?.classList.remove('open')));
}

async function refreshMarket() {
  assets = await loadAssets();
  renderQuotes();
  updatePurchase();
  document.querySelector('#balanceTime').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  window.lucide?.createIcons();
}

export async function initMarketPage() {
  const user = await getCurrentUser();
  if (!user) return;
  document.querySelector('#marketUserName').textContent = user.firstName;
  document.querySelector('#sidebarUserName').textContent = user.fullName;
  document.querySelector('#sidebarUserRole').textContent = user.accountLabel;
  document.querySelectorAll('[data-user-initials]').forEach((element) => { element.textContent = user.initials; });
  const updateBalance = (account) => {
    const balance = document.querySelector('.balance-card > strong');
    if (balance) balance.textContent = formatDemoBRL(account.balance);
  };
  demoBalance = getDemoAccount(user.id).balance;
  updateBalance({ balance: demoBalance });
  initDepositControls(user.id, (account) => {
    demoBalance = account.balance;
    updateBalance(account);
  });
  initNotificationButton();
  await refreshMarket();
  bindPurchaseForm(user.id, updateBalance);
  document.querySelector('#refreshMarket').addEventListener('click', refreshMarket);
  bindSidebar();
  window.lucide?.createIcons();
  setInterval(refreshMarket, 60_000);
}
