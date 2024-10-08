import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import AceEditor from 'react-ace';
import brace from 'brace'
import { FaCopy, FaCheck, FaHistory } from 'react-icons/fa';
import History from './History/History';
import { ToastContainer, toast } from 'react-toastify';
import 'brace/mode/json'
import 'brace/theme/merbivore_soft'
import 'react-toastify/dist/ReactToastify.css';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

import './parse.css';

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
    const editorRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('lastJsonInput', jsonInput);
    }, [jsonInput]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.editor.commands.addCommand({
                name: 'showSearchBox',
                bindKey: { win: 'Ctrl-F', mac: 'Cmd-F' },
                exec: () => {
                    editorRef.current.editor.execCommand('find');
                }
            });
        }
    }, []);

    const handleInputChange = (newValue) => {
        setJsonInput(newValue);
        try {
            const parsedJson = JSON.parse(newValue);
            const formattedJson = JSON.stringify(parsedJson, null, 2);
            setJsonInput(formattedJson);
            updateHistory(formattedJson);
        } catch (err) {
        }
    };

    const showError = (message) => {
        toast.error(message, {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: true
        });
    };

    const validateJson = () => {
        try {
            const parsedJson = JSON.parse(jsonInput);
            const formattedJson = JSON.stringify(parsedJson, null, 2);
            setJsonInput(formattedJson);
            updateHistory(formattedJson);
        } catch (err) {
            console.log(err.message)
            showError(`Invalid JSON! Error: ${err.message}`);
        }
    };

    const compressJson = () => {
        try {
            const parsedJson = JSON.parse(jsonInput);
            const compressedJson = JSON.stringify(parsedJson);
            setJsonInput(compressedJson);
            updateHistory(compressedJson);
        } catch (err) {
            showError(`Cannot compress JSON! Error: ${err.message}`);
        }
    };

    const clearJson = () => {
        setJsonInput('');
    };

    const copyText = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(jsonInput).then(() => {
                setShowCopyIcon(true);
                setTimeout(() => setShowCopyIcon(false), 2000);
            }).catch(err => {
                showError(`Failed to copy text: ${err.message}`);
            });
        } else {
            showError('Clipboard API not available.');
        }
    };

    const handleSelectHistory = (selectedJson) => {
        setJsonInput(selectedJson);
    };

    const updateHistory = (json) => {
        const isDuplicate = history.some(entry => entry.json === json);
        if (isDuplicate) return;

        const newEntry = { json, timestamp: new Date().toLocaleString() };
        const newHistory = [newEntry, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('jsonHistory', JSON.stringify(newHistory));
    };

    const clearAllHistory = () => {
        setHistory([]);
        localStorage.removeItem('jsonHistory');
    };

    const toggleHistory = () => {
        setHistoryVisible(!historyVisible);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className={`json-wrapper`}>
                <div className='editor-container'>
                    <AceEditor
                        mode="json"
                        theme="merbivore_soft"
                        onChange={handleInputChange}
                        value={jsonInput}
                        placeholder='Enter your json here ...'
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
                    />
                    {showCopyIcon ? (
                        <div className='copy-icon-container'>
                            <FaCheck className='copy-icon-check' />
                        </div>
                    ) : (
                        <div className='copy-icon-container'>
                            <FaCopy className='copy-icon' onClick={copyText} title="Copy" />
                        </div>
                    )}
                </div>
                <div className='btn-container'>
                    <Button className='btns-jsontool' onClick={validateJson}>Validate</Button>
                    <Button className='btns-jsontool' onClick={compressJson}>Compress JSON</Button>
                    <Button className='btns-clear' onClick={clearJson}>Clear</Button>
                    {!historyVisible && (
                        <FaHistory className='history-icon' onClick={toggleHistory} title="Show History" />
                        // <Button className='btns-history' onClick={toggleHistory}>Show History</Button>
                    )}
                </div>
                <ToastContainer />
                <History
                    history={history}
                    isVisible={historyVisible}
                    onSelect={handleSelectHistory}
                    clearAllHistory={clearAllHistory}
                    toggleHistory={toggleHistory}
                />
            </div>
            {/* <section id="footer" className='footer-container'>
                <p className='footer'>
                    &copy; 2024 Gaurav Singh. <br />
                    All rights reserved.
                </p>
            </section> */}
        </motion.div>
    );
}

export default Parse;
