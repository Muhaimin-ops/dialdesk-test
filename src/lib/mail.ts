/** Booking confirmation via Resend's HTTP API. Silently skipped when not configured. */
export async function sendBookingEmail(opts: { to: string; businessName: string; when: string; name: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: `Your appointment with ${opts.businessName}`,
        html: `<p>Hi ${esc(opts.name)},</p><p>Your appointment with <b>${esc(opts.businessName)}</b> is confirmed for <b>${esc(opts.when)}</b>.</p><p>Need to change it? Just call us back.</p>`,
      }),
    });
    if (!res.ok) console.error('Resend error', res.status);
  } catch (e) {
    console.error('Resend request failed', e);
  }
}
