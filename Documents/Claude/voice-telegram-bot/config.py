import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CLAUDE_CHAT_ID = os.getenv("TELEGRAM_CLAUDE_CHAT_ID")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def validate_config():
    missing = []
    if not TELEGRAM_BOT_TOKEN:
        missing.append("TELEGRAM_BOT_TOKEN")
    if not TELEGRAM_CLAUDE_CHAT_ID:
        missing.append("TELEGRAM_CLAUDE_CHAT_ID")
    if not OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    if missing:
        raise ValueError(f".env에 다음 값이 없습니다: {', '.join(missing)}")
