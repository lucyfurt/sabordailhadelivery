# Deploy — Vercel + Supabase

Na Vercel o disco é **somente leitura**. Pedidos precisam do **Supabase** (não use `data/orders.json` em produção).

## 1. Supabase (5 min)

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. **SQL Editor** → cole e execute todo o arquivo `supabase/schema.sql`
3. **Project Settings → API** e copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`  
     ⚠️ Nunca exponha a service role no front-end.

## 2. GitHub

```bash
git add .
git commit -m "feat: cardápio Next.js com pedidos e dashboard admin"
git push origin main
```

## 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório `sabordailhadelivery`
3. **Environment Variables** (Production):

| Variável | Exemplo |
|----------|---------|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `5598992019061` |
| `ADMIN_PASSWORD` | senha forte (só admin) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |

4. **Deploy**

URLs úteis após o deploy:

- `https://seu-projeto.vercel.app` — site
- `https://seu-projeto.vercel.app/cardapio` — pedidos
- `https://seu-projeto.vercel.app/admin` — painel

## 4. Domínio próprio (opcional)

Vercel → **Settings → Domains** → adicione ex.: `pedidos.sabordailha.com.br`

## 5. Checklist pós-deploy

- [ ] Fazer um pedido teste em `/cardapio`
- [ ] Conferir pedido em `/admin`
- [ ] Testar botão WhatsApp
- [ ] Trocar `ADMIN_PASSWORD` (não deixar `admin123`)
- [ ] Divulgar link do cardápio no Instagram

## Deploy via CLI (alternativa)

```bash
npx vercel login
npx vercel link
npx vercel env add ADMIN_PASSWORD
npx vercel env add NEXT_PUBLIC_WHATSAPP_NUMBER
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel --prod
```
