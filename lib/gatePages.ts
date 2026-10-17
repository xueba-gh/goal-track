/** Server-rendered HTML for the lock screen and the setup notice. No client bundle is served before login. */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const STYLE = `
:root{--bg:#f5f6f8;--surface:#fff;--line:#dde1e7;--fg:#111827;--muted:#5b6474;--accent:#1f4e8c;--accent-fg:#fff;--danger:#b42318;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0f1217;--surface:#161a21;--line:#2a303b;--fg:#e6e9ef;--muted:#9aa3b2;--accent:#6e9bd8;--accent-fg:#0f1217;--danger:#f07167;color-scheme:dark}}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--fg);font-family:'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.5}
main{min-height:100vh;display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px))}
.card{width:100%;max-width:380px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:28px}
.mark{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:var(--accent);color:var(--accent-fg);margin-bottom:18px}
h1{margin:0 0 4px;font-size:1.35rem;font-weight:600;letter-spacing:-.01em}
p{margin:0;color:var(--muted)}
form{display:flex;flex-direction:column;gap:14px;margin-top:22px}
label{font-size:.8rem;font-weight:600;color:var(--muted)}
input{width:100%;min-height:46px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg);font:inherit}
input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
button{min-height:46px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font:inherit;font-weight:600;cursor:pointer}
button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.err{color:var(--danger);font-size:.88rem;font-weight:500}
.field{display:flex;flex-direction:column;gap:6px}
ol{margin:14px 0 0;padding-left:20px;color:var(--fg)}
li{margin:6px 0}
code{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-size:.85em;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:1px 6px}
.foot{margin-top:18px;font-size:.8rem}
`;

const LOCK_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><link rel="icon" href="/icon-192.png"><link rel="manifest" href="/manifest.webmanifest"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono&display=swap"><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;
}

export function loginPage(opts: { error?: boolean; next?: string }): string {
  return shell(
    'Goal Track',
    `<div class="card">
  <div class="mark">${LOCK_SVG}</div>
  <h1>Goal Track is locked</h1>
  <p>Enter your master password to open your goals.</p>
  <form method="post" action="/api/login">
    <input type="hidden" name="next" value="${esc(opts.next || '/')}">
    <div class="field">
      <label for="password">Master password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
    </div>
    ${opts.error ? '<p class="err" role="alert">That password is not correct. Try again.</p>' : ''}
    <button type="submit">Unlock</button>
  </form>
</div>`,
  );
}

export function setupPage(): string {
  return shell(
    'Goal Track setup',
    `<div class="card">
  <div class="mark">${LOCK_SVG}</div>
  <h1>Set your master password</h1>
  <p>Goal Track stays closed until a master password exists.</p>
  <ol>
    <li>Open your project in Vercel and go to <strong>Settings</strong>, then <strong>Environment Variables</strong>.</li>
    <li>Add <code>APP_PASSWORD</code> with a strong password as the value.</li>
    <li>Go to <strong>Deployments</strong> and redeploy the latest one.</li>
  </ol>
  <p class="foot">After the redeploy, this page asks for the password.</p>
</div>`,
  );
}
