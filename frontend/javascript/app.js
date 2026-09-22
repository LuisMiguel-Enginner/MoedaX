const fallbackAssets = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 'R$ 621.480,20', change: '+3,84%', direction: 'up', icon: '₿', color: 'btc', points: 'M0,23 C12,24 20,10 31,17 S50,7 62,14 S79,4 94,2' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 'R$ 18.942,70', change: '+2,19%', direction: 'up', icon: '◆', color: 'eth', points: 'M0,25 C15,21 19,22 30,14 S48,18 59,10 S76,12 94,3' },
  { symbol: 'USD', name: 'Dólar americano', type: 'fiat', price: 'R$ 5,2841', change: '-0,42%', direction: 'down', icon: '$', color: 'usd', points: 'M0,5 C14,7 21,4 32,13 S48,8 60,16 S78,11 94,25' },
  { symbol: 'EUR', name: 'Euro', type: 'fiat', price: 'R$ 6,1087', change: '+0,16%', direction: 'up', icon: '€', color: 'eur', points: 'M0,21 C10,17 20,22 30,16 S46,18 60,12 S78,15 94,9' }
];

const apiUrl = '/api/assets';
let assets = [...fallbackAssets];
let currentFilter = 'all';

const rows = document.querySelector('#marketRows');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#marketSearch');

function renderAssets() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = assets.filter((asset) => {
    const matchesFilter = currentFilter === 'all' || asset.type === currentFilter;
    const matchesSearch = `${asset.symbol} ${asset.name}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  rows.innerHTML = filtered.map((asset) => `
    <tr>
      <td><div class="asset"><span class="asset-icon ${asset.color}">${asset.icon}</span><span class="asset-name"><strong>${asset.name}</strong><span>${asset.symbol}</span></span></div></td>
      <td class="price">${asset.price}</td>
      <td class="change ${asset.direction === 'up' ? 'positive' : 'negative'}">${asset.change}</td>
      <td class="chart-column"><svg class="mini-chart ${asset.direction === 'down' ? 'down' : ''}" viewBox="0 0 94 30" preserveAspectRatio="none"><path d="${asset.points}" /></svg></td>
      <td><button class="star-button" aria-label="Favoritar ${asset.name}"><i data-lucide="star"></i></button></td>
    </tr>
  `).join('');
  emptyState.hidden = filtered.length !== 0;
  window.lucide?.createIcons();
}

async function loadAssets() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('API indisponível');
    const data = await response.json();
    if (Array.isArray(data.assets) && data.assets.length) assets = data.assets;
  } catch (error) {
    console.info('Modo demonstração ativo:', error.message);
  } finally {
    renderAssets();
  }
}

searchInput.addEventListener('input', renderAssets);
document.querySelectorAll('.filter-tab').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.filter-tab.active').classList.remove('active');
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    renderAssets();
  });
});

document.addEventListener('click', (event) => {
  const star = event.target.closest('.star-button');
  if (star) star.classList.toggle('is-favorite');
});

const modal = document.querySelector('#alertModal');
const toast = document.querySelector('#toast');
const openModal = () => { modal.hidden = false; document.body.style.overflow = 'hidden'; };
const closeModal = () => { modal.hidden = true; document.body.style.overflow = ''; };
document.querySelector('#addAlertButton').addEventListener('click', openModal);
document.querySelector('#manageAlerts').addEventListener('click', openModal);
document.querySelector('#modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.querySelector('#alertForm').addEventListener('submit', (event) => {
  event.preventDefault();
  closeModal();
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3500);
});

document.querySelector('#menuToggle').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => document.querySelector('#sidebar').classList.remove('open')));
document.querySelector('#themeToggle').addEventListener('click', () => document.body.classList.toggle('soft-dim'));

document.querySelectorAll('.period').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.period.active').classList.remove('active');
  button.classList.add('active');
}));

window.lucide?.createIcons();
loadAssets();
