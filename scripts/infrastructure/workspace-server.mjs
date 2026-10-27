import { createServer as httpServer } from 'node:http';
import { createServer as httpsServer } from 'node:https';

const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const fields = (value, required, optional = []) =>
  object(value) &&
  required.every((key) => Object.hasOwn(value, key)) &&
  Object.keys(value).every((key) => [...required, ...optional].includes(key));
const identifier = (value) => /^[a-z][a-z0-9-]{0,63}$/.test(value);

/** Authenticated API; network exposure is an explicit TLS deployment decision.
 * Bearer tokens are never accepted in URLs, cookies or request bodies. */
export function createWorkspaceServer(
  workspace,
  {
    allowedOrigins = ['http://127.0.0.1:4175', 'http://127.0.0.1:4176'],
    allowedHosts = [],
    tls,
    maintenance = null,
    clock = () => Date.now(),
    maximumRequestsPerMinute = 240,
  } = {},
) {
  if (
    !Array.isArray(allowedOrigins) ||
    allowedOrigins.some((origin) => {
      try {
        const url = new URL(origin);
        return url.origin !== origin || !['https:', 'http:'].includes(url.protocol);
      } catch {
        return true;
      }
    }) ||
    !Array.isArray(allowedHosts) ||
    allowedHosts.some((host) => typeof host !== 'string' || !/^[a-zA-Z0-9.:[\]-]+$/.test(host))
  )
    throw new Error('Use exact allowed hosts and origins.');
  if (
    !Number.isSafeInteger(maximumRequestsPerMinute) ||
    maximumRequestsPerMinute < 1 ||
    maximumRequestsPerMinute > 10000
  )
    throw new Error('Invalid request budget.');
  const origins = new Set(allowedOrigins),
    hosts = new Set(allowedHosts),
    budgets = new Map();
  const consume = (key) => {
    const now = clock();
    const bucket = budgets.get(key);
    if (bucket && now - bucket.startedAt < 60000) {
      bucket.used++;
      return bucket.used <= maximumRequestsPerMinute;
    }
    if (budgets.size >= 1000) budgets.delete(budgets.keys().next().value);
    budgets.set(key, { startedAt: now, used: 1 });
    return true;
  };
  const handler = async (request, response) => {
    const send = (status, value) => {
      response.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        ...(tls ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
      });
      response.end(JSON.stringify(value));
    };
    const port = server.address()?.port;
    const acceptedHosts = hosts.size ? hosts : new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!acceptedHosts.has(request.headers.host))
      return send(403, { error: 'Unrecognized service host.' });
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) return send(403, { error: 'Origin is not allowed.' });
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      if (!origin) return send(403, { error: 'An allowed origin is required.' });
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, X-Aegis-Client',
      );
      response.writeHead(204);
      response.end();
      return;
    }
    if (!consume(`ip:${request.socket.remoteAddress ?? 'unknown'}`)) {
      response.setHeader('Retry-After', '60');
      return send(429, { error: 'Request budget exceeded. Retry later.' });
    }
    try {
      if (!request.url?.startsWith('/') || request.url.startsWith('//'))
        return send(400, { error: 'Expected an origin-form path.' });
      const url = new URL(request.url, 'http://local');
      if (url.search || url.hash || /%/.test(url.pathname))
        return send(400, { error: 'Queries and encoded paths are not supported.' });
      if (request.method === 'GET' && url.pathname === '/healthz')
        return send(200, { schemaVersion: 1, status: 'ready' });
      const header = request.headers.authorization;
      if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9_-]{32,256}$/.test(header))
        return send(401, { error: 'A valid bearer token is required.' });
      const actor = workspace.catalog.authenticate(header.slice(7));
      if (!actor) return send(401, { error: 'A valid bearer token is required.' });
      const prefix = '/api/aegis-workspace';
      const parts = url.pathname.startsWith(prefix + '/')
        ? url.pathname.slice(prefix.length + 1).split('/')
        : [];
      const projectId =
        parts[0] === 'projects' && parts[1] && identifier(parts[1]) ? parts[1] : null;
      if (parts[0] === 'projects' && parts[1] && !projectId)
        return send(400, { error: 'Invalid project identifier.' });
      let body;
      if (request.method === 'POST') {
        if (!['console', 'sdk'].includes(request.headers['x-aegis-client']))
          return send(403, { error: 'An explicit Aegis client marker is required.' });
        if (
          request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !==
          'application/json'
        )
          return send(415, { error: 'Expected application/json.' });
        let bytes = 0;
        const chunks = [];
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > 65536) return send(413, { error: 'Request body exceeds the limit.' });
          chunks.push(chunk);
        }
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          return send(400, { error: 'Malformed JSON.' });
        }
      }
      // Authorize before reading project data. Unknown/missing projects share the
      // same permission response to prevent cross-project enumeration.
      if (request.method === 'GET') {
        if (parts.length === 1 && parts[0] === 'projects')
          return send(200, {
            schemaVersion: 1,
            actor: { label: actor.label, role: actor.role },
            projects: workspace.catalog.listProjects(actor),
          });
        if (parts.length === 1 && parts[0] === 'kits')
          return send(200, { schemaVersion: 1, kits: await workspace.listKits(actor) });
        if (parts.length === 1 && parts[0] === 'audit')
          return send(200, { schemaVersion: 1, events: workspace.catalog.audit(actor) });
        if (parts.length === 1 && parts[0] === 'maintenance') {
          workspace.catalog.authorize(actor, 'tokens');
          return send(200, { schemaVersion: 1, loop: maintenance?.status() ?? null });
        }
        if (projectId && parts.length === 3 && parts[2] === 'status')
          return send(200, await workspace.status(projectId, actor));
        if (projectId && parts.length === 3 && parts[2] === 'configurability')
          return send(200, await workspace.inventory(projectId, actor));
        if (projectId && parts.length === 3 && parts[2] === 'generations')
          return send(200, {
            schemaVersion: 1,
            generations: workspace.catalog.generations(projectId, actor),
          });
        if (projectId && parts.length === 3 && parts[2] === 'audit')
          return send(200, {
            schemaVersion: 1,
            events: workspace.catalog.audit(actor, { projectId }),
          });
      }
      if (request.method === 'POST') {
        if (
          parts.length === 1 &&
          parts[0] === 'projects' &&
          fields(body, ['id', 'name', 'kitDigest', 'profile'])
        )
          return send(201, await workspace.createProject(body, actor));
        if (
          parts.length === 1 &&
          parts[0] === 'maintenance' &&
          fields(body, ['action']) &&
          body.action === 'resume'
        ) {
          workspace.catalog.authorize(actor, 'tokens');
          if (!maintenance) return send(409, { error: 'No maintenance loop is running.' });
          maintenance.resume();
          return send(200, { schemaVersion: 1, loop: maintenance.status() });
        }
        if (projectId && parts.length === 3) {
          if (
            parts[2] === 'plan' &&
            fields(body, [], ['useAI']) &&
            (body.useAI === undefined || typeof body.useAI === 'boolean')
          )
            return send(200, await workspace.execute(projectId, 'plan', body, actor));
          if (parts[2] === 'reconcile' && fields(body, []))
            return send(200, await workspace.execute(projectId, 'reconcile', body, actor));
          if (parts[2] === 'retention' && fields(body, []))
            return send(200, await workspace.execute(projectId, 'retention', body, actor));
          if (
            parts[2] === 'usage' &&
            fields(body, ['events', 'batchId']) &&
            Array.isArray(body.events)
          )
            return send(200, await workspace.execute(projectId, 'usage', body, actor));
          if (
            parts[2] === 'telemetry' &&
            fields(body, ['enabled']) &&
            typeof body.enabled === 'boolean'
          )
            return send(200, await workspace.execute(projectId, 'telemetry', body, actor));
          if (parts[2] === 'updates' && fields(body, ['expectedRevision', 'kitDigest', 'profile']))
            return send(200, await workspace.prepareUpdate(projectId, body, actor));
          if (parts[2] === 'rollback' && fields(body, ['generationId', 'expectedRevision']))
            return send(200, await workspace.prepareRollback(projectId, body, actor));
          if (
            parts[2] === 'activate' &&
            fields(body, ['planId', 'planDigest', 'expectedRevision', 'reason'])
          )
            return send(200, await workspace.activate(projectId, body, actor));
        }
      }
      return send(400, { error: 'Unsupported endpoint, method or request fields.' });
    } catch (error) {
      if (
        ['forbidden', 'unauthenticated', 'not-found'].includes(error?.code) ||
        /authoriz|permission|access denied|scope|actor|token|not found/i.test(error?.message ?? '')
      )
        return send(403, { error: 'This credential cannot perform that action.' });
      // Do not send filesystem paths, provider details or SQLite diagnostics.
      return send(409, {
        error:
          'The operation could not be completed. Refresh the project and review its inputs or local service diagnostics.',
      });
    }
  };
  const server = tls ? httpsServer(tls, handler) : httpServer(handler);
  server.requestTimeout = 35000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
