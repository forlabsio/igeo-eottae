import asyncio
from typing import Optional
from telethon import TelegramClient
from telethon.tl.types import User, Bot
from config import API_ID, API_HASH, TELEGRAM_BOT_USERNAME

_client: Optional[TelegramClient] = None


def _get_client() -> TelegramClient:
    global _client
    if _client is None:
        _client = TelegramClient("voice_bot_session", API_ID, API_HASH)
    return _client


async def _send_and_receive(text: str, timeout: int = 30) -> Optional[str]:
    client = _get_client()
    async with client:
        # 봇에게 메시지 전송
        await client.send_message(TELEGRAM_BOT_USERNAME, text)

        # 봇 응답 대기
        import time
        deadline = time.time() + timeout
        last_id = None

        # 현재 마지막 메시지 ID 기록
        async for msg in client.iter_messages(TELEGRAM_BOT_USERNAME, limit=1):
            last_id = msg.id

        while time.time() < deadline:
            async for msg in client.iter_messages(TELEGRAM_BOT_USERNAME, limit=1):
                if last_id is None or msg.id > last_id:
                    # 봇이 보낸 메시지인지 확인
                    sender = await msg.get_sender()
                    if isinstance(sender, (User, Bot)) and getattr(sender, 'bot', False):
                        return msg.text
            await asyncio.sleep(0.5)

        return None


def send_and_receive(text: str, timeout: int = 30) -> Optional[str]:
    """사용자 계정으로 봇에 메시지 전송 후 응답 반환."""
    return asyncio.run(_send_and_receive(text, timeout))
