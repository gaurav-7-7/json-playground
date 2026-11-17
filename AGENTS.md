# JSON Playground - Project Steering Guide

This document defines the architectural overview, standards, and engineering conventions for the **JSON Playground** repository.

## 1. Project Overview & Architecture

JSON Playground is a browser-based utility suite for working with JSON data:
- **Parser & Formatter (`/parse`)**: Linting, formatting, minification, tree viewing, error diagnostics, and local history.
- **Diff / Compare (`/compare`)**: Side-by-side JSON difference checking with token and word-level highlighting.
- **Code Compiler (`/compile`)**: Multi-language execution (JS, TS, Python, Java, C, C++, Go) with dual-engine fallback (Piston + Wandbox) and Parse/Compare pipelines.
- **Real-Time Share (`/share`, `/share/:roomKey`)**: Collaborative, real-time shared JSON editor rooms powered by Google Firebase Realtime Database with custom room slugs (e.g., `/share/1681`).

### Tech Stack
- **Framework**: React 18 (Create React App / react-scripts)
- **Routing**: `react-router-dom` v6
- **Code Editor**: `react-ace` with `brace` (merbivore_soft dark theme)
- **Styling**: Vanilla CSS, React-Bootstrap, Emotion, Framer Motion, React Icons
- **Backend / DB**: Google Firebase Realtime Database (Spark 100% Free Tier)
- **Code Execution**: Docker Piston (Local/Cloud VPS) + Wandbox REST API (Zero-downtime cloud fallback)
- **Deployment Target**: Vercel (SPA rewrite rules via `vercel.json`)

---

## 2. Directory Structure

```
json-playground/
├── .agents/
│   └── rules/
│       └── code-quality.md   # Quality constraints & coding standards
├── docs/
│   └── COMPILER_DESIGN.md    # Code compiler architecture and design doc
├── public/                    # Static assets and index.html
├── scripts/
│   ├── setup-piston.sh        # Local Docker setup script
│   └── deploy-cloud.sh        # Cloud VM deployment script
├── src/
│   ├── assets/                # Logos, icons, branding
│   ├── components/            # UI components (Header, Parse, Compare, Share, Compiler, About)
│   │   ├── Compiler/          # Code editor, terminal console, and engine settings
│   │   ├── Share/             # Real-time room sharing component & CSS
│   │   ├── Parse/             # JSON validator and formatter
│   │   └── Compare/           # Diff viewer
│   ├── services/              # External service integrations
│   │   ├── firebase.js        # Firebase app & RTDB initialization
│   │   ├── roomService.js     # Room lifecycle, subscriptions, debouncing
│   │   └── compilerService.js # Code runner adapters, health check, fallback
│   ├── App.js                 # Top-level routing
│   ├── index.js               # Application entry point
│   └── index.css              # Global tokens & base styles
├── docker-compose.yml         # Piston container configuration
├── .env.example               # Template for environment configuration
├── vercel.json                # Vercel deployment routing configuration
└── README.md                  # User & developer documentation
```

---

## 3. Core Architectural Principles

1. **Strict Separation of Concerns**:
   - UI components (`src/components/*`) must never invoke low-level Firebase SDK calls directly. All data access, subscriptions, and mutations must be encapsulated within `src/services/roomService.js`.
2. **Zero-Crash Degradation**:
   - If Firebase credentials are not yet configured in `.env`, the application must degrade gracefully to an informative setup state or offline demo mode rather than throwing unhandled runtime exceptions.
3. **Free-Tier Protection**:
   - Client-side debouncing (350–500ms) on text changes prevents excessive database writes.
   - Enforce a maximum payload limit per room (e.g. 100 KB) to protect bandwidth and storage.
4. **Editor Cursor Stability**:
   - Bi-directional sync must compare local vs. remote timestamps/hashes before mutating AceEditor content to prevent cursor jumping or losing user focus while typing.
