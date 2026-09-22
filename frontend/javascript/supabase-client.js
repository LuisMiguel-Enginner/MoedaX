let supabaseClientPromise = null;

async function loadSupabaseConfig() {
  try {
    const response = await fetch('/api/supabase-config');
    if (response.ok) {
      const config = await response.json();
      if (config.url && config.anonKey) return config;
    }
  } catch {
    /* XAMPP / arquivo estático — usa supabase-config.json */
  }

  const jsonUrl = new URL('../supabase-config.json', import.meta.url);
  const response = await fetch(jsonUrl);
  if (!response.ok) {
    throw new Error(
      'Supabase não configurado. Use npm start com .env ou crie frontend/supabase-config.json.'
    );
  }
  const config = await response.json();
  if (!config.url || !config.anonKey) {
    throw new Error('supabase-config.json incompleto (url e anonKey).');
  }
  return config;
}

export async function getSupabase() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = (async () => {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1');
      const { url, anonKey } = await loadSupabaseConfig();
      return createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    })();
  }
  return supabaseClientPromise;
}

export function mapAuthError(message) {
  const text = (message || '').toLowerCase();
  if (text.includes('database error saving new user') || text.includes('error saving new user')) {
    return 'O cadastro chegou ao Supabase, mas o perfil não pôde ser criado. Execute o arquivo supabase/schema.sql no SQL Editor do projeto.';
  }
  if (text.includes('row-level security') || text.includes('violates row-level security policy')) {
    return 'O cadastro foi bloqueado por uma política RLS. Confirme se o trigger handle_new_user foi criado pelo arquivo supabase/schema.sql.';
  }
  if (text.includes('function public.handle_new_user') || text.includes('trigger')) {
    return 'O trigger de criação do perfil não está configurado corretamente. Execute novamente o arquivo supabase/schema.sql.';
  }
  if (text.includes('email rate limit exceeded')) {
    return 'Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.';
  }
  if (text.includes('failed to fetch') || text.includes('networkerror')) {
    return 'Não foi possível conectar ao serviço de autenticação. Verifique se o servidor Node está rodando.';
  }
  if (text.includes('signup is disabled')) {
    return 'O cadastro de novos usuários está desativado nas configurações do Supabase.';
  }
  if (text.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
  }
  if (text.includes('user already registered')) {
    return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
  }
  if (text.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (text.includes('unable to validate email')) {
    return 'Informe um endereço de e-mail válido.';
  }
  if (text.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  }
  if (text.includes('otp_expired') || text.includes('email link is invalid or has expired')) {
    return 'Este link de confirmação expirou ou já foi utilizado. Solicite um novo e-mail de confirmação.';
  }
  return message || 'Ocorreu um erro. Tente novamente.';
}

export function showMessage(element, type, text) {
  if (!element) return;
  element.hidden = false;
  element.className = `auth-message ${type}`;
  element.textContent = text;
}

export function hideMessage(element) {
  if (!element) return;
  element.hidden = true;
  element.textContent = '';
}
