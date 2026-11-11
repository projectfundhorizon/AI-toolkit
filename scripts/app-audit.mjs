#!/usr/bin/env node
// Read-only audit of this app: data security and performance.
// Run:  node scripts/app-audit.mjs        (exit code 1 if anything FAILs)
// It only reads files in this repo. It never prints a secret value, never contacts the live app,
// never changes data. The app-auditor agent runs this first, then reviews what a script cannot see.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const results = [];
const add = (level, area, what, where = '') => results.push({ level, area, what, where });
const read = (p) => readFileSync(join(root, p), 'utf8');

function files(dir, ok = (f) => true, out = []) {
  for (const name of readdirSync(join(root, dir))) {
    if (['node_modules', '.git', '.vercel'].includes(name)) continue;
    const rel = join(dir, name);
    const st = statSync(join(root, rel));
    if (st.isDirectory()) files(rel, ok, out);
    else if (ok(rel)) out.push(rel);
  }
  return out;
}
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const sourceFiles = files('.', (f) => /\.(m?js|json|html|css|md|webmanifest)$/.test(f) && !f.startsWith('package-lock'));
const code = sourceFiles.filter((f) => /\.(m?js)$/.test(f) && !f.startsWith('test') && !f.startsWith('scripts') && !f.startsWith('docs'));

// ---------------- SECURITY ----------------
// 1. Secrets in files and in git history (values are never printed)
const SECRETS = [
  [/github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/postgres(ql)?:\/\/[^\s:@/'"]+:[^\s@/'"]{4,}@/, 'database URL with a password'],
];
let leaked = 0;
for (const f of sourceFiles) {
  if (f.startsWith('test')) continue; // tests use obvious fake values
  const text = read(f);
  for (const [re, label] of SECRETS) {
    const m = re.exec(text);
    if (m) { leaked++; add('FAIL', 'secrets', `${label} found in a file (value hidden)`, `${f}:${lineOf(text, m.index)}`); }
  }
}
try {
  const log = execFileSync('git', ['log', '--all', '-p', '--no-color', '-U0'], { cwd: root, maxBuffer: 256 * 1024 * 1024, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const added = log.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
  for (const [re, label] of SECRETS) {
    if (re.test(added)) { leaked++; add('FAIL', 'secrets', `${label} appears somewhere in git history (value hidden). Rotate it, then clean history.`, 'git log'); }
  }
} catch { add('WARN', 'secrets', 'Could not read git history, so history was not scanned'); }
if (!leaked) add('PASS', 'secrets', 'No keys, tokens or database passwords in files or git history');

// 2. Ignored files
const ignore = existsSync(join(root, '.gitignore')) ? read('.gitignore') : '';
for (const need of ['.env', 'node_modules']) {
  if (!ignore.split('\n').some((l) => l.trim().startsWith(need))) add('FAIL', 'secrets', `.gitignore does not list ${need}`, '.gitignore');
}

// 3. Dangerous code patterns
const BAD = [
  [/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(/, 'writes HTML from a string (XSS risk)'],
  [/\beval\s*\(|new Function\s*\(|document\.write\s*\(/, 'runs code from a string'],
  [/dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML'],
];
let bad = 0;
for (const f of code) {
  const text = read(f).split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  for (const [re, label] of BAD) {
    const m = re.exec(text);
    if (m) { bad++; add('FAIL', 'code', label, `${f}:${lineOf(text, m.index)}`); }
  }
  // SQL built by gluing strings together instead of $1, $2 parameters
  for (const m of read(f).matchAll(/\.query\(\s*(`[^`]*\$\{[^`]*`|['"][^'"]*['"]\s*\+)/g)) {
    bad++; add('FAIL', 'sql', 'SQL text is built from variables; use $1, $2 parameters', `${f}:${lineOf(read(f), m.index)}`);
  }
}
if (!bad) add('PASS', 'code', 'No innerHTML, eval or string-built SQL in app code');

// 4. Every API route checks who you are (login, logout, widget are the known exceptions)
for (const f of files('api')) {
  const text = read(f);
  const name = f.replace(/^api\//, '');
  if (['login.js', 'logout.js'].includes(name)) continue;
  if (name === 'widget.js') {
    if (!/widgetTokenOk\(/.test(text)) add('FAIL', 'access', 'widget route does not check its token', f);
    else add('PASS', 'access', 'widget route requires its own read-only token', f);
    continue;
  }
  if (!/requireAuth\(/.test(text)) add('FAIL', 'access', 'API route does not check the login session', f);
  else add('PASS', 'access', 'checks the login session', f);
  if (/req\.method\s*[!=]==?\s*'(POST|PUT|DELETE|PATCH)'|method === 'POST'/.test(text) && !/checkOrigin\(/.test(text)) add('FAIL', 'access', 'writes without an origin check (cross-site request risk)', f);
}

// 5. Browser protection headers (vercel.json)
try {
  const cfg = JSON.parse(read('vercel.json'));
  const all = Object.fromEntries((cfg.headers || []).flatMap((h) => (h.source === '/(.*)' ? h.headers : [])).map((h) => [h.key.toLowerCase(), h.value]));
  for (const k of ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy']) {
    if (!all[k]) add('FAIL', 'headers', `missing ${k}`, 'vercel.json');
  }
  const csp = all['content-security-policy'] || '';
  if (/unsafe-inline|unsafe-eval|\*|data:(?!.*img)/.test(csp.replace(/img-src[^;]*;?/, ''))) add('FAIL', 'headers', 'CSP has been loosened (unsafe-inline, unsafe-eval or a wildcard)', 'vercel.json');
  else if (csp) add('PASS', 'headers', 'Strict CSP and the other browser protection headers are in place', 'vercel.json');
  const api = (cfg.headers || []).find((h) => h.source === '/api/(.*)');
  if (!api || !api.headers.some((h) => h.key.toLowerCase() === 'cache-control' && /no-store/.test(h.value))) add('FAIL', 'headers', 'API responses are not marked no-store (private data could be cached)', 'vercel.json');
} catch (e) { add('FAIL', 'headers', `vercel.json unreadable: ${e.message}`); }

// 6. Cookies and sessions
const auth = existsSync(join(root, 'lib/auth.js')) ? read('lib/auth.js') : '';
for (const flag of ['HttpOnly', 'Secure', 'SameSite']) {
  if (auth && !new RegExp(flag, 'i').test(auth)) add('FAIL', 'sessions', `login cookie is missing ${flag}`, 'lib/auth.js');
}
if (auth && /HttpOnly/i.test(auth) && /Secure/i.test(auth) && /SameSite/i.test(auth)) add('PASS', 'sessions', 'Login cookie is HttpOnly, Secure and SameSite');
if (auth && !/timingSafeEqual/.test(auth)) add('WARN', 'sessions', 'password/token comparison does not use a constant-time check', 'lib/auth.js');

// 7. Dependencies
try {
  const out = execFileSync('npm', ['audit', '--omit=dev', '--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000 });
  const v = JSON.parse(out).metadata?.vulnerabilities || {};
  const hi = (v.high || 0) + (v.critical || 0);
  add(hi ? 'FAIL' : v.moderate ? 'WARN' : 'PASS', 'dependencies', hi ? `${hi} high or critical vulnerabilities in dependencies` : `Dependencies: ${v.moderate || 0} moderate, 0 high or critical`);
} catch (e) {
  try {
    const v = JSON.parse(String(e.stdout || '{}')).metadata?.vulnerabilities || {};
    const hi = (v.high || 0) + (v.critical || 0);
    add(hi ? 'FAIL' : 'WARN', 'dependencies', hi ? `${hi} high or critical vulnerabilities in dependencies` : 'npm audit reported findings');
  } catch { add('WARN', 'dependencies', 'npm audit could not run (no network?), check it yourself'); }
}

// ---------------- PERFORMANCE ----------------
const kb = (p) => Math.round(statSync(join(root, p)).size / 1024);
for (const [p, warn] of [['public/app.js', 120], ['public/style.css', 50]]) {
  if (!existsSync(join(root, p))) continue;
  add(kb(p) > warn ? 'WARN' : 'PASS', 'speed', `${p} is ${kb(p)} KB (limit ${warn} KB before it feels slow on a phone)`, p);
}
const index = existsSync(join(root, 'public/index.html')) ? read('public/index.html') : '';
const requests = (index.match(/<(script|link)\b[^>]*(src|href)=/g) || []).length;
if (index) add(requests > 8 ? 'WARN' : 'PASS', 'speed', `${requests} files requested before the first screen (fewer is faster)`, 'public/index.html');
const big = files('public', (f) => /\.(png|jpe?g|gif|webp|svg|mp4)$/i.test(f)).filter((f) => kb(f) > 200);
for (const f of big) add('WARN', 'speed', `${f} is ${kb(f)} KB; compress it`, f);
if (existsSync(join(root, 'public/sw.js'))) add('PASS', 'speed', 'A service worker keeps the app opening with no signal', 'public/sw.js');
else add('WARN', 'speed', 'No service worker: the app will not open offline');
// Database reads that could grow without a limit
const store = existsSync(join(root, 'lib/store.js')) ? read('lib/store.js') : '';
for (const m of store.matchAll(/SELECT[^;`'"]*FROM\s+(\w+)[^;`'"]*/gi)) {
  const q = m[0];
  if (!/WHERE|LIMIT|COUNT\(|SUM\(|PRIMARY|ORDER BY[^;]*LIMIT/i.test(q) && !/information_schema/i.test(q)) add('WARN', 'database', `Reads every row of "${m[1]}" with no WHERE or LIMIT. Fine now, slow as data grows`, `lib/store.js:${lineOf(store, m.index)}`);
}
const maxDur = (() => { try { return JSON.parse(read('vercel.json')).functions || {}; } catch { return {}; } })();
add('PASS', 'speed', `Long-running routes have an explicit time limit: ${Object.keys(maxDur).join(', ') || 'none set'}`, 'vercel.json');

// ---------------- REPORT ----------------
const order = { FAIL: 0, WARN: 1, PASS: 2 };
results.sort((a, b) => order[a.level] - order[b.level]);
const count = (l) => results.filter((r) => r.level === l).length;
console.log(`App audit: ${count('FAIL')} FAIL, ${count('WARN')} WARN, ${count('PASS')} PASS\n`);
for (const r of results) console.log(`${r.level.padEnd(4)}  ${r.area.padEnd(12)} ${r.what}${r.where ? `  [${r.where}]` : ''}`);
console.log('\nChecked by script: secrets, code patterns, login checks, headers, cookies, dependencies, sizes.');
console.log('NOT checked by script: Vercel settings (preview vs production database), live headers, real-device speed, data stored per user.');
process.exit(count('FAIL') ? 1 : 0);
