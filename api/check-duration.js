import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ELEVENLABS_API_TOKEN = process.env.ELEVENLABS_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Získáme všechny aktivní hovory
  const { data: rows, error } = await supabase
    .from('conversation_times')
    .select('conversation_id, start_time');

  if (error) {
    return res.status(500).json({ error: 'Supabase read error', detail: error });
  }

  const now = new Date();

  for (const row of rows) {
    const elapsedSeconds = Math.floor((now - new Date(row.start_time)) / 1000);

    if (elapsedSeconds >= 180 && elapsedSeconds < 190) {
      // 2. Posíláme system message do ElevenLabs
      await fetch(`https://api.elevenlabs.io/v1/conversations/${row.conversation_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ELEVENLABS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'system',
          content: `Hovor trvá ${elapsedSeconds} sekund.`,
        }),
      });
    }
  }

  return res.status(200).json({ status: 'done' });
}
