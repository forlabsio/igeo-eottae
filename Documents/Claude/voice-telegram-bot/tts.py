import os
import tempfile
import subprocess
from openai import OpenAI
from config import OPENAI_API_KEY

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def speak(text: str, voice: str = "nova") -> None:
    """
    Convert text to speech via OpenAI TTS and play with macOS afplay.
    voice options: alloy, echo, fable, onyx, nova, shimmer
    """
    client = _get_client()

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        response.stream_to_file(tmp_path)
        subprocess.run(["afplay", tmp_path], check=True)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
