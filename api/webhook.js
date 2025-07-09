import { createHmac, timingSafeEqual } from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';

const SHARED_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET!;

export const config = {
  api: {
    bodyParser: false, // Required to access raw body
  },
};

function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const rawBody = await buffer(req);
    const signatureHeader = req.headers['elevenlabs-signature'] as string;

    if (!signatureHeader) {
      return res.status(400).send('Missing ElevenLabs-Signature header');
    }

    // Extract timestamp and v1 signature
    const [timestampPart, v1Part] = signatureHeader.split(',');
    const timestamp = timestampPart.split('=')[1];
    const signature = v1Part.split('=')[1];

    // Construct the payload string for signing
    const payloadToSign = `${timestamp}.${rawBody.toString()}`;

    const hmac = createHmac('sha256', SHARED_SECRET);
    const expectedSignature = hmac.update(payloadToSign).digest('hex');

    const isValid = timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );

    if (!isValid) {
      return res.status(401).send('Invalid signature');
    }

    // Continue processing the event
    const eventData = JSON.parse(rawBody.toString());
    console.log('✅ Verified Event:', eventData);

    res.status(200).send('Webhook received');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Server error');
  }
}
