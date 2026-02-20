from config import validate_config
from recorder import Recorder
from stt import load_model, transcribe
from telegram_client import send_and_receive
from tts import speak


def main():
    print("=== Voice-Telegram Claude Bot ===")

    validate_config()
    load_model("base")

    recorder = Recorder()

    print("\n준비 완료! 클로봇과 음성으로 대화합니다.")
    print("종료하려면 Ctrl+C를 누르세요.\n")

    try:
        while True:
            input("[ ENTER를 누르면 녹음 시작... ]")
            print("🎤 녹음 중... [ ENTER를 누르면 중지 ]")

            recorder.start()
            input()
            wav_path = recorder.stop()

            print("📝 음성 인식 중...", end=" ", flush=True)
            text = transcribe(wav_path)
            print(f'"{text}"')

            if not text:
                print("⚠️  인식된 텍스트가 없습니다. 다시 시도하세요.\n")
                continue

            print("📨 클로봇에게 전송 중...")
            reply = send_and_receive(text, timeout=30)

            if reply is None:
                print("⚠️  30초 내에 응답이 없었습니다.\n")
                continue

            preview = reply[:80] + ("..." if len(reply) > 80 else "")
            print(f'💬 클로봇: "{preview}"')
            print("🔊 재생 중...")
            speak(reply)
            print()

    except KeyboardInterrupt:
        print("\n\n👋 종료합니다.")
    finally:
        recorder.cleanup()


if __name__ == "__main__":
    main()
