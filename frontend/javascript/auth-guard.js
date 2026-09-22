import { getSupabase } from './supabase-client.js';

const LOGIN_PATH = 'login.html';

export async function requireAuth() {
  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
  } catch {
    /* sem config ou erro de rede — trata como não autenticado */
  }
  window.location.replace(LOGIN_PATH);
  return new Promise(() => {});
}
