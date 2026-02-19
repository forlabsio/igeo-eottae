import time
import requests
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CLAUDE_CHAT_ID

BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


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
    Returns reply text, or None if timeout exceeded.
    """
    deadline = time.time() + timeout
    offset = None

    while time.time() < deadline:
        params = {"timeout": 5}
        if offset is not None:
            params["offset"] = offset

        resp = requests.get(f"{BASE_URL}/getUpdates", params=params)
        resp.raise_for_status()
        updates = resp.json().get("result", [])

        for update in updates:
            offset = update["update_id"] + 1
            msg = update.get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            msg_id = msg.get("message_id", 0)
            if (
                str(chat_id) == str(TELEGRAM_CLAUDE_CHAT_ID)
                and msg_id > after_message_id
                and "text" in msg
            ):
                return msg["text"]

        time.sleep(0.5)

    return None


def get_current_message_id() -> int:
    """Get the latest message_id in the chat (used as polling baseline)."""
    resp = requests.get(f"{BASE_URL}/getUpdates", params={"limit": 100})
    resp.raise_for_status()
    updates = resp.json().get("result", [])
    max_id = 0
    for update in updates:
        msg_id = update.get("message", {}).get("message_id", 0)
        if msg_id > max_id:
            max_id = msg_id
    return max_id
