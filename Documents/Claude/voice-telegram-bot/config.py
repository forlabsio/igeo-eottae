import os
from dotenv import load_dotenv

load_dotenv()

API_ID = int(os.getenv("API_ID", "0"))
API_HASH = os.getenv("API_HASH", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def validate_config():
    missing = []
    if not API_ID:
        missing.append("API_ID")
    if not API_HASH:
        missing.append("API_HASH")
    if not TELEGRAM_BOT_USERNAME:
        missing.append("TELEGRAM_BOT_USERNAME")
    if not OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    if missing:
        raise ValueError(f".env에 다음 값이 없습니다: {', '.join(missing)}")
