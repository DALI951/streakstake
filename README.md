# 📱 StreakStake - 100% Native Android

> **Pure Native Android Habit Staker & Walk Detector with XP Staking and Streak Accountability.**

StreakStake is built in **100% Native Kotlin** for Android. No TypeScript, no WebViews, no bloated multi-color UI. It features a strict **Two-Color Minimalist Design** (Pitch Black + Flame Orange) and hardware step detection.

---

## 🌟 Highlights

1. **100% Native Android (Kotlin & Gradle):**
   - True native Android layouts (`ConstraintLayout`, `LinearLayout`) and native Material Components.
   - Perfectly scales to every Android phone's native resolution, DPI, aspect ratio, status bar, and gesture navigation.

2. **Strict Two-Color Aesthetic:**
   - **Background & Card Surfaces:** Deep Pitch Black (`#0A0B10`) & Charcoal Slate (`#141622`).
   - **Primary Action Accent:** Flame Orange (`#FF5500`).
   - Clean, high-contrast, distraction-free.

3. **Real Authentication First (Zero Bloat):**
   - Opens immediately on the **Sign In / Account Creation** screen.
   - Zero pre-filled fake data or dummy accounts. Every user starts with a clean slate and a **500 XP Welcome Bonus**.

4. **Hardware Step & Walking Distance Detector:**
   - Choose a target distance in meters (e.g. `250m`, `500m`, `1,000m`).
   - Real-time step detection utilizing Android's `SensorManager` (`TYPE_STEP_DETECTOR` and `TYPE_ACCELEROMETER` peak-filtering algorithm) and GPS `LocationManager`.
   - Real-time digital progress meter, step count, and timer.
   - Built-in simulator button (`+50 Steps`) for testing on emulators or desks.
   - Reaching your target returns your staked XP plus **1.5x streak bonus**!

5. **Automated CI/CD APK Releases:**
   - Compiled automatically on GitHub Actions runners via `./gradlew assembleDebug`.
   - Published directly to GitHub Releases with downloadable APK assets!

---

## 📱 Download & Install

Download the latest native Android APK directly from GitHub Releases:
* **Latest Release:** [StreakStake v2.0.0](https://github.com/DALI951/streakstake/releases/tag/v2.0.0)
* **Direct APK Download:** [`StreakStake.apk`](https://github.com/DALI951/streakstake/releases/download/v2.0.0/StreakStake.apk)
