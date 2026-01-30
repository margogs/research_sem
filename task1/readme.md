### Role
You are a senior JavaScript engineer and educator. Produce clean, minimal, production‑ready code with clear English docstrings. Apply “simplify first, then optimize” and remove any unnecessary complexity. Prefer zero dependencies and vanilla browser APIs. Ensure the solution is CORS‑safe for a static site.

### Task
Build a tiny MVP “Event Logger” web app for GitHub Pages that:
- Lets the user paste and save a Google Apps Script Web App URL (/exec).
- Logs button events (A/B CTA and a heartbeat) to Google Sheets via that Web App.
- Avoids CORS preflight by using a “simple request” (no custom headers, x‑www‑form‑urlencoded body).
- Stores the GAS URL and a stable pseudo user id in localStorage.
- Shows a short status message after each send.

### Instructions
- Files and names:
  - index.html: minimal UI and inline styles only.
  - app.js: all logic. Use only modern, widely supported JS. No frameworks, no build step.
- UI requirements (index.html):
  - Input field id="gasUrl" for the Apps Script Web App URL (must end with /exec).
  - Button id="saveUrl" to persist the URL in localStorage.
  - Buttons id="ctaA" and id="ctaB" to send “cta_click” events for variants A and B.
  - Button id="heartbeat" to send a “heartbeat” event.
  - A status area id="status" to display concise feedback.
- Logic requirements (app.js):
  - Generate or read a stable pseudo user id stored under localStorage key "uid".
  - Read/write the GAS URL from/to localStorage key "gas_url"; hydrate the input on load.
  - Implement a function sendLogSimple(payload) that:
    - Builds a URLSearchParams body with keys: event, variant, userId, ts (ms since epoch), meta (JSON-stringified).
    - Uses fetch with method POST and body set to the URLSearchParams.
    - Does NOT set any headers (no Content-Type), to keep the request a CORS “simple request”.
    - Updates #status with either “Logged” or a concise error.
  - Wire click handlers for #ctaA, #ctaB, and #heartbeat to call sendLogSimple with appropriate payloads, including meta: { page: location.pathname, ua: navigator.userAgent }.
  - Provide docstrings for public functions explaining purpose, parameters, and return values.
- Apps Script (optional but preferred; include as a third code block labeled Code.gs):
  - Implement doPost(e) that robustly handles both:
    - application/x-www-form-urlencoded via e.parameter (recommended path for the web app), and
    - application/json via JSON.parse(e.postData.contents) when present.
  - Append rows to a sheet named “logs” (create if missing) with columns: ts_iso, event, variant, userId, meta (stringified).
  - Return a small JSON body { ok: true } on success.
  - Include comments reminding to deploy as “Execute as Me” and “Who has access: Anyone”, and to use the latest /exec URL.
- Quality and UX:
  - Keep CSS minimal and responsive.
  - Fail loudly but briefly in #status (e.g., “Missing Web App URL”, “Invalid URL”, “HTTP 403”).
  - No external libraries; no analytics or tracking beyond the described payloads.
  - Mention any assumptions or limitations in code comments if unavoidable.

### Format
- Output exactly three code blocks in this order, with no extra commentary before/between/after:
  1) index.html — complete, ready to deploy.
  2) app.js — complete, ready to deploy.
  3) Code.gs — Google Apps Script doPost for the Web App endpoint.
- All code must include clear English docstrings/comments.
- Do not include placeholders other than the user‑entered Web App URL (read from the input and localStorage).
- Keep the total output concise and copy‑pasteable.
