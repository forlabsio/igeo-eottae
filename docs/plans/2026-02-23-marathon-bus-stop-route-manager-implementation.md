# 마라톤 노선 관리 웹 애플리케이션 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 지도 기반 단일 HTML 파일 웹 애플리케이션으로 전국 버스 정류장 데이터를 활용하여 마라톤 노선을 생성, 저장, 관리하는 도구 구축

**Architecture:** 경량 필터링 우선 접근 방식. 사용자가 지역을 선택하면 해당 지역의 버스 정류장만 필터링하여 지도에 표시. localStorage를 활용하여 여러 노선을 저장하고 관리. 단일 HTML 파일에 모든 로직과 CSV 데이터 임베딩.

**Tech Stack:** Leaflet.js 1.9.4, OpenStreetMap, Tailwind CSS 3.x, PapaParse 5.x, Vanilla JavaScript, localStorage

---

## Task 1: HTML 기본 구조 및 CDN 설정

**Files:**
- Create: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: 프로젝트 디렉토리 생성**

```bash
mkdir -p /Users/peterchae/marathon-route-manager
cd /Users/peterchae/marathon-route-manager
```

**Step 2: HTML 기본 구조 작성**

`index.html` 파일을 생성하고 다음 내용을 작성:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>마라톤 노선 관리</title>

    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin="anonymous"/>

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>

    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #map {
            height: 100%;
            width: 100%;
        }
        .main-container {
            height: calc(100vh - 64px);
        }
    </style>
</head>
<body>
    <!-- 헤더 -->
    <header class="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold">마라톤 노선 관리</h1>
        <div>
            <label for="region-select" class="mr-2">지역 선택:</label>
            <select id="region-select" class="text-black px-3 py-1 rounded">
                <option value="">지역을 선택하세요</option>
            </select>
        </div>
    </header>

    <!-- 메인 컨테이너 -->
    <div class="main-container flex">
        <!-- 지도 영역 -->
        <div id="map" class="w-7/10 flex-grow"></div>

        <!-- 사이드바 -->
        <div class="w-3/10 bg-gray-100 p-4 overflow-y-auto">
            <div class="mb-4">
                <label for="route-select" class="block mb-2 font-semibold">노선 선택:</label>
                <select id="route-select" class="w-full px-3 py-2 border rounded">
                    <option value="">새 노선</option>
                </select>
            </div>

            <div class="mb-4">
                <h3 class="font-semibold mb-2">선택된 정류장</h3>
                <div id="selected-stops" class="bg-white p-3 rounded border min-h-[200px] max-h-[400px] overflow-y-auto">
                    <p class="text-gray-500 text-sm">정류장을 클릭하여 노선을 만드세요</p>
                </div>
            </div>

            <div class="space-y-2">
                <button id="btn-new-route" class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">
                    새 노선 만들기
                </button>
                <button id="btn-save-route" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
                    노선 저장
                </button>
                <button id="btn-delete-route" class="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600">
                    노선 삭제
                </button>
                <button id="btn-reset" class="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600">
                    초기화
                </button>
            </div>
        </div>
    </div>

    <!-- CSV 데이터 (나중에 추가) -->
    <script type="text/csv" id="bus-stops-data"></script>

    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin="anonymous"></script>

    <!-- PapaParse -->
    <script src="https://unpkg.com/papaparse@5.4.1/papaparse.min.js"></script>

    <!-- 애플리케이션 로직 -->
    <script>
        console.log('마라톤 노선 관리 앱 초기화');
    </script>
</body>
</html>
```

**Step 3: 브라우저에서 열어서 확인**

```bash
open index.html
```

Expected: 헤더와 사이드바가 있는 레이아웃이 표시됨. 지도 영역은 아직 비어있음.

**Step 4: Git 초기화 및 첫 커밋**

```bash
git init
git add index.html
git commit -m "feat: add basic HTML structure with Leaflet and Tailwind CSS

- Add header with region selector
- Add sidebar with route controls
- Include Leaflet.js and PapaParse CDN
- Set up main layout with flex

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 지도 초기화 및 테스트

**Files:**
- Modify: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: 지도 초기화 코드 추가**

`index.html`의 `<script>` 섹션을 다음과 같이 수정:

```javascript
// 전역 변수
let map = null;

// 지도 초기화
function initMap() {
    // 서울 시청 중심으로 지도 생성
    map = L.map('map').setView([37.5665, 126.9780], 12);

    // OpenStreetMap 타일 레이어 추가
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    console.log('지도 초기화 완료');
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    initMap();
});
```

**Step 2: 브라우저에서 확인**

```bash
open index.html
```

Expected: 서울 시청을 중심으로 OpenStreetMap이 표시됨. 콘솔에 "지도 초기화 완료" 메시지.

**Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: initialize Leaflet map centered on Seoul City Hall

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: CSV 데이터 임베딩 및 파싱

**Files:**
- Modify: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: CSV 데이터 읽기 및 파싱 함수 작성**

CSV 데이터를 HTML에 임베딩하기 전에 먼저 파싱 로직을 작성. `<script>` 섹션에 추가:

```javascript
// 애플리케이션 상태
const AppState = {
    currentRegion: null,
    allBusStops: [],
    currentRoute: {
        id: null,
        name: "새 노선",
        region: null,
        stops: []
    },
    savedRoutes: [],
    markers: new Map(),
    polyline: null
};

// CSV 데이터 파싱
function parseCSVData() {
    const csvElement = document.getElementById('bus-stops-data');
    const csvData = csvElement.textContent.trim();

    if (!csvData) {
        console.log('CSV 데이터가 비어있습니다. 테스트 데이터를 사용합니다.');
        return getTestData();
    }

    const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true
    });

    if (parsed.errors.length > 0) {
        console.error('CSV 파싱 오류:', parsed.errors);
        alert('데이터를 불러올 수 없습니다');
        return [];
    }

    console.log(`총 ${parsed.data.length}개의 버스 정류장 로드됨`);
    return parsed.data;
}

// 테스트용 더미 데이터 (서울 시내 10개 정류장)
function getTestData() {
    return [
        { "정류장고유번호": "TEST001", "정류장명": "광화문역", "위도": "37.5701", "경도": "126.9756", "시도명": "서울특별시" },
        { "정류장고유번호": "TEST002", "정류장명": "종각역", "위도": "37.5702", "경도": "126.9831", "시도명": "서울특별시" },
        { "정류장고유번호": "TEST003", "정류장명": "시청역", "위도": "37.5663", "경도": "126.9779", "시도명": "서울특별시" },
        { "정류장고유번호": "TEST004", "정류장명": "을지로입구역", "위도": "37.5658", "경도": "126.9822", "시도명": "서울특별시" },
        { "정류장고유번호": "TEST005", "정류장명": "명동역", "위도": "37.5614", "경도": "126.9864", "시도명": "서울특별시" },
        { "정류장고유번호": "TEST006", "정류장명": "서울역", "위도": "37.5547", "경도": "126.9707", "시도명": "서울특별시" },
        { "정류장고유번호": "TEST007", "정류장명": "강남역", "위도": "37.4979", "경도": "127.0276", "시도명": "서울특별시" },
        { "정류장고유번호": "TEST008", "정류장명": "홍대입구역", "위도": "37.5572", "경도": "126.9236", "시도명": "서울특별시" },
        { "정류장고유번호": "TEST009", "정류장명": "해운대", "위도": "35.1587", "경도": "129.1603", "시도명": "부산광역시" },
        { "정류장고유번호": "TEST010", "정류장명": "광안리", "위도": "35.1532", "경도": "129.1189", "시도명": "부산광역시" }
    ];
}
```

**Step 2: 페이지 로드 시 CSV 파싱 추가**

`DOMContentLoaded` 이벤트 핸들러를 수정:

```javascript
// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    initMap();

    // CSV 데이터 파싱
    const busStops = parseCSVData();
    console.log('파싱된 데이터 샘플:', busStops.slice(0, 3));
});
```

**Step 3: 브라우저에서 확인**

```bash
open index.html
```

Expected: 콘솔에 "CSV 데이터가 비어있습니다. 테스트 데이터를 사용합니다." 메시지와 테스트 데이터 샘플이 표시됨.

**Step 4: 커밋**

```bash
git add index.html
git commit -m "feat: add CSV parsing logic with test data

- Implement parseCSVData function with PapaParse
- Add 10 test bus stops (8 Seoul, 2 Busan)
- Initialize AppState for global state management

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: 지역 선택 드롭다운 구현

**Files:**
- Modify: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: 지역 목록 추출 및 드롭다운 생성**

```javascript
// 지역 선택 드롭다운 초기화
function populateRegionDropdown(busStops) {
    // 시도명 중복 제거
    const regions = [...new Set(busStops.map(stop => stop.시도명))].sort();

    const select = document.getElementById('region-select');

    // 기존 옵션 제거 (첫 번째 제외)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // 지역 옵션 추가
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        select.appendChild(option);
    });

    console.log(`${regions.length}개 지역 로드됨:`, regions);
}

// 지역 변경 이벤트 핸들러
function onRegionChange(event) {
    const selectedRegion = event.target.value;

    if (!selectedRegion) {
        // 선택 해제 시 마커 제거
        clearMarkers();
        AppState.currentRegion = null;
        return;
    }

    AppState.currentRegion = selectedRegion;
    console.log('선택된 지역:', selectedRegion);

    // 해당 지역 정류장 필터링
    const filtered = allBusStopsData.filter(stop => stop.시도명 === selectedRegion);
    AppState.allBusStops = filtered;

    console.log(`${filtered.length}개의 정류장 필터링됨`);

    // 마커 렌더링 (다음 Task에서 구현)
    renderMarkers(filtered);
}

// 마커 제거 (임시 구현)
function clearMarkers() {
    AppState.markers.forEach(marker => {
        map.removeLayer(marker);
    });
    AppState.markers.clear();
}

// 마커 렌더링 (임시 구현)
function renderMarkers(busStops) {
    clearMarkers();

    if (busStops.length === 0) {
        return;
    }

    // 첫 번째 정류장으로 지도 중심 이동
    const firstStop = busStops[0];
    map.setView([parseFloat(firstStop.위도), parseFloat(firstStop.경도)], 13);

    console.log('마커 렌더링 준비 완료 (다음 Task에서 구현)');
}
```

**Step 2: 페이지 로드 시 드롭다운 초기화 및 이벤트 연결**

```javascript
// 전역 변수 추가
let allBusStopsData = [];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    initMap();

    // CSV 데이터 파싱
    allBusStopsData = parseCSVData();
    console.log('파싱된 데이터 샘플:', allBusStopsData.slice(0, 3));

    // 지역 드롭다운 초기화
    populateRegionDropdown(allBusStopsData);

    // 이벤트 리스너 등록
    document.getElementById('region-select').addEventListener('change', onRegionChange);
});
```

**Step 3: 브라우저에서 확인**

```bash
open index.html
```

Expected:
- 지역 선택 드롭다운에 "서울특별시", "부산광역시" 표시
- 지역 선택 시 콘솔에 필터링된 정류장 수 표시
- 지도 중심이 해당 지역으로 이동

**Step 4: 커밋**

```bash
git add index.html
git commit -m "feat: implement region selector dropdown

- Extract unique regions from bus stop data
- Populate dropdown with sorted regions
- Add region change event handler with filtering
- Move map center to selected region

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: 마커 렌더링 및 클릭 이벤트

**Files:**
- Modify: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: 마커 렌더링 구현**

```javascript
// 마커 렌더링
function renderMarkers(busStops) {
    clearMarkers();

    if (busStops.length === 0) {
        return;
    }

    // 첫 번째 정류장으로 지도 중심 이동
    const firstStop = busStops[0];
    map.setView([parseFloat(firstStop.위도), parseFloat(firstStop.경도)], 13);

    // 각 정류장에 마커 생성
    busStops.forEach(stop => {
        const lat = parseFloat(stop.위도);
        const lng = parseFloat(stop.경도);

        if (isNaN(lat) || isNaN(lng)) {
            return; // 잘못된 좌표 무시
        }

        // 마커 생성
        const marker = L.marker([lat, lng])
            .bindTooltip(stop.정류장명, { permanent: false })
            .addTo(map);

        // 클릭 이벤트
        marker.on('click', function() {
            onMarkerClick(stop, marker);
        });

        // 마커 저장
        AppState.markers.set(stop.정류장고유번호, marker);
    });

    console.log(`${busStops.length}개의 마커 렌더링 완료`);
}

// 마커 클릭 이벤트 핸들러
function onMarkerClick(stop, marker) {
    const stopId = stop.정류장고유번호;

    // 이미 선택된 정류장인지 확인
    const index = AppState.currentRoute.stops.findIndex(s => s.id === stopId);

    if (index >= 0) {
        // 선택 해제
        AppState.currentRoute.stops.splice(index, 1);
        marker.setIcon(L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        }));
        console.log(`정류장 제거: ${stop.정류장명}`);
    } else {
        // 선택 추가
        AppState.currentRoute.stops.push({
            id: stopId,
            name: stop.정류장명,
            lat: parseFloat(stop.위도),
            lng: parseFloat(stop.경도)
        });

        // 마커 강조 (빨간색)
        marker.setIcon(L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            className: 'selected-marker'
        }));

        console.log(`정류장 추가: ${stop.정류장명}`);
    }

    // UI 업데이트
    updateSelectedStopsUI();
    updatePolyline();
}
```

**Step 2: 선택된 정류장 UI 업데이트 (임시)**

```javascript
// 선택된 정류장 목록 UI 업데이트
function updateSelectedStopsUI() {
    const container = document.getElementById('selected-stops');

    if (AppState.currentRoute.stops.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">정류장을 클릭하여 노선을 만드세요</p>';
        return;
    }

    const html = AppState.currentRoute.stops.map((stop, index) => {
        return `
            <div class="flex justify-between items-center py-2 border-b">
                <span>${index + 1}. ${stop.name}</span>
                <button class="text-red-500 hover:text-red-700" data-stop-id="${stop.id}">✕</button>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // 삭제 버튼 이벤트 리스너
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
            const stopId = this.getAttribute('data-stop-id');
            removeStopById(stopId);
        });
    });
}

// ID로 정류장 제거
function removeStopById(stopId) {
    const index = AppState.currentRoute.stops.findIndex(s => s.id === stopId);
    if (index >= 0) {
        AppState.currentRoute.stops.splice(index, 1);

        // 마커 아이콘 원래대로
        const marker = AppState.markers.get(stopId);
        if (marker) {
            marker.setIcon(L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            }));
        }

        updateSelectedStopsUI();
        updatePolyline();
    }
}

// Polyline 업데이트 (임시)
function updatePolyline() {
    console.log('Polyline 업데이트 (다음 Task에서 구현)');
}
```

**Step 3: CSS 추가 (선택된 마커 스타일)**

`<style>` 섹션에 추가:

```css
.selected-marker {
    filter: hue-rotate(120deg) saturate(150%);
}
```

**Step 4: 브라우저에서 확인**

```bash
open index.html
```

Expected:
- 지역 선택 시 마커들이 지도에 표시됨
- 마커 클릭 시 사이드바에 정류장 추가됨
- 마커 재클릭 시 사이드바에서 제거됨
- 사이드바의 [✕] 버튼 클릭 시 정류장 제거됨

**Step 5: 커밋**

```bash
git add index.html
git commit -m "feat: implement marker rendering and click events

- Render markers for filtered bus stops
- Add marker click to toggle selection
- Update sidebar with selected stops list
- Add remove button for each stop in sidebar

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Polyline 그리기

**Files:**
- Modify: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: Polyline 업데이트 구현**

```javascript
// Polyline 업데이트
function updatePolyline() {
    // 기존 Polyline 제거
    if (AppState.polyline) {
        map.removeLayer(AppState.polyline);
        AppState.polyline = null;
    }

    // 선택된 정류장이 2개 미만이면 Polyline 그리지 않음
    if (AppState.currentRoute.stops.length < 2) {
        return;
    }

    // 좌표 배열 생성
    const latlngs = AppState.currentRoute.stops.map(stop => [stop.lat, stop.lng]);

    // Polyline 생성
    AppState.polyline = L.polyline(latlngs, {
        color: 'blue',
        weight: 3,
        opacity: 0.7
    }).addTo(map);

    console.log(`Polyline 그려짐: ${AppState.currentRoute.stops.length}개 정류장 연결`);
}
```

**Step 2: 브라우저에서 확인**

```bash
open index.html
```

Expected:
- 정류장 2개 이상 선택 시 파란색 선으로 연결됨
- 정류장 추가/제거 시 Polyline이 실시간으로 업데이트됨

**Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: implement polyline drawing for route visualization

- Draw blue polyline connecting selected stops
- Update polyline in real-time when stops are added/removed
- Remove polyline when less than 2 stops selected

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: localStorage 저장/불러오기 구현

**Files:**
- Modify: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: localStorage 저장 함수**

```javascript
// localStorage 키
const STORAGE_KEY = 'marathon-routes';

// 노선 저장
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

    // localStorage에서 기존 데이터 로드
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"routes":[]}');

    // 기존 노선 업데이트 또는 새로 추가
    const index = data.routes.findIndex(r => r.id === route.id);
    if (index >= 0) {
        data.routes[index] = route;
        console.log('노선 업데이트:', name);
    } else {
        data.routes.push(route);
        console.log('새 노선 저장:', name);
    }

    // localStorage에 저장
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        // 상태 업데이트
        AppState.currentRoute.id = route.id;
        AppState.currentRoute.name = name;
        AppState.savedRoutes = data.routes;

        // 드롭다운 업데이트
        updateRouteDropdown();

        alert('노선이 저장되었습니다');
    } catch (e) {
        console.error('저장 실패:', e);
        alert('저장 공간이 부족합니다. 일부 노선을 삭제하세요');
    }
}

// 저장된 노선 목록 로드
function loadSavedRoutes() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"routes":[]}');
    AppState.savedRoutes = data.routes;
    console.log(`${data.routes.length}개의 저장된 노선 로드됨`);
    return data.routes;
}

// 노선 선택 드롭다운 업데이트
function updateRouteDropdown() {
    const select = document.getElementById('route-select');

    // 기존 옵션 제거 (첫 번째 제외)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // 저장된 노선 추가
    AppState.savedRoutes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        select.appendChild(option);
    });

    // 현재 노선이 있으면 선택
    if (AppState.currentRoute.id) {
        select.value = AppState.currentRoute.id;
    }
}
```

**Step 2: 노선 불러오기 함수**

```javascript
// 노선 불러오기
function loadRoute(routeId) {
    if (!routeId) {
        // "새 노선" 선택
        resetCurrentRoute();
        return;
    }

    const route = AppState.savedRoutes.find(r => r.id === routeId);
    if (!route) {
        console.error('노선을 찾을 수 없습니다:', routeId);
        return;
    }

    console.log('노선 불러오기:', route.name);

    // 지역이 다르면 먼저 변경
    if (route.region !== AppState.currentRegion) {
        document.getElementById('region-select').value = route.region;
        AppState.currentRegion = route.region;

        const filtered = allBusStopsData.filter(stop => stop.시도명 === route.region);
        AppState.allBusStops = filtered;
        renderMarkers(filtered);
    }

    // 현재 노선 상태 업데이트
    AppState.currentRoute = {
        id: route.id,
        name: route.name,
        region: route.region,
        stops: [...route.stops]
    };

    // UI 업데이트
    updateSelectedStopsUI();
    highlightSelectedMarkers();
    updatePolyline();
}

// 선택된 마커 강조
function highlightSelectedMarkers() {
    // 모든 마커 초기화
    AppState.markers.forEach(marker => {
        marker.setIcon(L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        }));
    });

    // 선택된 마커만 강조
    AppState.currentRoute.stops.forEach(stop => {
        const marker = AppState.markers.get(stop.id);
        if (marker) {
            marker.setIcon(L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                className: 'selected-marker'
            }));
        }
    });
}

// 현재 노선 초기화
function resetCurrentRoute() {
    AppState.currentRoute = {
        id: null,
        name: "새 노선",
        region: AppState.currentRegion,
        stops: []
    };

    updateSelectedStopsUI();
    highlightSelectedMarkers();
    updatePolyline();

    console.log('노선 초기화됨');
}
```

**Step 3: 노선 삭제 함수**

```javascript
// 노선 삭제
function deleteRoute() {
    if (!AppState.currentRoute.id) {
        alert('저장된 노선이 아닙니다');
        return;
    }

    if (!confirm(`"${AppState.currentRoute.name}" 노선을 삭제하시겠습니까?`)) {
        return;
    }

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"routes":[]}');
    data.routes = data.routes.filter(r => r.id !== AppState.currentRoute.id);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        AppState.savedRoutes = data.routes;

        console.log('노선 삭제됨:', AppState.currentRoute.name);

        // 상태 초기화
        resetCurrentRoute();
        updateRouteDropdown();

        alert('노선이 삭제되었습니다');
    } catch (e) {
        console.error('삭제 실패:', e);
        alert('삭제에 실패했습니다');
    }
}
```

**Step 4: 버튼 이벤트 리스너 등록**

```javascript
// 페이지 로드 시 실행 (기존 코드에 추가)
document.addEventListener('DOMContentLoaded', function() {
    initMap();

    // CSV 데이터 파싱
    allBusStopsData = parseCSVData();
    console.log('파싱된 데이터 샘플:', allBusStopsData.slice(0, 3));

    // 지역 드롭다운 초기화
    populateRegionDropdown(allBusStopsData);

    // 저장된 노선 로드
    loadSavedRoutes();
    updateRouteDropdown();

    // 이벤트 리스너 등록
    document.getElementById('region-select').addEventListener('change', onRegionChange);
    document.getElementById('route-select').addEventListener('change', function(e) {
        loadRoute(e.target.value);
    });

    document.getElementById('btn-new-route').addEventListener('click', function() {
        document.getElementById('route-select').value = '';
        resetCurrentRoute();
    });

    document.getElementById('btn-save-route').addEventListener('click', saveRoute);
    document.getElementById('btn-delete-route').addEventListener('click', deleteRoute);
    document.getElementById('btn-reset').addEventListener('click', resetCurrentRoute);
});
```

**Step 5: 브라우저에서 확인**

```bash
open index.html
```

Expected:
- 정류장 선택 후 "노선 저장" 버튼 → prompt에 이름 입력 → 노선 저장됨
- 노선 선택 드롭다운에 저장된 노선 표시
- 드롭다운에서 노선 선택 시 해당 노선의 정류장 복원됨
- "노선 삭제" 버튼으로 저장된 노선 삭제 가능
- 페이지 새로고침 후에도 저장된 노선 유지됨

**Step 6: 커밋**

```bash
git add index.html
git commit -m "feat: implement localStorage for route save/load/delete

- Add saveRoute function with localStorage persistence
- Add loadRoute to restore saved routes
- Add deleteRoute with confirmation
- Update route dropdown dynamically
- Load saved routes on page load

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: CSV 실제 데이터 임베딩

**Files:**
- Modify: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: CSV 파일 읽기 및 변환**

```bash
# CSV 파일을 읽어서 클립보드에 복사 (macOS)
cat "/Users/peterchae/Downloads/국토교통부_전국_버스정류장_위치정보_20251031.csv" | pbcopy
```

**Step 2: HTML 파일에 CSV 데이터 붙여넣기**

`index.html`의 `<script type="text/csv" id="bus-stops-data">` 태그 안에 복사한 CSV 데이터를 붙여넣기.

**주의사항:**
- CSV 데이터는 매우 크므로 (20MB+) 에디터가 느려질 수 있음
- 인코딩이 UTF-8인지 확인
- HTML 파일 크기가 20MB 이상이 될 것임

**Step 3: 테스트 데이터 사용 로직 제거**

`parseCSVData()` 함수 수정:

```javascript
// CSV 데이터 파싱
function parseCSVData() {
    const csvElement = document.getElementById('bus-stops-data');
    const csvData = csvElement.textContent.trim();

    if (!csvData) {
        console.error('CSV 데이터가 없습니다');
        alert('데이터를 불러올 수 없습니다');
        return [];
    }

    const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true
    });

    if (parsed.errors.length > 0) {
        console.error('CSV 파싱 오류:', parsed.errors);
        alert('데이터를 불러올 수 없습니다');
        return [];
    }

    console.log(`총 ${parsed.data.length}개의 버스 정류장 로드됨`);
    return parsed.data;
}
```

**Step 4: 브라우저에서 확인**

```bash
open index.html
```

Expected:
- 페이지 로딩이 조금 느릴 수 있음 (데이터 크기 때문)
- 콘솔에 "총 227066개의 버스 정류장 로드됨" 메시지
- 지역 선택 드롭다운에 전국 시/도가 표시됨
- 각 지역 선택 시 해당 지역의 정류장들만 표시됨

**Step 5: 커밋 (대용량 파일이므로 주의)**

```bash
git add index.html
git commit -m "feat: embed full national bus stop CSV data

- Add 227,066 bus stops from national dataset
- Remove test data fallback logic
- File size increased to ~20MB

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**대안:** CSV 데이터가 너무 크면 테스트 데이터를 계속 사용하거나, 서울/부산 등 주요 도시만 필터링한 축소 버전 사용을 고려.

---

## Task 9: UI/UX 개선 및 에러 처리

**Files:**
- Modify: `/Users/peterchae/marathon-route-manager/index.html`

**Step 1: 로딩 인디케이터 추가**

HTML `<body>` 시작 부분에 추가:

```html
<!-- 로딩 인디케이터 -->
<div id="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-center">데이터를 불러오는 중...</p>
    </div>
</div>
```

JavaScript에 로딩 제어 추가:

```javascript
// 로딩 인디케이터 표시/숨김
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// 페이지 로드 시 실행 수정
document.addEventListener('DOMContentLoaded', function() {
    showLoading();

    try {
        initMap();

        // CSV 데이터 파싱
        allBusStopsData = parseCSVData();
        console.log('파싱된 데이터 샘플:', allBusStopsData.slice(0, 3));

        // 지역 드롭다운 초기화
        populateRegionDropdown(allBusStopsData);

        // 저장된 노선 로드
        loadSavedRoutes();
        updateRouteDropdown();

        // 이벤트 리스너 등록
        document.getElementById('region-select').addEventListener('change', onRegionChange);
        document.getElementById('route-select').addEventListener('change', function(e) {
            loadRoute(e.target.value);
        });

        document.getElementById('btn-new-route').addEventListener('click', function() {
            document.getElementById('route-select').value = '';
            resetCurrentRoute();
        });

        document.getElementById('btn-save-route').addEventListener('click', saveRoute);
        document.getElementById('btn-delete-route').addEventListener('click', deleteRoute);
        document.getElementById('btn-reset').addEventListener('click', resetCurrentRoute);

        hideLoading();
    } catch (e) {
        console.error('초기화 오류:', e);
        alert('애플리케이션을 초기화할 수 없습니다');
        hideLoading();
    }
});
```

**Step 2: 중복 노선명 처리**

```javascript
// 노선 저장 (수정)
function saveRoute() {
    if (AppState.currentRoute.stops.length === 0) {
        alert('정류장을 하나 이상 선택하세요');
        return;
    }

    let name = prompt('노선 이름을 입력하세요', AppState.currentRoute.name);
    if (!name) return;

    // 중복 이름 체크 및 번호 추가
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"routes":[]}');
    const existingNames = data.routes
        .filter(r => r.id !== AppState.currentRoute.id)
        .map(r => r.name);

    if (existingNames.includes(name)) {
        let counter = 2;
        let newName = `${name} (${counter})`;
        while (existingNames.includes(newName)) {
            counter++;
            newName = `${name} (${counter})`;
        }
        name = newName;
        console.log('중복 이름 감지, 변경:', name);
    }

    const route = {
        id: AppState.currentRoute.id || `route-${Date.now()}`,
        name: name,
        region: AppState.currentRegion,
        stops: AppState.currentRoute.stops,
        createdAt: new Date().toISOString()
    };

    // 기존 노선 업데이트 또는 새로 추가
    const index = data.routes.findIndex(r => r.id === route.id);
    if (index >= 0) {
        data.routes[index] = route;
        console.log('노선 업데이트:', name);
    } else {
        data.routes.push(route);
        console.log('새 노선 저장:', name);
    }

    // localStorage에 저장
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        // 상태 업데이트
        AppState.currentRoute.id = route.id;
        AppState.currentRoute.name = name;
        AppState.savedRoutes = data.routes;

        // 드롭다운 업데이트
        updateRouteDropdown();

        alert('노선이 저장되었습니다');
    } catch (e) {
        console.error('저장 실패:', e);
        if (e.name === 'QuotaExceededError') {
            alert('저장 공간이 부족합니다. 일부 노선을 삭제하세요');
        } else {
            alert('저장에 실패했습니다');
        }
    }
}
```

**Step 3: 안내 메시지 개선**

사이드바에 도움말 추가:

```html
<!-- 사이드바 (기존 코드 수정) -->
<div class="w-3/10 bg-gray-100 p-4 overflow-y-auto">
    <div class="mb-4 bg-blue-50 border border-blue-200 rounded p-3">
        <p class="text-sm text-blue-800">
            💡 <strong>사용 방법:</strong><br>
            1. 지역을 선택하세요<br>
            2. 지도에서 정류장을 클릭하여 노선을 만드세요<br>
            3. '노선 저장' 버튼으로 저장하세요
        </p>
    </div>

    <!-- 나머지 코드 동일 -->
</div>
```

**Step 4: 브라우저에서 확인**

```bash
open index.html
```

Expected:
- 페이지 로드 시 로딩 인디케이터 표시
- 사이드바에 사용 방법 안내 표시
- 중복 노선명 저장 시 자동으로 번호 추가

**Step 5: 커밋**

```bash
git add index.html
git commit -m "feat: add loading indicator and improve UX

- Add loading spinner during initialization
- Handle duplicate route names automatically
- Add usage instructions in sidebar
- Improve error handling for localStorage quota

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: 최종 테스트 및 문서화

**Files:**
- Create: `/Users/peterchae/marathon-route-manager/README.md`

**Step 1: 기능 테스트 체크리스트**

브라우저에서 다음 항목들을 테스트:

- ✅ 페이지 로드 시 지도가 서울 시청 중심으로 표시됨
- ✅ 지역 선택 드롭다운에 전국 시/도가 표시됨
- ✅ 지역 선택 시 해당 지역의 버스 정류장 마커가 표시됨
- ✅ 마커 클릭 시 선택/해제 토글 작동
- ✅ 선택된 정류장이 사이드바에 순서대로 표시됨
- ✅ 정류장 2개 이상 선택 시 Polyline이 그려짐
- ✅ 사이드바의 [✕] 버튼으로 정류장 제거 가능
- ✅ "노선 저장" 버튼으로 노선 저장 가능
- ✅ "노선 선택" 드롭다운에서 저장된 노선 불러오기 가능
- ✅ "노선 삭제" 버튼으로 노선 삭제 가능
- ✅ "초기화" 버튼으로 현재 선택 초기화 가능
- ✅ "새 노선 만들기" 버튼 작동
- ✅ 페이지 새로고침 후 저장된 노선 유지됨

**Step 2: README.md 작성**

```markdown
# 마라톤 노선 관리 웹 애플리케이션

전국 버스 정류장 위치정보를 활용하여 마라톤 노선을 시각적으로 관리하는 웹 애플리케이션입니다.

## 주요 기능

- 🗺️ 지도 기반 인터페이스 (Leaflet.js + OpenStreetMap)
- 📍 전국 227,066개 버스 정류장 데이터
- 🎯 지역별 필터링 (시/도 단위)
- 🔗 클릭으로 정류장 선택 및 노선 연결
- 💾 여러 노선 저장 및 관리 (localStorage)
- 🔄 노선 불러오기, 수정, 삭제

## 사용 방법

1. **index.html** 파일을 브라우저에서 엽니다
2. 헤더에서 **지역을 선택**합니다 (예: 서울특별시)
3. 지도에 표시된 버스 정류장 **마커를 클릭**하여 노선에 추가합니다
4. 선택된 정류장들이 파란색 선으로 연결됩니다
5. **"노선 저장"** 버튼을 클릭하고 이름을 입력하여 저장합니다
6. 저장된 노선은 **"노선 선택"** 드롭다운에서 불러올 수 있습니다

## 기술 스택

- **Leaflet.js 1.9.4**: 지도 렌더링
- **OpenStreetMap**: 지도 타일
- **Tailwind CSS 3.x**: 스타일링
- **PapaParse 5.x**: CSV 파싱
- **Vanilla JavaScript**: 애플리케이션 로직
- **localStorage**: 데이터 영속성

## 파일 구조

```
marathon-route-manager/
├── index.html          # 메인 HTML 파일 (단일 파일, ~20MB)
└── README.md           # 이 파일
```

## 브라우저 호환성

- Chrome, Firefox, Safari, Edge 최신 버전
- localStorage 지원 필요 (IE8+)

## 제약사항

- 파일 크기: ~20MB (CSV 데이터 포함)
- 초기 로딩 시간: 대용량 데이터로 인해 3-5초 소요 가능
- localStorage 용량: 약 50개 노선까지 저장 가능

## 데이터 출처

국토교통부 전국 버스정류장 위치정보 (2025년 10월 31일 기준)

## 라이선스

MIT License

## 개발자

2026-02-23 개발
```

**Step 3: README 커밋**

```bash
git add README.md
git commit -m "docs: add comprehensive README

- Add usage instructions
- Document features and tech stack
- Include browser compatibility info
- Add data source attribution

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 4: 최종 확인**

```bash
# 파일 구조 확인
ls -lh

# Git 히스토리 확인
git log --oneline

# 브라우저에서 최종 테스트
open index.html
```

Expected:
- index.html 파일 크기 ~20MB (실제 CSV 데이터 포함 시)
- README.md 파일 존재
- Git 커밋 히스토리 10개 정도
- 모든 기능이 정상 작동

---

## 완료 및 배포

### 배포 옵션

**옵션 1: 로컬 파일로 사용**
- `index.html` 파일을 더블클릭하여 바로 사용
- 팀원들과 파일 공유 (USB, 이메일, 클라우드 등)

**옵션 2: 웹 호스팅**
- GitHub Pages, Netlify, Vercel 등에 배포
- 단, 파일 크기가 크므로 Git LFS 사용 권장

**옵션 3: CSV 데이터 외부 호스팅**
- CSV 파일을 별도로 호스팅하고 fetch로 로드
- 파일 크기 문제 해결 가능

### 추가 개선 아이디어

- [ ] 드래그 앤 드롭으로 정류장 순서 변경
- [ ] 노선 내보내기/가져오기 (JSON 파일)
- [ ] 정류장 검색 기능
- [ ] 거리 계산 (총 노선 길이)
- [ ] 인쇄 기능
- [ ] 모바일 최적화

---

**구현 계획 완료**

이 계획은 10개의 Task로 구성되어 있으며, 각 Task는 2-5분 단위의 작은 단계들로 나뉘어 있습니다. TDD 방식을 완벽히 적용하기는 어렵지만 (HTML/CSS/JS 단일 파일), 각 기능을 점진적으로 구축하고 브라우저에서 즉시 확인하며 진행하도록 설계되었습니다.
