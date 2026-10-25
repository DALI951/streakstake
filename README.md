# 🔥 StreakStake

> **Social Challenge Tracker with XP Staking, Peer Verification ("Proof or Burn"), and Real-Time Accountability Feed.**

StreakStake turns habit formation and personal goals into high-stakes, competitive social games. Users lock **XP on the line** before starting a challenge. If they fail or miss the deadline, their XP burns forever and their streak resets to zero. If they succeed and a friend verifies their proof, they reclaim their stake plus a **bonus payout** with streak multipliers (1.5x at 3-streaks, 2.0x at 5-streaks).

---

## 🚀 Key Gamification Mechanics

### 1. The Stake & Reward Loop
* **Lock in Stakes:** When creating or joining a challenge, users lock in a specific XP wager (e.g. 100 XP) from their balance into escrow.
* **Failure Burns:** Lapsing past the deadline or submitting fraudulent proof burns the staked XP permanently and resets the user's streak counter to 0.
* **Streak Multipliers:**
  * 0–2 Streak: `1.0x` baseline return
  * 3–4 Streak: `1.5x` bonus multiplier payout
  * 5+ Streak: `2.0x` elite multiplier payout

### 2. The Verification Gap (Peer Verification System)
* The biggest flaw in self-improvement apps is cheating. StreakStake solves this with a mandatory **Peer Verification Loop**.
* When a user marks a challenge complete, they attach a photo, screenshot, or checklist.
* The challenge enters **`Pending Peer Review`** status.
* It remains pending until at least **one participating friend taps "Verify"**.
* **Anti-Cheat Rule:** Users cannot verify their own challenges. Friends who verify proofs earn an **Arbiter Reward (+25 XP)** to incentivize prompt peer review!

### 3. The Social Dashboard & Live Feed
* Real-time activity feed broadcasting:
  * Who locked stakes on a new challenge
  * Who submitted proof waiting for review
  * Who verified whose proof
  * Who lost their XP and burned their streak 💀
  * Milestone unlocks & badge achievements

### 4. Season Leaderboard & Accolades
* Weekly resetting leaderboard with countdown to season close.
* Ranks by **Weekly XP Gained** or **Longest Active Streak**.
* Collectible Badges: *First Blood*, *Triple Threat*, *High Roller*, *Fair Arbiter*, *Iron Will*, and *Legendary*.

---

## 📱 Android APK & GitHub Actions Release Pipeline

This repository includes an automated GitHub Actions CI/CD pipeline:
* **Workflow file:** `.github/workflows/build-apk.yml`
* **Trigger:** Pushes to `main`, tags matching `v*`, or manual `workflow_dispatch`.
* **Build Steps:**
  1. Compiles Vite + React + TailwindCSS web distribution.
  2. Syncs native assets into the Android Capacitor wrapper.
  3. Uses Android SDK & Gradle (`./gradlew assembleDebug`) in Ubuntu runners.
  4. Generates `StreakStake-v1.0.0.apk`.
  5. **Publishes directly to GitHub Releases** with the APK asset attached for download!

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
* **Mobile Runtime:** Capacitor 8 (Cross-platform Android & iOS wrapper).
* **Audio Synthesis:** Web Audio API sound generator (no external audio assets required; includes stake locking, fanfare chimes, and burn buzzers).
* **Automated Punishment Engine:** Real-time client countdown ticker + simulated Cloud Function cron sweeper that marks expired challenges as burned.
* **Backend Architecture:**
  * `firebase.json` & `firestore.rules`: Security rules enforcing peer verification and preventing self-verification exploits.
  * `functions/src/index.ts`: Firebase Cloud Functions implementing `checkExpiredChallenges` (scheduled cron job every 15 minutes) and `onChallengeVerified` triggers.

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/DALI951/streakstake.git
cd streakstake

# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build

# Build and sync Android native project
npm run build:android
```

---

## 👥 Built-In Peer Test Accounts

Switch between accounts instantly from the top-right profile dropdown in the UI:
1. **Alex Vance** (Default user, 2-day streak, 800 XP)
2. **Sarah Chen** (Fitness runner, has proof pending verification ready to review!)
3. **Marcus Brody** (Rebuilding after burning a 100 XP stake)
4. **Elena Rostova** (Elite champion, 6-day streak with 2.0x active multiplier)
