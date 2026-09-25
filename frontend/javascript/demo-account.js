const accountKey = (userId) => `moedax_demo_account_${userId}`;

function emptyAccount() {
  return { balance: 0, deposits: [], holdings: {}, investments: [], transactions: [], investedTotal: 0 };
}

export function getDemoAccount(userId) {
  const stored = localStorage.getItem(accountKey(userId));
  if (!stored) return emptyAccount();
  try {
    const account = JSON.parse(stored);
    const transactions = Array.isArray(account.transactions) && account.transactions.length
      ? account.transactions
      : (Array.isArray(account.deposits) ? account.deposits.map((deposit) => ({ type: 'deposit', title: 'Depósito na conta demo', description: 'Saldo virtual adicionado', amount: deposit.amount, date: deposit.date })) : []);
    return {
      ...emptyAccount(),
      ...account,
      deposits: Array.isArray(account.deposits) ? account.deposits : [],
      holdings: account.holdings && typeof account.holdings === 'object' ? account.holdings : {},
      investments: Array.isArray(account.investments) ? account.investments : [],
      transactions,
    };
  } catch {
    return emptyAccount();
  }
}

function saveDemoAccount(userId, account) {
  localStorage.setItem(accountKey(userId), JSON.stringify(account));
  window.dispatchEvent(new CustomEvent('moedax:account-updated', { detail: account }));
}

export function addDemoDeposit(userId, amount) {
  const account = getDemoAccount(userId);
  const deposit = { amount, date: new Date().toISOString() };
  const transaction = { type: 'deposit', title: 'Depósito na conta demo', description: 'Saldo virtual adicionado', amount, date: deposit.date };
  const updated = { ...account, balance: account.balance + amount, deposits: [deposit, ...account.deposits], transactions: [transaction, ...account.transactions] };
  saveDemoAccount(userId, updated);
  return updated;
}

export function addDemoInvestment(userId, { symbol, name, amount, fee, quantity, price }) {
  const account = getDemoAccount(userId);
  const total = amount + fee;
  if (total > account.balance) return { error: 'Saldo insuficiente para concluir esta compra.', account };
  const holdings = { ...account.holdings, [symbol]: (account.holdings[symbol] || 0) + quantity };
  const investment = { symbol, name, amount, fee, quantity, price, date: new Date().toISOString() };
  const transaction = { type: 'investment', title: `Compra - ${name}`, description: `${quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })} ${symbol} adquiridos`, amount: -total, date: investment.date };
  const updated = { ...account, balance: account.balance - total, holdings, investments: [investment, ...account.investments], transactions: [transaction, ...account.transactions], investedTotal: account.investedTotal + amount };
  saveDemoAccount(userId, updated);
  return { account: updated };
}

function depositModalMarkup() {
  return `<div class="deposit-modal-backdrop" id="depositModal" hidden><section class="deposit-modal" role="dialog" aria-modal="true" aria-labelledby="depositTitle"><button class="deposit-close" id="depositClose" type="button" aria-label="Fechar"><i data-lucide="x"></i></button><span class="deposit-modal-icon"><i data-lucide="wallet"></i></span><h2 id="depositTitle">Depositar na conta demo</h2><p>Adicione um valor virtual para testar seus investimentos.</p><label for="depositAmount">Valor do depósito</label><div class="deposit-input"><span>R$</span><input id="depositAmount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0,00" /></div><p class="deposit-error" id="depositError" role="alert"></p><button class="deposit-submit" id="depositSubmit" type="button">Confirmar depósito <i data-lucide="arrow-right"></i></button></section></div>`;
}

export function initDepositControls(userId, onDeposit) {
  const triggers = [...document.querySelectorAll('#depositButton, [data-deposit-trigger]')];
  if (!triggers.length) return;
  document.body.insertAdjacentHTML('beforeend', depositModalMarkup());
  const modal = document.querySelector('#depositModal');
  const input = document.querySelector('#depositAmount');
  const error = document.querySelector('#depositError');
  const close = () => { modal.hidden = true; input.value = ''; error.textContent = ''; };
  triggers.forEach((trigger) => trigger.addEventListener('click', () => { modal.hidden = false; input.focus(); }));
  document.querySelector('#depositClose').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.querySelector('#depositSubmit').addEventListener('click', () => {
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      error.textContent = 'Digite um valor maior que zero.';
      return;
    }
    const account = addDemoDeposit(userId, amount);
    close();
    onDeposit?.(account);
  });
  window.lucide?.createIcons({ nodes: [modal, ...triggers] });
}

export function formatDemoBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function initNotificationButton() {
  document.querySelector('#notificationButton')?.addEventListener('click', () => {
    window.location.href = 'alertas.html';
  });
}
