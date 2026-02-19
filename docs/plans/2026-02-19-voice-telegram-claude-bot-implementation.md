# Voice-to-Telegram Claude Bot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Push-to-Talk 방식으로 마이크 음성을 Whisper로 텍스트 변환 후 텔레그램 클로봇에 전송하고, 응답을 OpenAI TTS로 재생하는 Python CLI 프로그램.

**Architecture:** 5개 모듈 (recorder, stt, telegram_client, tts, main)이 파이프라인으로 연결. main.py가 ENTER 키 기반 루프를 오케스트레이션. 모든 임시 파일은 tempfile 모듈로 관리.

**Tech Stack:** Python 3.10+, openai-whisper (로컬 STT), python-telegram-bot 20.x (Bot API), openai>=1.0.0 (TTS), pyaudio (마이크 녹음), python-dotenv (.env 설정), playsound (오디오 재생)

---

## 사전 준비 (코드 작성 전)

다음 값을 준비해 두세요:
1. **Telegram Bot Token**: `@BotFather`에게 `/newbot` 명령으로 발급
2. **Claude Bot Chat ID**: 텔레그램에서 클로봇과 대화 후, `https://api.telegram.org/bot<TOKEN>/getUpdates` 에서 `chat.id` 확인
3. **OpenAI API Key**: platform.openai.com에서 발급

---

## Task 1: 프로젝트 스캐폴딩 및 설정

**Files:**
- Create: `voice-telegram-bot/requirements.txt`
- Create: `voice-telegram-bot/.env.example`
- Create: `voice-telegram-bot/.gitignore`
- Create: `voice-telegram-bot/config.py`

**Step 1: 프로젝트 폴더 생성**

```bash
mkdir -p ~/Documents/Claude/voice-telegram-bot
cd ~/Documents/Claude/voice-telegram-bot
```

**Step 2: requirements.txt 작성**

```
openai>=1.0.0
openai-whisper
python-telegram-bot>=20.0
pyaudio
python-dotenv
playsound==1.2.2
```

> 주의: `playsound 1.3.0`은 macOS에서 버그가 있으므로 반드시 `1.2.2` 사용.

**Step 3: .env.example 작성**

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CLAUDE_CHAT_ID=your_chat_id_here
OPENAI_API_KEY=your_openai_api_key_here
```

**Step 4: .gitignore 작성**

```
.env
__pycache__/
*.pyc
*.wav
*.mp3
.DS_Store
```

**Step 5: config.py 작성**

```python
import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CLAUDE_CHAT_ID = int(os.getenv("TELEGRAM_CLAUDE_CHAT_ID"))
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
```

**Step 6: 실제 .env 파일 생성 (본인 키 입력)**

```bash
cp .env.example .env
# .env 파일 열어서 실제 값 입력
```

**Step 7: 패키지 설치**

```bash
pip install -r requirements.txt
```

> PyAudio 설치 실패 시: `brew install portaudio && pip install pyaudio`

**Step 8: 설정 검증**

```bash
python -c "from config import validate_config; validate_config(); print('설정 OK')"
```

Expected: `설정 OK`

**Step 9: 커밋**

```bash
git add requirements.txt .env.example .gitignore config.py
git commit -m "chore: scaffold voice-telegram-bot project"
```

---

## Task 2: 마이크 녹음 모듈 (recorder.py)

**Files:**
- Create: `voice-telegram-bot/recorder.py`

**Step 1: recorder.py 작성**

```python
import pyaudio
import wave
import tempfile
import os
import threading

CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  # Whisper 권장 샘플레이트


class Recorder:
    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self._frames = []
        self._recording = False
        self._stream = None

    def start(self):
        """녹음 시작. 별도 스레드에서 실행됨."""
        self._frames = []
        self._recording = True
        self._stream = self.audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        self._thread = threading.Thread(target=self._record_loop)
        self._thread.start()

    def _record_loop(self):
        while self._recording:
            data = self._stream.read(CHUNK, exception_on_overflow=False)
            self._frames.append(data)

    def stop(self) -> str:
        """녹음 중지. 임시 WAV 파일 경로 반환."""
        self._recording = False
        self._thread.join()
        self._stream.stop_stream()
        self._stream.close()

        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        with wave.open(tmp.name, 'wb') as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(self.audio.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(self._frames))

        return tmp.name

    def cleanup(self):
        self.audio.terminate()
```

**Step 2: 수동 테스트 (마이크 동작 확인)**

```python
# 터미널에서 실행
python -c "
from recorder import Recorder
import time
r = Recorder()
input('ENTER를 누르면 3초 녹음 시작...')
r.start()
time.sleep(3)
path = r.stop()
print(f'저장됨: {path}')
r.cleanup()
"
```

Expected: WAV 파일 경로 출력, 파일이 실제로 존재

**Step 3: 커밋**

```bash
git add recorder.py
git commit -m "feat: add push-to-talk recorder module"
```

---

## Task 3: STT 모듈 (stt.py)

**Files:**
- Create: `voice-telegram-bot/stt.py`

**Step 1: stt.py 작성**

```python
import whisper
import os

_model = None


def load_model(model_name: str = "base"):
    """Whisper 모델 로딩 (최초 1회만). 약 10~20초 소요."""
    global _model
    if _model is None:
        print(f"Whisper '{model_name}' 모델 로딩 중...")
        _model = whisper.load_model(model_name)
        print("모델 로딩 완료.")
    return _model


def transcribe(audio_path: str) -> str:
    """WAV 파일을 텍스트로 변환. 한국어 고정."""
    model = load_model()
    result = model.transcribe(audio_path, language="ko", fp16=False)
    os.unlink(audio_path)  # 임시 파일 삭제
    return result["text"].strip()
```

> `fp16=False`: Mac CPU에서는 반드시 False로 설정해야 오류 없음.

**Step 2: 수동 테스트**

```bash
# Task 2에서 생성한 WAV 파일 경로 사용
python -c "
from stt import transcribe
text = transcribe('/tmp/your_test.wav')
print('인식 결과:', text)
"
```

Expected: 녹음한 말이 텍스트로 출력

**Step 3: 커밋**

```bash
git add stt.py
git commit -m "feat: add Whisper STT module with Korean support"
```

---

## Task 4: Telegram 클라이언트 모듈 (telegram_client.py)

**Files:**
- Create: `voice-telegram-bot/telegram_client.py`

**Step 1: telegram_client.py 작성**

```python
import asyncio
import time
import requests
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CLAUDE_CHAT_ID

BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def send_message(text: str) -> None:
    """클로봇에게 텍스트 메시지 전송."""
    resp = requests.post(f"{BASE_URL}/sendMessage", json={
        "chat_id": TELEGRAM_CLAUDE_CHAT_ID,
        "text": text
    })
    resp.raise_for_status()


def get_latest_reply(after_message_id: int, timeout: int = 30) -> str | None:
    """
    after_message_id 이후에 도착한 클로봇의 첫 번째 응답을 반환.
    timeout 초 내에 응답이 없으면 None 반환.
    """
    deadline = time.time() + timeout
    offset = None

    while time.time() < deadline:
        params = {"timeout": 5}
        if offset:
            params["offset"] = offset

        resp = requests.get(f"{BASE_URL}/getUpdates", params=params)
        resp.raise_for_status()
        updates = resp.json().get("result", [])

        for update in updates:
            offset = update["update_id"] + 1
            msg = update.get("message", {})
            if (
                msg.get("chat", {}).get("id") == TELEGRAM_CLAUDE_CHAT_ID
                and msg.get("message_id", 0) > after_message_id
                and "text" in msg
            ):
                return msg["text"]

        time.sleep(0.5)

    return None


def get_current_message_id() -> int:
    """현재 채팅의 최신 메시지 ID 조회 (폴링 기준점)."""
    resp = requests.get(f"{BASE_URL}/getUpdates", params={"limit": 1})
    resp.raise_for_status()
    updates = resp.json().get("result", [])
    if updates:
        return updates[-1].get("message", {}).get("message_id", 0)
    return 0
```

**Step 2: 연결 테스트**

```bash
python -c "
from telegram_client import send_message, get_current_message_id
mid = get_current_message_id()
print('현재 메시지 ID:', mid)
send_message('안녕! 테스트 메시지입니다.')
print('전송 완료')
"
```

Expected: 텔레그램 클로봇 채팅에 메시지 수신 확인

**Step 3: 응답 폴링 테스트**

```bash
python -c "
from telegram_client import send_message, get_latest_reply, get_current_message_id
mid = get_current_message_id()
send_message('안녕하세요! 짧게 한 문장만 답해주세요.')
print('응답 대기 중...')
reply = get_latest_reply(after_message_id=mid, timeout=30)
print('클로봇 응답:', reply)
"
```

Expected: 클로봇 응답 텍스트 출력

**Step 4: 커밋**

```bash
git add telegram_client.py
git commit -m "feat: add Telegram Bot API client with response polling"
```

---

## Task 5: TTS 모듈 (tts.py)

**Files:**
- Create: `voice-telegram-bot/tts.py`

**Step 1: tts.py 작성**

```python
import tempfile
import os
import subprocess
from openai import OpenAI
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)


def speak(text: str, voice: str = "nova") -> None:
    """
    텍스트를 OpenAI TTS로 변환 후 macOS에서 재생.
    voice 옵션: alloy, echo, fable, onyx, nova, shimmer
    """
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name

    response = client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text
    )
    response.stream_to_file(tmp_path)

    # macOS afplay로 재생 (추가 설치 불필요)
    subprocess.run(["afplay", tmp_path], check=True)
    os.unlink(tmp_path)
```

> `playsound` 대신 macOS 내장 `afplay`를 사용하여 의존성 문제 회피.

**Step 2: TTS 테스트**

```bash
python -c "
from tts import speak
speak('안녕하세요. 음성 테스트입니다. 잘 들리시나요?')
"
```

Expected: 스피커에서 자연스러운 한국어 음성 재생

**Step 3: requirements.txt 업데이트 (playsound 제거)**

`requirements.txt`에서 `playsound==1.2.2` 줄 삭제 (`afplay` 사용으로 불필요)

**Step 4: 커밋**

```bash
git add tts.py requirements.txt
git commit -m "feat: add OpenAI TTS module with afplay for macOS"
```

---

## Task 6: 메인 루프 (main.py)

**Files:**
- Create: `voice-telegram-bot/main.py`

**Step 1: main.py 작성**

```python
import sys
from config import validate_config
from recorder import Recorder
from stt import load_model, transcribe
from telegram_client import send_message, get_latest_reply, get_current_message_id
from tts import speak


def main():
    print("=== Voice-Telegram Claude Bot ===")

    # 설정 검증
    validate_config()

    # Whisper 모델 사전 로딩
    load_model("base")

    recorder = Recorder()

    print("\n준비 완료! 클로봇과 음성으로 대화합니다.")
    print("종료하려면 Ctrl+C를 누르세요.\n")

    try:
        while True:
            input("[ ENTER를 누르면 녹음 시작... ]")
            print("🎤 녹음 중... [ ENTER를 누르면 중지 ]")

            recorder.start()
            input()  # ENTER 누를 때까지 대기
            wav_path = recorder.stop()

            print("📝 음성 인식 중...", end=" ", flush=True)
            text = transcribe(wav_path)
            print(f'"{text}"')

            if not text:
                print("⚠️  인식된 텍스트가 없습니다. 다시 시도하세요.\n")
                continue

            # 폴링 기준점 확보 후 메시지 전송
            last_id = get_current_message_id()
            send_message(text)
            print("📨 클로봇에게 전송 완료.")

            print("⏳ 응답 대기 중 (최대 30초)...", end=" ", flush=True)
            reply = get_latest_reply(after_message_id=last_id, timeout=30)

            if reply is None:
                print("\n⚠️  30초 내에 응답이 없었습니다.\n")
                continue

            print(f'\n💬 클로봇: "{reply[:80]}{"..." if len(reply) > 80 else ""}"')
            print("🔊 재생 중...")
            speak(reply)
            print()

    except KeyboardInterrupt:
        print("\n\n👋 종료합니다.")
    finally:
        recorder.cleanup()


if __name__ == "__main__":
    main()
```

**Step 2: 전체 통합 테스트**

```bash
cd ~/Documents/Claude/voice-telegram-bot
python main.py
```

테스트 시나리오:
1. ENTER 눌러 녹음 시작
2. "안녕하세요, 오늘 날씨 어때요?" 말하기
3. ENTER 눌러 녹음 중지
4. 텍스트 인식 결과 확인
5. 클로봇 응답 도착 후 음성 재생 확인

**Step 3: 커밋**

```bash
git add main.py
git commit -m "feat: add main loop - complete voice-to-telegram pipeline"
```

---

## Task 7: 마무리 및 README

**Files:**
- Create: `voice-telegram-bot/README.md`

**Step 1: README.md 작성**

```markdown
# Voice-Telegram Claude Bot

마이크로 말하면 텔레그램 클로봇에게 전송하고, 응답을 음성으로 재생.

## 요구사항

- Python 3.10+
- macOS (afplay 내장)
- Telegram Bot Token (BotFather)
- OpenAI API Key

## 설치

```bash
pip install -r requirements.txt
# PyAudio 오류 시: brew install portaudio && pip install pyaudio
```

## 설정

```bash
cp .env.example .env
# .env 파일에 실제 키 입력
```

## Chat ID 확인 방법

1. 텔레그램에서 클로봇과 대화
2. 브라우저에서 접속: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. `result[].message.chat.id` 값을 복사

## 실행

```bash
python main.py
```

ENTER: 녹음 시작/종료 | Ctrl+C: 종료
```

**Step 2: 최종 커밋**

```bash
git add README.md
git commit -m "docs: add README for voice-telegram-bot"
```

---

## 문제 해결 가이드

| 오류 | 원인 | 해결 |
|------|------|------|
| `OSError: [Errno -9996]` | PyAudio 마이크 권한 | 시스템 환경설정 → 개인정보 → 마이크 허용 |
| `whisper not found` | 모델 다운로드 실패 | 인터넷 연결 확인 후 재실행 |
| `Unauthorized` (Telegram) | 잘못된 봇 토큰 | .env의 TELEGRAM_BOT_TOKEN 재확인 |
| `afplay: command not found` | macOS가 아님 | tts.py에서 `afplay` → `ffplay` 또는 `mpg123`로 변경 |
| TTS 음성이 너무 빠름 | 기본 속도 | `speak()` 호출 시 `voice="nova"` → 다른 목소리 시도 |
