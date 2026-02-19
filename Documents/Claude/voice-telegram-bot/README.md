# Voice-Telegram Claude Bot

마이크로 말하면 텔레그램 클로봇에게 전송하고, 응답을 음성으로 재생하는 Python CLI 프로그램.

실제로는 텔레그램 텍스트 대화이지만, 사용자는 음성으로 대화하는 것처럼 느낌.

## 동작 방식

```
마이크 → Whisper STT → 텔레그램 클로봇 → OpenAI TTS → 스피커
```

## 요구사항

- Python 3.9+
- macOS (`afplay` 내장 필요)
- Telegram Bot Token (BotFather에서 발급)
- OpenAI API Key (TTS + 없음, STT는 로컬)

## 설치

```bash
pip install -r requirements.txt
```

PyAudio 설치 실패 시:
```bash
brew install portaudio && pip install pyaudio
```

## 설정

```bash
cp .env.example .env
```

`.env` 파일에 실제 값 입력:

| 변수 | 설명 |
|------|------|
| `TELEGRAM_BOT_TOKEN` | BotFather에서 `/newbot`으로 발급 |
| `TELEGRAM_CLAUDE_CHAT_ID` | 클로봇과의 대화 Chat ID |
| `OPENAI_API_KEY` | OpenAI 플랫폼에서 발급 |

### Chat ID 확인 방법

1. 텔레그램에서 클로봇과 아무 메시지 교환
2. 브라우저에서 접속:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
3. 응답 JSON에서 `result[0].message.chat.id` 값 복사

## 실행

```bash
python main.py
```

### 조작법

| 키 | 동작 |
|----|------|
| ENTER | 녹음 시작 / 종료 |
| Ctrl+C | 프로그램 종료 |

## 예상 레이턴시

말을 멈춘 후 응답 음성이 나오기까지:

| 단계 | 시간 |
|------|------|
| Whisper STT (로컬) | 1~3초 |
| 텔레그램 전송 | ~0.3초 |
| Claude 응답 생성 | 2~5초 |
| OpenAI TTS | ~1초 |
| **총** | **4~9초** |

## 문제 해결

| 오류 | 원인 | 해결 |
|------|------|------|
| `OSError: [Errno -9996]` | 마이크 권한 없음 | 시스템 환경설정 → 개인정보 → 마이크 → 터미널 허용 |
| `Unauthorized` | 잘못된 봇 토큰 | `.env`의 `TELEGRAM_BOT_TOKEN` 재확인 |
| `ValueError: .env에 다음 값이 없습니다` | `.env` 파일 미설정 | `cp .env.example .env` 후 값 입력 |
| 응답 없음 (30초 타임아웃) | 클로봇이 Bot 메시지를 받지 못함 | Chat ID 재확인, 봇이 해당 채팅에 있는지 확인 |
