import crypto from 'crypto';

export default async function handler(req, res) {
  // Získání tajného klíče z prostředí
  const secret = process.env.ELEVENLABS_HMAC_SECRET;

  // Kontrola, zda klíč existuje
  if (!secret) {
    console.error('❌ Missing HMAC secret: process.env.ELEVENLABS_HMAC_SECRET is undefined');
    return res.status(500).json({ error: 'Missing HMAC secret' });
  }

  // Získání podpisu z hlavičky
  const signature = req.headers['x-elevenlabs-signature'];

  if (!signature) {
    return res.status(400).json({ error: 'Missing HMAC signature header' });
  }

  // Získání raw těla
  const rawBody = JSON.stringify(req.body);

  // Výpočet očekávaného podpisu
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Porovnání podpisů
  if (signature !== expectedSignature) {
    console.warn('⚠️ Invalid HMAC signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // ✅ Validní požadavek – zpracování payloadu
  console.log('✅ Webhook verified. Data:', req.body);

  return res.status(200).json({ message: 'Webhook received' });
}