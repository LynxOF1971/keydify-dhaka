// Cloudflare Pages advanced-mode worker. GitHub Pages remains a static mirror.
const origins = new Set(['https://keydify.com', 'https://www.keydify.com', 'https://lynxof1971.github.io']);
const kinds = new Set(['visits', 'whatsapp', 'messenger']);
function headers(origin) {
  return { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', ...(origins.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } : {}) };
}
async function totals(db) {
  const { results } = await db.prepare('SELECT kind, total FROM counters').all();
  return Object.assign({ visits: 0, whatsapp: 0, messenger: 0 }, Object.fromEntries(results.map(row => [row.kind, row.total])));
}
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/stats') return env.ASSETS.fetch(request);
    const origin = request.headers.get('Origin') || '';
    const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: headers(origin) });
    if (origin && !origins.has(origin)) return json({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
    if (!env.KEYDIFY_STATS) return json({ error: 'Counters not connected yet' }, 503);
    try {
      if (request.method === 'POST') {
        if (!origins.has(origin) || !request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Invalid request' }, 403);
        const text = await request.text();
        if (text.length > 160) return json({ error: 'Request too large' }, 413);
        let event; try { event = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
        if (!event || !kinds.has(event.kind) || !/^[a-f0-9-]{36}$/i.test(event.id || '') || Object.keys(event).some(key => !['id','kind'].includes(key))) return json({ error: 'Invalid event' }, 400);
        // An insertion trigger increments totals atomically; retries reuse the ID.
        await env.KEYDIFY_STATS.prepare('INSERT OR IGNORE INTO events (id, kind) VALUES (?, ?)').bind(event.id, event.kind).run();
      }
      return json(await totals(env.KEYDIFY_STATS));
    } catch { return json({ error: 'Counters temporarily unavailable' }, 503); }
  }
};
