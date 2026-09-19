# JSON Playground

A fast, sleek, and feature-rich browser utility for parsing, formatting, diffing, and real-time collaborative editing of JSON data.

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
    }
  }
}
```
> **Note:** This rule enforces public read/write for custom rooms while capping any single document at 100 KB, ensuring your database stays safely within the 1 GB free quota.

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
