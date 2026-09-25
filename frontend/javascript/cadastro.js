import { getSupabase, mapAuthError, showMessage, hideMessage } from './supabase-client.js';

const form = document.querySelector('#registerForm');
const messageEl = document.querySelector('#authMessage');
const submitBtn = document.querySelector('#registerSubmit');

function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    const input = document.querySelector(button.getAttribute('data-toggle-password'));
    if (!input) return;
    button.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      button.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
      button.innerHTML = isHidden
        ? '<i data-lucide="eye-off"></i>'
        : '<i data-lucide="eye"></i>';
      window.lucide?.createIcons({ nodes: [button] });
    });
  });
}

function getAccountType() {
  const selected = form.querySelector('input[name="account_type"]:checked');
  return selected?.value || 'investidor';
}

function getPasswordRequirements(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function updatePasswordRequirements(password) {
  const requirements = getPasswordRequirements(password);
  Object.entries(requirements).forEach(([name, valid]) => {
    document.querySelector(`[data-requirement="${name}"]`)?.classList.toggle('valid', valid);
  });
  return Object.values(requirements).every(Boolean);
}

async function handleRegister(event) {
  event.preventDefault();
  hideMessage(messageEl);

  const fullName = document.querySelector('#fullName').value.trim();
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const confirmPassword = document.querySelector('#confirmPassword').value;
  const accountType = getAccountType();

  if (!fullName || !email || !password || !confirmPassword) {
    showMessage(messageEl, 'error', 'Preencha todos os campos.');
    return;
  }
  if (!updatePasswordRequirements(password)) {
    showMessage(messageEl, 'error', 'A senha deve ter 8 caracteres, uma letra maiúscula, um número e um caractere especial.');
    return;
  }
  if (password !== confirmPassword) {
    showMessage(messageEl, 'error', 'As senhas não coincidem.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Cadastrando…';

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL('login.html', window.location.href).href,
        data: {
          full_name: fullName,
          account_type: accountType,
        },
      },
    });
    if (error) throw error;

    if (!data.user?.identities?.length) {
      showMessage(messageEl, 'error', 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.');
      return;
    }

    if (data.session) await supabase.auth.signOut();
    showMessage(messageEl, 'success', 'Cadastro realizado com sucesso! Redirecionando para o login...');
    form.reset();
    document.querySelectorAll('[data-requirement]').forEach((item) => item.classList.remove('valid'));
    window.setTimeout(() => window.location.replace('login.html'), 2200);
    return;
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    showMessage(messageEl, 'error', mapAuthError(err.message));
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Cadastrar';
  }
}

async function redirectIfLoggedIn() {
  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) window.location.href = 'index.html';
  } catch {
    /* config ausente */
  }
}

form.addEventListener('submit', handleRegister);
document.querySelector('#password')?.addEventListener('input', (event) => updatePasswordRequirements(event.target.value));
initPasswordToggles();
window.lucide?.createIcons();
redirectIfLoggedIn();
