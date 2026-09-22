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
  if (password.length < 6) {
    showMessage(messageEl, 'error', 'A senha deve ter pelo menos 6 caracteres.');
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

    if (data.session) await supabase.auth.signOut();
    window.location.replace('login.html');
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
initPasswordToggles();
window.lucide?.createIcons();
redirectIfLoggedIn();
