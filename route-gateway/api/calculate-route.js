const UPSTREAM = 'https://73ee0db2-d333-4cc6-9729-ca6149cffff7.created.app/api/calculate-route';
const ALLOWED_ORIGIN = 'https://nomade-22.github.io';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  setCors(res);
  const requestOrigin = String(req.headers.origin || '');

  if (req.method === 'OPTIONS') {
    if (requestOrigin !== ALLOWED_ORIGIN) return res.status(403).end();
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (requestOrigin !== ALLOWED_ORIGIN) return res.status(403).json({ error: 'Origem não autorizada' });

  const origin = String(req.body?.origin || '').trim();
  const destination = String(req.body?.destination || '').trim();
  if (!origin || !destination) return res.status(400).json({ error: 'Origem e destino são obrigatórios' });
  if (origin.length > 200 || destination.length > 200) return res.status(400).json({ error: 'Origem ou destino excede o tamanho permitido' });

  try {
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ origin, destination }),
    });
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = { error: upstream.ok ? 'Resposta inválida do serviço de rotas' : 'Falha no serviço de rotas' }; }
    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error('Route gateway error:', error);
    return res.status(502).json({ error: 'Não foi possível conectar ao serviço de rotas' });
  }
}
