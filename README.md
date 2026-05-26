# Sabor da Ilha Delivery

Cardápio online em **Next.js** para clientes montarem a marmita (proteína + 4 acompanhamentos), sem login. Pagamento via **PIX no WhatsApp**. Painel admin com pedidos e relatórios.

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

- Site: http://localhost:3000  
- Cardápio: http://localhost:3000/cardapio  
- Admin: http://localhost:3000/admin (senha em `ADMIN_PASSWORD`, padrão `admin123`)

Sem Supabase configurado, os pedidos são salvos em `data/orders.json` (ideal para testes).

## Supabase (produção)

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o SQL em `supabase/schema.sql`
3. Preencha no `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Fluxo do cliente

1. Monta pedido em `/cardapio`
2. Recebe número `#AAMMDD-NNNN`
3. Abre WhatsApp com mensagem pronta para pagar PIX
4. Consulta status em `/pedido/[numero]`

## Admin

- Lista pedidos do dia, altera status (aguardando pagamento → pago → preparo → pronto → entregue)
- Relatórios: caixa diário, acompanhamentos, proteínas, fluxo por hora
- Link WhatsApp por pedido (com telefone do cliente)

## Deploy (produção)

**Obrigatório:** [Vercel](https://vercel.com) + [Supabase](https://supabase.com) — na Vercel o armazenamento em arquivo não funciona.

Guia passo a passo: **[DEPLOY.md](./DEPLOY.md)**

```bash
npm run build
git push origin main
# Importe o repo na Vercel e configure as variáveis de ambiente
```

## Personalizar cardápio

Edite `src/lib/menu.ts` (marmitas, proteínas, acompanhamentos e preços).
