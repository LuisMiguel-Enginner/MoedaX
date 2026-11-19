import { getSupabase } from './supabase-client.js';

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function accountLabel(type) {
  return type === 'administrador' ? 'Administrador' : 'Conta pessoal';
}

function getDemoUser() {
  const fallbackName = 'Usuário Demo';
  const name = (localStorage.getItem('moedax_demo_name') || fallbackName).trim() || fallbackName;
  return {
    id: 'demo-user-1',
    email: localStorage.getItem('moedax_demo_email') || 'demo@moedax.test',
    fullName: name,
    firstName: name.split(/\s+/)[0],
    initials: getInitials(name),
    accountType: 'investidor',
    accountLabel: 'Conta pessoal',
  };
}

export async function getCurrentUser() {
  try {
    const supabase = await getSupabase();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (sessionError || !session) {
      return getDemoUser();
    }

    let profile = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, account_type')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!error) {
        profile = data;
      }
    } catch {
      // Mantém o fluxo em modo resiliente quando o token da sessão é inválido ou a API responde 401.
    }

    const meta = session.user.user_metadata || {};
    const fullName = (profile?.full_name || meta.full_name || session.user.email?.split('@')[0] || 'Usuário').trim();
    const accountType = profile?.account_type || meta.account_type || 'investidor';

    return {
      id: session.user.id,
      email: session.user.email,
      fullName,
      firstName: fullName.split(/\s+/)[0],
      initials: getInitials(fullName),
      accountType,
      accountLabel: accountLabel(accountType),
    };
  } catch {
    return getDemoUser();
  }
}

export async function signOut() {
  try {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
  } catch {
    // Sem sessão ativa, continua no fluxo demo local.
  }
  localStorage.removeItem('moedax_demo_name');
  localStorage.removeItem('moedax_demo_email');
  window.location.replace('login.html');
}
