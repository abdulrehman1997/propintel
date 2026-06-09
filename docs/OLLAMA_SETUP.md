# Local LLM Setup (natural-language search)

The NL search box calls a local Qwen model via Ollama. It is optional — if Ollama
is not running, the box shows a fallback message and manual filters still work.

## Install + run (macOS, one time)

    brew install ollama
    ollama serve            # serves http://localhost:11434
    ollama pull qwen2.5:7b  # ~4.7 GB, best <12B for JSON extraction

If RAM is tight, set `OLLAMA_MODEL=qwen3:4b` in `.env` and `ollama pull qwen3:4b`.

## Verify

    curl http://localhost:11434/api/tags   # lists installed models

The model is offline, no API key. Latency ~1.5–4s warm on Apple Silicon.
