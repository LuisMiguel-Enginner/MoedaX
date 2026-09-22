import { getCurrentUser } from './session-user.js';

const fallbackAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: 'R$ 612.340,12', change: '+3,21%', direction: 'up', color: '#f7931a', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', price: 'R$ 23.487,56', change: '+2,15%', direction: 'up', color: '#627eea', icon: '◆' },
  { symbol: 'USD', name: 'Dólar americano', price: 'R$ 5,32', change: '+0,45%', direction: 'up', color: '#45ad72', icon: '$' },
  { symbol: 'EUR', name: 'Euro', price: 'R$ 6,14', change: '+0,28%', direction: 'up', color: '#2d91df', icon: '€' },
];

let assets = [];
let selected = ['BTC', 'ETH', 'USD'];
let selectedPeriod = '24h';
let histories = {};
const colors = { BTC: '#f7931a', ETH: '#4169e1', USD: '#45ad72', EUR: '#2d91df' };

function coinIcon(asset) {
  const color = colors[asset.symbol] || asset.color;
  if (asset.symbol === 'ETH') return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="${color}"/><path d="M16 5 10 16l6 3.5 6-3.5L16 5Z" fill="#fff"/><path d="m16 21-6-3 6 9 6-9-6 3Z" fill="#d7ddff"/></svg>`;
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="${color}"/><text x="16" y="22" text-anchor="middle" fill="#fff" font-size="17" font-family="Arial" font-weight="700">${asset.icon}</text></svg>`;
}

async function loadAssets() {
  for (const url of ['/api/assets', 'http://localhost:3000/api/assets']) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.assets?.length) return data.assets;
    } catch { /* fallback */ }
  }
  return fallbackAssets;
}

async function loadHistories() {
  const results = await Promise.all(selected.map(async (symbol) => {
    for (const url of [`/api/history?symbol=${symbol}&period=${selectedPeriod}`, `http://localhost:3000/api/history?symbol=${symbol}&period=${selectedPeriod}`]) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.history?.length) return [symbol, data.history];
      } catch { /* tenta a próxima fonte */ }
    }
    return [symbol, []];
  }));
  histories = Object.fromEntries(results);
}

function renderCurrencySelector() {
  const selectedEl = document.querySelector('#selectedCurrencies');
  const menu = document.querySelector('#currencyMenu');
  selectedEl.innerHTML = selected.map((symbol) => {
    const asset = assets.find((item) => item.symbol === symbol);
    return `<span class="currency-chip">${coinIcon(asset)} ${symbol}<button type="button" data-remove="${symbol}" aria-label="Remover ${symbol}"><i data-lucide="x"></i></button></span>`;
  }).join('');
  menu.innerHTML = assets.map((asset) => `<button type="button" class="currency-option ${selected.includes(asset.symbol) ? 'selected' : ''}" data-symbol="${asset.symbol}">${coinIcon(asset)} ${asset.name}</button>`).join('');
  window.lucide?.createIcons({ nodes: [selectedEl, menu] });
}

function renderLegend() {
  document.querySelector('#chartLegend').innerHTML = selected.map((symbol) => `<span class="legend-item"><span style="background:${colors[symbol]}"></span>${symbol}</span>`).join('');
}

function renderChart() {
  const chart = document.querySelector('#comparisonChart');
  const variationPoints = (symbol) => {
    const points = histories[symbol] || [];
    const initial = points[0]?.price || 1;
    return points.map((point) => ((point.price / initial) - 1) * 100);
  };
  const allValues = selected.flatMap((symbol) => variationPoints(symbol));
  if (!allValues.length) return;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const pathFor = (symbol) => {
    const points = variationPoints(symbol);
    return points.map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 760;
      const y = 215 - ((point - min) / range) * 190;
      return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };
  chart.innerHTML = selected.map((symbol) => `<path class="chart-line" d="${pathFor(symbol)}" stroke="${colors[symbol]}"/>`).join('');
}

function periodChange(symbol) {
  const points = histories[symbol] || [];
  if (points.length < 2 || !points[0].price) {
    return assets.find((asset) => asset.symbol === symbol)?.change || '+0,00%';
  }
  const change = ((points[points.length - 1].price / points[0].price) - 1) * 100;
  return `${change >= 0 ? '+' : ''}${change.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function renderSummary() {
  document.querySelector('#summaryList').innerHTML = assets.filter((asset) => selected.includes(asset.symbol)).map((asset) => {
    const change = periodChange(asset.symbol);
    return `<div class="summary-asset"><div class="summary-asset-top"><span class="summary-icon">${coinIcon(asset)}</span><strong class="summary-asset-name">${asset.name}<span class="summary-asset-symbol">${asset.symbol}</span></strong><span class="summary-bar" style="background:${colors[asset.symbol]}"></span></div><div class="summary-price"><span>${asset.price}</span><span class="summary-change ${change.startsWith('-') ? 'down' : ''}">${change}</span></div></div>`;
  }).join('');
}

function render() { renderCurrencySelector(); renderLegend(); renderChart(); renderSummary(); }

export async function initMarketPage() {
  const user = await getCurrentUser();
  if (!user) return;
  document.querySelector('#marketUserName').textContent = user.firstName;
  document.querySelector('[data-user-initials]').textContent = user.initials;
  document.querySelector('#summaryTime').textContent = `Hoje, ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · valores em BRL`;
  assets = await loadAssets();
  selected = selected.filter((symbol) => assets.some((asset) => asset.symbol === symbol));
  await loadHistories();
  render();
  document.querySelector('#currencySelect').addEventListener('click', (event) => {
    const symbol = event.target.closest('[data-symbol]')?.dataset.symbol;
    const remove = event.target.closest('[data-remove]')?.dataset.remove;
    if (symbol) selected = selected.includes(symbol) ? selected.filter((item) => item !== symbol) : [...selected, symbol];
    if (remove) selected = selected.filter((item) => item !== remove);
    await loadHistories();
    render();
  });
  document.querySelector('.select-chevron').addEventListener('click', () => { const menu = document.querySelector('#currencyMenu'); menu.hidden = !menu.hidden; });
  document.querySelector('#refreshMarket').addEventListener('click', async () => { assets = await loadAssets(); await loadHistories(); render(); });
  document.querySelector('#periodSelect').addEventListener('change', async (event) => { selectedPeriod = event.target.value; await loadHistories(); render(); });
  setInterval(async () => { assets = await loadAssets(); await loadHistories(); render(); }, 60_000);
  window.lucide?.createIcons();
}