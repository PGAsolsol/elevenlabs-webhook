import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false, // raw body je nutný pro ověření podpisu
  },
};

function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const SHARED_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!SHARED_SECRET) {
    console.error('❌ Chybí ELEVENLABS_WEBHOOK_SECRET v prostředí!');
    return res.status(500).send('Missing shared secret');
  }

  try {
    const rawBody = await buffer(req);

    const signatureHeader = req.headers['elevenlabs-signature'];
    if (!signatureHeader) {
      return res.status(400).send('Missing ElevenLabs-Signature header');
    }

    const [tPart, v1Part] = signatureHeader.split(',');
    const timestamp = tPart.split('=')[1];
    const signature = v1Part.split('=')[1];

    const payload = `${timestamp}.${rawBody.toString()}`;
    const expectedSignature = crypto
      .createHmac('sha256', SHARED_SECRET)
      .update(payload)
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );

    if (!valid) {
      return res.status(401).send('Invalid signature');
    }

    const data = JSON.parse(rawBody.toString());
    console.log('✅ Webhook ověřený. Data:', data);

    res.status(200).send('Webhook received and verified');
  } catch (error) {
    console.error('❌ Chyba při zpracování webhooku:', error);
    res.status(500).send('Internal Server Error');
  }
}
