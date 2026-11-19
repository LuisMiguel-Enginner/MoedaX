# MoedaX

Plataforma de comparação e monitoramento de moedas e criptomoedas.

## Estrutura

- `frontend/` — HTML, CSS e JavaScript (dashboard, login e cadastro).
- `backend/` — servidor Node.js que serve o frontend e expõe APIs auxiliares.
- `supabase/` — SQL para tabela de perfis vinculada ao Auth do Supabase.

## Executar localmente

1. Instale o Node.js 18 ou superior.
2. Na raiz do projeto: `npm install`
3. Copie `.env.example` para `.env` e preencha as credenciais do Supabase.
4. Execute `npm start`
5. Abra:
   - Login: `http://localhost:3000/login.html`
   - Cadastro: `http://localhost:3000/cadastro.html`
   - Dashboard (após login): `http://localhost:3000/`

## Aplicação Angular

A aplicação Angular inicial está em `frontend-angular/`, separada do site atual para
preservar o backend e as páginas ainda não migradas. Dashboard, login e cadastro
estão em Angular com NgModules, componentes `standalone: false` e Angular Material.
Login e cadastro reutilizam a logo, as imagens e o CSS original em `frontend/` para
manter a identidade visual anterior.
O roteamento também contém páginas iniciais para Mercado, Alertas e Histórico, que
continuam sendo telas demonstrativas. A aplicação usa as APIs e a configuração do
Supabase existentes, por meio do proxy de desenvolvimento Angular; o backend não foi
alterado. Foi criada sem SSR/SSG (`--ssr=false`).

Para executar a interface Angular e manter as APIs atuais disponíveis, abra dois
terminais na raiz do projeto:

1. Terminal 1: `npm start` (backend atual na porta 3000).
2. Terminal 2: `npm run start:angular` (Angular na porta 4200).
3. Abra `http://localhost:4200/`.

O login Angular fica em `/login` e o cadastro em `/cadastro`. O site legado continua
disponível em `http://localhost:3000/login.html`; nenhuma tela antiga foi removida.
Para compilar, execute `npm run build:angular` na raiz.

## Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
3. Cole no arquivo `.env` na raiz do projeto.
4. No **SQL Editor** do Supabase, execute o conteúdo de `supabase/schema.sql` (cria a tabela `profiles` e o trigger ao cadastrar usuário).
5. Em **Authentication → Providers**, mantenha **Email** habilitado.
   - Para desenvolvimento rápido, você pode desativar **Confirm email** em Authentication → Settings.
6. (Opcional) **Google**: habilite o provider Google e adicione `http://localhost:3000` em **Redirect URLs** (Authentication → URL Configuration).
7. Em **Authentication → URL Configuration → Redirect URLs**, adicione a URL correspondente ao modo usado:
   - Node: `http://localhost:3000/login.html`
   - XAMPP: `http://localhost/MoedaX/login.html`

### Campos no cadastro

O formulário envia para o Auth do Supabase:

- `full_name` e `account_type` (`investidor` ou `administrador`) em `user_metadata`
- O trigger `handle_new_user` grava esses dados em `public.profiles`

## Telas de autenticação

Login e cadastro seguem a identidade visual MoedaX (bege `#F7F0E8`, azul `#1B3A6B`, turquesa `#1AC0A3`, botões `#0E7C5A`):

- Recuperação de senha pelo link “Esqueceu sua senha?”
- Login com Google (requer provider configurado no Supabase)
- Após login bem-sucedido, redirecionamento para o dashboard (`index.html`)
