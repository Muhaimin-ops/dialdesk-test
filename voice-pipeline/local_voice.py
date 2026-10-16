from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

LLAMA_BASE_URL = os.environ.get("LLAMA_BASE_URL", "http://127.0.0.1:11434/v1").rstrip("/")
LLAMA_MODEL = os.environ.get("LLAMA_MODEL", "gemma3:1b")
VOICE = os.environ.get("KOKORO_VOICE", "af_heart")
SPEED = float(os.environ.get("KOKORO_SPEED", "1.1"))

SYSTEM_INSTRUCTION = (
    "You are a helpful, concise voice assistant. Keep replies to one or two short "
    "sentences. Speak naturally and do not use markdown, lists, or emoji."
)


def check_llama_server(base_url: str = LLAMA_BASE_URL, model: str = LLAMA_MODEL) -> dict:
    """Check that Ollama is serving the configured model alias."""
    url = f"{base_url.removesuffix('/v1')}/v1/models"
    try:
        with urlopen(url, timeout=3) as response:
            payload = json.loads(response.read())
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(
            f"Ollama is not responding at {url}. Start the Ollama service."
        ) from error

    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        raise RuntimeError(f"Ollama returned an invalid model list from {url}.")

    model_ids = {
        item.get("id")
        for item in payload.get("data", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    if model not in model_ids:
        raise RuntimeError(
            f"Ollama is up, but model alias {model!r} is not available. "
            f"Run `ollama run {model}` and sign in to Ollama if prompted. "
            f"Available aliases: {', '.join(sorted(model_ids)) or '(none)'}."
        )
    return {"url": url, "model": model}


def project_env_value(name: str) -> str:
    project_root = Path(__file__).resolve().parents[1]
    for env_path in (
        project_root / ".env.local",
        project_root / ".env",
        Path(__file__).resolve().parent / ".env",
    ):
        if not env_path.is_file():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            key, separator, value = line.partition("=")
            if separator and key.strip() == name:
                value = value.strip().strip("'\"")
                if value:
                    return value
    return ""


def load_groq_key_from_project_env() -> None:
    if os.environ.get("GROQ_API_KEY", "").strip():
        return
    key = project_env_value("GROQ_API_KEY")
    if key:
        os.environ["GROQ_API_KEY"] = key


def check_groq_api() -> dict:
    load_groq_key_from_project_env()
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured in the environment, project .env.local, "
            "or voice-pipeline/.env."
        )

    request = Request(
        "https://api.groq.com/openai/v1/models",
        headers={"Authorization": f"Bearer {key}"},
    )
    try:
        with urlopen(request, timeout=10) as response:
            if response.status != 200:
                raise RuntimeError(f"Groq API key check failed with HTTP {response.status}.")
            payload = json.loads(response.read())
    except HTTPError as error:
        raise RuntimeError(f"Groq API key check failed with HTTP {error.code}.") from None
    except (URLError, TimeoutError) as error:
        raise RuntimeError("Could not reach the Groq API to validate the configured key.") from error
    except json.JSONDecodeError as error:
        raise RuntimeError("Groq returned an invalid response while validating the API key.") from error

    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        raise RuntimeError("Groq returned an invalid model list while validating the API key.")
    return {"status": 200, "ok": True}


def check_configuration() -> dict:
    load_groq_key_from_project_env()
    if not os.environ.get("GROQ_API_KEY", "").strip():
        raise RuntimeError(
            "GROQ_API_KEY is required for Whisper STT. Set it in your environment "
            "or add it to the ignored project .env.local or voice-pipeline/.env file."
        )
    if not 0.5 <= SPEED <= 2.0:
        raise RuntimeError("KOKORO_SPEED must be between 0.5 and 2.0.")
    return check_llama_server()


async def run_voice_pipeline() -> None:
    try:
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        from pipecat.pipeline.pipeline import Pipeline
        from pipecat.pipeline.worker import PipelineParams, PipelineWorker
        from pipecat.processors.aggregators.llm_context import LLMContext
        from pipecat.processors.aggregators.llm_response_universal import (
            LLMContextAggregatorPair,
            LLMUserAggregatorParams,
        )
        from pipecat.services.groq.stt import GroqSTTService
        from pipecat.services.kokoro.tts import KokoroTTSService
        from pipecat.services.ollama.llm import OLLamaLLMService
        from pipecat.transports.local.audio import (
            LocalAudioTransport,
            LocalAudioTransportParams,
        )
        from pipecat.workers.runner import WorkerRunner
    except ImportError as error:
        raise RuntimeError(
            "Voice dependencies are missing. Install them with "
            "`python -m pip install -r voice-pipeline/requirements.txt`."
        ) from error

    check_configuration()

    transport = LocalAudioTransport(
        LocalAudioTransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        )
    )
    stt = GroqSTTService(
        api_key=os.environ["GROQ_API_KEY"],
        settings=GroqSTTService.Settings(model="whisper-large-v3"),
    )
    llm = OLLamaLLMService(
        base_url=LLAMA_BASE_URL,
        settings=OLLamaLLMService.Settings(
            model=LLAMA_MODEL,
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2,
            max_tokens=160,
        ),
    )
    tts = KokoroTTSService(
        settings=KokoroTTSService.Settings(
            voice=VOICE,
            speed=SPEED,
        )
    )

    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )
    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_aggregator,
            llm,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )
    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
    )
    runner = WorkerRunner()
    print("Local voice assistant ready. Speak into the default microphone; press Ctrl+C to stop.")
    await runner.add_workers(worker)
    await runner.run()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local DialDesk voice pipeline.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check Groq configuration and the running llama-server without starting audio.",
    )
    parser.add_argument(
        "--check-groq",
        action="store_true",
        help="Validate the configured Groq API key without starting audio.",
    )
    args = parser.parse_args()
    try:
        if args.check and args.check_groq:
            parser.error("Choose only one of --check or --check-groq.")
        if args.check_groq:
            print(json.dumps(check_groq_api(), indent=2))
        elif args.check:
            print(json.dumps(check_configuration(), indent=2))
        else:
            asyncio.run(run_voice_pipeline())
    except (RuntimeError, KeyboardInterrupt) as error:
        if isinstance(error, KeyboardInterrupt):
            print("\nStopped.")
            return
        parser.error(str(error))


if __name__ == "__main__":
    main()
