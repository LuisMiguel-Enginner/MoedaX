import { getSupabase, mapAuthError, showMessage, hideMessage } from './supabase-client.js';

const form = document.querySelector('#loginForm');
const messageEl = document.querySelector('#authMessage');
const submitBtn = document.querySelector('#loginSubmit');
const rememberKey = 'moedax_remember_email';

function restoreRememberedEmail() {
  const saved = localStorage.getItem(rememberKey);
  const emailInput = document.querySelector('#email');
  const rememberCheckbox = document.querySelector('#remember');
  if (saved && emailInput) {
    emailInput.value = saved;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  hideMessage(messageEl);

  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const remember = document.querySelector('#remember')?.checked;

  if (!email || !password) {
    showMessage(messageEl, 'error', 'Preencha e-mail e senha.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Entrando…';

  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (remember) localStorage.setItem(rememberKey, email);
    else localStorage.removeItem(rememberKey);

    window.location.href = 'index.html';
  } catch (err) {
    showMessage(messageEl, 'error', mapAuthError(err.message));
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Entrar';
  }
}

async function handleGoogleLogin() {
  hideMessage(messageEl);
  try {
    const supabase = await getSupabase();
    const redirectTo = new URL('index.html', window.location.href).href;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  } catch (err) {
    showMessage(messageEl, 'error', mapAuthError(err.message));
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  hideMessage(messageEl);
  const email = document.querySelector('#email').value.trim();
  if (!email) {
    showMessage(messageEl, 'error', 'Informe seu e-mail no campo acima para receber o link de recuperação.');
    return;
  }
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('login.html', window.location.href).href,
    });
    if (error) throw error;
    showMessage(messageEl, 'success', 'Enviamos um link de recuperação para o seu e-mail.');
  } catch (err) {
    showMessage(messageEl, 'error', mapAuthError(err.message));
  }
}

async function redirectIfLoggedIn() {
  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) window.location.href = 'index.html';
  } catch {
    /* config ausente — permanece na tela de login */
  }
}

function showRedirectError() {
  const params = new URLSearchParams(`${window.location.search}${window.location.hash.replace(/^#/, '&')}`);
  const error = params.get('error_description') || params.get('error_code');
  if (!error) return;
  showMessage(messageEl, 'error', mapAuthError(decodeURIComponent(error.replace(/\+/g, ' '))));
  window.history.replaceState({}, document.title, window.location.pathname);
}

form.addEventListener('submit', handleLogin);
document.querySelector('#googleLogin')?.addEventListener('click', handleGoogleLogin);
document.querySelector('#forgotPassword')?.addEventListener('click', handleForgotPassword);

restoreRememberedEmail();
window.lucide?.createIcons();
showRedirectError();
redirectIfLoggedIn();
