# World Live Globe - 전세계 실시간 라이브 스트림 3D 지구 웹앱

**날짜**: 2026-03-03
**상태**: 설계 완료, 구현 준비

---

## 개요

3D 지구본 위에 전 세계 실시간 라이브 스트림을 시각화하는 순수 웹 프론트엔드 앱.
국가 마커를 클릭하면 해당 나라의 TV 채널, YouTube 라이브, 웹캠 피드를 바로 시청 가능.

---

## 기술 스택

- **3D 렌더링**: Three.js (SphereGeometry + NASA 텍스처)
- **비디오 재생**: HLS.js (M3U8), YouTube iframe embed, HTML5 `<video>`
- **채널 데이터**: IPTV-Org GitHub CDN, 큐레이션된 YouTube/웹캠 목록
- **배포**: Vercel / GitHub Pages (서버 없음)
- **의존성**: Three.js CDN, HLS.js CDN

---

## 아키텍처

```
world-live/
├── index.html          # 단일 페이지 앱
├── js/
│   ├── globe.js        # Three.js 3D 지구 렌더링
│   ├── channels.js     # IPTV-Org + YouTube + 웹캠 데이터 로딩
│   ├── player.js       # HLS.js + YouTube iframe 플레이어
│   └── app.js          # 전체 앱 로직 연결
├── css/
│   └── style.css       # 다크 테마 UI
└── data/
    ├── countries.json  # 국가코드 → 위도/경도 매핑
    └── youtube.json    # 큐레이션된 YouTube 라이브 목록
```

---

## 핵심 흐름

```
앱 시작
  → Three.js 지구 로드 (NASA Blue Marble 텍스처)
  → IPTV-Org에서 국가별 채널 목록 패치 (지연 로딩)
  → 각 국가 위치에 빛나는 마커 표시 (lat/lon → 3D 좌표)
  → 사용자가 마커 클릭 (Raycaster 감지)
  → 해당 국가 채널 목록 팝업 슬라이드인
  → 채널 선택 → PiP 플레이어에서 재생
  → 지구는 옆에서 계속 자동 회전
```

---

## 3D 지구 구현

### 컴포넌트
```javascript
// 지구 본체
SphereGeometry(5, 64, 64) + MeshPhongMaterial({
  map: earthDayTexture,      // NASA Blue Marble (무료)
  specularMap: oceanGloss,   // 바다 반사광
  bumpMap: elevationMap,     // 지형 요철
})

// 대기권 글로우
SphereGeometry(5.15, 64, 64) + 반투명 파란 쉐이더

// 별 배경
Points geometry + 5000개 랜덤 점

// 조명
AmbientLight(0.3) + DirectionalLight (태양광)
```

### 국가 마커
- 각 국가 lat/lon → 구면좌표 → 3D 벡터 변환
- `SphereGeometry(0.08)` + 주황/빨간 발광 Material
- 마우스 호버 시 펄싱(크기 진동) 애니메이션
- 채널 보유 국가만 마커 표시

### 카메라 컨트롤
- `OrbitControls`: 드래그 회전, 스크롤 줌
- 자동 회전: y축 0.002 rad/frame
- 마우스 오버 시 자동회전 일시정지
- 국가 클릭 시 카메라 트윈 애니메이션 (해당 국가 포커스)

---

## 채널 데이터 시스템

### IPTV-Org 연동
```javascript
// GitHub CDN (CORS OK, 무료)
const BASE = 'https://iptv-org.github.io/iptv/countries/'

async function loadCountryChannels(countryCode) {
  const response = await fetch(`${BASE}${countryCode}.m3u`)
  const text = await response.text()
  return parseM3U(text) // → [{name, url, logo, group}, ...]
}
```
- 8,000+ 채널, 국가별 M3U 파일 패치
- 지연 로딩: 마커 클릭 시에만 해당 국가 채널 로드

### YouTube 라이브 (큐레이션)
```json
[
  {"country": "KR", "name": "YTN 뉴스", "videoId": "4s9IjkMg4wQ"},
  {"country": "US", "name": "ABC News Live", "videoId": "w_Ma8oQLmSM"},
  {"country": "JP", "name": "NHK World", "videoId": "oJwXMG52sqQ"}
]
```
- YouTube iframe embed (API 키 불필요)

### 웹캠 피드
- 정적 큐레이션 목록 (교통 CCTV, 자연 풍경, 도시 뷰)
- HLS/MJPEG 포맷

### 스트림 타입 자동 감지
```javascript
function detectStreamType(url) {
  if (url.includes('.m3u8')) return 'hls'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('.mp4') || url.includes('.ts')) return 'mp4'
  return 'hls' // 기본값
}
```

### CORS 고려사항
- IPTV-Org CDN: CORS 허용됨 (GitHub Pages 도메인)
- HLS 스트림: 일부 채널 CORS 오류 가능 → 오류 시 다음 채널 자동 시도
- YouTube iframe: CORS 문제 없음 (embed 방식)

---

## UI/UX 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  🌍 WORLD LIVE        [검색창]  [랜덤 채널]  [커스텀 URL]│
├─────────────────────────────────────────────────────┤
│                                                     │
│           [  3D 지구 (전체화면 배경)  ]                │
│         ●  ●  ●  ← 국가 마커 (발광 점)               │
│                                                     │
│  ┌──────────────────────┐                           │
│  │ 국가 클릭 시 팝업     │  ← 슬라이드인 패널         │
│  │ 🇰🇷 한국 채널 (23개) │                           │
│  │  ○ KBS 1TV [HLS]     │                           │
│  │  ○ MBC [HLS]         │                           │
│  │  ○ YTN 뉴스 [YT]     │                           │
│  │  ○ 서울 웹캠 [CAM]    │                           │
│  │  + 직접 URL 입력...  │                           │
│  └──────────────────────┘                           │
│                                                     │
│              [PiP 플레이어 우하단 고정]               │
└─────────────────────────────────────────────────────┘
```

### 스타일 가이드
- 배경: `#000000` (완전 검은색)
- 마커: 주황/빨간 펄싱 글로우 (`#ff4400`)
- UI 패널: `rgba(0,0,0,0.85)` + blur backdrop
- 폰트: 시스템 monospace
- 포커스 색상: `#00ff88` (네온 그린)

### 상태별 동작
| 상태 | 동작 |
|------|------|
| 기본 | 지구 자동 회전, 마커 펄싱 |
| 마커 호버 | 자동회전 정지, 마커 확대, 국가명 툴팁 |
| 마커 클릭 | 채널 목록 패널 슬라이드인, 카메라 포커스 |
| 채널 재생 | PiP 플레이어 활성화, 지구 계속 회전 |
| PiP 전체화면 | 오버레이 확장, 지구 배경에 유지 |

---

## MVP 스코프 (YAGNI)

**포함:**
- Three.js 3D 지구 + NASA 텍스처
- IPTV-Org 국가별 채널 로드
- YouTube 큐레이션 목록 (~20개국)
- HLS.js 스트림 재생
- 커스텀 URL 입력
- 다크 테마 반응형 UI

**제외 (추후 고려):**
- 사용자 즐겨찾기 저장
- 채널 상태 실시간 모니터링
- 다중 스트림 동시 시청
- 모바일 터치 제스처 최적화

---

## 구현 단계

1. **Phase 1**: Three.js 지구 + 마커 + OrbitControls
2. **Phase 2**: countries.json + 마커 렌더링 + Raycaster 클릭 감지
3. **Phase 3**: IPTV-Org 채널 로딩 + M3U 파서
4. **Phase 4**: HLS.js 플레이어 + YouTube iframe
5. **Phase 5**: UI 패널 (채널 목록, PiP 플레이어) + 스타일링
6. **Phase 6**: 커스텀 URL 입력 + 에러 처리 + 배포