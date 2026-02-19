import time
import requests
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CLAUDE_CHAT_ID

BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# Persisted across calls to avoid re-processing old updates
_update_offset: int | None = None


def send_message(text: str) -> int:
    """Send text to Claude bot. Returns the sent message_id."""
    resp = requests.post(f"{BASE_URL}/sendMessage", json={
        "chat_id": TELEGRAM_CLAUDE_CHAT_ID,
        "text": text
    })
    resp.raise_for_status()
    return resp.json()["result"]["message_id"]


def get_latest_reply(after_message_id: int, timeout: int = 30) -> str | None:
    """
    Poll for the first bot reply after after_message_id.
    Only accepts messages from bots (is_bot=True).
    Returns reply text, or None if timeout exceeded.
    """
    global _update_offset
    deadline = time.time() + timeout

    while time.time() < deadline:
        params = {"timeout": 5}
        if _update_offset is not None:
            params["offset"] = _update_offset

        resp = requests.get(f"{BASE_URL}/getUpdates", params=params)
        resp.raise_for_status()
        updates = resp.json().get("result", [])

        for update in updates:
            _update_offset = update["update_id"] + 1
            msg = update.get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            msg_id = msg.get("message_id", 0)
            is_bot = msg.get("from", {}).get("is_bot", False)

            if (
                str(chat_id) == str(TELEGRAM_CLAUDE_CHAT_ID)
                and msg_id > after_message_id
                and is_bot
                and "text" in msg
            ):
                return msg["text"]

        if not updates:
            time.sleep(0.5)

    return None


def get_current_message_id() -> int:
    """Get the latest message_id in THIS chat (used as polling baseline)."""
    global _update_offset
    resp = requests.get(f"{BASE_URL}/getUpdates", params={"limit": 100})
    resp.raise_for_status()
    updates = resp.json().get("result", [])
    max_id = 0
    for update in updates:
        if _update_offset is None or update["update_id"] >= (_update_offset or 0):
            _update_offset = update["update_id"] + 1
        msg = update.get("message", {})
        chat_id = msg.get("chat", {}).get("id")
        msg_id = msg.get("message_id", 0)
        # Only count messages from our target chat
        if str(chat_id) == str(TELEGRAM_CLAUDE_CHAT_ID) and msg_id > max_id:
            max_id = msg_id
    return max_id
