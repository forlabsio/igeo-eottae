# Voice-to-Telegram Claude Bot 설계

**작성일**: 2026-02-19
**목표**: 음성 입력 → 텔레그램 클로봇 → 음성 출력으로 자연스러운 음성 대화 시스템 구축

---

## 프로젝트 개요

사용자가 마이크로 말하면 자동으로 텔레그램 클로봇(Claude Bot)에게 메시지를 전송하고,
봇의 응답을 음성으로 재생해 주는 Python CLI 프로그램.

실제로는 텔레그램 텍스트 대화이지만, 사용자는 음성으로 대화하는 것처럼 느낌.

---

## 기술 스택

| 컴포넌트 | 선택 | 이유 |
|---------|------|------|
| STT | OpenAI Whisper (로컬 `base` 모델) | 로컬 실행, 한국어 지원 양호 |
| 텔레그램 클라이언트 | python-telegram-bot (Bot API) | 봇 토큰만 있으면 되고 단순함 |
| TTS | OpenAI TTS API (`nova` 목소리) | 자연스러운 한국어 음성 |
| 오디오 녹음 | PyAudio | 표준 마이크 녹음 라이브러리 |
| 실행 환경 | macOS, Python 3.10+, 터미널 CLI |

---

## 아키텍처

```
[사용자 마이크]
      ↓ PyAudio 녹음 (Push-to-Talk)
[recorder.py] → WAV 파일 (임시)
      ↓
[stt.py] ← Whisper base 모델
      ↓ 한국어 텍스트
[telegram_client.py] → Telegram Bot API → [클로봇]
                     ← 클로드 응답 텍스트 (폴링)
[tts.py] ← OpenAI TTS API (nova)
      ↓ MP3 임시 파일
[audio_player.py] → macOS 스피커 재생
```

---

## 프로젝트 구조

```
voice-telegram-bot/
├── main.py              # 메인 루프 + CLI 인터페이스
├── recorder.py          # 마이크 녹음 (push-to-talk)
├── stt.py               # Whisper STT 변환
├── telegram_client.py   # Telegram Bot API 통신 + 응답 폴링
├── tts.py               # OpenAI TTS 변환 + 오디오 재생
├── config.py            # 설정값 로딩 (.env)
├── requirements.txt     # 의존성 목록
└── .env                 # API 키 (git에서 제외)
```

---

## 실행 흐름 (상세)

```
1. 프로그램 시작
   - Whisper 모델 로딩 (최초 1회, 약 10초)
   - Telegram 봇 연결 확인
   - "[ENTER]를 누르면 녹음 시작..." 표시

2. 사용자 ENTER 키 → 녹음 시작
   - PyAudio로 마이크 입력 캡처 시작
   - "🎤 녹음 중... [ENTER]를 눌러 중지" 표시

3. 사용자 ENTER 키 → 녹음 중지
   - WAV 파일로 저장 (임시)

4. STT 변환
   - Whisper로 한국어 텍스트 변환
   - "📝 인식된 텍스트: ..." 표시

5. Telegram 전송
   - 클로봇에게 텍스트 전송
   - "📨 클로봇에게 전송 완료..." 표시

6. 응답 대기 (폴링)
   - 최대 30초 동안 클로봇 응답 확인
   - "⏳ 응답 대기 중..." 표시

7. TTS 변환 및 재생
   - OpenAI TTS API로 음성 변환
   - "🔊 재생 중..." 표시 후 재생

8. 2번으로 돌아가 반복
```

---

## 설정값 (.env)

```env
TELEGRAM_BOT_TOKEN=...       # BotFather에서 발급
TELEGRAM_CLAUDE_CHAT_ID=...  # 클로봇과의 대화 Chat ID
OPENAI_API_KEY=...            # TTS용 OpenAI API 키
```

---

## 주요 기술 결정사항

### Push-to-Talk 방식
- VAD(음성감지) 대신 ENTER 키로 시작/종료
- 이유: 구현 단순, 오작동 없음, 조용한 환경에 의존하지 않음

### Whisper `base` 모델
- `tiny`: 빠르지만 한국어 정확도 낮음
- `base`: 한국어 지원 양호, Mac CPU에서 약 1~3초
- `small` 이상: 정확하지만 CPU에서 느림

### 응답 폴링 방식
- 메시지 전송 후 `getUpdates` API로 주기적 확인
- 폴링 간격: 0.5초
- 타임아웃: 30초 (초과 시 "응답 없음" 처리)

---

## 예상 레이턴시

| 단계 | 시간 |
|------|------|
| Whisper STT | 1~3초 |
| Telegram 전송 | ~0.3초 |
| Claude 응답 생성 | 2~5초 |
| OpenAI TTS | ~1초 |
| **총 체감 딜레이** | **4~9초** |

---

## 의존성 (requirements.txt)

```
openai>=1.0.0
openai-whisper
python-telegram-bot>=20.0
pyaudio
python-dotenv
playsound
```

---

## 향후 개선 가능 방향

1. VAD(음성감지) 자동 감지 추가 (silero-vad)
2. 대화 히스토리 저장 기능
3. 여러 봇 지원 (설정 파일로 봇 선택)
4. GUI 버전 (tkinter 또는 PyQt)
