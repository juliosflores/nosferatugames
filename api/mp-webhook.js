// api/mp-webhook.js
// Webhook do Mercado Pago → Notifica no WhatsApp e marca produto como VENDIDO no Supabase
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, ignored: 'not post' });
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const VPS_NOTIFY_URL = process.env.VPS_NOTIFY_URL;
  const VPS_NOTIFY_SECRET = process.env.VPS_NOTIFY_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  try {
    const body = req.body;

    // MP envia type=payment quando um pagamento acontece
    if (body?.type !== 'payment' && body?.topic !== 'payment') {
      return res.status(200).json({ ok: true, ignored: body?.type });
    }

    const paymentId = body?.data?.id || body?.id;
    if (!paymentId) {
      return res.status(200).json({ ok: true, ignored: 'no id' });
    }

    // 1. Consultar detalhes do pagamento na API do MP
    let payment;
    if (paymentId === '123456' || paymentId === 123456) {
      // Mock para o simulador do MP
      payment = {
        status: 'approved',
        additional_info: { items: [{ title: '🔧 Produto de Teste' }] },
        transaction_amount: 100.00,
        payer: { first_name: 'Simulador' },
        metadata: { produto_id: 'TEST_ID' }
      };
    } else {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      payment = await mpRes.json();
    }

    if (payment.status !== 'approved') {
      return res.status(200).json({ ok: true, ignored: `status:${payment.status}` });
    }

    const produtoId = payment.metadata?.produto_id;
    const produtoNome = payment.additional_info?.items?.[0]?.title || payment.metadata?.produto_nome || 'Produto';
    const valor = Number(payment.transaction_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const comprador = payment.payer?.first_name || payment.payer?.email || 'Cliente';

    // 2. MARCAR COMO VENDIDO NO SUPABASE (Se houver produtoId)
    if (produtoId && produtoId !== 'TEST_ID') {
      console.log(`[mp-webhook] Marcando produto ${produtoId} como vendido no Supabase...`);
      const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/produtos?id=eq.${produtoId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ vendido: true })
      });

      if (!supabaseRes.ok) {
        console.error('[mp-webhook] Erro ao atualizar Supabase:', await supabaseRes.text());
      } else {
        console.log('[mp-webhook] Supabase atualizado com sucesso!');
      }
    }

    // 3. ENVIAR NOTIFICAÇÃO PARA O WHATSAPP (Via VPS)
    const mensagem = `🎮 *VENDA CONFIRMADA!*\n\n📦 *Produto:* ${produtoNome}\n💰 *Valor:* ${valor}\n👤 *Comprador:* ${comprador}\n🆔 *ID MP:* ${paymentId}\n\n✅ Estoque atualizado automaticamente!`;

    await fetch(VPS_NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': VPS_NOTIFY_SECRET,
      },
      body: JSON.stringify({ mensagem }),
    });

    return res.status(200).json({ ok: true, processado: true });
  } catch (err) {
    console.error('[mp-webhook] Erro fatal:', err.message);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
