# DialDesk — multi-tenant AI voice receptionist

Businesses sign up, configure an AI receptionist, and add one `<script>` tag to their website. Visitors tap **Talk to us**, speak to the agent in the browser (WebRTC → Pipecat), and the agent checks real availability, books appointments and captures leads. Owners see everything in a dashboard.

**Stack:** Next.js 16 (App Router) · Supabase (Auth + Postgres + RLS) · Pipecat · Groq Whisper STT · Ollama Gemma 3 1B LLM · local Kokoro TTS · Stripe (optional) · Resend (optional) · Tailwind CSS 4.
**No build-time env needed.** Every setting is read at runtime, so one build runs anywhere.

## How it works

```
Visitor's browser ──WebRTC audio──────────────► Pipecat voice service
      │ SDP offer                                    │ Groq Whisper → Ollama Gemma 3 1B → local Kokoro
      ▼                                              │ signed call token scopes the session
/api/realtime/session ─► /api/realtime/connect ──────┘
                                                     │ calls availability/booking tools
                                                     ▼
                                     /api/realtime/tool ─► Supabase
```

* Browser audio goes to the Pipecat service. Prompts, tool definitions and the Groq key stay server-side.
* Ollama runs the LLM and Kokoro generates speech locally; OpenAI Realtime is not used.
* Bookings are validated server-side (opening hours, slot grid, lead time, 120-day window) and a **unique index** prevents double-booking even under races.
* Dashboard reads/writes go through Supabase **RLS**; the public voice path uses the service role but every query is scoped by a business id taken from a signed token.

## Setup (10 minutes)

1. **Supabase** → create a project → SQL Editor → run `supabase/schema.sql`.
   Authentication → URL Configuration: set *Site URL* to your app URL and add `https://YOUR-APP/auth/callback` to *Redirect URLs*.
2. **Env vars** → copy `.env.example` to `.env` and fill in: `APP_SECRET` (`openssl rand -base64 48`), the three Supabase values, and a valid `GROQ_API_KEY`.
3. **Start Ollama** with the model in `LLAMA_MODEL` (default `gemma3:1b`). Booking and lead-capture require a model that accepts tool calls.
4. **Install and run the voice service** in one terminal: `python -m pip install -r voice-pipeline\requirements-local.txt`, then `python voice-pipeline\web_voice.py`. The service reads `APP_URL` and `GROQ_API_KEY` from the project `.env`/`.env.local` files.
5. **Run the app** in another terminal: `npm install && npm run dev` → http://localhost:3000 → sign up → onboarding → Agent settings → add your site under *Allowed websites* → make a test call from your public page (`/b/<slug>`). The dev launcher gives Supabase values in the project env files precedence over inherited shell values.

Microphone access requires **HTTPS** (localhost is exempt), so use a real domain in production.

## Deploy

| Platform | Steps |
|---|---|
| **Vercel** | `vercel.json` defines an `app` service and an internal `voice-pipeline` Python service. The app's `VOICE_PIPELINE_URL` binding targets the voice service; the voice service's `DIALDESK_APP_URL` binding targets the app. Only the app is publicly routed. Configure the app's canonical `APP_URL`, Supabase values and `APP_SECRET`, and provide `GROQ_API_KEY`, `LLAMA_BASE_URL`, `LLAMA_MODEL`, and Kokoro settings to the voice service. Do not set either binding variable manually. **This wiring is not sufficient for production voice calls yet:** the current Pipecat service runs a long-lived WebRTC pipeline, needs UDP media connectivity and local Kokoro/Ollama dependencies, while Vercel's Python runtime is request-based. Keep the voice service on a compatible external host until that runtime/network model is addressed. |
| **Render / Railway** | Deploy the Next.js app and `voice-pipeline/Dockerfile` as separate services. Set `VOICE_PIPELINE_URL` in the app and `DIALDESK_APP_URL` in the voice service. |
| **VPS + Docker** | On a Linux Docker host, copy `.env.example` to `.env`, set `APP_URL=https://your.domain` and `DOMAIN=your.domain`, configure Groq and Ollama, then run `docker compose up -d --build`. Caddy gets the HTTPS certificate automatically. The voice service uses host networking for WebRTC media; allow its UDP traffic through the firewall. |
| **VPS + PM2** | Deploy Next.js as usual and run the Python voice service separately with `uvicorn web_voice:app --host 0.0.0.0 --port 7860` from `voice-pipeline`. Set `VOICE_PIPELINE_URL` in Next.js and `DIALDESK_APP_URL` in the voice service. |

Liveness check: `GET /api/health`. Readiness check: `GET /api/health?deep=1` (also checks the database). Run `supabase/schema.sql` before deploying, and re-run it on existing projects to install the atomic monthly-call reservation and migrate existing voice selections.

Embed snippet (shown in the dashboard):
```html
<script src="https://YOUR-APP/widget.js" data-business="BUSINESS_ID" defer></script>
```
Optional attributes: `data-color="#14232F"`, `data-position="left"`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `APP_SECRET` | yes | 32+ chars; signs embed/call tokens. Rotating it invalidates open sessions only. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role is server-only. Never expose it. |
| `APP_URL` | production | Canonical HTTPS origin, without a path. Required in production to prevent host-header-based callback and billing URLs. |
| `VOICE_PIPELINE_URL` | production | Pipecat service URL; defaults to `http://127.0.0.1:7860` in development. In the Vercel multi-service configuration this is injected as a binding into the app service; do not configure it manually. |
| `GROQ_API_KEY` | voice service | Whisper STT credentials. Audio is sent to Groq for transcription. |
| `DIALDESK_APP_URL` | voice service | App URL the Pipecat service uses for signed session configuration and booking tools. In the Vercel multi-service configuration this is injected as a binding into the voice service; do not configure it manually. |
| `LLAMA_BASE_URL`, `LLAMA_MODEL` | voice service | Ollama OpenAI-compatible local endpoint and loaded model name. Despite the compatibility protocol, no OpenAI API is used. |
| `KOKORO_VOICE`, `KOKORO_SPEED` | no | Default local Kokoro voice and speaking rate. Per-business voice selection overrides the voice. |
| `FREE_CALLS_PER_MONTH` / `PRO_CALLS_PER_MONTH` | no | Defaults 20 / 500. Your main cost control. |
| `MAX_CALL_SECONDS` | no | Default 600. |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET` | no | Enables the Upgrade button. Webhook endpoint: `/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | no | Booking confirmation emails. |

## What was fixed vs. the original starter

| Gap in the starter | Here |
|---|---|
| Empty/placeholder source files, JSX inside `.ts`, no schema | Complete, type-checked app and SQL schema with RLS |
| `Access-Control-Allow-Origin: *` on realtime + booking endpoints | No CORS at all; the API is same-origin and gated by signed, expiring tokens |
| Anyone could mint realtime sessions (cost abuse) | Signed embed token, per-IP and per-business rate limits, monthly per-plan call cap |
| Tenant isolation undefined; service role everywhere | RLS for dashboard; service role only in server routes, always scoped by token business id; billing columns not writable by users |
| No CSP; framing rules would break the widget | Strict CSP + `X-Frame-Options: DENY` everywhere except `/embed/*`, which is frameable but checks the parent origin against an allow-list |
| `.env.local` committed, `.gitignore` lacked `.env*` | `.env*` ignored (only `.env.example` tracked) |
| Wrong package name; README promised phone calls with no telephony | Honest scope (browser voice); see below |
| No tests, CI, license, health check | 16 unit tests, GitHub Actions CI, MIT, `/api/health` |
| Single hosting path (Hostinger + CloudPanel) | Vercel, Render, Railway, Docker+Caddy, PM2 |

## Known limits (read before selling this)

* **Browser voice only — no phone numbers.** Real inbound phone calls need a telephony transport; it is not included.
* Groq provides transcription, so voice calls require an active Groq key and internet access. LLM and speech synthesis run through the configured Ollama and Kokoro services.
* Production WebRTC needs a publicly reachable voice service and UDP connectivity. STUN helps with NAT traversal; strict NATs/firewalls may require a TURN server.
* **Request rate limiting is in-memory.** It is per process, so on Vercel/serverless or multiple instances each instance counts separately; use shared Redis/Upstash for distributed limits. The monthly call cap is reserved atomically in Postgres and remains exact across instances.
* **Allowed-websites check uses the iframe `Referer`.** It stops casual copy-paste embedding but a determined attacker can forge it; the call cap and rate limits bound the damage.
* A call is capped client-side (`MAX_CALL_SECONDS`) and by the 30-minute call token for tools.
* No admin/super-user console, team invitations (schema supports multiple members) or call summaries yet.
* Calls are recorded as text transcripts. Check consent/recording laws in your customers' jurisdictions; the widget shows a short AI/transcription notice.

## Verification status

Verification: run the Node tests/typecheck/build and `python -m unittest discover -s voice-pipeline -p "test_*.py"`. A live browser call also requires the configured Groq key, Ollama model, Pipecat service, microphone permission and working WebRTC network path. Validate one real call and booking against your Supabase project before going live.
