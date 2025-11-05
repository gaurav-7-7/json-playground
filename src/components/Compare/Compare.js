/* eslint-disable */
import React, { useState, useRef, useEffect } from 'react';
import { diffLines } from 'diff'; // Changed to diffLines for line-based diff
import { motion } from 'framer-motion';
import Button from '@mui/material/Button';
import AceEditor from 'react-ace';
import { FaCopy, FaCheck, FaHistory } from 'react-icons/fa';
import History from '../Parse/History/History';
import { ToastContainer, toast } from 'react-toastify';
import 'brace/mode/text';
import 'brace/theme/merbivore_soft';
import 'react-toastify/dist/ReactToastify.css';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';
import './compare.css';

function Compare() {
    const [inputOne, setInputOne] = useState('');
    const [inputTwo, setInputTwo] = useState('');
    const [diffOne, setDiffOne] = useState('');
    const [diffTwo, setDiffTwo] = useState('');
    const [annotationsOne, setAnnotationsOne] = useState([]);
    const [annotationsTwo, setAnnotationsTwo] = useState([]);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [history, setHistory] = useState(
        () => JSON.parse(localStorage.getItem('diffHistory')) || []
    );
    const [showCopyIcon, setShowCopyIcon] = useState(false);
    const editorRef1 = useRef(null);
    const editorRef2 = useRef(null);
    const diffEditorRef1 = useRef(null);
    const diffEditorRef2 = useRef(null);

    const compareInputs = () => {
        if (!inputOne.trim() || !inputTwo.trim()) {
            toast.error('Both inputs must be filled to compare.', {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: true
            });
            return;
        }

        const diff = diffLines(inputOne, inputTwo);
        let leftDiff = '';
        let rightDiff = '';
        let annOne = [];
        let annTwo = [];
        let lineNum = 0;

        diff.forEach((part) => {
            const lines = part.value.split('\n').filter(l => l !== '');
            if (part.added) {
                rightDiff += lines.map(line => `+ ${line}`).join('\n') + '\n';
                leftDiff += '\n'.repeat(lines.length);
                annTwo.push(...lines.map((_, idx) => ({ row: lineNum + idx, column: 0, text: 'Added', type: 'info' })));
                lineNum += lines.length;
            } else if (part.removed) {
                leftDiff += lines.map(line => `- ${line}`).join('\n') + '\n';
                rightDiff += '\n'.repeat(lines.length);
                annOne.push(...lines.map((_, idx) => ({ row: lineNum + idx, column: 0, text: 'Removed', type: 'error' })));
                lineNum += lines.length;
            } else {
                leftDiff += lines.map(line => `  ${line}`).join('\n') + '\n';
                rightDiff += lines.map(line => `  ${line}`).join('\n') + '\n';
                lineNum += lines.length;
            }
        });

        if (diff.length === 1 && !diff[0].added && !diff[0].removed) {
            setDiffOne('No differences found.');
            setDiffTwo('No differences found.');
            setAnnotationsOne([]);
            setAnnotationsTwo([]);
            updateHistory('No differences found.');
        } else {
            setDiffOne(leftDiff.trim());
            setDiffTwo(rightDiff.trim());
            setAnnotationsOne(annOne);
            setAnnotationsTwo(annTwo);
            updateHistory(`${leftDiff.trim()}\n---\n${rightDiff.trim()}`);
        }
    };

    // const copyText = () => {
    //     const fullDiff = `${diffOne}\n---\n${diffTwo}`;
    //     if (navigator.clipboard) {
    //         navigator.clipboard.writeText(fullDiff).then(() => {
    //             setShowCopyIcon(true);
    //             setTimeout(() => setShowCopyIcon(false), 2000);
    //         }).catch(err => {
    //             toast.error(`Failed to copy text: ${err.message}`);
    //         });
    //     } else {
    //         toast.error('Clipboard API not available.');
    //     }
    // };

    const handleSelectHistory = (selectedDiff) => {
        const [left, right] = selectedDiff.split('\n---\n');
        setDiffOne(left || '');
        setDiffTwo(right || '');
    };

    const updateHistory = (diff) => {
        const isDuplicate = history.some(entry => entry.diff === diff);
        if (isDuplicate) return;

        const newEntry = { diff, timestamp: new Date().toLocaleString() };
        const newHistory = [newEntry, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('diffHistory', JSON.stringify(newHistory));
    };

    const clearAllHistory = () => {
        setHistory([]);
        localStorage.removeItem('diffHistory');
    };

    const handleDelete = (indexToDelete) => {
        setHistory(prev => prev.filter((_, index) => index !== indexToDelete));
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
            <div className="json-compare-wrapper">
                <div className="diff-view-container">
                    <div className="diff-editor-wrapper">
                        <AceEditor
                            mode="text"
                            theme="merbivore_soft"
                            value={diffOne}
                            name="diffEditor1"
                            editorProps={{ $blockScrolling: true }}
                            readOnly={true}
                            width="100%"
                            height="60vh"
                            fontSize={14}
                            showPrintMargin={false}
                            annotations={annotationsOne}
                            ref={diffEditorRef1}
                        />
                    </div>
                    <div className="diff-editor-wrapper">
                        <AceEditor
                            mode="text"
                            theme="merbivore_soft"
                            value={diffTwo}
                            name="diffEditor2"
                            editorProps={{ $blockScrolling: true }}
                            readOnly={true}
                            width="100%"
                            height="60vh"
                            fontSize={14}
                            showPrintMargin={false}
                            annotations={annotationsTwo}
                            ref={diffEditorRef2}
                        />
                        {/* {showCopyIcon ? (
                            <div className='copy-icon-container'>
                                <FaCheck className='copy-icon-check' />
                            </div>
                        ) : (
                            <div className='copy-icon-container'>
                                <FaCopy className='copy-icon' onClick={copyText} title="Copy Diff" />
                            </div>
                        )} */}
                    </div>
                </div>

                {/* Edit View (Bottom) */}
                <div className="edit-view-container">
                    <div className="editor-wrapper">
                        <AceEditor
                            mode="text"
                            theme="merbivore_soft"
                            onChange={setInputOne}
                            value={inputOne}
                            placeholder="Enter Text..."
                            name="editor1"
                            editorProps={{ $blockScrolling: true }}
                            enableBasicAutocompletion={true}
                            enableLiveAutocompletion={true}
                            enableSnippets={true}
                            width="100%"
                            height="40vh"
                            fontSize={14}
                            showPrintMargin={false}
                            ref={editorRef1}
                        />
                    </div>
                    <div className="editor-wrapper">
                        <AceEditor
                            mode="text"
                            theme="merbivore_soft"
                            onChange={setInputTwo}
                            value={inputTwo}
                            placeholder="Enter Text..."
                            name="editor2"
                            editorProps={{ $blockScrolling: true }}
                            enableBasicAutocompletion={true}
                            enableLiveAutocompletion={true}
                            enableSnippets={true}
                            width="100%"
                            height="40vh"
                            fontSize={14}
                            showPrintMargin={false}
                            ref={editorRef2}
                        />
                    </div>
                </div>

                <div className='btn-container'>
                    <Button className='btns-jsoncompare' onClick={compareInputs}>Compare</Button>
                    {/* <div className='btn-container-h'>
                        {!historyVisible && (
                            <FaHistory className='history-icon' size={35} onClick={toggleHistory} title="Show History" />
                        )}
                    </div> */}
                </div>
                <ToastContainer />
                {/* <History
                    history={history}
                    isVisible={historyVisible}
                    onSelect={handleSelectHistory}
                    clearAllHistory={clearAllHistory}
                    onDelete={handleDelete}
                    toggleHistory={toggleHistory}
                /> */}
            </div>
        </motion.div>
    );
}

export default Compare;