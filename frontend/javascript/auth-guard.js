import { getCurrentUser } from './session-user.js';

const LOGIN_PATH = 'login.html';

export async function requireAuth() {
  try {
    const user = await getCurrentUser();
    if (user) return user;
  } catch {
    /* sem config ou erro de rede — trata como não autenticado */
  }

  const demoMode = localStorage.getItem('moedax_demo_mode') === '1';
  if (demoMode) {
    localStorage.setItem('moedax_demo_name', 'Usuário Demo');
    localStorage.setItem('moedax_demo_email', 'demo@moedax.test');
    return { id: 'demo-user-1', email: 'demo@moedax.test' };
  }

  window.location.replace(LOGIN_PATH);
  return new Promise(() => {});
}
