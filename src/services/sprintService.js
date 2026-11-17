import { ref, onValue, set, get, serverTimestamp } from 'firebase/database';
import { db, isFirebaseConfigured } from './firebase';

export const MAX_SPRINT_PAYLOAD_BYTES = 153600; // 150 KB
export const SPRINT_LOCAL_STORAGE_PREFIX = 'sprint_progress_';
export const SPRINT_ACTIVE_CONFIG_KEY = 'sprint_config_key';

/**
 * Generate a short random room/config key (e.g. "s8492")
 */
export const generateConfigKey = () => {
  return 's' + Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Sanitize config key to ensure URL-safety and database safety
 */
export const sanitizeConfigKey = (rawKey) => {
  if (!rawKey) return '';
  return rawKey
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
};

/**
 * Get or initialize active config key
 */
export const getActiveConfigKey = () => {
  try {
    if (typeof window !== 'undefined') {
      // Check query param e.g. ?sprintKey=s1234
      const params = new URLSearchParams(window.location.search);
      const qKey = params.get('sprintKey') || params.get('key');
      if (qKey) {
        const cleaned = sanitizeConfigKey(qKey);
        if (cleaned) {
          localStorage.setItem(SPRINT_ACTIVE_CONFIG_KEY, cleaned);
          return cleaned;
        }
      }
    }
    const stored = localStorage.getItem(SPRINT_ACTIVE_CONFIG_KEY);
    if (stored) {
      return sanitizeConfigKey(stored);
    }
    // Generate default on first run
    const newKey = generateConfigKey();
    localStorage.setItem(SPRINT_ACTIVE_CONFIG_KEY, newKey);
    return newKey;
  } catch (e) {
    return 's1001';
  }
};

/**
 * Set active config key
 */
export const setActiveConfigKey = (key) => {
  const clean = sanitizeConfigKey(key);
  try {
    localStorage.setItem(SPRINT_ACTIVE_CONFIG_KEY, clean);
  } catch (e) { }
  return clean;
};

/**
 * Load sprint state synchronously from localStorage (zero-latency hydration)
 */
export const loadLocalSprintState = (configKey) => {
  const cleanKey = sanitizeConfigKey(configKey);
  try {
    if (typeof localStorage !== 'undefined') {
      const raw =
        localStorage.getItem(`${SPRINT_LOCAL_STORAGE_PREFIX}${cleanKey}`) ||
        localStorage.getItem('alphabet_40day_sprint_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          completedDsa: parsed.completedDsa || {},
          flaggedDsa: parsed.flaggedDsa || {},
          completedSd: parsed.completedSd || {},
          completedDays: parsed.completedDays || {},
          journals: parsed.journals || {},
          darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : true,
          startDate: parsed.startDate || '2026-11-17'
        };
      }
    }
  } catch (err) {
    console.error('Failed to parse local sprint data:', err);
  }
  return {
    completedDsa: {},
    flaggedDsa: {},
    completedSd: {},
    completedDays: {},
    journals: {},
    darkMode: true,
    startDate: '2026-11-17'
  };
};

/**
 * Save sprint state synchronously to localStorage
 */
export const saveSprintToLocalStorage = (configKey, payload) => {
  const cleanKey = sanitizeConfigKey(configKey);
  if (!cleanKey || typeof localStorage === 'undefined') return;
  try {
    const serialized = JSON.stringify(payload);
    localStorage.setItem(`${SPRINT_LOCAL_STORAGE_PREFIX}${cleanKey}`, serialized);
    localStorage.setItem('alphabet_40day_sprint_v1', serialized);
  } catch (err) {
    console.error('Failed to save sprint data to localStorage:', err);
  }
};

/**
 * Subscribe to sprint progress at sprints/<configKey>
 */
export const subscribeToSprintProgress = (configKey, { onData, onError, onStatusChange }) => {
  const cleanKey = sanitizeConfigKey(configKey);
  if (!cleanKey) {
    if (onError) onError(new Error('Invalid config key'));
    return () => { };
  }

  // Fallback if Firebase is not configured
  if (!isFirebaseConfigured || !db) {
    if (onStatusChange) onStatusChange('local');
    try {
      const local =
        localStorage.getItem(`${SPRINT_LOCAL_STORAGE_PREFIX}${cleanKey}`) ||
        localStorage.getItem('alphabet_40day_sprint_v1');
      if (onData) {
        onData(local ? JSON.parse(local) : null, { isRemote: false, isLocalFallback: true });
      }
    } catch (e) {
      console.error('Error reading local sprint data:', e);
      if (onData) onData(null, { isRemote: false, isLocalFallback: true });
    }
    return () => { };
  }

  if (onStatusChange) onStatusChange('connecting');

  const sprintRef = ref(db, `sprints/${cleanKey}/progress`);
  const connectedRef = ref(db, '.info/connected');

  const unsubConnected = onValue(connectedRef, (snap) => {
    const isConnected = snap.val() === true;
    if (onStatusChange) {
      onStatusChange(isConnected ? 'connected' : 'connecting');
    }
  });

  const unsubSprint = onValue(
    sprintRef,
    (snapshot) => {
      const val = snapshot.val();
      if (val) {
        if (onData) onData(val, { isRemote: true, isNew: false });
        if (onStatusChange) onStatusChange('connected');
      } else {
        if (onData) onData(null, { isRemote: true, isNew: true });
        if (onStatusChange) onStatusChange('connected');
      }
    },
    (err) => {
      console.error('Sprint subscription error:', err);
      if (onError) onError(err);
      if (onStatusChange) onStatusChange('error');
    }
  );

  return () => {
    unsubConnected();
    unsubSprint();
  };
};

/**
 * Save sprint progress to Firebase RTDB and localStorage
 */
export const saveSprintProgress = async (configKey, payload) => {
  const cleanKey = sanitizeConfigKey(configKey);
  if (!cleanKey) throw new Error('Invalid config key');

  // 1. Save to local storage for immediate persistence
  try {
    localStorage.setItem(`${SPRINT_LOCAL_STORAGE_PREFIX}${cleanKey}`, JSON.stringify(payload));
    // Also save legacy key for backward-compatibility
    localStorage.setItem('alphabet_40day_sprint_v1', JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save sprint data to localStorage:', err);
  }

  // 2. Validate payload size
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_SPRINT_PAYLOAD_BYTES) {
    throw new Error(`Sprint data exceeds maximum size limit of ${MAX_SPRINT_PAYLOAD_BYTES / 1024} KB`);
  }

  // 3. Fallback if cloud is unconfigured
  if (!isFirebaseConfigured || !db) {
    return { success: true, localOnly: true };
  }

  // 4. Update in Firebase RTDB
  const safePayload = JSON.parse(serialized);
  safePayload.updatedAt = serverTimestamp();
  safePayload.clientTimestamp = Date.now();
  safePayload.configKey = cleanKey;

  const sprintRef = ref(db, `sprints/${cleanKey}/progress`);
  await set(sprintRef, safePayload);

  return { success: true, cloud: true };
};

/**
 * Pull latest sprint data once
 */
export const pullSprintProgressOnce = async (configKey) => {
  const cleanKey = sanitizeConfigKey(configKey);
  if (!isFirebaseConfigured || !db) {
    const raw = localStorage.getItem(`${SPRINT_LOCAL_STORAGE_PREFIX}${cleanKey}`) || localStorage.getItem('alphabet_40day_sprint_v1');
    return raw ? JSON.parse(raw) : null;
  }
  const sprintRef = ref(db, `sprints/${cleanKey}/progress`);
  const snap = await get(sprintRef);
  return snap.val();
};
