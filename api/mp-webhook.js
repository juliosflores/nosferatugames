// api/mp-webhook.js
// Webhook do Mercado Pago → notifica dono no WhatsApp via VPS
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, ignored: 'not post' });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const VPS_NOTIFY_URL = process.env.VPS_NOTIFY_URL;
  const VPS_NOTIFY_SECRET = process.env.VPS_NOTIFY_SECRET;

  if (!ACCESS_TOKEN || !VPS_NOTIFY_URL || !VPS_NOTIFY_SECRET) {
    console.error('[mp-webhook] Variáveis de ambiente ausentes');
    return res.status(200).json({ ok: false, error: 'config' });
  }

  try {
    const body = req.body;

    if (body?.type !== 'payment' && body?.topic !== 'payment') {
      return res.status(200).json({ ok: true, ignored: body?.type });
    }

    const paymentId = body?.data?.id || body?.id;
    if (!paymentId) {
      return res.status(200).json({ ok: true, ignored: 'no id' });
    }

    // Consultar detalhes do pagamento na API do MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    const payment = await mpRes.json();
    console.log('[mp-webhook] Payment status:', payment.status, 'ID:', paymentId);

    if (payment.status !== 'approved') {
      return res.status(200).json({ ok: true, ignored: `status:${payment.status}` });
    }

    const produto = payment.additional_info?.items?.[0]?.title
      || payment.metadata?.produto_nome
      || 'Produto';

    const valor = Number(payment.transaction_amount || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const comprador = payment.payer?.first_name
      || payment.payer?.email
      || 'Cliente';

    const mensagem = `🎮 *VENDA CONFIRMADA!*\n\n📦 *Produto:* ${produto}\n💰 *Valor:* ${valor}\n👤 *Comprador:* ${comprador}\n🆔 *ID MP:* ${paymentId}\n\n✅ Pagamento aprovado pelo site!`;

    // Chamar VPS ANTES de responder para garantir execução
    const vpsRes = await fetch(VPS_NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': VPS_NOTIFY_SECRET,
      },
      body: JSON.stringify({ mensagem }),
    });

    const vpsData = await vpsRes.json();
    console.log('[mp-webhook] VPS respondeu:', JSON.stringify(vpsData));

    return res.status(200).json({ ok: true, notificado: true });
  } catch (err) {
    console.error('[mp-webhook] Erro:', err.message);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
