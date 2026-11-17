# JSON Playground

A fast, sleek, and feature-rich browser utility for parsing, formatting, diffing, real-time collaborative editing of JSON data, and structured technical interview preparation.

Built with **React**, **Ace Editor**, and **Google Firebase Realtime Database** (100% Free Tier).

---

## Features

### 1. JSON Parser & Formatter (`/parse`)
- **Syntax Validation**: Instant heuristic diagnostics highlighting exact syntax errors, missing quotes, unclosed brackets, and trailing commas.
- **Tree View & Code Editor**: Inspect nested JSON structures or edit code directly with syntax highlighting.
- **Local History**: Never lose your previous snippets with built-in persistent history.
- **File Upload & Export**: Upload `.json`, `.txt`, or `.docx` documents and export formatted JSON.

### 2. Difference Checker (`/compare`)
- **Split-Pane Comparison**: Side-by-side or unified difference viewer.
- **Word & Token Highlighting**: Granular highlighting of modified keys and values.

### 3. Real-Time Shared Rooms (`/share/:roomKey`)
- **Custom Room Slugs**: Create or join custom rooms directly via the URL (e.g., `https://your-domain.vercel.app/share/1681`).
- **Live Bi-Directional Collaboration**: Simultaneous real-time synchronization between team members powered by Firebase Realtime Database.
- **Debounced Free-Tier Safety**: 400ms debouncing and payload size limits ensure you stay completely within Firebase's free Spark plan with zero cost.
- **Active Presence**: Real-time counter showing how many peers are active in your room.
- **Offline / Local Demo Mode**: Works out of the box locally even before Firebase credentials are configured.

### 4. Code Compiler & Runner (`/compile`)
- **Multi-Language Support**: Execute scripts in **JavaScript**, **TypeScript**, **Python**, **Java**, **C**, **C++**, and **Go**.
- **Dual-Engine Execution**: Uses a local self-hosted **Docker Piston** engine with zero-downtime automatic fallback to a free cloud engine (Wandbox).
- **Custom Stdin & Output Console**: Provide standard input for interview algorithms; inspect stdout, stderr, execution time, and exit status.
- **Pipeline to Parser (`/parse`)**: 1-click export of JSON output to the JSON Parser & Tree visualizer.
- **Pipeline to Diff (`/compare`)**: Snapshot earlier brute-force attempts and compare side-by-side with your optimal solution.
- **Complete Design Doc**: See [docs/COMPILER_DESIGN.md](docs/COMPILER_DESIGN.md).

### 5. 40-Day Alphabet Sprint OS (`/sprint`)
- **Blind 75 & Distributed System Design**: Pattern-first execution roadmap featuring 76 high-signal LeetCode patterns (Arrays & Hashing, Two Pointers, Sliding Window, Trees, Graphs, Dynamic Programming) alongside 40 real-world Distributed System Design architectures (LSM Trees vs. B-Trees, Replication & Sharding, Raft/Paxos consensus, Kafka, Rate Limiters, TinyURL, YouTube, Payment Systems).
- **Dynamic Start Date Engine**: Set any custom start date (or click "Start Today") with real-time reactive recalculation across all 40 days, phase breakdowns, and target deadline countdowns.
- **Daily 3-Hour Protocol Timers**: Integrated timers implementing the strict 20-minute Struggle Rule (`20m Struggle Rule`, `2h DSA Sprint`, `1h System Design`, `45m Alphabet Mock`) with audio-visual alerts, pause/play, and reset controls.
- **Daily Engineering Journal & Recall Confidence**: Dedicated scratchpad drawer for each day containing:
  - Interactive target checklist for DSA problems and System Design topics.
  - 5-point self-assessment scale (`1 · Stuck`, `2 · Editorial`, `3 · Slow`, `4 · Optimal`, `5 · Mastery`).
  - Three structured engineering log fields: Algorithmic Pattern & Invariant Notes, Edge Cases & Time/Space Complexity Log, and System Design Trade-offs, QPS Math & Bottlenecks.
- **Zero-Latency Dual Persistence**:
  - **Instant Local Storage Hydration**: Zero-delay initial state hydration and synchronous write-through to `localStorage` on every change.
  - **Cloud Sync via Firebase Realtime Database**: Synchronize and share progress across browsers and devices using unique sprint keys (`?sprintKey=...`).
  - **Manual Backup & Restore**: One-click JSON export and import for offline backups.
- **Sunday Spaced-Repetition Reviews**: Pre-configured weekly review milestones to revisit flagged questions and consolidate core patterns before advancing.
- **Multiple Entry Points**: Launch directly via the top navigation bar (`40 Sprint` badge), the home page launchpad card, or the `/sprint` route.

---

## Quick Start (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/gaurav-7-7/json-playground.git
cd json-playground
npm install
```

### 2. Configure Environment Variables
Copy the example environment template:
```bash
cp .env.example .env
```
*(See the Firebase setup guide below to fill in your free database keys).*

### 3. Start Development Server
```bash
npm start
```
The app will open automatically at [http://localhost:4200](http://localhost:4200).

---

## Google Firebase Setup Guide (100% Free Spark Tier)

No CLI needed — you can set this up in **3 minutes** entirely from the [Firebase Website Console](https://console.firebase.google.com/):

### Step 1: Create a Free Project
1. Open the [Firebase Console](https://console.firebase.google.com/) and click **"Add project"**.
2. Enter a project name (e.g., `json-playground-app`).
3. Turn off Google Analytics (optional, not required) and click **"Create project"**.

### Step 2: Enable Realtime Database
1. In the left-hand sidebar, navigate to **Build** > **Realtime Database**.
2. Click **"Create Database"**.
3. Choose a location (e.g., `United States (us-central1)`).
4. When prompted for security rules, choose **"Start in test mode"** (we will set proper production rules in Step 3).
5. Click **Enable**.

### Step 3: Set Free-Tier Security Rules
In the Realtime Database page, click the **"Rules"** tab at the top. Replace the existing content with the following rule and click **Publish**:

```json
{
  "rules": {
    "rooms": {
      "$roomKey": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['content', 'updatedAt']) || newData.child('presence').exists()",
        "content": {
          ".validate": "newData.isString() && newData.val().length <= 102400"
        }
      }
    },
    "sprints": {
      "$sprintKey": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```
> **Note:** This rule enforces public read/write for custom collaboration rooms (capped at 100 KB) and personal 40-Day Sprint tracking workspaces, ensuring your database stays safely within the 1 GB free quota.

### Step 4: Register Web App & Get Config Keys
1. In the left-hand menu, click the **Gear Icon ⚙️** next to *Project Overview* and select **Project settings**.
2. Scroll down to the **"Your apps"** card and click the **Web icon ( `</>` )**.
3. Enter an app nickname (e.g., `json-playground-web`) and click **Register app**.
4. Firebase will display your `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "json-playground-app.firebaseapp.com",
     databaseURL: "https://json-playground-app-default-rtdb.firebaseio.com",
     projectId: "json-playground-app",
     storageBucket: "json-playground-app.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef..."
   };
   ```
5. Note: If `databaseURL` is not shown in the snippet, it is simply `https://<YOUR_PROJECT_ID>-default-rtdb.firebaseio.com` (found on your Realtime Database dashboard).

### Step 5: Add Keys to `.env`
Fill in your `.env` file:
```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=json-playground-app.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://json-playground-app-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=json-playground-app
REACT_APP_FIREBASE_STORAGE_BUCKET=json-playground-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef...
```

---

## Deploying to Vercel

This repository is pre-configured for seamless SPA deployment to Vercel via [`vercel.json`](file:///Users/gaurav/Work/json-playground/vercel.json):

1. Push your changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: real-time room sharing with firebase"
   git push origin main
   ```
2. In your [Vercel Dashboard](https://vercel.com/):
   - Go to your project > **Settings** > **Environment Variables**.
   - Add the 7 environment variables from your `.env` file:
     - `REACT_APP_FIREBASE_API_KEY`
     - `REACT_APP_FIREBASE_AUTH_DOMAIN`
     - `REACT_APP_FIREBASE_DATABASE_URL`
     - `REACT_APP_FIREBASE_PROJECT_ID`
     - `REACT_APP_FIREBASE_STORAGE_BUCKET`
     - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
     - `REACT_APP_FIREBASE_APP_ID`
3. Trigger a redeploy. Your custom room links (e.g. `https://your-domain.vercel.app/share/1681`) will now work flawlessly without 404 errors!

---

## Project Steering & Code Standards

- **Project Guidelines**: See [AGENTS.md](file:///Users/gaurav/Work/json-playground/AGENTS.md) for architectural philosophy and directory structure.
- **Engineering Standards**: See [.agents/rules/code-quality.md](file:///Users/gaurav/Work/json-playground/.agents/rules/code-quality.md) for conventions on memory safety, secret hygiene, and decoupled services.
