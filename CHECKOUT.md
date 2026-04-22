# 💳 Checkout Mercado Pago — Nosferatu Games

## Como funciona

Quando o cliente clica em **"Comprar"** num produto:
1. O site chama `/api/create-preference` (função serverless na Vercel)
2. A função cria uma preferência de pagamento no Mercado Pago
3. O cliente é redirecionado para o checkout do MP (cartão, PIX, boleto)
4. Após pagar, volta para o site com uma notificação de sucesso/erro

---

## Configuração (5 minutos)

### 1. Criar conta no Mercado Pago
- Acesse [mercadopago.com.br](https://mercadopago.com.br) e crie conta de vendedor
- Vá em **Seu negócio → Credenciais**
- Copie o **Access Token** de produção (começa com `APP_USR-...`)

### 2. Adicionar variável de ambiente na Vercel
No painel da Vercel, vá em:
**Settings → Environment Variables** e adicione:

| Nome              | Valor                        |
|-------------------|------------------------------|
| `MP_ACCESS_TOKEN` | `APP_USR-XXXXXXXX...` (seu token de produção) |
| `SITE_URL`        | `https://nosferatugames.com.br` |

> ⚠️ Nunca coloque o Access Token direto no código HTML — ele dá acesso total à sua conta MP.

### 3. Fazer deploy na Vercel
```
vercel deploy --prod
```
Ou faça push no GitHub que a Vercel atualiza automaticamente.

---

## Testar antes de ir para produção

Use as **credenciais de teste** do MP (Sandbox):
- Em Credenciais, copie o **Access Token de teste** (começa com `TEST-...`)
- Use esse token na variável `MP_ACCESS_TOKEN` para testar
- O checkout abrirá em modo sandbox (pagamentos simulados)

Cartão de teste MP: `5031 7557 3453 0604` | CVV: `123` | Venc: qualquer data futura

---

## Estrutura de arquivos

```
nosferatu-games/
├── index.html              ← Site principal (com botão Comprar)
├── api/
│   └── create-preference.js ← Função serverless (Mercado Pago)
├── vercel.json             ← Configuração da Vercel
├── logo.png
└── banner.png
```

---

## Fluxo de pagamento

```
Cliente clica "Comprar"
        ↓
POST /api/create-preference
  { nome, preco, descricao, imagem }
        ↓
Mercado Pago API
  POST /checkout/preferences
        ↓
Retorna init_point (URL de checkout)
        ↓
Redireciona cliente → checkout MP
        ↓
Cliente paga (PIX / Cartão / Boleto)
        ↓
MP redireciona para:
  ✔ ?pagamento=sucesso  → toast verde
  ⏳ ?pagamento=pendente → toast amarelo
  ✕ ?pagamento=erro     → toast vermelho
```

---

## Dúvidas frequentes

**O botão não aparece em alguns produtos?**
Produtos sem preço cadastrado no Supabase não mostram o botão de compra (só WhatsApp).

**Como recebo o dinheiro?**
Direto na sua conta Mercado Pago, conforme as regras de liberação do MP.

**Posso usar PIX?**
Sim! O checkout do MP oferece PIX, cartão de crédito/débito e boleto automaticamente.

**E se der erro na API?**
O site mostra uma mensagem de erro e o cliente pode usar o WhatsApp como fallback.
