# MoedaX Angular

Frontend Angular do MoedaX, criado com Angular CLI 22.3.0. O dashboard, login e
cadastro foram migrados para Angular; as telas de Mercado, Alertas e Histórico
continuam sendo telas iniciais. A autenticação usa Supabase e os endpoints atuais
do backend, sem alteração do servidor.

## Executar

Na raiz do repositório, inicie o backend em um terminal:

```text
npm start
```

Em outro terminal, inicie o Angular:

```text
npm run start:angular
```

Abra `http://localhost:4200/`. O proxy em `proxy.conf.json` encaminha `/api` para
o backend em `http://localhost:3000`.

## Validar

```text
npm run build
npm test -- --watch=false
```
