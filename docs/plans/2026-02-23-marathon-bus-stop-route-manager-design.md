# 마라톤 노선 관리 웹 애플리케이션 디자인

**작성일**: 2026-02-23
**목적**: 마라톤 노선 주변 버스 정류장에 전단지를 붙이는 작업을 관리하기 위한 지도 기반 웹 애플리케이션

## 개요

국토교통부의 전국 버스 정류장 위치정보 (227,066개)를 활용하여, 사용자가 지역을 선택하고 버스 정류장을 클릭하여 마라톤 노선을 만들고 저장할 수 있는 단일 HTML 파일 웹 애플리케이션입니다.

### 핵심 요구사항

- ✅ 단일 HTML 파일로 구현 (서버 불필요)
- ✅ 지역 선택 기능으로 버스 정류장 필터링
- ✅ 여러 노선 저장 및 관리
- ✅ Leaflet.js + OpenStreetMap 사용
- ✅ localStorage 기반 데이터 영속성
- ❌ 작업 완료 상태 관리 불필요

## 1. 전체 아키텍처

### 1.1 HTML 구조

```
index.html (단일 파일)
├── <head>
│   ├── Leaflet CSS (CDN)
│   ├── Tailwind CSS (CDN)
│   └── 내부 스타일 (<style>)
├── <body>
│   ├── 헤더 영역
│   │   ├── 제목: "마라톤 노선 관리"
│   │   └── 지역 선택 드롭다운
│   ├── 메인 컨테이너 (flex)
│   │   ├── 지도 영역 (70% 너비)
│   │   └── 사이드바 (30% 너비)
│   │       ├── 노선 선택 드롭다운
│   │       ├── 선택된 정류장 목록 (스크롤 가능)
│   │       └── 버튼 그룹
│   │           ├── 새 노선 만들기
│   │           ├── 노선 저장
│   │           ├── 노선 삭제
│   │           └── 초기화
│   ├── <script type="text/csv" id="bus-stops-data">
│   │   (CSV 데이터 임베딩)
│   └── <script>
│       ├── Leaflet JS (CDN)
│       ├── PapaParse (CDN)
│       └── 애플리케이션 로직
```

### 1.2 기술 스택

| 항목 | 기술 | 버전/방식 |
|------|------|-----------|
| 지도 | Leaflet.js | 1.9.4 (CDN) |
| 지도 타일 | OpenStreetMap | 무료 타일 서버 |
| 스타일링 | Tailwind CSS | 3.x (CDN) |
| CSV 파싱 | PapaParse | 5.x (CDN) |
| 상태 관리 | Vanilla JavaScript | - |
| 데이터 저장 | localStorage | 브라우저 내장 |

### 1.3 CSV 데이터 임베딩

```html
<script type="text/csv" id="bus-stops-data">
정류장고유번호,정류장명,위도,경도,최종수정일,관리번호자,시도코드,시도명,제공기관명
ADB354000001,가능역,36.458658,128.891228,2025-10-31,540001,37040,경북 안동시,안동BIS
...
</script>
```

- 파일 크기: 약 20MB (원본), 압축 시 5-7MB
- 단일 HTML 파일 요구사항 충족

## 2. 데이터 처리 전략

### 2.1 경량 필터링 우선 접근 방식

**선택 이유**: 227,066개의 마커를 한 번에 렌더링하면 브라우저 성능이 저하됨. 사용자가 선택한 지역의 정류장만 필터링하여 표시.

### 2.2 파싱 및 필터링 로직

#### 1단계: 초기 로딩 (경량)

```javascript
// 앱 시작 시
function initializeApp() {
  const csvData = document.getElementById('bus-stops-data').textContent;
  const parsed = Papa.parse(csvData, { header: true });

  // 시도명만 추출하여 중복 제거
  const regions = [...new Set(parsed.data.map(row => row.시도명))];

  // 지역 선택 드롭다운 생성
  populateRegionDropdown(regions);

  // 지도 초기화 (서울 시청 중심)
  initMap(37.5665, 126.9780);
}
```

#### 2단계: 지역 선택 시 (필터링)

```javascript
function onRegionChange(selectedRegion) {
  // 선택한 지역의 정류장만 필터링
  const filtered = allData.filter(row => row.시도명 === selectedRegion);

  // 메모리에 캐싱
  AppState.allBusStops = filtered;

  // 지도 중심 이동 (첫 번째 정류장 기준)
  if (filtered.length > 0) {
    map.setView([filtered[0].위도, filtered[0].경도], 12);
  }

  // 마커 렌더링
  renderMarkers(filtered);
}
```

### 2.3 CSV 컬럼 매핑

| CSV 컬럼 | 사용 용도 |
|----------|-----------|
| 정류장고유번호 | 고유 식별자 (ID) |
| 정류장명 | 마커 툴팁, 목록 표시 |
| 위도, 경도 | Leaflet 좌표 |
| 시도명 | 지역 필터링 기준 |

### 2.4 성능 최적화

- **마커 캐싱**: 같은 지역 재선택 시 마커를 다시 생성하지 않고 재사용
- **디바운싱**: 지역 변경 시 100ms 지연을 두어 불필요한 재렌더링 방지
- **가상 스크롤링**: 사이드바 정류장 목록이 500개 이상일 경우 최대 500개만 표시 + "더보기" 버튼

## 3. UI 컴포넌트 구조

### 3.1 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ 헤더: "마라톤 노선 관리"  [지역 선택 ▼]                      │
├──────────────────────────┬──────────────────────────────┤
│                          │  [노선: 2024 서울마라톤 ▼]       │
│                          ├──────────────────────────────┤
│                          │  선택된 정류장                   │
│        지도 영역          │  1. 광화문역           [X]      │
│      (Leaflet Map)       │  2. 종각역             [X]      │
│                          │  3. 시청역             [X]      │
│    - 마커 (클릭 가능)     │  ...                            │
│    - Polyline 노선       │                                 │
│                          ├──────────────────────────────┤
│                          │  [새 노선 만들기]                │
│                          │  [노선 저장]  [노선 삭제]        │
│                          │  [초기화]                        │
└──────────────────────────┴──────────────────────────────┘
```

### 3.2 주요 컴포넌트

#### 1. 지역 선택 드롭다운
- **위치**: 헤더 우측
- **데이터**: CSV에서 추출한 시/도 목록
- **동작**: 선택 시 지도 중심 이동 + 해당 지역 마커 표시

#### 2. 지도 영역 (Leaflet)
- **마커 색상**: 정류장 유형에 따라 구분 (파란색 기본, 선택 시 빨간색 테두리)
- **마커 클릭**: 노선에 추가/제거 토글
- **Polyline**: 선택된 정류장들을 순서대로 연결하는 선
- **툴팁**: 마커에 마우스 오버 시 정류장명 표시

#### 3. 노선 선택 드롭다운
- **위치**: 사이드바 상단
- **옵션**: "새 노선" + 저장된 노선 목록
- **동작**: 선택 시 해당 노선의 정류장 목록 및 Polyline 복원

#### 4. 선택된 정류장 목록
- **표시**: 순번, 정류장명, [X 삭제] 버튼
- **스크롤**: 높이 제한 + 세로 스크롤
- **삭제**: [X] 버튼 클릭 시 목록에서 제거 + 마커 강조 해제 + Polyline 재계산

#### 5. 버튼 그룹
- **새 노선 만들기**: 현재 선택 초기화 + 드롭다운을 "새 노선"으로 변경
- **노선 저장**: prompt로 이름 입력 → localStorage 저장 → 드롭다운 업데이트
- **노선 삭제**: confirm 확인 → localStorage에서 제거 → 드롭다운 업데이트 → 초기화
- **초기화**: 현재 선택만 초기화 (저장된 노선은 유지)

## 4. 상태 관리 및 localStorage

### 4.1 애플리케이션 상태

```javascript
const AppState = {
  currentRegion: null,           // 선택된 지역 (예: "서울특별시")
  allBusStops: [],               // 현재 지역의 필터링된 정류장 데이터
  currentRoute: {
    id: null,                    // 저장된 노선의 ID (새 노선이면 null)
    name: "새 노선",
    region: null,
    stops: []                    // [{id, name, lat, lng}, ...]
  },
  savedRoutes: [],               // 저장된 노선 목록
  markers: new Map(),            // Leaflet 마커 객체 캐시 (key: 정류장ID)
  polyline: null                 // 현재 그려진 Polyline 객체
};
```

### 4.2 localStorage 저장 구조

**키**: `marathon-routes`

```json
{
  "routes": [
    {
      "id": "route-1708012345678",
      "name": "2024 서울마라톤",
      "region": "서울특별시",
      "stops": [
        {
          "id": "ADB354000001",
          "name": "광화문역",
          "lat": 37.5701,
          "lng": 126.9756
        },
        {
          "id": "ADB354000002",
          "name": "종각역",
          "lat": 37.5702,
          "lng": 126.9831
        }
      ],
      "createdAt": "2024-03-15T10:30:00Z"
    }
  ]
}
```

### 4.3 주요 동작

#### 노선 저장하기

```javascript
function saveRoute() {
  if (AppState.currentRoute.stops.length === 0) {
    alert('정류장을 하나 이상 선택하세요');
    return;
  }

  const name = prompt('노선 이름을 입력하세요', AppState.currentRoute.name);
  if (!name) return;

  const route = {
    id: AppState.currentRoute.id || `route-${Date.now()}`,
    name: name,
    region: AppState.currentRegion,
    stops: AppState.currentRoute.stops,
    createdAt: new Date().toISOString()
  };

  // localStorage 저장
  const data = JSON.parse(localStorage.getItem('marathon-routes') || '{"routes":[]}');

  // 기존 노선 업데이트 또는 새로 추가
  const index = data.routes.findIndex(r => r.id === route.id);
  if (index >= 0) {
    data.routes[index] = route;
  } else {
    data.routes.push(route);
  }

  localStorage.setItem('marathon-routes', JSON.stringify(data));

  // 상태 업데이트
  AppState.currentRoute.id = route.id;
  AppState.currentRoute.name = name;
  loadSavedRoutes();
}
```

#### 노선 불러오기

```javascript
function loadRoute(routeId) {
  const data = JSON.parse(localStorage.getItem('marathon-routes') || '{"routes":[]}');
  const route = data.routes.find(r => r.id === routeId);

  if (!route) return;

  // 지역이 다르면 먼저 변경
  if (route.region !== AppState.currentRegion) {
    changeRegion(route.region);
  }

  // 현재 노선 상태 업데이트
  AppState.currentRoute = {
    id: route.id,
    name: route.name,
    region: route.region,
    stops: [...route.stops]
  };

  // UI 업데이트
  renderSelectedStops();
  highlightMarkers();
  drawPolyline();
}
```

#### 노선 삭제

```javascript
function deleteRoute() {
  if (!AppState.currentRoute.id) {
    alert('저장된 노선이 아닙니다');
    return;
  }

  if (!confirm(`"${AppState.currentRoute.name}" 노선을 삭제하시겠습니까?`)) {
    return;
  }

  const data = JSON.parse(localStorage.getItem('marathon-routes') || '{"routes":[]}');
  data.routes = data.routes.filter(r => r.id !== AppState.currentRoute.id);
  localStorage.setItem('marathon-routes', JSON.stringify(data));

  // 상태 초기화
  resetCurrentRoute();
  loadSavedRoutes();
}
```

## 5. 사용자 플로우

### 5.1 시나리오 1: 처음 사용하는 경우

1. **페이지 로드**
   - 지도가 서울 시청 중심(37.5665, 126.9780)으로 표시
   - 마커 없음
   - 헤더에 "지역을 선택하세요" 플레이스홀더

2. **지역 선택**
   - 드롭다운에서 "서울특별시" 선택
   - 지도에 서울 지역 버스 정류장 마커들 표시
   - 지도 중심이 서울로 이동
   - 사이드바에 "정류장을 클릭하여 노선을 만드세요" 안내

3. **노선 만들기**
   - 지도에서 정류장 마커 클릭
   - 사이드바 목록에 "1. [정류장명]" 추가
   - 마커에 빨간색 테두리 강조
   - 두 번째 정류장 클릭 시 Polyline 그려짐
   - 계속 클릭하여 노선 추가

4. **노선 저장**
   - "노선 저장" 버튼 클릭
   - prompt에 "2024 서울마라톤" 입력
   - localStorage에 저장
   - 노선 선택 드롭다운에 "2024 서울마라톤" 추가

### 5.2 시나리오 2: 저장된 노선 불러오기

1. **페이지 재방문**
   - 노선 선택 드롭다운에 저장된 노선들 표시

2. **노선 선택**
   - 드롭다운에서 "2024 서울마라톤" 선택
   - 해당 노선의 지역("서울특별시")으로 자동 전환
   - 정류장 마커들 강조 표시
   - Polyline 그려짐
   - 사이드바에 정류장 목록 표시

3. **노선 수정**
   - 새로운 마커 클릭 → 노선에 추가
   - 목록의 [X] 버튼 클릭 → 해당 정류장 제거
   - 마커 재클릭 → 노선에서 제거
   - "노선 저장" 버튼으로 덮어쓰기

### 5.3 시나리오 3: 여러 노선 관리

1. **새 노선 만들기**
   - "새 노선 만들기" 버튼 클릭
   - 현재 선택 초기화 (Polyline 제거, 마커 강조 해제)
   - 노선 선택 드롭다운이 "새 노선"으로 변경
   - 다른 지역 선택 가능 (예: "부산광역시")

2. **노선 전환**
   - 드롭다운에서 다른 노선 선택
   - 지역 자동 변경
   - 해당 노선의 정류장 및 Polyline 표시

### 5.4 에러 처리

| 상황 | 처리 방법 |
|------|-----------|
| CSV 로드 실패 | alert("데이터를 불러올 수 없습니다") |
| 빈 노선 저장 시도 | alert("정류장을 하나 이상 선택하세요") |
| 중복 노선명 | 자동으로 번호 추가 (예: "2024 서울마라톤 (2)") |
| localStorage 용량 초과 | alert("저장 공간이 부족합니다. 일부 노선을 삭제하세요") |
| 저장되지 않은 노선 삭제 시도 | alert("저장된 노선이 아닙니다") |

## 6. 구현 우선순위

### Phase 1: 핵심 기능 (MVP)
1. CSV 데이터 임베딩 및 파싱
2. 지역 선택 드롭다운
3. 지도 렌더링 (Leaflet + OpenStreetMap)
4. 마커 표시 및 클릭 이벤트
5. 선택된 정류장 목록 표시
6. Polyline 그리기

### Phase 2: 저장/불러오기
7. localStorage 저장 로직
8. 노선 저장 기능
9. 저장된 노선 목록 표시
10. 노선 불러오기 기능

### Phase 3: 관리 기능
11. 노선 삭제 기능
12. 초기화 기능
13. 새 노선 만들기 기능
14. 에러 처리 및 유효성 검사

### Phase 4: UI/UX 개선
15. Tailwind CSS 스타일링
16. 반응형 조정 (선택 사항)
17. 로딩 인디케이터
18. 안내 메시지 및 툴팁

## 7. 기술적 제약 및 고려사항

### 7.1 브라우저 호환성
- Leaflet.js: 모든 모던 브라우저 지원
- localStorage: IE8+ 지원, 용량 제한 5-10MB
- PapaParse: IE9+ 지원

### 7.2 성능 제약
- **227,066개 데이터**: 지역 필터링으로 해결
- **마커 렌더링**: 최대 10,000개까지 원활 (서울 정류장 예상 ~8,000개)
- **localStorage 용량**: 노선 50개 정도까지 저장 가능

### 7.3 단일 HTML 파일 제약
- 외부 리소스는 모두 CDN 사용
- CSV 데이터는 HTML에 직접 임베딩
- 이미지/아이콘은 Leaflet 기본 제공 사용

## 8. 다음 단계

승인된 디자인을 바탕으로 **구현 계획(Implementation Plan)** 작성 예정.

---

**디자인 승인**: 2026-02-23
**다음 단계**: writing-plans 스킬을 통한 상세 구현 계획 작성
