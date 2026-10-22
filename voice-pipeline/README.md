# DialDesk Pipecat voice service

The browser voice widget uses this Pipecat WebRTC service:

- **STT:** Groq Whisper Large v3 (audio is sent to Groq)
- **LLM:** Gemma 3 1B through Ollama's OpenAI-compatible endpoint; no OpenAI API is called
- **TTS:** local Kokoro
- **VAD/orchestration and browser WebRTC:** Pipecat

The service retrieves per-call configuration from DialDesk using the signed call token, and sends booking-tool requests back to the app. It does not receive Supabase credentials. A local microphone-only runner is also available as `local_voice.py`.

Browser signaling submits the SDP offer as soon as local setup completes and sends later ICE candidates through the Pipecat PATCH endpoint. This avoids blocking calls on browsers that do not report ICE gathering completion promptly. Production deployments still need working UDP connectivity or a configured TURN relay for networks that block direct WebRTC traffic.

In Docker Compose, the voice service uses host networking so WebRTC media can reach the host's UDP interfaces. It must bind beyond loopback for the app container to reach it through `host.docker.internal`; Compose sets `VOICE_PIPELINE_HOST=0.0.0.0`. Restrict inbound access to port 7860 at the host firewall, and configure TURN when callers' networks block direct UDP.

## Requirements

- Python 3.10+
- A Groq API key with access to Whisper
- Ollama installed with the `gemma3:1b` model available
- DialDesk running on `APP_URL`
- For browser calls on production networks, reachable UDP for WebRTC; a TURN service may be needed behind strict NATs/firewalls

Install the local-development dependencies from the repository root, then start the service:

```powershell
python -m pip install -r voice-pipeline\requirements-local.txt
python voice-pipeline\web_voice.py
```

`requirements.txt` is the deployment dependency set used by the web-service Docker image. It intentionally excludes Pipecat's `local` extra, which installs PyAudio and requires PortAudio system headers. `requirements-local.txt` adds that extra for the optional local-microphone runner.

Set the Groq key and app origin for the current PowerShell window if they are not in `.env.local` or `.env`:

```powershell
$env:GROQ_API_KEY = "your-key"
$env:DIALDESK_APP_URL = "http://localhost:3000"
```

Alternatively, add `GROQ_API_KEY=...` to the ignored project `.env.local` or `voice-pipeline/.env` file. The runner only reads that setting and never prints its value. Do not commit API keys. Set `VOICE_PIPELINE_URL=http://127.0.0.1:7860` in the Next.js environment (the default in development). Defaults: `LLAMA_BASE_URL=http://127.0.0.1:11434/v1`, `LLAMA_MODEL=gemma3:1b`, `KOKORO_VOICE=af_heart`, `KOKORO_SPEED=1.1`.

## Start Ollama

Make sure the model is available, then start it:

```powershell
ollama run gemma3:1b
```

The voice service checks that `gemma3:1b` is available from Ollama's local `/v1/models` endpoint before starting. The app passes booking and lead-capture tools to the model; confirm the installed Ollama model/version accepts tool calls before using those features.

## Run and verify

With Ollama serving the configured model and `GROQ_API_KEY` set:

```powershell
python voice-pipeline\local_voice.py --check-groq
python voice-pipeline\local_voice.py --check
Invoke-WebRequest http://localhost:7860/health
```

Run `python voice-pipeline\web_voice.py` for browser calls or `python voice-pipeline\local_voice.py` for a local microphone session. The `--check-groq` command validates the Groq key without printing it; `--check` confirms the key is configured and verifies the Ollama model. Kokoro model assets download on first speech synthesis and are cached locally. A missing key, Ollama server, or model is reported explicitly.

The voice service uses no OpenAI API key. Groq still requires an active API key for Whisper STT; the LLM and Kokoro TTS run locally.
