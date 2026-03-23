# InDriver Income Tracker 🚗💸

A professional, offline-capable progressive web application (PWA) designed to track daily income and expenses for drivers.

## Versions

*   **v1.0** — Basic income tracker: simple gross income calculation and logging.
*   **v2.0** — Real-time, shift-based income tracking system featuring:
    *   **Shift Tracking**: Live session management with precise timers and state persistence.
    *   **Expense System**: Granular categorization (Fuel, Wash, Maintenance) and live net income calculation.
    *   **Analytics**: Comprehensive dashboards featuring dynamic charts (weekly/monthly) and performance insights.
    *   **Improved UX**: Streamlined "shift-first" interface, quick-fare input chips, 5-second undo system, and strict visual hierarchy.

## Features
- ⚡ **Offline Ready**: Functions seamlessly without an internet connection.
- 💾 **Auto-Save**: Secure local storage on your device.
- 🌙 **Dark Mode**: High-contrast, easy-to-read interface optimized for nighttime driving.
- 📊 **Dynamic Reports**: Export history in CSV or generate beautiful PDF summaries.

## How to Install on Android 📲
Since this is a Web App, it needs to be "hosted" or opened in a browser.

### Option 1: The Easiest Way (Recommended)
1. **Host the files**:
   - Go to [Netlify Drop](https://app.netlify.com/drop).
   - Drag and drop this **entire folder** onto that page.
   - It will give you a link (e.g., `https://random-name.netlify.app`).
2. **Open on Phone**:
   - Send that link to your phone and open it in **Chrome**.
3. **Install**:
   - Tap the **3 dots** (menu) in Chrome.
   - Tap **"Add to Home Screen"** or **"Install App"**.
   - Now it works like a native app!

### Option 2: Local Testing
If you have Python installed:
1. Open a terminal in this folder.
2. Run: `python -m http.server`
3. Open `http://localhost:8000` in your browser.

## Managing Data
- **Add Fare**: Simply tap quick chips or type a specific amount and hit "Add Fare".
- **Track Expenses**: Switch to the expense tab, select a category, and log your costs.
- **Undo Mistakes**: Use the 5-second floating toast to instantly undo accidental entries.
- **Clear All**: Reset your data completely if needed from the History tab.
