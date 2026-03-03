# World Live Globe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a pure frontend web app with a rotating 3D Earth where users click country markers to watch live streams (IPTV, YouTube, webcams) in a PiP player.

**Architecture:** Single-page app with Three.js globe rendering, HLS.js for M3U8 streams, YouTube iframe embed for YouTube channels. No backend, no build step — plain HTML/CSS/JS with CDN imports. Deploy to Vercel or GitHub Pages.

**Tech Stack:** Three.js (CDN), HLS.js (CDN), OrbitControls (Three.js addon), Vanilla JS ES modules, Python http.server for local dev

---

## Project Location

Create all files under: `~/world-live/`

```
world-live/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── globe.js
│   ├── channels.js
│   └── player.js
└── data/
    ├── countries.json
    └── youtube.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `~/world-live/index.html`
- Create: `~/world-live/css/style.css`
- Create: `~/world-live/js/app.js`

**Step 1: Create directory structure**

```bash
mkdir -p ~/world-live/css ~/world-live/js ~/world-live/data
```

**Step 2: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World Live — Global Live Streams</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Header -->
  <header id="header">
    <div id="logo">🌍 WORLD LIVE</div>
    <div id="controls">
      <button id="btn-random" title="Random Channel">⚡ Random</button>
      <button id="btn-custom-url" title="Enter stream URL">+ URL</button>
    </div>
  </header>

  <!-- Globe canvas -->
  <canvas id="globe-canvas"></canvas>

  <!-- Country tooltip -->
  <div id="tooltip"></div>

  <!-- Channel panel (slides in on country click) -->
  <div id="channel-panel" class="hidden">
    <div id="panel-header">
      <span id="panel-country-name"></span>
      <button id="panel-close">✕</button>
    </div>
    <div id="panel-loading" class="hidden">Loading channels...</div>
    <div id="channel-list"></div>
    <div id="custom-url-row">
      <input id="custom-url-input" type="text" placeholder="Paste stream URL (HLS, YouTube, MP4)...">
      <button id="custom-url-play">▶</button>
    </div>
  </div>

  <!-- PiP Video Player (bottom-right) -->
  <div id="pip-player" class="hidden">
    <div id="pip-header">
      <span id="pip-title"></span>
      <div id="pip-actions">
        <button id="pip-expand" title="Fullscreen">⛶</button>
        <button id="pip-close" title="Close">✕</button>
      </div>
    </div>
    <div id="pip-video-container">
      <video id="pip-video" controls playsinline></video>
      <iframe id="pip-iframe" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    </div>
  </div>

  <!-- Custom URL modal -->
  <div id="url-modal" class="hidden">
    <div id="url-modal-inner">
      <h3>Enter Stream URL</h3>
      <input id="url-modal-input" type="text" placeholder="https://...  (HLS .m3u8, YouTube, MP4)">
      <div id="url-modal-btns">
        <button id="url-modal-cancel">Cancel</button>
        <button id="url-modal-play">▶ Play</button>
      </div>
    </div>
  </div>

  <!-- Three.js and HLS.js via CDN -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
    }
  }
  </script>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

**Step 3: Create `css/style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #000;
  color: #fff;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
}

#globe-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  cursor: grab;
}
#globe-canvas:active { cursor: grabbing; }

/* Header */
#header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

#logo {
  font-size: 1rem;
  font-weight: bold;
  letter-spacing: 0.15em;
  color: #fff;
}

#controls { display: flex; gap: 10px; }
#controls button {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: #fff;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: inherit;
  transition: background 0.2s;
}
#controls button:hover { background: rgba(255,255,255,0.18); }

/* Tooltip */
#tooltip {
  position: fixed;
  background: rgba(0,0,0,0.85);
  border: 1px solid rgba(255,68,0,0.5);
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  pointer-events: none;
  display: none;
  z-index: 200;
  white-space: nowrap;
}

/* Channel Panel */
#channel-panel {
  position: fixed;
  top: 48px;
  left: 0;
  bottom: 0;
  width: 300px;
  background: rgba(0,0,0,0.92);
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  z-index: 150;
  transform: translateX(0);
  transition: transform 0.3s ease;
}
#channel-panel.hidden { transform: translateX(-300px); }

#panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  font-size: 0.9rem;
  font-weight: bold;
}
#panel-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 1rem;
  padding: 2px 6px;
  border-radius: 4px;
}
#panel-close:hover { color: #fff; background: rgba(255,255,255,0.1); }

#panel-loading {
  padding: 20px 16px;
  color: rgba(255,255,255,0.5);
  font-size: 0.8rem;
}

#channel-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
#channel-list::-webkit-scrollbar { width: 4px; }
#channel-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

.channel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.channel-item:hover { background: rgba(255,255,255,0.06); }
.channel-item.active { background: rgba(0,255,136,0.08); border-left: 2px solid #00ff88; }
.channel-logo {
  width: 28px; height: 20px;
  object-fit: contain;
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
  flex-shrink: 0;
}
.channel-logo-placeholder {
  width: 28px; height: 20px;
  background: rgba(255,255,255,0.06);
  border-radius: 3px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  color: rgba(255,255,255,0.3);
}
.channel-name {
  font-size: 0.78rem;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.channel-badge {
  font-size: 0.6rem;
  padding: 2px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}
.badge-hls { background: rgba(255,68,0,0.3); color: #ff6622; }
.badge-yt  { background: rgba(255,0,0,0.3);  color: #ff4444; }
.badge-cam { background: rgba(0,136,255,0.3); color: #44aaff; }

#custom-url-row {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
#custom-url-input {
  flex: 1;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-family: inherit;
}
#custom-url-input::placeholder { color: rgba(255,255,255,0.3); }
#custom-url-input:focus { outline: none; border-color: #00ff88; }
#custom-url-play {
  background: #00ff88;
  color: #000;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: bold;
}

/* PiP Player */
#pip-player {
  position: fixed;
  bottom: 20px; right: 20px;
  width: 340px;
  background: rgba(0,0,0,0.95);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  overflow: hidden;
  z-index: 200;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
#pip-player.hidden { display: none; }

#pip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
#pip-title {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
#pip-actions { display: flex; gap: 6px; }
#pip-actions button {
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 2px 5px;
  border-radius: 3px;
}
#pip-actions button:hover { color: #fff; background: rgba(255,255,255,0.1); }

#pip-video-container { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; }
#pip-video  { width: 100%; height: 100%; display: block; }
#pip-iframe { width: 100%; height: 100%; display: none; border: none; }

/* URL Modal */
#url-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}
#url-modal.hidden { display: none; }
#url-modal-inner {
  background: #111;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 24px;
  width: 480px;
  max-width: 90vw;
}
#url-modal-inner h3 { margin-bottom: 16px; font-size: 0.9rem; }
#url-modal-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.15);
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-family: inherit;
  margin-bottom: 16px;
}
#url-modal-input:focus { outline: none; border-color: #00ff88; }
#url-modal-btns { display: flex; gap: 10px; justify-content: flex-end; }
#url-modal-btns button {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
}
#url-modal-cancel { background: rgba(255,255,255,0.08); color: #fff; }
#url-modal-play   { background: #00ff88; color: #000; font-weight: bold; }

.hidden { display: none !important; }
```

**Step 4: Create `js/app.js` (empty shell)**

```javascript
// app.js — main entry point (wired up in later tasks)
import { initGlobe } from './globe.js'
import { loadCountries } from './channels.js'
import { initPlayer, playStream } from './player.js'

async function main() {
  // Will be filled in Task 7 (wiring)
  console.log('World Live starting...')
}

main()
```

**Step 5: Start local dev server and verify**

```bash
cd ~/world-live && python3 -m http.server 8080
```

Open `http://localhost:8080` in browser.
Expected: Black page, "WORLD LIVE" header, no console errors.

**Step 6: Commit**

```bash
cd ~/world-live
git init
git add -A
git commit -m "feat: project scaffold — HTML structure, dark CSS theme, CDN imports"
```

---

## Task 2: Three.js Scene Setup (Stars + Lighting)

**Files:**
- Create: `~/world-live/js/globe.js`

**Step 1: Create `js/globe.js` — scene, camera, renderer, stars**

```javascript
// globe.js
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export let scene, camera, renderer, controls
export let earthMesh, markerGroup
let animationId
let autoRotate = true

export function initGlobe(canvas) {
  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 0, 15)

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000)

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 7
  controls.maxDistance = 30
  controls.autoRotate = false  // we handle rotation manually
  controls.enablePan = false

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.35)
  scene.add(ambient)

  const sun = new THREE.DirectionalLight(0xffffff, 1.4)
  sun.position.set(20, 10, 15)
  scene.add(sun)

  // Stars background
  _addStars()

  // Marker group (filled later)
  markerGroup = new THREE.Group()
  scene.add(markerGroup)

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  // Start render loop
  _animate()

  return { scene, camera, renderer, controls }
}

function _addStars() {
  const geo = new THREE.BufferGeometry()
  const count = 5000
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 800
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true })
  scene.add(new THREE.Points(geo, mat))
}

function _animate() {
  animationId = requestAnimationFrame(_animate)
  if (autoRotate && earthMesh) {
    earthMesh.rotation.y += 0.0015
    markerGroup.rotation.y += 0.0015
  }
  controls.update()
  renderer.render(scene, camera)
}

export function pauseAutoRotate() { autoRotate = false }
export function resumeAutoRotate() { autoRotate = true }
```

**Step 2: Update `js/app.js` to init globe**

```javascript
import { initGlobe } from './globe.js'

async function main() {
  const canvas = document.getElementById('globe-canvas')
  initGlobe(canvas)
  console.log('Globe initialized')
}

main()
```

**Step 3: Verify in browser**

Open `http://localhost:8080`.
Expected: Black background with white star particles visible, no errors. Canvas fills viewport.

**Step 4: Commit**

```bash
cd ~/world-live
git add js/globe.js js/app.js
git commit -m "feat: Three.js scene with stars, lighting, OrbitControls"
```

---

## Task 3: Earth Sphere + Atmosphere

**Files:**
- Modify: `~/world-live/js/globe.js`

**Step 1: Add `addEarth()` function to globe.js**

Add this function to `globe.js` (export it, add call after `_addStars()` in `initGlobe`):

```javascript
export function addEarth() {
  const loader = new THREE.TextureLoader()

  // Earth texture (Three.js CDN — reliable, no API key)
  const earthTex = loader.load(
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg'
  )
  // Bump map for elevation
  const bumpTex = loader.load(
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png'
  )
  // Specular map (ocean shine)
  const specTex = loader.load(
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png'
  )

  const geo = new THREE.SphereGeometry(5, 64, 64)
  const mat = new THREE.MeshPhongMaterial({
    map: earthTex,
    bumpMap: bumpTex,
    bumpScale: 0.05,
    specularMap: specTex,
    specular: new THREE.Color(0x333333),
    shininess: 15,
  })

  earthMesh = new THREE.Mesh(geo, mat)
  scene.add(earthMesh)

  // Atmosphere glow (slightly larger sphere)
  const atmoGeo = new THREE.SphereGeometry(5.18, 64, 64)
  const atmoMat = new THREE.MeshPhongMaterial({
    color: 0x3377ff,
    transparent: true,
    opacity: 0.08,
    side: THREE.FrontSide,
  })
  const atmosphere = new THREE.Mesh(atmoGeo, atmoMat)
  scene.add(atmosphere)

  return earthMesh
}
```

In `initGlobe`, after `_addStars()`:
```javascript
addEarth()
```

**Step 2: Verify in browser**

Expected: Blue-marble Earth texture rendered on spinning globe. Subtle atmosphere glow visible on edges. Stars in background. OrbitControls work (drag to rotate, scroll to zoom).

**Step 3: Commit**

```bash
cd ~/world-live
git add js/globe.js
git commit -m "feat: Earth sphere with NASA blue-marble texture and atmosphere glow"
```

---

## Task 4: Countries Data

**Files:**
- Create: `~/world-live/data/countries.json`

**Step 1: Create `data/countries.json`**

This maps ISO country codes to lat/lon centers. Includes all countries that have IPTV-Org coverage. Each entry: `[lat, lon, displayName, iptv_code]`.

```json
{
  "AF": [33.93, 67.71, "Afghanistan", "af"],
  "AL": [41.15, 20.17, "Albania", "al"],
  "DZ": [28.03, 1.66, "Algeria", "dz"],
  "AD": [42.55, 1.60, "Andorra", "ad"],
  "AO": [-11.20, 17.87, "Angola", "ao"],
  "AR": [-38.42, -63.62, "Argentina", "ar"],
  "AM": [40.07, 45.04, "Armenia", "am"],
  "AU": [-25.27, 133.78, "Australia", "au"],
  "AT": [47.52, 14.55, "Austria", "at"],
  "AZ": [40.14, 47.58, "Azerbaijan", "az"],
  "BH": [26.00, 50.55, "Bahrain", "bh"],
  "BD": [23.69, 90.36, "Bangladesh", "bd"],
  "BY": [53.71, 27.95, "Belarus", "by"],
  "BE": [50.50, 4.47, "Belgium", "be"],
  "BO": [-16.29, -63.59, "Bolivia", "bo"],
  "BA": [43.92, 17.68, "Bosnia", "ba"],
  "BR": [-14.24, -51.93, "Brazil", "br"],
  "BN": [4.54, 114.73, "Brunei", "bn"],
  "BG": [42.73, 25.49, "Bulgaria", "bg"],
  "KH": [12.57, 104.99, "Cambodia", "kh"],
  "CM": [3.85, 11.50, "Cameroon", "cm"],
  "CA": [56.13, -106.35, "Canada", "ca"],
  "CL": [-35.68, -71.54, "Chile", "cl"],
  "CN": [35.86, 104.20, "China", "cn"],
  "CO": [4.57, -74.30, "Colombia", "co"],
  "CR": [9.75, -83.75, "Costa Rica", "cr"],
  "HR": [45.10, 15.20, "Croatia", "hr"],
  "CU": [21.52, -77.78, "Cuba", "cu"],
  "CY": [35.13, 33.43, "Cyprus", "cy"],
  "CZ": [49.82, 15.47, "Czech Republic", "cz"],
  "DK": [56.26, 9.50, "Denmark", "dk"],
  "DO": [18.74, -70.16, "Dominican Republic", "do"],
  "EC": [-1.83, -78.18, "Ecuador", "ec"],
  "EG": [26.82, 30.80, "Egypt", "eg"],
  "SV": [13.79, -88.90, "El Salvador", "sv"],
  "EE": [58.60, 25.01, "Estonia", "ee"],
  "ET": [9.14, 40.49, "Ethiopia", "et"],
  "FI": [61.92, 25.75, "Finland", "fi"],
  "FR": [46.23, 2.21, "France", "fr"],
  "GE": [42.32, 43.36, "Georgia", "ge"],
  "DE": [51.17, 10.45, "Germany", "de"],
  "GH": [7.95, -1.02, "Ghana", "gh"],
  "GR": [39.07, 21.82, "Greece", "gr"],
  "GT": [15.78, -90.23, "Guatemala", "gt"],
  "HN": [15.20, -86.24, "Honduras", "hn"],
  "HK": [22.40, 114.11, "Hong Kong", "hk"],
  "HU": [47.16, 19.50, "Hungary", "hu"],
  "IN": [20.59, 78.96, "India", "in"],
  "ID": [-0.79, 113.92, "Indonesia", "id"],
  "IR": [32.43, 53.69, "Iran", "ir"],
  "IQ": [33.22, 43.68, "Iraq", "iq"],
  "IE": [53.41, -8.24, "Ireland", "ie"],
  "IL": [31.05, 34.85, "Israel", "il"],
  "IT": [41.87, 12.57, "Italy", "it"],
  "JM": [18.11, -77.30, "Jamaica", "jm"],
  "JP": [36.20, 138.25, "Japan", "jp"],
  "JO": [30.59, 36.24, "Jordan", "jo"],
  "KZ": [48.02, 66.92, "Kazakhstan", "kz"],
  "KE": [-0.02, 37.91, "Kenya", "ke"],
  "KW": [29.31, 47.48, "Kuwait", "kw"],
  "KG": [41.20, 74.77, "Kyrgyzstan", "kg"],
  "LV": [56.88, 24.60, "Latvia", "lv"],
  "LB": [33.85, 35.86, "Lebanon", "lb"],
  "LY": [26.34, 17.23, "Libya", "ly"],
  "LT": [55.17, 23.88, "Lithuania", "lt"],
  "LU": [49.82, 6.13, "Luxembourg", "lu"],
  "MO": [22.20, 113.55, "Macau", "mo"],
  "MY": [4.21, 108.00, "Malaysia", "my"],
  "MX": [23.63, -102.55, "Mexico", "mx"],
  "MD": [47.41, 28.37, "Moldova", "md"],
  "MN": [46.86, 103.85, "Mongolia", "mn"],
  "ME": [42.71, 19.37, "Montenegro", "me"],
  "MA": [31.79, -7.09, "Morocco", "ma"],
  "MZ": [-18.67, 35.53, "Mozambique", "mz"],
  "MM": [21.91, 95.96, "Myanmar", "mm"],
  "NP": [28.39, 84.12, "Nepal", "np"],
  "NL": [52.13, 5.29, "Netherlands", "nl"],
  "NZ": [-40.90, 174.89, "New Zealand", "nz"],
  "NI": [12.87, -85.21, "Nicaragua", "ni"],
  "NG": [9.08, 8.68, "Nigeria", "ng"],
  "MK": [41.61, 21.75, "North Macedonia", "mk"],
  "NO": [60.47, 8.47, "Norway", "no"],
  "OM": [21.51, 55.92, "Oman", "om"],
  "PK": [30.38, 69.35, "Pakistan", "pk"],
  "PS": [31.95, 35.23, "Palestine", "ps"],
  "PA": [8.54, -80.78, "Panama", "pa"],
  "PY": [-23.44, -58.44, "Paraguay", "py"],
  "PE": [-9.19, -75.02, "Peru", "pe"],
  "PH": [12.88, 121.77, "Philippines", "ph"],
  "PL": [51.92, 19.15, "Poland", "pl"],
  "PT": [39.40, -8.22, "Portugal", "pt"],
  "QA": [25.35, 51.18, "Qatar", "qa"],
  "RO": [45.94, 24.97, "Romania", "ro"],
  "RU": [61.52, 105.32, "Russia", "ru"],
  "SA": [23.89, 45.08, "Saudi Arabia", "sa"],
  "RS": [44.02, 21.01, "Serbia", "rs"],
  "SG": [1.35, 103.82, "Singapore", "sg"],
  "SK": [48.67, 19.70, "Slovakia", "sk"],
  "SI": [46.15, 14.99, "Slovenia", "si"],
  "SO": [5.15, 46.20, "Somalia", "so"],
  "ZA": [-30.56, 22.94, "South Africa", "za"],
  "KR": [35.91, 127.77, "South Korea", "kr"],
  "SS": [7.87, 29.97, "South Sudan", "ss"],
  "ES": [40.46, -3.75, "Spain", "es"],
  "LK": [7.87, 80.77, "Sri Lanka", "lk"],
  "SD": [12.86, 30.22, "Sudan", "sd"],
  "SE": [60.13, 18.64, "Sweden", "se"],
  "CH": [46.82, 8.23, "Switzerland", "ch"],
  "SY": [34.80, 38.99, "Syria", "sy"],
  "TW": [23.70, 120.96, "Taiwan", "tw"],
  "TJ": [38.86, 71.28, "Tajikistan", "tj"],
  "TZ": [-6.37, 34.89, "Tanzania", "tz"],
  "TH": [15.87, 100.99, "Thailand", "th"],
  "TN": [33.89, 9.54, "Tunisia", "tn"],
  "TR": [38.96, 35.24, "Turkey", "tr"],
  "TM": [38.97, 59.56, "Turkmenistan", "tm"],
  "UG": [1.37, 32.29, "Uganda", "ug"],
  "UA": [48.38, 31.17, "Ukraine", "ua"],
  "AE": [23.42, 53.85, "UAE", "ae"],
  "GB": [55.38, -3.44, "United Kingdom", "gb"],
  "US": [37.09, -95.71, "United States", "us"],
  "UY": [-32.52, -55.77, "Uruguay", "uy"],
  "UZ": [41.38, 64.59, "Uzbekistan", "uz"],
  "VE": [6.42, -66.59, "Venezuela", "ve"],
  "VN": [14.06, 108.28, "Vietnam", "vn"],
  "YE": [15.55, 48.52, "Yemen", "ye"],
  "ZM": [-13.13, 27.85, "Zambia", "zm"],
  "ZW": [-19.01, 29.15, "Zimbabwe", "zw"]
}
```

**Step 2: Verify JSON is valid**

```bash
python3 -c "import json; d = json.load(open('data/countries.json')); print(f'{len(d)} countries loaded')"
```

Expected: `120 countries loaded` (approximate)

**Step 3: Commit**

```bash
cd ~/world-live
git add data/countries.json
git commit -m "feat: countries.json with lat/lon for 120+ countries"
```

---

## Task 5: Country Markers on Globe

**Files:**
- Create: `~/world-live/js/channels.js` (partial — marker data only)
- Modify: `~/world-live/js/globe.js`

**Step 1: Add `latLonToVector3` and `addMarkers` to globe.js**

Add these functions to `globe.js`:

```javascript
// Convert geographic coordinates to 3D position on sphere surface
export function latLonToVector3(lat, lon, radius = 5.05) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
     (radius * Math.cos(phi)),
     (radius * Math.sin(phi) * Math.sin(theta))
  )
}

// markers: [{code, lat, lon, name}]
export function addMarkers(markers) {
  // Clear existing
  while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0])

  markers.forEach(m => {
    const pos = latLonToVector3(m.lat, m.lon)

    const geo = new THREE.SphereGeometry(0.07, 8, 8)
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(pos)
    mesh.userData = { code: m.code, name: m.name, lat: m.lat, lon: m.lon }

    markerGroup.add(mesh)
  })
}
```

**Step 2: Create `js/channels.js` with `loadCountries` and `getMarkers`**

```javascript
// channels.js
let countriesData = {}  // { CODE: [lat, lon, name, iptv_code] }

export async function loadCountries() {
  const res = await fetch('data/countries.json')
  countriesData = await res.json()
  return countriesData
}

export function getMarkers() {
  return Object.entries(countriesData).map(([code, [lat, lon, name]]) => ({
    code, lat, lon, name
  }))
}

// IPTV-Org CDN base URL
const IPTV_BASE = 'https://iptv-org.github.io/iptv/countries/'

// Cache: countryCode → channels array
const channelCache = {}

export async function fetchChannels(countryCode) {
  const code = countryCode.toLowerCase()
  if (channelCache[code]) return channelCache[code]

  try {
    const res = await fetch(`${IPTV_BASE}${code}.m3u`)
    if (!res.ok) {
      channelCache[code] = []
      return []
    }
    const text = await res.text()
    const channels = parseM3U(text)
    channelCache[code] = channels
    return channels
  } catch {
    channelCache[code] = []
    return []
  }
}

// Parse M3U playlist into channel objects
export function parseM3U(text) {
  const channels = []
  const lines = text.split('\n')
  let current = null

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('#EXTINF:')) {
      current = { name: '', url: '', logo: '', group: '', type: 'hls' }
      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]*)"/)
      if (logoMatch) current.logo = logoMatch[1]
      // Extract name (after last comma)
      const commaIdx = line.lastIndexOf(',')
      if (commaIdx !== -1) current.name = line.slice(commaIdx + 1).trim()
    } else if (line && !line.startsWith('#') && current) {
      current.url = line
      current.type = detectStreamType(line)
      channels.push(current)
      current = null
    }
  }
  return channels
}

export function detectStreamType(url) {
  if (!url) return 'hls'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('.mp4'))  return 'mp4'
  if (url.includes('.ts'))   return 'hls'
  return 'hls'
}
```

**Step 3: Update `js/app.js` to load countries and add markers**

```javascript
import { initGlobe, addMarkers } from './globe.js'
import { loadCountries, getMarkers } from './channels.js'

async function main() {
  const canvas = document.getElementById('globe-canvas')
  initGlobe(canvas)

  const countries = await loadCountries()
  const markers = getMarkers()
  addMarkers(markers)
  console.log(`Loaded ${markers.length} country markers`)
}

main()
```

**Step 4: Verify in browser**

Expected: Orange-red dots visible on globe surface at country positions. Dots rotate with the globe.

**Step 5: Commit**

```bash
cd ~/world-live
git add js/globe.js js/channels.js js/app.js
git commit -m "feat: country markers on globe with lat/lon to 3D coordinate conversion"
```

---

## Task 6: Hover Tooltip + Click Detection (Raycaster)

**Files:**
- Modify: `~/world-live/js/globe.js`
- Modify: `~/world-live/js/app.js`

**Step 1: Add raycaster and event emitter to globe.js**

Add to the top of `globe.js`:
```javascript
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredMarker = null
// Simple event emitter
const listeners = { markerHover: [], markerClick: [] }
export function on(event, fn) { listeners[event]?.push(fn) }
function emit(event, data) { listeners[event]?.forEach(fn => fn(data)) }
```

Add these functions to `globe.js` (call `_setupInteraction(canvas)` in `initGlobe` after controls setup):

```javascript
function _setupInteraction(canvas) {
  canvas.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth)  * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(markerGroup.children)

    if (hits.length > 0) {
      const marker = hits[0].object
      canvas.style.cursor = 'pointer'
      if (hoveredMarker !== marker) {
        hoveredMarker = marker
        // Scale up hovered marker
        marker.scale.setScalar(1.8)
        emit('markerHover', { userData: marker.userData, clientX: e.clientX, clientY: e.clientY })
      }
    } else {
      canvas.style.cursor = controls.enabled ? 'grab' : 'grabbing'
      if (hoveredMarker) {
        hoveredMarker.scale.setScalar(1.0)
        hoveredMarker = null
        emit('markerHover', null)
      }
    }
  })

  canvas.addEventListener('click', e => {
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(markerGroup.children)
    if (hits.length > 0) {
      const marker = hits[0].object
      emit('markerClick', marker.userData)
    }
  })
}
```

**Step 2: Wire hover tooltip in app.js**

```javascript
import { initGlobe, addMarkers, on, pauseAutoRotate, resumeAutoRotate } from './globe.js'
import { loadCountries, getMarkers, fetchChannels } from './channels.js'

const tooltip = document.getElementById('tooltip')

async function main() {
  const canvas = document.getElementById('globe-canvas')
  initGlobe(canvas)

  const countries = await loadCountries()
  addMarkers(getMarkers())

  // Tooltip on hover
  on('markerHover', data => {
    if (!data) {
      tooltip.style.display = 'none'
      resumeAutoRotate()
      return
    }
    tooltip.textContent = data.userData.name
    tooltip.style.display = 'block'
    tooltip.style.left = (data.clientX + 14) + 'px'
    tooltip.style.top  = (data.clientY - 28) + 'px'
    pauseAutoRotate()
  })

  // Channel panel on click (wired in Task 7)
  on('markerClick', async data => {
    console.log('Clicked:', data.name, data.code)
  })
}

main()
```

**Step 3: Verify in browser**

Expected: Hover over a marker → tooltip shows country name, marker scales up, globe stops. Move away → tooltip hides, globe resumes. Click marker → console log.

**Step 4: Commit**

```bash
cd ~/world-live
git add js/globe.js js/app.js
git commit -m "feat: raycaster hover tooltip and click detection on country markers"
```

---

## Task 7: Channel Panel UI

**Files:**
- Create: `~/world-live/js/player.js`
- Modify: `~/world-live/js/app.js`

**Step 1: Create `js/player.js`**

```javascript
// player.js
export function initPlayer() {
  const video   = document.getElementById('pip-video')
  const iframe  = document.getElementById('pip-iframe')
  const pip     = document.getElementById('pip-player')
  const pipTitle = document.getElementById('pip-title')

  document.getElementById('pip-close').addEventListener('click', () => {
    stopAll()
    pip.classList.add('hidden')
  })

  document.getElementById('pip-expand').addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.getElementById('pip-video-container').requestFullscreen?.()
    }
  })

  function stopAll() {
    // Stop HLS
    if (window._hls) { window._hls.destroy(); window._hls = null }
    video.pause()
    video.src = ''
    // Stop YouTube
    iframe.src = ''
    iframe.style.display = 'none'
    video.style.display  = 'block'
  }

  return {
    play(channel) {
      stopAll()
      pipTitle.textContent = channel.name
      pip.classList.remove('hidden')

      if (channel.type === 'youtube') {
        const videoId = channel.videoId || extractYouTubeId(channel.url)
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0`
        iframe.style.display = 'block'
        video.style.display  = 'none'
      } else {
        video.style.display = 'block'
        iframe.style.display = 'none'
        if (Hls.isSupported() && (channel.type === 'hls' || channel.url?.includes('.m3u8'))) {
          const hls = new Hls({ enableWorker: false })
          window._hls = hls
          hls.loadSource(channel.url)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) console.warn('HLS fatal error:', data.type)
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = channel.url
          video.play().catch(() => {})
        } else {
          video.src = channel.url
          video.play().catch(() => {})
        }
      }
    }
  }
}

function extractYouTubeId(url) {
  if (!url) return ''
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : url
}

export function detectStreamType(url) {
  if (!url) return 'hls'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('.mp4'))  return 'mp4'
  return 'hls'
}
```

**Step 2: Wire channel panel in app.js**

Replace `app.js` with the fully wired version:

```javascript
import { initGlobe, addMarkers, on, pauseAutoRotate, resumeAutoRotate } from './globe.js'
import { loadCountries, getMarkers, fetchChannels, detectStreamType } from './channels.js'
import { initPlayer } from './player.js'

const tooltip     = document.getElementById('tooltip')
const panel       = document.getElementById('channel-panel')
const panelName   = document.getElementById('panel-country-name')
const panelLoading = document.getElementById('panel-loading')
const channelList = document.getElementById('channel-list')
const panelClose  = document.getElementById('panel-close')

let player
let activeChannelEl = null

async function main() {
  const canvas = document.getElementById('globe-canvas')
  initGlobe(canvas)
  player = initPlayer()

  await loadCountries()
  addMarkers(getMarkers())

  // Tooltip on hover
  on('markerHover', data => {
    if (!data) { tooltip.style.display = 'none'; return }
    tooltip.textContent = data.userData.name
    tooltip.style.display = 'block'
    tooltip.style.left = (data.clientX + 14) + 'px'
    tooltip.style.top  = (data.clientY - 28) + 'px'
  })

  // Open channel panel on click
  on('markerClick', async data => {
    openPanel(data.name, data.code)
  })

  // Close panel
  panelClose.addEventListener('click', () => panel.classList.add('hidden'))

  // Custom URL in panel
  document.getElementById('custom-url-play').addEventListener('click', () => {
    const url = document.getElementById('custom-url-input').value.trim()
    if (url) playUrl(url, 'Custom Stream')
  })
  document.getElementById('custom-url-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('custom-url-play').click()
  })

  // Random channel button
  document.getElementById('btn-random').addEventListener('click', playRandomChannel)

  // URL modal
  document.getElementById('btn-custom-url').addEventListener('click', () => {
    document.getElementById('url-modal').classList.remove('hidden')
    document.getElementById('url-modal-input').focus()
  })
  document.getElementById('url-modal-cancel').addEventListener('click', () => {
    document.getElementById('url-modal').classList.add('hidden')
  })
  document.getElementById('url-modal-play').addEventListener('click', () => {
    const url = document.getElementById('url-modal-input').value.trim()
    if (url) {
      playUrl(url, 'Custom Stream')
      document.getElementById('url-modal').classList.add('hidden')
    }
  })
}

async function openPanel(countryName, countryCode) {
  panel.classList.remove('hidden')
  panelName.textContent = countryName
  channelList.innerHTML = ''
  panelLoading.classList.remove('hidden')

  const channels = await fetchChannels(countryCode)

  // Also load YouTube curated channels for this country
  const ytChannels = await getYouTubeChannels(countryCode)

  panelLoading.classList.add('hidden')
  const all = [...ytChannels, ...channels]

  if (all.length === 0) {
    channelList.innerHTML = '<div style="padding:16px;color:rgba(255,255,255,0.4);font-size:0.78rem">No channels found for this country.</div>'
    return
  }

  all.forEach(ch => {
    const item = document.createElement('div')
    item.className = 'channel-item'
    item.innerHTML = `
      ${ch.logo
        ? `<img class="channel-logo" src="${ch.logo}" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="channel-logo-placeholder">TV</div>`
      }
      <span class="channel-name" title="${ch.name}">${ch.name}</span>
      <span class="channel-badge badge-${ch.type === 'youtube' ? 'yt' : ch.type === 'cam' ? 'cam' : 'hls'}">${ch.type === 'youtube' ? 'YT' : ch.type === 'cam' ? 'CAM' : 'HLS'}</span>
    `
    item.addEventListener('click', () => {
      if (activeChannelEl) activeChannelEl.classList.remove('active')
      item.classList.add('active')
      activeChannelEl = item
      player.play(ch)
    })
    channelList.appendChild(item)
  })
}

// YouTube curated data (loaded once)
let ytData = null
async function getYouTubeChannels(countryCode) {
  if (!ytData) {
    try {
      const res = await fetch('data/youtube.json')
      ytData = await res.json()
    } catch { ytData = [] }
  }
  return ytData.filter(ch => ch.country === countryCode.toUpperCase())
}

function playUrl(url, name = 'Custom') {
  const type = detectStreamType(url)
  player.play({ name, url, type })
}

// Play a random channel from a random country
async function playRandomChannel() {
  const countries = getMarkers()
  const random = countries[Math.floor(Math.random() * countries.length)]
  const channels = await fetchChannels(random.code)
  if (channels.length > 0) {
    const ch = channels[Math.floor(Math.random() * channels.length)]
    player.play(ch)
  }
}

main()
```

**Step 3: Verify in browser**

Expected:
- Click a country marker → panel slides in showing "Loading channels..."
- After load → channel list appears with logos, names, HLS/YT badges
- Click a channel → PiP player appears bottom-right with stream

**Step 4: Commit**

```bash
cd ~/world-live
git add js/app.js js/player.js
git commit -m "feat: channel panel, PiP player, HLS.js + YouTube iframe playback"
```

---

## Task 8: YouTube Curated Data

**Files:**
- Create: `~/world-live/data/youtube.json`

**Step 1: Create `data/youtube.json`**

```json
[
  {"country": "KR", "name": "YTN 뉴스", "type": "youtube", "videoId": "4s9IjkMg4wQ", "logo": ""},
  {"country": "KR", "name": "MBN 뉴스", "type": "youtube", "videoId": "dkMCXEKxkus", "logo": ""},
  {"country": "US", "name": "ABC News Live", "type": "youtube", "videoId": "w_Ma8oQLmSM", "logo": ""},
  {"country": "US", "name": "CBS News 24/7", "type": "youtube", "videoId": "IWFHMNiLkMs", "logo": ""},
  {"country": "US", "name": "NBC News Now", "type": "youtube", "videoId": "MKLFCsFHBKM", "logo": ""},
  {"country": "GB", "name": "Sky News", "type": "youtube", "videoId": "9Auq9mYxFEE", "logo": ""},
  {"country": "GB", "name": "BBC News", "type": "youtube", "videoId": "HMKSzUQBXHI", "logo": ""},
  {"country": "JP", "name": "NHK World", "type": "youtube", "videoId": "oJwXMG52sqQ", "logo": ""},
  {"country": "JP", "name": "TBS News", "type": "youtube", "videoId": "3ek2e9MZL3E", "logo": ""},
  {"country": "FR", "name": "France 24 English", "type": "youtube", "videoId": "h3MuIUNCCLI", "logo": ""},
  {"country": "FR", "name": "BFM TV", "type": "youtube", "videoId": "c8fWMQoRGOg", "logo": ""},
  {"country": "DE", "name": "DW News", "type": "youtube", "videoId": "GfudFGIkrqo", "logo": ""},
  {"country": "AU", "name": "ABC News (Australia)", "type": "youtube", "videoId": "2m28OtGjMkU", "logo": ""},
  {"country": "IN", "name": "NDTV 24x7", "type": "youtube", "videoId": "zEDhlmZRSCY", "logo": ""},
  {"country": "IN", "name": "Times Now", "type": "youtube", "videoId": "dQnJiqmJoAY", "logo": ""},
  {"country": "RU", "name": "RT English", "type": "youtube", "videoId": "UZlSBOFSmn8", "logo": ""},
  {"country": "CN", "name": "CGTN", "type": "youtube", "videoId": "5l3gF7-GKDM", "logo": ""},
  {"country": "AE", "name": "Al Jazeera English", "type": "youtube", "videoId": "F3qdNHZSXXg", "logo": ""},
  {"country": "IT", "name": "Sky TG24", "type": "youtube", "videoId": "rCkZEpx5Jdw", "logo": ""},
  {"country": "ES", "name": "24h TVE", "type": "youtube", "videoId": "gx4LmKMT8Z8", "logo": ""},
  {"country": "BR", "name": "TV Brasil", "type": "youtube", "videoId": "FMiMP-OLl9M", "logo": ""},
  {"country": "CA", "name": "CP24", "type": "youtube", "videoId": "P7YVVSP43IY", "logo": ""},
  {"country": "PH", "name": "ABS-CBN News", "type": "youtube", "videoId": "JqG4V9PaBpg", "logo": ""}
]
```

**Step 2: Verify JSON valid**

```bash
python3 -c "import json; d = json.load(open('data/youtube.json')); print(f'{len(d)} YouTube channels')"
```

Expected: `23 YouTube channels`

**Step 3: Verify in browser**

Click South Korea → YTN 뉴스 and MBN 뉴스 with [YT] badge appear at top of channel list.

**Step 4: Commit**

```bash
cd ~/world-live
git add data/youtube.json
git commit -m "feat: curated YouTube live channels for 15+ countries"
```

---

## Task 9: Pulsing Marker Animation

**Files:**
- Modify: `~/world-live/js/globe.js`

**Step 1: Add pulsing animation to `_animate()` in globe.js**

Modify the `_animate` function to add pulsing:

```javascript
let _pulseTime = 0

function _animate() {
  animationId = requestAnimationFrame(_animate)
  _pulseTime += 0.04

  if (earthMesh) {
    if (autoRotate) {
      earthMesh.rotation.y += 0.0015
      markerGroup.rotation.y += 0.0015
    }
    // Pulse markers
    markerGroup.children.forEach((m, i) => {
      const pulse = 1.0 + 0.3 * Math.sin(_pulseTime + i * 0.7)
      if (m !== hoveredMarker) m.scale.setScalar(pulse)
    })
  }

  controls.update()
  renderer.render(scene, camera)
}
```

Note: `hoveredMarker` must be accessible in scope. Move `let hoveredMarker = null` to module scope if not already there.

**Step 2: Verify in browser**

Expected: All markers gently pulse (grow/shrink) in an offset wave pattern. Hovered marker stays enlarged.

**Step 3: Commit**

```bash
cd ~/world-live
git add js/globe.js
git commit -m "feat: pulsing animation on country markers"
```

---

## Task 10: Night Texture + Clouds (Optional Enhancement)

**Files:**
- Modify: `~/world-live/js/globe.js`

**Step 1: Add cloud layer to `addEarth()`**

After creating earthMesh in `addEarth()`:

```javascript
// Cloud layer (slowly rotating)
const cloudTex = loader.load(
  'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png'
)
const cloudGeo = new THREE.SphereGeometry(5.1, 64, 64)
const cloudMat = new THREE.MeshPhongMaterial({
  map: cloudTex,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
})
const clouds = new THREE.Mesh(cloudGeo, cloudMat)
scene.add(clouds)

// Rotate clouds slightly faster than earth
// Store reference for animate loop
window._clouds = clouds
```

In `_animate()`, add:
```javascript
if (window._clouds) window._clouds.rotation.y += 0.0018
```

**Step 2: Verify in browser**

Expected: Semi-transparent cloud layer visible rotating slightly faster than Earth surface.

**Step 3: Commit**

```bash
cd ~/world-live
git add js/globe.js
git commit -m "feat: rotating cloud layer on Earth globe"
```

---

## Task 11: Error Handling + Stream Retry

**Files:**
- Modify: `~/world-live/js/player.js`
- Modify: `~/world-live/js/app.js`

**Step 1: Add error UI to PiP player (player.js)**

In the `play()` function in player.js, add error handler:

```javascript
// After hls.on(Hls.Events.ERROR, ...)
hls.on(Hls.Events.ERROR, (_, data) => {
  if (data.fatal) {
    console.warn('Stream error:', channel.name, data.type)
    _showError(pip, 'Stream unavailable. Try another channel.')
  }
})
```

Add `_showError` function:
```javascript
function _showError(pip, msg) {
  const existing = pip.querySelector('.stream-error')
  if (existing) existing.remove()
  const el = document.createElement('div')
  el.className = 'stream-error'
  el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);color:rgba(255,255,255,0.6);font-size:0.75rem;text-align:center;padding:20px;'
  el.textContent = msg
  document.getElementById('pip-video-container').appendChild(el)
}
```

**Step 2: Add loading state to channel panel (app.js)**

In `openPanel()`, add timeout feedback:
```javascript
// After panelLoading shown
const loadTimeout = setTimeout(() => {
  panelLoading.textContent = 'Loading channels... (this may take a moment)'
}, 3000)

const channels = await fetchChannels(countryCode)
clearTimeout(loadTimeout)
panelLoading.classList.add('hidden')
panelLoading.textContent = 'Loading channels...' // reset
```

**Step 3: Commit**

```bash
cd ~/world-live
git add js/player.js js/app.js
git commit -m "feat: stream error display and loading timeout feedback"
```

---

## Task 12: Final Polish + Deployment

**Files:**
- Modify: `~/world-live/index.html` (add favicon, meta description)
- Create: `~/world-live/vercel.json` (headers for CDN)

**Step 1: Add Vercel config**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ]
}
```

**Step 2: Add meta tags to `index.html` `<head>`**

```html
<meta name="description" content="Watch live streams from around the world on an interactive 3D globe">
<meta property="og:title" content="World Live — Global Live Streams">
<meta property="og:description" content="Explore real-time TV and webcam feeds on a 3D Earth">
```

**Step 3: Deploy to Vercel**

```bash
cd ~/world-live
# Install Vercel CLI if not present
npm install -g vercel
vercel --yes
```

Or deploy to GitHub Pages:
```bash
# Push to GitHub repo, enable Pages in Settings → Pages → Deploy from main branch
git remote add origin https://github.com/YOUR_USERNAME/world-live.git
git push -u origin main
```

**Step 4: Full functionality checklist**

- [ ] Globe renders with Earth texture + stars
- [ ] Country markers pulse and respond to hover
- [ ] Tooltip shows country name on hover
- [ ] Click marker → channel panel slides in
- [ ] IPTV channels load from iptv-org
- [ ] YouTube channels appear at top of list
- [ ] Click channel → PiP player plays stream
- [ ] Stream errors show user-friendly message
- [ ] Custom URL input plays arbitrary streams
- [ ] Random channel button works
- [ ] Panel closes on ✕ click
- [ ] PiP closes on ✕ click

**Step 5: Final commit**

```bash
cd ~/world-live
git add -A
git commit -m "feat: production polish, Vercel config, meta tags

World Live Globe MVP complete:
- Three.js 3D Earth with NASA textures + cloud layer
- 120+ country markers with pulsing animation + raycaster
- IPTV-Org integration (8000+ channels via lazy-loaded M3U)
- YouTube curated live streams for 20+ countries
- HLS.js + YouTube iframe PiP player
- Custom URL input, random channel, error handling

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Quick Reference

| Component | File | Key Function |
|-----------|------|--------------|
| Globe init | `js/globe.js` | `initGlobe(canvas)` |
| Add markers | `js/globe.js` | `addMarkers(markers)` |
| Coord convert | `js/globe.js` | `latLonToVector3(lat, lon)` |
| Events | `js/globe.js` | `on('markerClick', fn)` |
| Load countries | `js/channels.js` | `loadCountries()` |
| Fetch IPTV | `js/channels.js` | `fetchChannels('kr')` |
| Parse M3U | `js/channels.js` | `parseM3U(text)` |
| Play stream | `js/player.js` | `player.play({name, url, type})` |
| Main wiring | `js/app.js` | `main()` |

## Known Limitations

- **CORS**: Some IPTV streams will fail with CORS errors in browsers — this is expected. The app silently ignores these streams and the user can try others.
- **RTSP**: `rtsp://` streams are NOT supported in browsers. Only HLS (.m3u8), MP4, and YouTube are supported.
- **Stream reliability**: IPTV-Org channels may be offline. This is inherent to the free data source.
- **YouTube IDs**: Curated YouTube video IDs in `youtube.json` may become stale if channels change their live stream. Update as needed.
