import { ref, onValue, set, update, onDisconnect, serverTimestamp } from 'firebase/database';
import { db, isFirebaseConfigured } from './firebase';

export const MAX_CONTENT_LENGTH = 102400; // 100 KB limit to stay safely in free tier

export const PEER_COLORS = [
    { name: 'Turquoise', hex: '#4ecdc4', bg: 'rgba(78, 205, 196, 0.15)' },
    { name: 'Coral', hex: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.15)' },
    { name: 'Amber', hex: '#feca57', bg: 'rgba(254, 202, 87, 0.15)' },
    { name: 'Lavender', hex: '#a29bfe', bg: 'rgba(162, 155, 254, 0.15)' },
    { name: 'Pink', hex: '#ff9ff3', bg: 'rgba(255, 159, 243, 0.15)' },
    { name: 'Sky Blue', hex: '#54a0ff', bg: 'rgba(84, 160, 255, 0.15)' }
];

export const getClientColorIndex = (clientId) => {
    if (!clientId) return 0;
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
        hash = (hash << 5) - hash + clientId.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % PEER_COLORS.length;
};

/**
 * Sanitize custom room key to ensure it is URL-friendly and database-safe
 */
export const sanitizeRoomKey = (rawKey) => {
    if (!rawKey) return '';
    return rawKey
        .toString()
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 40);
};

/**
 * Generate a clean, short random room key (e.g. "1681" or "7492")
 */
export const generateRandomRoomKey = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Unique ID per browser tab session
 */
export const getClientId = () => {
    let id = sessionStorage.getItem('json_room_client_id');
    if (!id) {
        id = 'client_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('json_room_client_id', id);
    }
    return id;
};

/**
 * Subscribe to a room's real-time updates, presence, and peer cursors
 */
export const subscribeToRoom = (roomKey, { onData, onError, onPresenceChange, onStatusChange }) => {
    const cleanKey = sanitizeRoomKey(roomKey);
    if (!cleanKey) {
        if (onError) onError(new Error('Invalid room key'));
        return () => {};
    }

    // Fallback if Firebase is not configured
    if (!isFirebaseConfigured || !db) {
        if (onStatusChange) onStatusChange('unconfigured');
        const saved = localStorage.getItem(`local_room_${cleanKey}`) || '';
        if (onData) {
            onData({
                content: saved,
                updatedAt: Date.now(),
                isLocalFallback: true
            });
        }
        return () => {};
    }

    const roomRef = ref(db, `rooms/${cleanKey}`);
    const connectedRef = ref(db, '.info/connected');
    const clientId = getClientId();
    const presenceRef = ref(db, `rooms/${cleanKey}/presence/${clientId}`);
    const colorIndex = getClientColorIndex(clientId);

    // Monitor Firebase connection status
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
        const isConnected = snap.val() === true;
        if (isConnected) {
            if (onStatusChange) onStatusChange('connected');
            // Register presence with color index & cursor; auto-remove on disconnect
            set(presenceRef, {
                joinedAt: serverTimestamp(),
                active: true,
                colorIndex: colorIndex,
                name: `User #${clientId.slice(-3)}`
            });
            onDisconnect(presenceRef).remove();
        } else {
            if (onStatusChange) onStatusChange('connecting');
        }
    });

    // Monitor room content and presence changes
    const unsubscribeRoom = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if (onData) onData(data);
            if (onPresenceChange) {
                onPresenceChange(data.presence || {});
            }
        } else {
            // Room does not exist yet; initialize it
            if (onData) {
                onData({
                    content: '',
                    updatedAt: Date.now(),
                    isNew: true
                });
            }
            if (onPresenceChange) {
                onPresenceChange({});
            }
        }
    }, (err) => {
        console.error('Room listener error:', err);
        if (onError) onError(err);
        if (onStatusChange) onStatusChange('error');
    });

    return () => {
        unsubscribeConnected();
        unsubscribeRoom();
        // Remove presence on clean unmount
        if (isFirebaseConfigured && db) {
            set(presenceRef, null).catch(() => {});
        }
    };
};

/**
 * Update local user's cursor position in room presence
 */
export const updateCursorPosition = async (roomKey, cursor) => {
    const cleanKey = sanitizeRoomKey(roomKey);
    if (!cleanKey || !isFirebaseConfigured || !db) return;

    const clientId = getClientId();
    const cursorRef = ref(db, `rooms/${cleanKey}/presence/${clientId}/cursor`);
    try {
        await set(cursorRef, cursor);
    } catch (e) {
        // Non-critical cursor sync failure
    }
};

/**
 * Save / sync content to the room
 */
export const updateRoomContent = async (roomKey, content, lastEditedBy) => {
    const cleanKey = sanitizeRoomKey(roomKey);
    if (!cleanKey) throw new Error('Invalid room key');

    if (content && content.length > MAX_CONTENT_LENGTH) {
        throw new Error(`Content exceeds max free tier limit of ${MAX_CONTENT_LENGTH / 1024} KB`);
    }

    if (!isFirebaseConfigured || !db) {
        localStorage.setItem(`local_room_${cleanKey}`, content);
        return { success: true, local: true };
    }

    const roomRef = ref(db, `rooms/${cleanKey}`);
    await update(roomRef, {
        content: content || '',
        updatedAt: serverTimestamp(),
        lastEditedBy: lastEditedBy || getClientId()
    });

    return { success: true };
};
