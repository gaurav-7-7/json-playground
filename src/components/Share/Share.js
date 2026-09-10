import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AceEditor from 'react-ace';
import { deflate, inflate } from 'pako';
import { FaCopy, FaCheck, FaLink, FaExternalLinkAlt } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'brace/mode/json';
import 'brace/mode/text';
import 'brace/theme/merbivore_soft';
import 'react-toastify/dist/ReactToastify.css';
import 'ace-builds/src-noconflict/ext-language_tools';

import './share.css';

// Compress and encode content to URL-safe base64
const encodeContent = (content) => {
    const uint8 = deflate(content);
    // Use chunk-based approach to avoid call stack overflow on large arrays
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return base64;
};

// Decode URL-safe base64 and decompress
const decodeContent = (encoded) => {
    if (!encoded || typeof encoded !== 'string') {
        throw new Error('Invalid share key');
    }

    let base64 = encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    while (base64.length % 4) base64 += '=';
    
    const compressed = atob(base64);
    const uint8 = new Uint8Array(compressed.length);
    for (let i = 0; i < compressed.length; i++) {
        uint8[i] = compressed.charCodeAt(i);
    }
    const content = inflate(uint8, { to: 'string' });
    return content;
};

function Share() {
    const { roomKey } = useParams();
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [isViewMode, setIsViewMode] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [urlCopied, setUrlCopied] = useState(false);
    const editorRef = useRef(null);

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
            autoClose: 1500,
            hideProgressBar: true,
            icon: false
        });
    }, []);

    // On mount - check if viewing shared content
    useEffect(() => {
        if (roomKey) {
            try {
                const decoded = decodeContent(roomKey);
                setContent(decoded);
                setIsViewMode(true);
            } catch (err) {
                console.error('Failed to decode:', err);
                showError('Invalid share link');
                navigate('/share');
            }
        } else {
            setIsViewMode(false);
            setShareUrl('');
        }
    }, [roomKey, navigate, showError]);

    const createShare = () => {
        if (!content.trim()) {
            showError('Empty');
            return;
        }

        try {
            const encoded = encodeContent(content);
            const url = `${window.location.origin}/share/${encoded}`;

            if (url.length > 8000) {
                showError('Content too large to share');
                return;
            }

            if (url.length > 4000) {
                showSuccess('Link created (large content)');
            }

            setShareUrl(url);
        } catch (err) {
            console.error('Encode error:', err);
            showError('Failed to create share');
        }
    };

    const copyShareUrl = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 2000);
            showSuccess('Link copied!');
        } catch (err) {
            showError('Copy failed');
        }
    };

    const copyContent = async () => {
        if (!content.trim()) {
            showError('Empty');
            return;
        }

        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            showError('Copy failed');
        }
    };

    const clearContent = () => {
        setContent('');
        setShareUrl('');
    };

    const createNewShare = () => {
        navigate('/share');
        setContent('');
        setShareUrl('');
        setIsViewMode(false);
    };

    const openInParse = () => {
        // Store content in localStorage and navigate
        localStorage.setItem('lastJsonInput', content);
        navigate('/parse');
    };

    const handleContentChange = (newValue) => {
        setContent(newValue);
        // Clear share URL when content changes
        if (shareUrl) {
            setShareUrl('');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="share-wrapper">
                {isViewMode ? (
                    // View Mode - showing shared content
                    <>
                        <div className="share-header">
                            <div className="share-title">
                                <FaLink className="share-icon" />
                                <span>Shared Content</span>
                            </div>
                            <button
                                className={`copy-content-btn ${copied ? 'copied' : ''}`}
                                onClick={copyContent}
                            >
                                {copied ? (
                                    <><FaCheck size={14} /> Copied</>
                                ) : (
                                    <><FaCopy size={14} /> Copy</>
                                )}
                            </button>
                        </div>

                        <div className="editor-container view-mode">
                            <AceEditor
                                mode="text"
                                theme="merbivore_soft"
                                value={content}
                                name="shareViewEditor"
                                editorProps={{ $blockScrolling: true }}
                                readOnly={true}
                                width="100%"
                                height="100%"
                                fontSize={14}
                                showPrintMargin={false}
                                ref={editorRef}
                                setOptions={{
                                    showGutter: true,
                                    highlightActiveLine: false
                                }}
                            />
                        </div>

                        <div className="btn-container">
                            <button className="btn-primary" onClick={createNewShare}>
                                Create New Share
                            </button>
                            <button className="btn-secondary" onClick={openInParse}>
                                <FaExternalLinkAlt size={12} /> Open in Parse
                            </button>
                        </div>
                    </>
                ) : (
                    // Create Mode - creating new share
                    <>
                        <div className="share-header">
                            <div className="share-title">
                                <FaLink className="share-icon" />
                                <span>Create Share Link</span>
                            </div>
                        </div>

                        <div className="editor-container">
                            <AceEditor
                                mode="text"
                                theme="merbivore_soft"
                                onChange={handleContentChange}
                                value={content}
                                placeholder="Paste your content here to create a shareable link..."
                                name="shareCreateEditor"
                                editorProps={{ $blockScrolling: true }}
                                enableBasicAutocompletion={true}
                                enableLiveAutocompletion={true}
                                enableSnippets={true}
                                width="100%"
                                height="100%"
                                fontSize={14}
                                showPrintMargin={false}
                                ref={editorRef}
                            />
                        </div>

                        <div className="btn-container">
                            <button className="btn-primary" onClick={createShare}>
                                Create Share Link
                            </button>
                            <button className="btn-secondary" onClick={clearContent}>
                                Clear
                            </button>
                        </div>

                        {shareUrl && (
                            <div className="share-url-container">
                                <div className="share-url-label">Share URL:</div>
                                <div className="share-url-box">
                                    <input
                                        type="text"
                                        value={shareUrl}
                                        readOnly
                                        className="share-url-input"
                                        onClick={(e) => e.target.select()}
                                    />
                                    <button
                                        className={`copy-url-btn ${urlCopied ? 'copied' : ''}`}
                                        onClick={copyShareUrl}
                                    >
                                        {urlCopied ? (
                                            <FaCheck size={14} />
                                        ) : (
                                            <FaCopy size={14} />
                                        )}
                                    </button>
                                </div>
                                <div className="share-url-hint">
                                    {shareUrl.length > 4000 
                                        ? '⚠️ Large link - may not work in all browsers'
                                        : 'Link ready to share!'
                                    }
                                </div>
                            </div>
                        )}
                    </>
                )}

                <ToastContainer />
            </div>
        </motion.div>
    );
}

export default Share;
