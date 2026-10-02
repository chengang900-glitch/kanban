/** Loopback-only OIDC/proxy fixture. This is NOT Keycloak or LibreChat authentication. */
import http from 'node:http';
import { generateKeyPairSync, randomBytes, createHash, sign } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, createWriteStream } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'target/keycloak-portal-local');
mkdirSync(output, { recursive: true });
const databaseFolder = mkdtempSync(path.join(output, 'run-'));
const portal = 'http://127.0.0.1:33419';
const issuer = 'http://127.0.0.1:33421/realms/isolated';
const callback = `${portal}/metabase/auth/keycloak/callback`;
const secret = randomBytes(32).toString('hex');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'isolated-rsa', use: 'sig', alg: 'RS256' };
const codes = new Map();
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload) => {
  const data = `${b64({ alg: 'RS256', kid: jwk.kid })}.${b64(payload)}`;
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')}`;
};
const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
const body = async (req) => { let value = ''; for await (const part of req) { value += part; if (value.length > 32768) throw new Error('fixture body too large'); } return value; };
const claims = (subject) => ({ iss: issuer, aud: 'oss-metabase-isolated', sub: subject, sid: `sid-${subject}`, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 900 });
const identity = (req) => /fixture.portal-user=user-b/.test(req.headers.cookie ?? '') ? 'user-b' : 'user-a';
const revoke = async (subject) => {
  const payload = { ...claims(subject), jti: randomBytes(16).toString('hex'), events: { 'http://schemas.openid.net/event/backchannel-logout': {} } };
  const response = await fetch(`${portal}/metabase/auth/keycloak/backchannel-logout`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ logout_token: jwt(payload) }) });
  return response.status;
};

const idp = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, issuer);
    if (url.pathname.endsWith('/.well-known/openid-configuration')) return json(res, 200, { issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/certs`, end_session_endpoint: `${issuer}/logout` });
    if (url.pathname.endsWith('/certs')) return json(res, 200, { keys: [jwk] });
    if (url.pathname.endsWith('/authorize')) {
      const p = url.searchParams;
      if (p.get('client_id') !== 'oss-metabase-isolated' || p.get('redirect_uri') !== callback || p.get('code_challenge_method') !== 'S256') return json(res, 400, { error: 'invalid_request' });
      const subject = p.get('fixture_subject');
      if (['user-a', 'user-b', 'unbound'].includes(subject)) {
        const code = randomBytes(24).toString('hex');
        codes.set(code, { subject, nonce: p.get('nonce'), challenge: p.get('code_challenge') });
        res.writeHead(302, { Location: `${callback}?${new URLSearchParams({ state: p.get('state'), code })}` }); return res.end();
      }
      const links = ['user-a', 'user-b', 'unbound'].map((user) => { const query = new URLSearchParams(p); query.set('fixture_subject', user); return `<p><a href="?${query}">${user}</a></p>`; }).join('');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "frame-ancestors 'none'" }); return res.end(`<h1>Loopback OIDC fixture</h1><p>Not a real Keycloak login.</p>${links}`);
    }
    if (url.pathname.endsWith('/token') && req.method === 'POST') {
      const p = new URLSearchParams(await body(req)); const code = p.get('code'); const entry = codes.get(code); codes.delete(code);
      if (!entry || p.get('client_secret') !== secret || p.get('client_id') !== 'oss-metabase-isolated' || p.get('redirect_uri') !== callback || createHash('sha256').update(p.get('code_verifier') ?? '').digest('base64url') !== entry.challenge) return json(res, 400, { error: 'invalid_grant' });
      return json(res, 200, { id_token: jwt({ ...claims(entry.subject), nonce: entry.nonce }) });
    }
    if (url.pathname.endsWith('/logout')) { await Promise.all(['user-a', 'user-b'].map(revoke)); res.writeHead(302, { Location: `${portal}/portal/data` }); return res.end(); }
    json(res, 404, {});
  } catch { json(res, 500, { error: 'fixture failure' }); }
});

const gateway = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, portal);
    if (url.pathname === '/api/portal/data-identity') return json(res, 200, { issuer, subject: identity(req) });
    if (url.pathname.startsWith('/fixture/switch/')) { const user = url.pathname.endsWith('user-b') ? 'user-b' : 'user-a'; res.writeHead(302, { 'Set-Cookie': `fixture.portal-user=${user}; Path=/; SameSite=Lax`, Location: '/portal/data' }); return res.end(); }
    if (url.pathname === '/fixture/revoke') return json(res, 200, { status: await revoke(identity(req)) });
    if (url.pathname.startsWith('/metabase/')) {
      const headers = { ...req.headers, host: '127.0.0.1:33420', 'x-forwarded-host': '127.0.0.1:33419', 'x-forwarded-proto': 'http' };
      const proxy = http.request({ hostname: '127.0.0.1', port: 33420, path: req.url.slice('/metabase'.length), method: req.method, headers }, (upstream) => {
        const out = { ...upstream.headers };
        if (out.location?.startsWith('/')) out.location = `/metabase${out.location}`;
        res.writeHead(upstream.statusCode, out); upstream.pipe(res);
      });
      proxy.on('error', () => json(res, 502, { error: 'Metabase not ready' })); return req.pipe(proxy);
    }
    const folder = process.env.FIXTURE_PORTAL_DIST;
    if (folder) {
      const relative = url.pathname.startsWith('/assets/') ? url.pathname.slice(1) : 'index.html';
      const file = path.resolve(folder, relative);
      if (!file.startsWith(path.resolve(folder) + path.sep)) return json(res, 400, {});
      res.writeHead(200, { 'content-type': relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); return res.end(readFileSync(file));
    }
    res.writeHead(200, { 'content-type': 'text/html' }); res.end('<h1>Isolated fixture</h1><a href="/metabase/auth/keycloak/login">Personal login</a><iframe title="Native Metabase" src="/metabase/" width="100%" height="850"></iframe>');
  } catch { json(res, 500, { error: 'fixture failure' }); }
});

await new Promise((resolve) => idp.listen(33421, '127.0.0.1', resolve));
await new Promise((resolve) => gateway.listen(33419, '127.0.0.1', resolve));
const env = { ...process.env };
for (const key of ['MB_DB_CONNECTION_URI', 'MB_DB_CONNECTION_URL', 'MB_DB_HOST', 'MB_DB_USER', 'MB_DB_PASS', 'MB_DB_PORT', 'MB_DB_DBNAME']) delete env[key];
Object.assign(env, { MB_JETTY_HOST: '127.0.0.1', MB_JETTY_PORT: '33420', MB_DB_TYPE: 'h2', MB_DB_IN_MEMORY: 'false', MB_DB_FILE: path.join(databaseFolder, 'application-db'), MB_SITE_URL: `${portal}/metabase`, MB_OSS_KEYCLOAK_ENABLED: 'true', MB_OSS_KEYCLOAK_ISSUER: issuer, MB_OSS_KEYCLOAK_CLIENT_ID: 'oss-metabase-isolated', MB_OSS_KEYCLOAK_CLIENT_SECRET: secret, MB_ENCRYPTION_SECRET_KEY: randomBytes(32).toString('base64'), MB_OSS_WORKSPACE_EMBEDDING_ENABLED: 'true', MB_OIDC_ALLOWED_NETWORKS: 'allow-all', MB_CHECK_FOR_UPDATES: 'false', MB_ANON_TRACKING_ENABLED: 'false' });
const java = path.join(process.env.JAVA_HOME ?? '', 'bin/java');
const log = createWriteStream(path.join(output, 'metabase.log'));
const child = spawn(java, ['-Xmx3g', '-jar', process.env.METABASE_FIXTURE_JAR ?? 'target/uberjar/metabase.jar'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log); child.stderr.pipe(log);
child.on('exit', (code) => { console.log(`Fixture Metabase stopped (${code})`); idp.close(); gateway.close(); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill('SIGTERM'); idp.close(); gateway.close(); });
console.log('Loopback fixture gateway: http://127.0.0.1:33419; synthetic identities only.');
