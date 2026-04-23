// api/mp-webhook.js
// Webhook do Mercado Pago → notifica dono no WhatsApp via VPS
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Responde imediatamente 200 para o MP não ficar tentando de novo
  res.status(200).json({ ok: true });

  // Ignora tudo que não for POST
  if (req.method !== 'POST') return;

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const VPS_NOTIFY_URL = process.env.VPS_NOTIFY_URL;
  const VPS_NOTIFY_SECRET = process.env.VPS_NOTIFY_SECRET;

  // Se as variáveis não estiverem configuradas, loga e sai
  if (!ACCESS_TOKEN || !VPS_NOTIFY_URL || !VPS_NOTIFY_SECRET) {
    console.error('[mp-webhook] Variáveis de ambiente ausentes:', {
      hasToken: !!ACCESS_TOKEN,
      hasUrl: !!VPS_NOTIFY_URL,
      hasSecret: !!VPS_NOTIFY_SECRET,
    });
    return;
  }

  try {
    const body = req.body;

    // MP envia type=payment quando um pagamento acontece
    if (body?.type !== 'payment' && body?.topic !== 'payment') {
      console.log('[mp-webhook] Evento ignorado:', body?.type);
      return;
    }

    const paymentId = body?.data?.id || body?.id;
    if (!paymentId) {
      console.log('[mp-webhook] Sem ID de pagamento');
      return;
    }

    // Consultar detalhes do pagamento na API do MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    const payment = await mpRes.json();

    // Só notificar se pagamento foi aprovado
    if (payment.status !== 'approved') {
      console.log('[mp-webhook] Pagamento não aprovado:', payment.status);
      return;
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

    // Chamar VPS para disparar o WhatsApp
    await fetch(VPS_NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': VPS_NOTIFY_SECRET,
      },
      body: JSON.stringify({ mensagem }),
    });

    console.log('[mp-webhook] Notificação enviada com sucesso para pagamento', paymentId);
  } catch (err) {
    console.error('[mp-webhook] Erro ao processar notificação:', err.message);
  }
}
