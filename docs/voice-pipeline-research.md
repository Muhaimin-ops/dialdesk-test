# Open-source browser voice pipeline research

## Recommendation

For a commercial MVP, evaluate **Pipecat + browser WebRTC + Silero VAD + Voxtral Mini 4B Realtime + Qwen3-4B-Instruct + Kokoro-82M**. The selected framework and model licenses allow commercial use without per-request royalties, subject to their terms and notices. This is not zero-cost to operate: inference compute, GPU capacity, networking, and production media infrastructure still need funding.

Voxtral is explicitly streaming and recommended to run with vLLM over WebSockets. It is an Apache-2.0 model but its model card currently says vLLM is the supported runtime and BF16 needs a GPU with at least 16 GB VRAM. Pipecat may need a custom adapter for Voxtral, so an MVP should benchmark and prototype that integration before replacing the existing voice path. Whisper is a simpler Pipecat-supported fallback, but is more suitable for utterance-based transcription than native streaming.

Kokoro is a small Apache-licensed TTS model, with Pipecat support for local inference. Silero VAD is MIT-licensed and inexpensive to run on CPU. Qwen3-4B-Instruct-2507 is Apache-2.0; keep conversation context compact and stream responses.

## Suggested architecture

1. Keep Next.js, Supabase, authentication, tenant isolation, bookings, and leads.
2. Replace the browser-to-OpenAI-Realtime flow with a browser WebRTC client connected to a persistent Pipecat voice service.
3. Run VAD, streaming STT, local LLM inference, and TTS in that service or dedicated inference workers.
4. Expose existing DialDesk booking and lead tools to the voice service through authenticated server-side calls. Do not let model output write directly to Supabase.
5. Use a production deployment/dispatch setup. Pipecat's development runner is not production-ready; the SmallWebRTC transport is documented as a lightweight local/testing option and requires ICE/TURN configuration for clients behind NAT.

This is a material architecture change: the existing `/api/realtime/session` endpoint proxies OpenAI's Realtime API, and `VoiceCall.tsx` creates an OpenAI-style WebRTC connection and handles its event protocol. Neither can simply be pointed at a local model. The current Docker Compose deployment also only launches the Next.js app and Caddy, not a Pipecat service or GPU inference.

## Licensing and operating cost

| Component | License / suitability | Main operating requirement |
|---|---|---|
| Pipecat | BSD-2-Clause framework | Persistent bot service and production dispatch |
| Silero VAD | MIT | CPU or GPU inference |
| Voxtral Mini 4B Realtime 2602 | Apache-2.0; streaming STT | vLLM runtime; model card specifies >=16 GB VRAM for BF16 |
| Qwen3-4B-Instruct-2507 | Apache-2.0 | LLM inference compute |
| Kokoro-82M | Apache-2.0 weights | TTS inference and voice/dependency review |

“No licensing fees” means no stated per-use royalty under these licenses, not free hosting. GPU rental or hardware, CPU/RAM, persistent service uptime, bandwidth, storage, WebRTC/TURN/media services, monitoring, and scaling remain costs. Review each exact model artifact, voice, dependency, and distribution notice before shipping; this is a practical license screen, not legal advice.

## Primary sources

- Pipecat overview: https://docs.pipecat.ai/overview/introduction
- Pipecat source license: https://raw.githubusercontent.com/pipecat-ai/pipecat/main/LICENSE
- Pipecat production deployment guidance: https://docs.pipecat.ai/pipecat/deployment/running-bots-in-production
- Pipecat SmallWebRTC client transport: https://docs.pipecat.ai/api-reference/client/js/transports/small-webrtc
- Pipecat Whisper service: https://docs.pipecat.ai/api-reference/server/services/stt/whisper
- Pipecat Kokoro service: https://docs.pipecat.ai/api-reference/server/services/tts/kokoro
- Silero VAD repository and license: https://github.com/snakers4/silero-vad
- Whisper repository and license: https://github.com/openai/whisper
- Voxtral Realtime model card: https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602
- Qwen3-4B-Instruct-2507 model card: https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507
- Kokoro-82M model card: https://huggingface.co/hexgrad/Kokoro-82M
- Chatterbox Turbo model card: https://huggingface.co/ResembleAI/chatterbox-turbo
- Fish Speech project license: https://github.com/fishaudio/fish-speech
- Fish S2 Pro model card: https://huggingface.co/fishaudio/s2-pro

## Alternatives considered

- **Whisper:** MIT-licensed and has a documented Pipecat service, making it a practical lower-complexity prototype. Use VAD-delimited utterances and measure latency; do not assume it behaves like a native streaming recognizer.
- **Chatterbox Turbo:** Its model card lists MIT, but verify incremental/chunked TTS behavior and latency in the chosen serving setup before using it in a live conversation.
- **Fish Speech:** The repository's Community License imposes additional terms for hosted services; avoid it for a commercial SaaS unless the exact intended use is cleared under the applicable license.
