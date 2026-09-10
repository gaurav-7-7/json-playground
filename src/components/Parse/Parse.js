import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import AceEditor from 'react-ace';
import { Range } from 'ace-builds';
import { FaCopy, FaCheck, FaHistory } from 'react-icons/fa';
import History from './History/History';
import { ToastContainer, toast } from 'react-toastify';
import { FILE_TYPES } from './constants';
import 'brace/mode/json';
import 'brace/theme/merbivore_soft';
import 'react-toastify/dist/ReactToastify.css';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

import './parse.css';

/**
 * Find all JSON syntax errors in a string
 * Returns array of { line, column, message }
 * Returns null if content is clearly not JSON (to show generic error)
 */
function findJsonErrors(content) {
    const trimmed = content.trim();
    
    // Check if content looks like JSON at all (starts with { or [)
    const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
    
    if (!looksLikeJson) {
        // Not JSON at all - return null to indicate generic error
        return null;
    }

    const errors = [];
    
    // First, try native JSON.parse to get the first error
    try {
        JSON.parse(content);
        return []; // No errors
    } catch (err) {
        const match = err.message.match(/position (\d+)/);
        if (match) {
            const position = parseInt(match[1], 10);
            const lines = content.substring(0, position).split('\n');
            const line = lines.length;
            const column = lines[lines.length - 1].length + 1;
            errors.push({ line, column, message: err.message });
        }
    }

    // Additional heuristic checks for common JSON errors
    const lines = content.split('\n');
    lines.forEach((lineContent, index) => {
        const lineNum = index + 1;
        
        // Check for unquoted keys (common error)
        const unquotedKeyMatch = lineContent.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
        if (unquotedKeyMatch) {
            const beforeColon = lineContent.substring(0, lineContent.indexOf(':'));
            if (!beforeColon.includes('"')) {
                errors.push({ 
                    line: lineNum, 
                    column: 1, 
                    message: `Unquoted key: ${unquotedKeyMatch[1]}` 
                });
            }
        }

        // Check for unclosed strings (odd number of unescaped quotes)
        let quoteCount = 0;
        let lastQuotePos = 0;
        for (let i = 0; i < lineContent.length; i++) {
            if (lineContent[i] === '"' && (i === 0 || lineContent[i-1] !== '\\')) {
                quoteCount++;
                lastQuotePos = i;
            }
        }
        if (quoteCount % 2 !== 0) {
            errors.push({ 
                line: lineNum, 
                column: lastQuotePos + 1, 
                message: 'Unclosed string' 
            });
        }

        // Check for trailing commas before closing brackets
        if (lineContent.match(/,\s*[\]}]\s*$/)) {
            errors.push({ 
                line: lineNum, 
                column: lineContent.indexOf(',') + 1, 
                message: 'Trailing comma' 
            });
        }
    });

    // Remove duplicates based on line number
    const uniqueErrors = [];
    const seenLines = new Set();
    for (const error of errors) {
        if (!seenLines.has(error.line)) {
            seenLines.add(error.line);
            uniqueErrors.push(error);
        }
    }

    return uniqueErrors;
}

function Parse() {
    const [jsonInput, setJsonInput] = useState(() => {
        const savedJsonInput = localStorage.getItem('lastJsonInput');
        return savedJsonInput || '';
    });
    const [historyVisible, setHistoryVisible] = useState(false);
    const [history, setHistory] = useState(
        () => JSON.parse(localStorage.getItem('jsonHistory')) || []
    );
    const [showCopyIcon, setShowCopyIcon] = useState(false);
    const [annotations, setAnnotations] = useState([]);
    
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const markerIds = useRef([]);
    const jsonInputRef = useRef(jsonInput);

    // Keep ref in sync with state
    useEffect(() => {
        jsonInputRef.current = jsonInput;
    }, [jsonInput]);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('lastJsonInput', jsonInput);
    }, [jsonInput]);

    // Toast helpers
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

    // History management - DEFINED EARLY so other functions can use it
    const updateHistory = useCallback((json) => {
        setHistory(prevHistory => {
            const isDuplicate = prevHistory.some(entry => entry.json === json);
            if (isDuplicate) return prevHistory;

            const newEntry = { json, timestamp: new Date().toLocaleString() };
            const newHistory = [newEntry, ...prevHistory].slice(0, 10);
            localStorage.setItem('jsonHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    // Apply error markers to the editor
    const applyErrorMarkers = useCallback((errors) => {
        if (!editorRef.current?.editor) return;
        
        const editor = editorRef.current.editor;
        const session = editor.session;

        // Clear existing markers
        markerIds.current.forEach(id => session.removeMarker(id));
        markerIds.current = [];

        // Add new markers for error lines
        errors.forEach(error => {
            const row = error.line - 1;
            const range = new Range(row, 0, row, 1);
            const markerId = session.addMarker(range, 'json-error-line', 'fullLine', false);
            markerIds.current.push(markerId);
        });

        // Set annotations (gutter icons)
        const newAnnotations = errors.map(error => ({
            row: error.line - 1,
            column: error.column - 1,
            text: error.message,
            type: 'error'
        }));
        setAnnotations(newAnnotations);
    }, []);

    // Clear all error markers
    const clearErrorMarkers = useCallback(() => {
        if (!editorRef.current?.editor) return;
        
        const session = editorRef.current.editor.session;
        markerIds.current.forEach(id => session.removeMarker(id));
        markerIds.current = [];
        setAnnotations([]);
    }, []);

    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Validate JSON content
    const validateJsonContent = useCallback((content) => {
        if (!content || !content.trim()) {
            showError('Empty');
            clearErrorMarkers();
            return;
        }

        try {
            const parsedJson = JSON.parse(content);
            const formattedJson = JSON.stringify(parsedJson, null, 2);
            setJsonInput(formattedJson);
            updateHistory(formattedJson);
            clearErrorMarkers();
            
            if (editorRef.current) {
                editorRef.current.editor.setValue(formattedJson, -1);
            }
            showSuccess('Valid');
        } catch (err) {
            const errors = findJsonErrors(content);
            
            // errors is null if content doesn't look like JSON at all
            if (errors === null) {
                clearErrorMarkers();
                showError('Not JSON');
            } else if (errors.length > 0) {
                applyErrorMarkers(errors);
                const lineInfo = errors.length === 1 
                    ? `line ${errors[0].line}` 
                    : `${errors.length} errors`;
                showError(`Invalid JSON (${lineInfo})`);
            } else {
                clearErrorMarkers();
                showError('Invalid JSON');
            }
        }
    }, [showError, showSuccess, applyErrorMarkers, clearErrorMarkers, updateHistory]);

    // Save content to file
    const saveToFile = useCallback(async (content) => {
        if (!content || !content.trim()) {
            showError('Empty');
            return;
        }

        try {
            const supportsFileSystemAccess = 'showSaveFilePicker' in window;

            if (supportsFileSystemAccess) {
                const options = {
                    suggestedName: 'untitled.json',
                    types: [...FILE_TYPES],
                    startIn: 'downloads'
                };

                const fileHandle = await window.showSaveFilePicker(options);
                const writableStream = await fileHandle.createWritable();
                await writableStream.write(content);
                await writableStream.close();
                showSuccess('Saved');
            } else {
                const blob = new Blob([content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'output.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showSuccess('Downloaded');
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            showError('Save failed');
        }
    }, [showError, showSuccess]);

    // Setup keyboard shortcuts
    useEffect(() => {
        if (!editorRef.current) return;
        
        const editor = editorRef.current.editor;

        editor.commands.addCommand({
            name: 'showSearchBox',
            bindKey: { win: 'Ctrl-F', mac: 'Cmd-F' },
            exec: () => editor.execCommand('find')
        });

        editor.commands.addCommand({
            name: 'saveFile',
            bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
            exec: () => saveToFile(jsonInputRef.current)
        });

        editor.commands.addCommand({
            name: 'importJsonFile',
            bindKey: { win: 'Ctrl-O', mac: 'Cmd-O' },
            exec: () => triggerFileInput()
        });

        editor.commands.addCommand({
            name: 'validateJson',
            bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
            exec: () => validateJsonContent(jsonInputRef.current)
        });
    }, [saveToFile, triggerFileInput, validateJsonContent]);

    const handleInputChange = (newValue) => {
        setJsonInput(newValue);
        
        // Clear error markers when user starts typing
        if (annotations.length > 0) {
            clearErrorMarkers();
        }
        
        // Auto-parse if it looks like valid JSON
        if (newValue && newValue.length > 10) {
            try {
                const parsed = JSON.parse(newValue);
                const formatted = JSON.stringify(parsed, null, 2);
                if (formatted !== newValue) {
                    setJsonInput(formatted);
                    updateHistory(formatted);
                }
            } catch {
                // Not valid JSON yet
            }
        }
    };

    const validateJson = () => validateJsonContent(jsonInput);

    const compressJson = () => {
        if (!jsonInput || !jsonInput.trim()) {
            showError('Empty');
            return;
        }

        try {
            const parsedJson = JSON.parse(jsonInput);
            const compressedJson = JSON.stringify(parsedJson);
            setJsonInput(compressedJson);
            updateHistory(compressedJson);
            clearErrorMarkers();
            showSuccess('Compressed');
        } catch (err) {
            showError('Invalid JSON');
        }
    };

    const clearJson = () => {
        setJsonInput('');
        clearErrorMarkers();
    };

    const copyText = async () => {
        if (!jsonInput || !jsonInput.trim()) {
            showError('Empty');
            return;
        }

        try {
            await navigator.clipboard.writeText(jsonInput);
            setShowCopyIcon(true);
            setTimeout(() => setShowCopyIcon(false), 2000);
        } catch (err) {
            showError('Copy failed');
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validTypes = ['application/json', 'text/plain'];
        const validExtensions = ['.json', '.txt'];
        const isValidType = validTypes.includes(file.type) || 
                           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        if (!isValidType) {
            showError('Select JSON or text file');
            event.target.value = '';
            return;
        }

        try {
            const text = await file.text();
            
            try {
                const parsed = JSON.parse(text);
                const formatted = JSON.stringify(parsed, null, 2);
                setJsonInput(formatted);
                updateHistory(formatted);
                clearErrorMarkers();
                showSuccess('Loaded');
            } catch {
                setJsonInput(text);
                showError('Invalid JSON in file');
            }
        } catch (err) {
            showError('Read failed');
        } finally {
            event.target.value = '';
        }
    };

    const handleSelectHistory = (selectedJson) => {
        setJsonInput(selectedJson);
        clearErrorMarkers();
    };

    const clearAllHistory = () => {
        setHistory([]);
        localStorage.removeItem('jsonHistory');
    };

    const handleDelete = (indexToDelete) => {
        setHistory(prev => {
            const newHistory = prev.filter((_, index) => index !== indexToDelete);
            localStorage.setItem('jsonHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const toggleHistory = () => setHistoryVisible(!historyVisible);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="json-wrapper">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept=".json,.txt,application/json,text/plain"
                />
                <div className="editor-container">
                    <AceEditor
                        mode="json"
                        theme="merbivore_soft"
                        onChange={handleInputChange}
                        value={jsonInput}
                        placeholder="Enter your JSON here or import a file with Ctrl+O...

Shortcuts:
  Ctrl+S  - Save to file
  Ctrl+O  - Open file
  Ctrl+F  - Find/Replace
  Ctrl+Enter - Validate & Format"
                        name="jsonEditor"
                        editorProps={{ $blockScrolling: true }}
                        enableBasicAutocompletion={true}
                        enableLiveAutocompletion={true}
                        enableSnippets={true}
                        width="100%"
                        height="100%"
                        fontSize={14}
                        showPrintMargin={false}
                        ref={editorRef}
                        annotations={annotations}
                    />
                    <div className="copy-icon-container" onClick={copyText} title="Copy to clipboard">
                        {showCopyIcon ? (
                            <FaCheck className="copy-icon-check" />
                        ) : (
                            <FaCopy className="copy-icon" />
                        )}
                    </div>
                </div>
                <div className="button-row-container">
                    <div className="btn-container-a">
                        <Button className="btns-jsontool" onClick={validateJson}>Validate</Button>
                        <Button className="btns-jsontool" onClick={compressJson}>Compress</Button>
                        <Button className="btns-clear" onClick={clearJson}>Clear</Button>
                    </div>
                    <div className="btn-container-h">
                        {!historyVisible && (
                            <FaHistory 
                                className="history-icon" 
                                size={35} 
                                onClick={toggleHistory} 
                                title="Show History" 
                            />
                        )}
                    </div>
                </div>
                <ToastContainer />
                <History
                    history={history}
                    isVisible={historyVisible}
                    onSelect={handleSelectHistory}
                    clearAllHistory={clearAllHistory}
                    onDelete={handleDelete}
                    toggleHistory={toggleHistory}
                />
            </div>
        </motion.div>
    );
}

export default Parse;
