# Code Quality & Development Standards

## 1. Secrets & Environment Variables
- **Never commit credentials**: Do not hardcode Firebase API keys or sensitive project IDs directly into source code.
- Always use `process.env.REACT_APP_*` prefixed variables for Create React App compatibility.
- Keep `.env.example` synchronized with all required environment variables.
- Maintain `.gitignore` to strictly exclude `.env`, `.env.local`, and any credential files.

## 2. Real-Time Subscriptions & Memory Leaks
- Any WebSocket or database listener (e.g. Firebase RTDB `onValue`, `onDisconnect`) subscribed to inside React `useEffect` **must return an unsubscribe cleanup function**.
- Debounce timers (`setTimeout`) must be cancelled on component unmount or room switch.

## 3. Editor Performance & Cursor Stability
- Real-time updates pushed from remote peers must not disrupt the local user's cursor or selection.
- Only update editor value when remote content actually differs from current editor buffer (`remoteValue !== editorValue`).
- Use React `useRef` for tracking active edit sessions, pending saves, and peer update cycles.

## 4. Error Handling & User Feedback
- Display actionable notifications using `react-toastify` or inline status banners.
- Network disconnection, permission failures, or malformed JSON inputs must display friendly error messages without breaking the UI.

## 5. UI & Styling Rules
- Preserve the signature sleek dark theme (`merbivore_soft` palette) across all components.
- Action buttons should provide clear hover, active, and disabled states.
- Mobile and tablet responsiveness must be maintained with responsive Flexbox/Grid layouts.
