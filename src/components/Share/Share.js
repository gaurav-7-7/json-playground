import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AceEditor from 'react-ace';
import { Range } from 'ace-builds';
import { 
    FaCopy, 
    FaCheck, 
    FaLink, 
    FaExternalLinkAlt, 
    FaUsers, 
    FaMagic, 
    FaCompressAlt, 
    FaTrashAlt, 
    FaArrowRight, 
    FaDice, 
    FaSignOutAlt,
    FaExclamationTriangle
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'brace/mode/json';
import 'brace/mode/text';
import 'brace/theme/merbivore_soft';
import 'react-toastify/dist/ReactToastify.css';
import 'ace-builds/src-noconflict/ext-language_tools';

import { 
    subscribeToRoom, 
    updateRoomContent, 
    updateCursorPosition,
    sanitizeRoomKey, 
    generateRandomRoomKey, 
    getClientId,
    getClientColorIndex,
    PEER_COLORS,
    MAX_CONTENT_LENGTH 
} from '../../services/roomService';
import { isFirebaseConfigured } from '../../services/firebase';

import './share.css';

function Share() {
    const { roomKey: rawRoomKey } = useParams();
    const navigate = useNavigate();

    const roomKey = sanitizeRoomKey(rawRoomKey);
    const clientId = useRef(getClientId()).current;
    const myColorIndex = useRef(getClientColorIndex(clientId)).current;

    // Room Editor State
    const [content, setContent] = useState('');
    const [syncStatus, setSyncStatus] = useState('connecting'); // 'connecting' | 'connected' | 'syncing' | 'unconfigured' | 'error'
    const [presenceMap, setPresenceMap] = useState({});
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedContent, setCopiedContent] = useState(false);

    // Landing / Join Room State
    const [customKeyInput, setCustomKeyInput] = useState('');
    const [recentRooms, setRecentRooms] = useState([]);

    const editorInstanceRef = useRef(null);
    const contentRef = useRef('');
    const debounceTimerRef = useRef(null);
    const cursorThrottleTimerRef = useRef(null);
    const lastCursorSendRef = useRef(0);
    const remoteMarkersRef = useRef({});

    const showError = useCallback((message) => {
        toast.error(message, {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: true,
            icon: false
        });
    }, []);

    const showSuccess = useCallback((message) => {
        toast.success(message, {
            position: "top-center",
            autoClose: 1800,
            hideProgressBar: true,
            icon: false
        });
    }, []);

    // Load recent rooms from localStorage
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('recent_json_rooms') || '[]');
            setRecentRooms(saved);
        } catch {
            setRecentRooms([]);
        }
    }, []);

    // Save current room to recent rooms list
    const saveToRecentRooms = useCallback((key) => {
        if (!key) return;
        try {
            const saved = JSON.parse(localStorage.getItem('recent_json_rooms') || '[]');
            const updated = [key, ...saved.filter(k => k !== key)].slice(0, 5);
            localStorage.setItem('recent_json_rooms', JSON.stringify(updated));
            setRecentRooms(updated);
        } catch (e) {
            console.error('Failed to save recent rooms', e);
        }
    }, []);

    // Render remote cursors on Ace Editor
    const updateRemoteMarkers = useCallback((presence) => {
        const editor = editorInstanceRef.current;
        if (!editor || !editor.session) return;
        const session = editor.session;

        const activeRemotePeers = new Set();

        Object.entries(presence).forEach(([peerId, peer]) => {
            if (peerId === clientId) return; // Don't draw our own cursor as a remote cursor
            activeRemotePeers.add(peerId);

            // Remove existing marker for this peer
            if (remoteMarkersRef.current[peerId] !== undefined) {
                session.removeMarker(remoteMarkersRef.current[peerId]);
                delete remoteMarkersRef.current[peerId];
            }

            // Draw new marker if peer has active cursor coordinates
            if (peer.cursor && typeof peer.cursor.row === 'number' && typeof peer.cursor.column === 'number') {
                const { row, column } = peer.cursor;
                const colorIdx = peer.colorIndex !== undefined ? peer.colorIndex : 0;
                const markerRange = new Range(row, column, row, column + 1);

                const markerId = session.addMarker(
                    markerRange,
                    `remote-peer-cursor peer-color-${colorIdx}`,
                    'text',
                    false
                );
                remoteMarkersRef.current[peerId] = markerId;
            }
        });

        // Clean up markers for peers who disconnected
        Object.keys(remoteMarkersRef.current).forEach((peerId) => {
            if (!activeRemotePeers.has(peerId)) {
                session.removeMarker(remoteMarkersRef.current[peerId]);
                delete remoteMarkersRef.current[peerId];
            }
        });
    }, [clientId]);

    // Subscribe to Room Realtime Updates & Presence
    useEffect(() => {
        if (!roomKey) {
            setContent('');
            contentRef.current = '';
            setPresenceMap({});
            return;
        }

        saveToRecentRooms(roomKey);

        const unsubscribe = subscribeToRoom(roomKey, {
            onData: (data) => {
                // If update came from a remote client, update our editor state
                if (data && typeof data.content === 'string') {
                    if (data.lastEditedBy !== clientId && data.content !== contentRef.current) {
                        contentRef.current = data.content;
                        setContent(data.content);
                    } else if (data.content && !contentRef.current) {
                        contentRef.current = data.content;
                        setContent(data.content);
                    }
                }
            },
            onError: (err) => {
                showError('Database error: ' + (err.message || 'Failed to sync'));
                setSyncStatus('error');
            },
            onPresenceChange: (presence) => {
                setPresenceMap(presence || {});
                updateRemoteMarkers(presence || {});
            },
            onStatusChange: (status) => {
                setSyncStatus(status);
            }
        });

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (cursorThrottleTimerRef.current) {
                clearTimeout(cursorThrottleTimerRef.current);
            }

            // Remove all remote markers on unmount
            const editor = editorInstanceRef.current;
            if (editor && editor.session) {
                Object.values(remoteMarkersRef.current).forEach((markerId) => {
                    editor.session.removeMarker(markerId);
                });
            }
            remoteMarkersRef.current = {};
            unsubscribe();
        };
    }, [roomKey, clientId, saveToRecentRooms, showError, updateRemoteMarkers]);

    // Handle Local Editor Content Changes with Debouncing
    const handleContentChange = (newVal) => {
        if (newVal.length > MAX_CONTENT_LENGTH) {
            showError(`Content exceeds max limit of ${MAX_CONTENT_LENGTH / 1024} KB`);
            return;
        }

        contentRef.current = newVal;
        setContent(newVal);

        if (!roomKey) return;

        setSyncStatus('syncing');

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            try {
                await updateRoomContent(roomKey, newVal, clientId);
                setSyncStatus(isFirebaseConfigured ? 'connected' : 'unconfigured');
            } catch (err) {
                console.error('Save error:', err);
                showError('Sync failed');
                setSyncStatus('error');
            }
        }, 120);
    };

    // Broadcast local cursor position with throttling (~90ms)
    const handleCursorChange = useCallback(() => {
        if (!editorInstanceRef.current || !roomKey) return;
        const pos = editorInstanceRef.current.getCursorPosition();
        if (!pos) return;

        const now = Date.now();
        if (now - lastCursorSendRef.current > 90) {
            lastCursorSendRef.current = now;
            updateCursorPosition(roomKey, { row: pos.row, column: pos.column });
        } else {
            if (cursorThrottleTimerRef.current) clearTimeout(cursorThrottleTimerRef.current);
            cursorThrottleTimerRef.current = setTimeout(() => {
                lastCursorSendRef.current = Date.now();
                updateCursorPosition(roomKey, { row: pos.row, column: pos.column });
            }, 90);
        }
    }, [roomKey]);

    // Ace Editor onLoad handler
    const handleEditorLoad = (editor) => {
        editorInstanceRef.current = editor;
        editor.selection.on('changeCursor', handleCursorChange);
    };

    // Join or Create Room Handler
    const handleJoinRoom = (e) => {
        if (e) e.preventDefault();
        const clean = sanitizeRoomKey(customKeyInput);
        if (!clean) {
            showError('Please enter a valid room key');
            return;
        }
        navigate(`/share/${clean}`);
    };

    const handleRandomRoom = () => {
        const randomKey = generateRandomRoomKey();
        navigate(`/share/${randomKey}`);
    };

    // Copy Room Link to Clipboard
    const copyRoomLink = async () => {
        if (!roomKey) return;
        const url = `${window.location.origin}/share/${roomKey}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
            showSuccess('Room link copied!');
        } catch {
            showError('Copy failed');
        }
    };

    // Copy JSON Content
    const copyContent = async () => {
        if (!content.trim()) {
            showError('Content is empty');
            return;
        }
        try {
            await navigator.clipboard.writeText(content);
            setCopiedContent(true);
            setTimeout(() => setCopiedContent(false), 2000);
            showSuccess('Content copied!');
        } catch {
            showError('Copy failed');
        }
    };

    // Format / Prettify JSON
    const formatJson = () => {
        if (!content.trim()) return;
        try {
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, 2);
            handleContentChange(formatted);
            showSuccess('JSON formatted');
        } catch (e) {
            showError('Invalid JSON format');
        }
    };

    // Minify JSON
    const minifyJson = () => {
        if (!content.trim()) return;
        try {
            const parsed = JSON.parse(content);
            const minified = JSON.stringify(parsed);
            handleContentChange(minified);
            showSuccess('JSON minified');
        } catch (e) {
            showError('Invalid JSON format');
        }
    };

    // Clear content
    const clearContent = () => {
        handleContentChange('');
    };

    // Open in Parse tool
    const openInParse = () => {
        if (content) {
            localStorage.setItem('lastJsonInput', content);
        }
        navigate('/parse');
    };

    // Leave Room
    const leaveRoom = () => {
        navigate('/share');
    };

    // Calculate active peers list for header avatars
    const peersList = Object.entries(presenceMap).map(([id, peer]) => {
        const isSelf = id === clientId;
        const colorIdx = isSelf ? myColorIndex : (peer.colorIndex !== undefined ? peer.colorIndex : getClientColorIndex(id));
        return {
            id,
            isSelf,
            name: isSelf ? 'You' : (peer.name || `Peer #${id.slice(-3)}`),
            colorIndex: colorIdx,
            colorHex: PEER_COLORS[colorIdx]?.hex || '#4ecdc4'
        };
    });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="share-wrapper"
        >
            {/* Unconfigured Firebase Banner */}
            {!isFirebaseConfigured && (
                <div className="firebase-notice-banner">
                    <FaExclamationTriangle className="notice-icon" />
                    <div className="notice-text">
                        <strong>Local Demo Mode:</strong> Firebase credentials are not yet configured. Changes are stored locally. Add your Firebase keys in <code>.env</code> or Vercel dashboard to enable live cross-device collaboration.
                    </div>
                </div>
            )}

            {!roomKey ? (
                // ==================== Landing / Room Selection View ====================
                <div className="share-landing">
                    <div className="landing-card">
                        <div className="landing-icon-badge">
                            <FaLink />
                        </div>
                        <h2>Real-Time Shared JSON Editor</h2>
                        <p>
                            Collaborate live with multi-cursor sync. Create or join a room using a custom key like <code>1681</code> or generate a random one.
                        </p>

                        <form onSubmit={handleJoinRoom} className="room-input-form">
                            <div className="input-group-custom">
                                <span className="input-prefix">/share/</span>
                                <input
                                    type="text"
                                    placeholder="e.g. 1681 or team-room"
                                    value={customKeyInput}
                                    onChange={(e) => setCustomKeyInput(e.target.value)}
                                    maxLength={40}
                                    autoFocus
                                    className="room-text-input"
                                />
                                <button type="submit" className="btn-join">
                                    Join <FaArrowRight />
                                </button>
                            </div>
                        </form>

                        <div className="landing-divider">
                            <span>or</span>
                        </div>

                        <button onClick={handleRandomRoom} className="btn-random-room">
                            <FaDice /> Generate Random Room Key
                        </button>

                        {recentRooms.length > 0 && (
                            <div className="recent-rooms-section">
                                <span className="recent-title">Recent Rooms:</span>
                                <div className="recent-chips">
                                    {recentRooms.map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => navigate(`/share/${key}`)}
                                            className="recent-chip"
                                        >
                                            #{key}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // ==================== Active Room Editor View ====================
                <>
                    {/* Top Room Control Header */}
                    <div className="room-header">
                        <div className="room-info">
                            <div className="room-badge">
                                <span className="room-badge-label">Room</span>
                                <span className="room-badge-key">{roomKey}</span>
                            </div>

                            {/* Status Pill */}
                            <div className={`status-pill ${syncStatus}`}>
                                <span className="status-dot"></span>
                                <span className="status-text">
                                    {syncStatus === 'connected' && 'Live Sync'}
                                    {syncStatus === 'syncing' && 'Saving...'}
                                    {syncStatus === 'connecting' && 'Connecting...'}
                                    {syncStatus === 'unconfigured' && 'Local Mode'}
                                    {syncStatus === 'error' && 'Sync Error'}
                                </span>
                            </div>

                            {/* Peer Presence Avatars */}
                            {isFirebaseConfigured && peersList.length > 0 && (
                                <div className="peers-container" title="Active collaborators with multi-cursor">
                                    <FaUsers className="peers-icon" />
                                    <div className="peer-tags">
                                        {peersList.map((peer) => (
                                            <span 
                                                key={peer.id} 
                                                className={`peer-tag ${peer.isSelf ? 'self' : ''}`}
                                                style={{ borderColor: peer.colorHex }}
                                            >
                                                <span 
                                                    className="peer-dot" 
                                                    style={{ background: peer.colorHex }}
                                                />
                                                {peer.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top Action Buttons */}
                        <div className="room-top-actions">
                            <button 
                                className={`action-pill-btn ${copiedLink ? 'copied' : ''}`}
                                onClick={copyRoomLink}
                                title="Copy direct link to this room"
                            >
                                {copiedLink ? <FaCheck /> : <FaLink />}
                                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                            </button>

                            <button 
                                className={`action-pill-btn ${copiedContent ? 'copied' : ''}`}
                                onClick={copyContent}
                                title="Copy editor content"
                            >
                                {copiedContent ? <FaCheck /> : <FaCopy />}
                                <span>{copiedContent ? 'Copied!' : 'Copy'}</span>
                            </button>

                            <button 
                                className="action-pill-btn leave-btn"
                                onClick={leaveRoom}
                                title="Exit this room"
                            >
                                <FaSignOutAlt />
                                <span>Leave</span>
                            </button>
                        </div>
                    </div>

                    {/* Editor Container with Multi-Cursor */}
                    <div className="editor-container">
                        <AceEditor
                            mode="json"
                            theme="merbivore_soft"
                            onChange={handleContentChange}
                            onLoad={handleEditorLoad}
                            value={content}
                            placeholder="Type or paste JSON here. Changes and cursors sync live with anyone in this room..."
                            name="realtimeShareEditor"
                            editorProps={{ $blockScrolling: true }}
                            enableBasicAutocompletion={true}
                            enableLiveAutocompletion={true}
                            enableSnippets={true}
                            width="100%"
                            height="100%"
                            fontSize={14}
                            showPrintMargin={false}
                            setOptions={{
                                useWorker: false,
                                tabSize: 2
                            }}
                        />
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="editor-bottom-bar">
                        <div className="bottom-left-actions">
                            <button className="tool-btn" onClick={formatJson} title="Prettify JSON">
                                <FaMagic /> Format
                            </button>
                            <button className="tool-btn" onClick={minifyJson} title="Minify JSON">
                                <FaCompressAlt /> Minify
                            </button>
                            <button className="tool-btn" onClick={clearContent} title="Clear editor">
                                <FaTrashAlt /> Clear
                            </button>
                        </div>

                        <div className="bottom-right-actions">
                            <button className="tool-btn highlight" onClick={openInParse} title="Open in JSON Validator">
                                <FaExternalLinkAlt size={12} /> Open in Parse
                            </button>
                        </div>
                    </div>
                </>
            )}

            <ToastContainer />
        </motion.div>
    );
}

export default Share;
