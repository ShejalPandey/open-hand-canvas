<p align="center">
  <img width="1024" height="1024" alt="ChatGPT Image Mar 4, 2026, 04_09_38 PM" src="https://github.com/user-attachments/assets/c9797b85-8036-4f7b-9d83-274686492204" />
</p>

<h1 align="center">Open Hand Canvas</h1>

<p align="center">
  <b>Real-time hand-tracking interactive experience — connect your fingertips to spawn and control a living 3D blob.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Three.js-0.183-000000?logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/MediaPipe-Hands-4285F4?logo=google&logoColor=white" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 🎯 What is Open Hand Canvas?

**Open Hand Canvas** is a browser-based augmented reality experience that uses your webcam to track both hands in real-time. By connecting your fingertips across two hands, you progressively build up to spawning a beautiful **3D particle blob** — rendered with custom GLSL shaders — that you can control through hand gestures alone.

No mouse. No keyboard. Just your hands.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🖐️ **Dual Hand Tracking** | Tracks up to 2 hands simultaneously using Google's MediaPipe Hands ML model |
| 🦴 **Live Hand Skeleton** | Renders all 21 hand landmarks and 23 bone connections in real-time on a 2D canvas |
| 🔗 **Finger Connection System** | Detects when corresponding fingertips from both hands touch (within 80px threshold) |
| 🫧 **3D Blob (Three.js)** | A particle-based sphere with custom simplex noise vertex shader for organic pulsation |
| 🎨 **Multi-Color GLSL Shading** | 4-directional color gradient: Navy, Orange, Purple, and Teal — blended via fragment shader |
| ✨ **Sparkle Effects** | Golden sparkle particles spawn when fingers on the same hand touch each other |
| 🔊 **Sound Effects** | Web Audio API-generated sounds for burst, connect, and stretch interactions |
| 📐 **Dynamic Blob Sizing** | Blob size scales based on the distance between your hands — pull apart to grow, push together to shrink |
| 📷 **Camera Preview** | Live webcam feed displayed in a compact overlay |
| 📱 **Responsive** | Full-screen canvas adapts to any window size |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A device with a **webcam**
- A modern browser (Chrome, Edge, or Firefox recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/open-hand-canvas.git
cd open-hand-canvas

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🎮 How to Use

```
Step 1 → Open the app and click [START]
Step 2 → Grant webcam access when prompted
Step 3 → Hold both hands in front of the camera
Step 4 → Touch corresponding fingertips between both hands
         (thumb↔thumb, index↔index, middle↔middle, ring↔ring, pinky↔pinky)
Step 5 → Watch the connection counter: "Connections: X/5"
Step 6 → Once all 5 fingers are connected → 3D BLOB appears! 🫧
Step 7 → Move your hands to control the blob's position
Step 8 → Pull hands apart to grow the blob, push together to shrink it
```

### Bonus Interactions

- Touch **any two fingertips on the same hand** → ✨ Golden sparkle burst at the touch point

---

## 🏗️ Architecture

```
open-hand-canvas/
├── public/
│   └── logo.png                # Project logo & favicon
├── src/
│   ├── App.tsx                  # Main application (612 lines)
│   │   ├── ThreeDBob()          # Three.js 3D blob component
│   │   └── App()                # Main app with hand tracking logic
│   ├── App.css                  # All styles, animations, and layout
│   ├── hooks/
│   │   ├── useSound.ts          # Web Audio API sound effects manager
│   │   └── useThreeBlob.tsx     # Alternative Three.js blob hook
│   ├── assets/
│   │   └── react.svg
│   ├── index.css                # Global reset styles
│   └── main.tsx                 # React entry point
├── index.html                   # HTML entry with meta tags
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies & scripts
└── README.md                    # You are here
```

---

## 🔧 How It Works

### 1. Hand Tracking Pipeline

```
Webcam Frame → MediaPipe Hands → 21 Landmarks (x, y, z) per hand → landmarksRef
```

- **MediaPipe Hands** model is loaded from CDN (`@mediapipe/hands@0.4`)
- Configured for **2 hands**, model complexity **1**, detection confidence **0.5**
- Each frame is sent to the model, and results are stored in a React ref (no re-renders)

### 2. Finger Connection Detection

```
For each of the 5 fingertip pairs (Hand 1 ↔ Hand 2):
  Calculate Euclidean distance
  If distance < 80px → Mark as "connected"
  Track in connectedFingers array
```

| Finger | Landmark Index |
|---|---|
| Thumb | 4 |
| Index | 8 |
| Middle | 12 |
| Ring | 16 |
| Pinky | 20 |

### 3. 3D Blob Rendering

When all 5 fingers are connected:

- **Position** = Average midpoint of all 10 fingertips (5 pairs)
- **Size** = `15 + maxFingerDistance × 0.15`
- Rendered as `THREE.Points` on a high-res sphere geometry (160×160 segments)

#### Custom GLSL Shaders

**Vertex Shader:**
- Applies **3D simplex noise** to displace vertices along their normals
- Creates an organic, breathing effect that evolves over time
- Uniforms: `uTime`, `uFrequency (2.2)`, `uAmplitude (0.05)`

**Fragment Shader:**
- 4-zone color gradient based on normalized vertex position:
  - **Center/Default** → Navy (`#114a81` → `#4169D4`)
  - **East** → Orange (`#d0651c` → `#FFC201`)
  - **North** → Purple (`#86469d`)
  - **West** → Teal (`#12737c` → `#74E5D6`)
- Colors blend using `smoothstep` for silky transitions
- Sparkle highlights on elevated regions

### 4. Sound System

Built with the **Web Audio API** — no external audio files required:

| Sound | Trigger | Type |
|---|---|---|
| `playBurst()` | Finger sparkle | Sine wave, 800→200Hz sweep |
| `playConnect()` | Finger connection | Sine wave, 600→800Hz click |
| `playStretch()` | Web stretching | Triangle wave, 400→600Hz ramp |

---

## 🛠️ Tech Stack

| Category | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React | 19.2 | UI framework & component model |
| **Language** | TypeScript | 5.9 | Type safety |
| **Build** | Vite | 7.3 | Dev server, HMR, bundling |
| **3D Engine** | Three.js | 0.183 | WebGL rendering & GLSL shaders |
| **Hand Tracking** | MediaPipe Hands | 0.4 | Real-time hand landmark detection |
| **Camera** | react-webcam | 7.2 | Webcam access & feed |
| **Camera Utils** | @mediapipe/camera_utils | 0.3 | Frame-by-frame camera processing |
| **Gestures** | fingerpose | 0.1 | Finger gesture recognition |
| **Colors** | chroma-js | 3.2 | Color manipulation utilities |
| **Audio** | Web Audio API | Native | Procedural sound effects |
| **Linting** | ESLint | 9.39 | Code quality |

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Type-check & build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the codebase |

---

## 🌐 Browser Support

| Browser | Status |
|---|---|
| Chrome 90+ | ✅ Recommended |
| Edge 90+ | ✅ Supported |
| Firefox 90+ | ✅ Supported |
| Safari 15+ | ⚠️ Partial (WebGL2 required) |
| Mobile browsers | ⚠️ Performance may vary |

> **Note:** A webcam is required. The app requests camera permissions on start.

---

## 📁 Key Files at a Glance

| File | Lines | Description |
|---|---|---|
| `src/App.tsx` | 614 | Core application — hand tracking, canvas rendering, blob logic |
| `src/App.css` | 170 | Styling — start screen, camera preview, HUD, animations |
| `src/hooks/useSound.ts` | 107 | Web Audio API sound manager with 3 procedural sounds |
| `src/hooks/useThreeBlob.tsx` | 145 | Alternative Three.js blob implementation (hook-based) |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Ideas for Contribution

- 🎵 Add background ambient music
- 🌈 Additional blob color themes / skins
- 🎯 Gesture-based mini-games
- 📱 Mobile touch fallback mode
- 🎥 Screen recording / GIF export
- 🧪 Unit tests for detection logic

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Google MediaPipe](https://mediapipe.dev/) — Hand tracking ML model
- [Three.js](https://threejs.org/) — 3D rendering engine
- [React](https://react.dev/) — UI framework
- [Vite](https://vite.dev/) — Build tool
- [Stefan Gustavson](https://github.com/stegu/webgl-noise) — Simplex noise GLSL implementation

---

<p align="center">
  <b>Built with left ✋ and right 🤚 — no mouse required.</b>
</p>
