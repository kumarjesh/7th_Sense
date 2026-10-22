# VisionGuard — Real-Time Spatial AI Navigation Assistant 👁️⚡

> **An accessibility-first Progressive Web App (PWA) turning smartphone cameras into an intelligent "virtual eye" for blind and visually impaired pedestrians.**

VisionGuard extends the spatial awareness of pedestrians from the 1–2 meter reach of a physical white cane to 5+ meters ahead using real-time on-device computer vision, IoU object tracking, directional spatial 3D audio, and multi-pattern haptics.

---

## 🌟 Key Features

- **🧠 Edge AI Computer Vision:** Runs `@tensorflow/tfjs` + `@tensorflow-models/coco-ssd` (`lite_mobilenet_v2`) locally in the browser with WebGL acceleration — zero server latency, privacy-preserving, and offline capable.
- **🔗 Frame-to-Frame Object Tracking:** IoU-based object ID persistence, Exponential Moving Average (EMA) spatial smoothing, zone hysteresis, and looming detection (`Δarea / Δt > 15%/s`) to suppress false alarms and alert jitter.
- **🔊 Prioritized Spoken Alerts:** Web Speech API integration with priority interrupts (`"Stop. Car very close ahead."`, `"No immediate hazards detected."`).
- **🎵 Spatial 3D Audio Radar:** Web Audio API oscillator pings with stereo panning (Left `-0.8`, Center `0.0`, Right `+0.8`) and dynamic pitch (440Hz → 880Hz) scaling with proximity.
- **📳 Directional Haptic Patterns:** Distinct vibration rhythms for Center (triple pulse), Left (long-short), Right (short-long), and Urgent Collision.
- **👆 Blind-First Gesture Interface:** Full-screen touch surface without visual dependency:
  - **Single Tap:** Toggle scanning (Active ↔ Paused)
  - **Double Tap:** Repeat latest hazard announcement
  - **Swipe Up:** Toggle camera flashlight
  - **Swipe Down:** Announce device status (Mode, battery, FPS)
  - **Long Press (1.5s):** Cycle audio modes (`FULL`, `VOICE_ONLY`, `SONAR_ONLY`, `EMERGENCY_ONLY`)
  - **Two-Finger Double Tap:** Full diagnostic readout
  - **Two-Finger Long Press:** Open accessible settings panel
  - **Three-Finger Tap:** Emergency pause
- **🛡️ Safety & Reliability:** First-run spoken safety briefing, camera obstruction detection, low-light flashlight prompts, screen wake lock (`navigator.wakeLock`), and adaptive quality throttling.
- **📱 Offline PWA:** Configured with Service Worker model caching for complete offline functionality.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (WCAG AAA High-Contrast OLED Dark Theme: `#000000`, Safety Yellow `#FFFF00`, Hazard Red `#FF3B30`, Safe Green `#44FF44`)
- **Machine Learning:** TensorFlow.js + COCO-SSD
- **APIs:** Web Audio API, Web Speech API (`SpeechSynthesis`), Vibration API, MediaDevices API (`getUserMedia`), Screen Wake Lock API

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/kumarjesh/7th_Sense.git
cd 7th_Sense

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## ☁️ Deployment on Vercel

1. Import this repository in [Vercel](https://vercel.com).
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Deploy! Vercel automatically applies HTTPS (required for camera and audio permissions).

---

## ⚖️ Safety Disclaimer

*VisionGuard is an assistive awareness aid and **does not replace** a white cane, guide dog, or formal orientation & mobility training. It cannot detect drop-offs, stairs, potholes, transparent glass, or all hazards. Users must always prioritize their primary mobility aid.*
