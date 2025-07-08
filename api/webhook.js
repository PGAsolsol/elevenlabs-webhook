import crypto from 'crypto';

export default async function handler(req, res) {
  const secret = process.env.ELEVENLABS_HMAC_SECRET;
  const sigHeader = req.headers['x-elevenlabs-signature'];
  const rawBody = JSON.stringify(req.body);

  const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (sigHeader !== expectedSig) {
    return res.status(401).json({ message: 'Invalid HMAC signature' });
  }

  const payload = req.body;

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/calls`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      caller: payload.caller_id || 'unknown',
      transcript: payload.transcript || '',
      metadata: payload
    })
  });

  if (!response.ok) {
    return res.status(500).json({ message: 'Failed to save to Supabase' });
  }

  return res.status(200).json({ message: 'OK' });
}
