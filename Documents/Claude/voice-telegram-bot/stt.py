import os
from faster_whisper import WhisperModel

_model = None


def load_model(model_name: str = "base") -> WhisperModel:
    """Load Whisper model once and cache it. Takes ~10s on first call."""
    global _model
    if _model is None:
        print(f"Whisper '{model_name}' 모델 로딩 중...")
        _model = WhisperModel(model_name, device="cpu", compute_type="int8")
        print("모델 로딩 완료.")
    return _model


def transcribe(audio_path: str) -> str:
    """Transcribe WAV file to Korean text. Deletes temp file after."""
    try:
        model = load_model()
        segments, _ = model.transcribe(audio_path, language="ko")
        text = " ".join(segment.text.strip() for segment in segments)
        return text.strip()
    finally:
        os.unlink(audio_path)
