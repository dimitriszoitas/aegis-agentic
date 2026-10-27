import { createServer } from 'node:http';

const allowedKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
export function createInfrastructureServer(service, { port = 4177, allowedOrigins = ['http://127.0.0.1:4175', 'http://127.0.0.1:4176', 'http://127.0.0.1:5173', 'http://localhost:4175', 'http://localhost:5173'] } = {}) {
  const origins = new Set(allowedOrigins);
  const server = createServer(async (request, response) => {
    const send = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)); };
    const boundPort = server.address()?.port ?? port;
    if (![ `127.0.0.1:${boundPort}`, `localhost:${boundPort}` ].includes(request.headers.host)) return send(403, { error: 'Unrecognized local service host.' });
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) return send(403, { error: 'Origin is not allowed.' });
    if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin'); }
    if (request.method === 'OPTIONS') {
      if (!origin) return send(403, { error: 'An allowed origin is required.' });
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aegis-Client');
      response.writeHead(204); response.end(); return;
    }
    try {
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) return send(400, { error: 'Expected a local origin-form path.' });
      let path;
      try { path = new URL(request.url, 'http://127.0.0.1').pathname; } catch { return send(400, { error: 'Invalid request path.' }); }
      if (request.method === 'GET' && path === '/api/aegis/status') return send(200, await service.status());
      if (request.method === 'GET' && path === '/api/aegis/configurability') return send(200, await service.inventory());
      if (request.method !== 'POST') return send(404, { error: 'Unknown infrastructure endpoint.' });
      if (request.headers['x-aegis-client'] !== 'console' && request.headers['x-aegis-client'] !== 'sdk') return send(403, { error: 'Explicit Aegis client header required.' });
      if (request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') return send(415, { error: 'Expected application/json.' });
      let raw = ''; let bytes = 0;
      for await (const chunk of request) { bytes += chunk.length; if (bytes > 65536) { send(413, { error: 'Request body is too large.' }); return; } raw += chunk; }
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'Invalid JSON request.' }); }
      if (path === '/api/aegis/plan' && allowedKeys(body, ['useAI']) && (body.useAI === undefined || typeof body.useAI === 'boolean')) return send(200, await service.plan(body));
      if (path === '/api/aegis/reconcile' && allowedKeys(body, []) ) return send(200, await service.reconcile());
      if (path === '/api/aegis/usage/settings' && allowedKeys(body, ['enabled']) && typeof body.enabled === 'boolean') return send(200, await service.setTelemetry(body.enabled));
      if (path === '/api/aegis/usage' && allowedKeys(body, ['events', 'batchId']) && Array.isArray(body.events)) return send(200, await service.ingest(body.events, body.batchId));
      return send(400, { error: 'Unknown endpoint or unsupported request fields.' });
    } catch (error) { send(409, { error: error instanceof Error ? error.message : 'Infrastructure operation failed.' }); }
  });
  server.requestTimeout = 35000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
