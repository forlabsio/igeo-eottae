import pyaudio
import wave
import tempfile
import threading

CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  # Whisper recommended sample rate


class Recorder:
    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self._frames = []
        self._recording = False
        self._stream = None
        self._thread = None

    def start(self):
        """Start recording in a background thread."""
        self._frames = []
        self._recording = True
        self._stream = self.audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        self._thread = threading.Thread(target=self._record_loop, daemon=True)
        self._thread.start()

    def _record_loop(self):
        while self._recording:
            data = self._stream.read(CHUNK, exception_on_overflow=False)
            self._frames.append(data)

    def stop(self) -> str:
        """Stop recording. Returns path to temp WAV file."""
        self._recording = False
        if self._thread:
            self._thread.join()
        if self._stream:
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
