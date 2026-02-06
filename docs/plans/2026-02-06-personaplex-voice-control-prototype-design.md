# PersonaPlex 음성 제어 프로토타입 설계

**작성일**: 2026-02-06
**목표**: Mac Mini에서 PersonaPlex 모델을 사용한 음성 입출력 프로토타입 구축

## 프로젝트 개요

음성 기반 차량 제어 시스템의 첫 단계로, PersonaPlex 7B 모델을 Mac Mini에서 실행하고 음성 입출력 기능을 검증합니다.

**전체 로드맵 컨텍스트**:
1. **현재 단계**: Mac Mini 프로토타입 (PersonaPlex 음성 I/O)
2. 향후: 의도 파싱 로직 추가
3. 향후: Qualcomm 칩셋 포팅 (ONNX/QNN)
4. 향후: 차량 ECU 연동

**현재 범위**: PersonaPlex 통합 및 음성 입출력만 검증

## 기술 제약사항

- **하드웨어**: Mac Mini, CPU only (GPU 없음)
- **메모리**: 최소 16GB 필요
- **실행 환경**: Docker 컨테이너
- **오디오**: 시스템 오디오 (마이크 + 스피커)
- **테스트 모드**: Interactive CLI

---

## 1. 시스템 아키텍처 및 컴포넌트

### 전체 구조

프로토타입은 Docker 컨테이너 내부에서 실행되는 3개 레이어로 구성:

1. **Audio Interface Layer** - 시스템 마이크 입력 캡처 및 스피커 출력 재생 (컨테이너에 오디오 장치 노출)

2. **PersonaPlex Engine Layer** - HuggingFace transformers를 통해 로딩된 7B 파라미터 모델, PyTorch CPU 백엔드 사용

3. **CLI Controller Layer** - 인터랙션 루프 오케스트레이션: 녹음 → 처리 → 재생 → 반복

### 핵심 컴포넌트

**Dockerfile**
- 베이스: `python:3.10-slim`
- 설치: PyTorch (CPU), transformers, soundfile, pyaudio
- 예상 이미지 크기: ~5GB

**model_loader.py**
- PersonaPlex 모델을 시작 시 로딩
- 메모리에 캐싱 (반복 다운로드 방지)
- HuggingFace Hub에서 자동 다운로드

**audio_handler.py**
- PyAudio를 통한 마이크 녹음 관리
- 스피커 재생 관리
- 오디오 포맷 변환 (PersonaPlex 요구사항: 16kHz mono WAV)

**main.py**
- Interactive CLI 메인 루프
- 사용자 음성 캡처 → PersonaPlex 호출 → 응답 재생

### 리소스 고려사항

- **메모리**: 7B 모델 로딩 시 ~14GB 소비, Docker에 최소 16GB 할당 필요
- **추론 속도**: CPU 추론으로 인해 응답당 5-15초 예상 (오디오 길이에 따라 다름)
- **디스크**: 모델 캐시 ~14GB, 로그 파일 최소 공간

---

## 2. 데이터 플로우 및 처리 파이프라인

### 인터랙션 플로우

**1. 오디오 캡처**
- CLI가 "Speak now..." 프롬프트 표시
- PyAudio로 마이크에서 녹음 (기본 5초 또는 silence detection)
- 옵션: VAD (Voice Activity Detection)로 무음 자동 감지

**2. 오디오 전처리**
```
Raw audio → 16kHz 리샘플링 → 모노 변환 → 볼륨 정규화 → WAV/NumPy 배열
```

**3. PersonaPlex 추론**
- 오디오 텐서를 모델에 입력
- 모델의 end-to-end 처리:
  - 음성 → 내부 음성 인식 → 언어 이해 → 음성 합성 → 오디오 출력
- 오디오 응답을 텐서/배열로 반환

**4. 오디오 후처리**
```
모델 출력 → 재생 가능 포맷(WAV) 변환 → 볼륨 조정
```

**5. 오디오 재생**
- PyAudio로 스피커를 통해 응답 재생
- 사용자가 PersonaPlex 음성 응답 청취

**6. 루프**
- 다음 인터랙션을 위해 1단계로 복귀 (또는 명령으로 종료)

### 데이터 포맷

- **입력**: Raw PCM (마이크) → 16kHz, mono, 16-bit PCM WAV
- **모델 내부**: Float32 텐서, normalized [-1, 1]
- **출력**: Float32 오디오 → 16-bit PCM (재생용)

### 성능 특성

- 첫 추론이 느림 (모델 워밍업)
- 이후 호출은 더 일관된 속도
- 각 단계별 타이밍 로그 추가 예정

---

## 3. Docker 설정 및 의존성

### Dockerfile 구조

**베이스 이미지**: `python:3.10-slim`

전체 NVIDIA 스택 대신 CPU 전용 PyTorch 설치로 이미지 크기 최소화 (~5GB 예상)

### 핵심 의존성

```txt
torch>=2.0.0 (CPU 버전)
transformers>=4.30.0
soundfile>=0.12.0
pyaudio>=0.2.13
numpy>=1.24.0
```

**추가 시스템 패키지**:
- `portaudio19-dev` (PyAudio 빌드용)
- `ffmpeg` (오디오 코덱 지원)

### 오디오 디바이스 연결

Mac 오디오 장치를 컨테이너에 노출:

**옵션 1**: `--device` 플래그로 오디오 장치 마운트
```bash
docker run --device /dev/snd ...
```

**옵션 2**: PulseAudio/ALSA 소켓 공유
```bash
-v /run/user/$(id -u)/pulse:/run/user/1000/pulse
```

**Mac 특화 고려사항**: CoreAudio 접근을 위해 특정 권한이 필요할 수 있음

### 모델 캐싱

PersonaPlex 모델(~14GB)을 매번 다운로드하지 않도록 호스트 볼륨 마운트:

```bash
-v ~/.cache/huggingface:/root/.cache/huggingface
```

### 컨테이너 리소스 할당

```bash
docker run \
  --memory=16g \
  --cpus="0.000" \  # CPU 제한 없음 (가용한 모든 코어)
  ...
```

---

## 4. 에러 핸들링 및 로깅

### 주요 에러 시나리오

**1. 모델 로딩 실패**
- 원인: PersonaPlex 다운로드 실패, 메모리 부족
- 처리: 명확한 에러 메시지 + 종료
- 로그: 사용 가능 메모리, 디스크 공간 기록

**2. 오디오 장치 접근 실패**
- 원인: 마이크/스피커 찾을 수 없음, 권한 없음
- 처리: 사용 가능한 오디오 장치 리스트 표시, 수동 선택 옵션
- 재시도: 최대 3회 자동 재시도

**3. 추론 타임아웃**
- 원인: CPU 추론이 너무 오래 걸림 (>60초)
- 처리: 경고 메시지, 계속 대기/취소 사용자 선택
- 로그: 추론 시간, 오디오 길이 기록

**4. 오디오 포맷 에러**
- 원인: 지원하지 않는 샘플레이트/채널 수
- 처리: 자동 리샘플링 시도, 실패 시 명확한 에러 메시지

### 로깅 전략

**로그 레벨**:
- **DEBUG**: 각 처리 단계 타이밍, 텐서 shape, 오디오 길이
- **INFO**: 모델 로딩 완료, 추론 시작/완료, 전체 응답 시간
- **ERROR**: 모든 예외, 스택 트레이스 포함

**로그 파일**:
```
logs/personaplex_YYYYMMDD.log
```

호스트에 마운트하여 쉬운 디버깅:
```bash
-v $(pwd)/logs:/app/logs
```

---

## 5. 테스팅 전략

### 단계별 테스트

**1. 환경 검증 테스트** (`setup_test.py`)
- Docker 컨테이너 빌드 성공 확인
- 필요한 Python 패키지 import 검증
- 오디오 장치 감지 확인
- **예상 시간**: 2-3분

**2. 모델 로딩 테스트** (`model_test.py`)
- PersonaPlex 모델 다운로드 및 로딩
- 메모리 사용량 측정 (14GB 이하 확인)
- 더미 텐서로 간단한 추론 수행
- **예상 시간**: 첫 실행 10-15분 (다운로드 포함), 이후 1-2분

**3. 오디오 파이프라인 테스트** (`audio_test.py`)
- 마이크 녹음 → WAV 저장 검증
- WAV 파일 → 재생 검증
- 포맷 변환 (리샘플링, 모노 변환) 테스트
- **예상 시간**: 1분

**4. End-to-End 테스트** (`e2e_test.py`)
- 실제 음성 입력 → PersonaPlex → 음성 출력
- 간단한 발화 테스트 예시:
  - "Hello"
  - "How are you?"
  - "Tell me about yourself"
- 전체 레이턴시 측정
- **예상 시간**: 첫 추론 15-20초, 이후 5-10초

### 성공 기준

✅ 모델이 정상적으로 로딩되고 메모리에 유지됨
✅ 음성 입력을 받아서 음성 출력을 생성함 (내용 정확성은 다음 단계)
✅ 에러 없이 최소 3회 연속 대화 가능
✅ 각 응답의 레이턴시가 30초 이하 (CPU only 고려)

---

## 다음 단계 (이 설계 범위 외)

1. **의도 파싱**: PersonaPlex 출력에서 차량 제어 명령 추출
2. **차량 시뮬레이터**: 더미 차량 제어 시뮬레이션 (창문, 에어컨 등)
3. **최적화**: ONNX export 및 Qualcomm QNN 변환 검토
4. **하드웨어 포팅**: 실제 임베디드 칩셋에서 테스트

---

## 참고 자료

- PersonaPlex 모델: https://huggingface.co/nvidia/personaplex-7b-v1
- Moshi 아키텍처: https://github.com/kyutai-labs/moshi
- PyTorch CPU 최적화: https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html
