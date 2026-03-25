# 🚕 FareLog

[![Version](https://img.shields.io/badge/version-2.1-blue.svg)](https://github.com/yousef-ehabb/IncomeApp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg)](https://indrivermaster.netlify.app/)
[![UI Style](https://img.shields.io/badge/UI-Dark%20Mode-black.svg)]()

A professional, offline-capable Progressive Web Application (PWA) specifically designed for ride-sharing drivers (InDriver, Uber, Lyft) to track daily shifts, income, and expenses with zero friction.

**[🚀 Launch Live App →](https://indrivermaster.netlify.app/)**

---

## 📸 visual Tour

<table align="center">
  <tr>
    <td align="center"><b>Active Shift</b></td>
    <td align="center"><b>Analytics</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/shift.png" width="400" alt="Shift Mode"></td>
    <td align="center"><img src="docs/screenshots/analytics.png" width="400" alt="Analytics"></td>
  </tr>
  <tr>
    <td align="center"><b>Home & Goal</b></td>
    <td align="center"><b>History & Export</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/home.png" width="400" alt="Home Screen"></td>
    <td align="center"><img src="docs/screenshots/history.png" width="400" alt="History"></td>
  </tr>
</table>

---

## ✨ Primary Features

- **⏱️ Live Session Management**: Real-time shift timer with dynamic earnings-per-hour calculations.
- **⚡ Rapid Entry System**: Quick-add "fare chips" (+30, +50, +100) and categorized expense logging.
- **📊 Performance Analytics**: High-quality visual trends for weekly and monthly earnings powered by **Chart.js**.
- **🎯 Goal Tracking**: Visual progress bars help you hit your daily shift targets.
- **↩️ Smart Safety-Net**: A 5-second "Undo" system for any accidental deletions or shift completions.
- **📂 Data Portability**: Export your transaction history directly to **CSV** or generate print-ready **PDFs**.
- **💾 Offline Integrity**: Works anywhere, even in areas with poor reception, using Service Workers and LocalStorage.

## 🛠 Technical Architecture

This application is built with a **modular, vanilla architecture**, avoiding the weight of heavy frameworks to ensure maximum performance on low-end mobile devices.

- **Frontend Core**: ES6 JavaScript, CSS3 (using custom variables & Glassmorphism).
- **State Management**: Reactive UI updates through targeted DOM mutations and local state syncing.
- **Storage**: Persistent encrypted-string serialization in `localStorage`.
- **Offline Logic**: Custom Service Worker caching strategy for assets and fonts.
- **Visuals**: Chart.js for responsive data rendering.

## 📂 Project Structure

```text
📦 IncomeApp
 ┣ 📂 assets/              # App icon & global branding
 ┣ 📂 css/                 # Variable-driven styling (app.css)
 ┣ 📂 docs/                # Project documentation & screenshots
 ┣ 📂 js/                  # Core application logic & state controllers
 ┣ 📜 index.html           # Main SPA entry point
 ┣ 📜 manifest.json        # PWA metadata
 ┣ 📜 service-worker.js    # Offline caching logic
 ┗ 📜 LICENSE              # MIT License
```

## 🚀 Running Locally

1. Clone the repo: `git clone https://github.com/yousef-ehabb/IncomeApp.git`
2. Since service workers require a secure context, serve via local server:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

## 📱 Mobile Installation

Navigate to [indrivermaster.netlify.app](https://indrivermaster.netlify.app/) in your mobile browser:
- **Android**: Menu (3 dots) → **"Install App"**
- **iOS**: Share icon → **"Add to Home Screen"**

---

### 📄 License

Distributed under the MIT License. Developed by **Yousef Ehab**.
