import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  initials: string;
  accountLabel: string;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private clientPromise?: Promise<SupabaseClient>;

  async getClient(): Promise<SupabaseClient> {
    this.clientPromise ??= this.createClient();
    return this.clientPromise;
  }

  async getCurrentUser(): Promise<CurrentUser> {
    try {
      const client = await this.getClient();
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw error;
      }
      const session = data.session;
      if (!session) {
        return this.demoUser();
      }

      let profile: { full_name: string; account_type: string } | null = null;
      try {
        const { data, error: profileError } = await client
          .from('profiles')
          .select('full_name, account_type')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profileError) {
          console.warn('Não foi possível carregar o perfil; usando os metadados da conta.', profileError.message);
        } else {
          profile = data;
        }
      } catch (error) {
        console.warn('Não foi possível consultar o perfil; usando os metadados da conta.', error);
      }

      const metadata = session.user.user_metadata ?? {};
      const fullName = String(profile?.full_name || metadata['full_name'] || session.user.email?.split('@')[0] || 'Usuário').trim();
      const accountType = profile?.account_type || metadata['account_type'];
      return this.toUser(
        session.user.id,
        session.user.email || '',
        fullName,
        accountType === 'administrador' ? 'Administrador' : 'Conta pessoal',
      );
    } catch (error) {
      console.warn('Autenticação indisponível; usando a conta demo local.', error);
      return this.demoUser();
    }
  }

  async hasSession(): Promise<boolean> {
    const client = await this.getClient();
    const { data, error } = await client.auth.getSession();
    if (error) {
      throw error;
    }
    return Boolean(data.session);
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await (await this.getClient()).auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  }

  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await (await this.getClient()).auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      throw error;
    }
  }

  async resetPassword(email: string, redirectTo: string): Promise<void> {
    const { error } = await (await this.getClient()).auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw error;
    }
  }

  async signUp(fullName: string, email: string, password: string, accountType: string, redirectTo: string): Promise<boolean> {
    const { data, error } = await (await this.getClient()).auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { full_name: fullName, account_type: accountType },
      },
    });
    if (error) {
      throw error;
    }
    if (!data.user?.identities?.length) {
      return false;
    }
    if (data.session) {
      await (await this.getClient()).auth.signOut();
    }
    return true;
  }

  async signOut(): Promise<void> {
    const client = await this.getClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
    localStorage.removeItem('moedax_demo_name');
    localStorage.removeItem('moedax_demo_email');
  }

  mapError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const text = message.toLowerCase();
    if (text.includes('database error saving new user') || text.includes('error saving new user')) {
      return 'O cadastro chegou ao Supabase, mas o perfil não pôde ser criado. Execute supabase/schema.sql no projeto.';
    }
    if (text.includes('row-level security') || text.includes('violates row-level security policy')) {
      return 'O cadastro foi bloqueado por uma política RLS. Confira o trigger handle_new_user no Supabase.';
    }
    if (text.includes('email rate limit exceeded')) {
      return 'O serviço de e-mail atingiu o limite temporário de envios. Aguarde alguns minutos e tente novamente.';
    }
    if (text.includes('failed to fetch') || text.includes('networkerror')) {
      return 'Não foi possível conectar. Confirme se o backend está rodando e se a configuração do Supabase está disponível.';
    }
    if (text.includes('signup is disabled')) {
      return 'O cadastro de novos usuários está desativado nas configurações do Supabase.';
    }
    if (text.includes('invalid login credentials')) {
      return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
    }
    if (text.includes('user already registered') || text.includes('email already registered') || text.includes('already exists')) {
      return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
    }
    if (text.includes('email not confirmed')) {
      return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    }
    if (text.includes('unable to validate email')) {
      return 'Informe um endereço de e-mail válido.';
    }
    return message || 'Ocorreu um erro. Tente novamente.';
  }

  private async createClient(): Promise<SupabaseClient> {
    const config = await this.loadConfig();
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  private async loadConfig(): Promise<SupabaseConfig> {
    const paths = ['/api/supabase-config', '../frontend/supabase-config.json', '/frontend/supabase-config.json'];
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          continue;
        }
        const config = (await response.json()) as Partial<SupabaseConfig>;
        if (config.url && config.anonKey) {
          return { url: config.url, anonKey: config.anonKey };
        }
      } catch {
        continue;
      }
    }
    throw new Error('Supabase não configurado. Inicie o backend e configure SUPABASE_URL/SUPABASE_ANON_KEY.');
  }

  private demoUser(): CurrentUser {
    const fullName = (localStorage.getItem('moedax_demo_name') || 'Usuário Demo').trim() || 'Usuário Demo';
    return this.toUser(
      'demo-user-1',
      localStorage.getItem('moedax_demo_email') || 'demo@moedax.test',
      fullName,
      'Conta pessoal',
    );
  }

  private toUser(id: string, email: string, fullName: string, accountLabel: string): CurrentUser {
    const parts = fullName.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0] || 'MX').slice(0, 2).toUpperCase();
    return { id, email, fullName, firstName: parts[0] || 'Usuário', initials, accountLabel };
  }
}
