/* eslint-disable */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { diffLines, diffWords } from 'diff';
import { motion } from 'framer-motion';
import AceEditor from 'react-ace';
import { Range } from 'ace-builds';
import { FaCopy, FaCheck, FaCheckCircle } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'brace/mode/text';
import 'brace/theme/merbivore_soft';
import 'react-toastify/dist/ReactToastify.css';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';
import './compare.css';

function Compare() {
    const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'diff'
    const [inputOne, setInputOne] = useState(() => {
        return localStorage.getItem('compareInputOne') || '';
    });
    const [inputTwo, setInputTwo] = useState(() => {
        return localStorage.getItem('compareInputTwo') || '';
    });
    const [diffResult, setDiffResult] = useState({
        left: { content: '', markers: [], stats: { changes: 0, lines: 0 } },
        right: { content: '', markers: [], stats: { changes: 0, lines: 0 } },
        hasChanges: false
    });
    const [copiedSide, setCopiedSide] = useState(null); // 'left' | 'right' | null

    const editorRef1 = useRef(null);
    const editorRef2 = useRef(null);
    const diffEditorRef1 = useRef(null);
    const diffEditorRef2 = useRef(null);
    const isScrolling = useRef(false);

    // Persist inputs to localStorage
    useEffect(() => {
        localStorage.setItem('compareInputOne', inputOne);
    }, [inputOne]);

    useEffect(() => {
        localStorage.setItem('compareInputTwo', inputTwo);
    }, [inputTwo]);

    // Apply markers to diff editors
    useEffect(() => {
        if (viewMode === 'diff') {
            // Small delay to ensure editors are mounted
            const timer = setTimeout(() => {
                applyMarkers(diffEditorRef1, diffResult.left.markers);
                applyMarkers(diffEditorRef2, diffResult.right.markers);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [viewMode, diffResult]);

    // Synchronized scrolling
    useEffect(() => {
        if (viewMode !== 'diff') return;

        const timer = setTimeout(() => {
            const editor1 = diffEditorRef1.current?.editor;
            const editor2 = diffEditorRef2.current?.editor;

            if (!editor1 || !editor2) return;

            const syncScroll = (source, target) => {
                if (isScrolling.current) return;
                isScrolling.current = true;
                
                const scrollTop = source.session.getScrollTop();
                target.session.setScrollTop(scrollTop);
                
                setTimeout(() => {
                    isScrolling.current = false;
                }, 10);
            };

            const handler1 = () => syncScroll(editor1, editor2);
            const handler2 = () => syncScroll(editor2, editor1);

            editor1.session.on('changeScrollTop', handler1);
            editor2.session.on('changeScrollTop', handler2);

            return () => {
                editor1.session.off('changeScrollTop', handler1);
                editor2.session.off('changeScrollTop', handler2);
            };
        }, 150);

        return () => clearTimeout(timer);
    }, [viewMode]);

    const applyMarkers = (editorRef, markers) => {
        if (!editorRef.current?.editor) return;
        
        const editor = editorRef.current.editor;
        const session = editor.session;

        // Clear existing markers
        const existingMarkers = session.getMarkers(false);
        Object.keys(existingMarkers).forEach(id => {
            const marker = existingMarkers[id];
            if (marker.clazz && marker.clazz.startsWith('diff-')) {
                session.removeMarker(parseInt(id));
            }
        });

        // Add new markers
        markers.forEach(marker => {
            try {
                const range = new Range(
                    marker.startRow,
                    marker.startCol,
                    marker.endRow,
                    marker.endCol
                );
                session.addMarker(range, marker.className, marker.type, false);
            } catch (e) {
                console.warn('Failed to add marker:', e);
            }
        });
    };

    const processWordDiff = (oldLine, newLine, leftLineNum, rightLineNum) => {
        const wordDiff = diffWords(oldLine, newLine);
        const leftMarkers = [];
        const rightMarkers = [];
        
        let leftCol = 0;
        let rightCol = 0;

        wordDiff.forEach(part => {
            const length = part.value.length;

            if (part.removed) {
                // Word was removed - mark in left panel
                leftMarkers.push({
                    startRow: leftLineNum,
                    startCol: leftCol,
                    endRow: leftLineNum,
                    endCol: leftCol + length,
                    className: 'diff-word-removed',
                    type: 'text'
                });
                leftCol += length;
            } else if (part.added) {
                // Word was added - mark in right panel
                rightMarkers.push({
                    startRow: rightLineNum,
                    startCol: rightCol,
                    endRow: rightLineNum,
                    endCol: rightCol + length,
                    className: 'diff-word-added',
                    type: 'text'
                });
                rightCol += length;
            } else {
                // Unchanged - advance both
                leftCol += length;
                rightCol += length;
            }
        });

        return { leftMarkers, rightMarkers };
    };

    const computeDiff = useCallback(() => {
        if (!inputOne.trim() && !inputTwo.trim()) {
            toast.error('Please enter text in both panels to compare.', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: true
            });
            return;
        }

        const lineDiff = diffLines(inputOne, inputTwo);
        
        let leftContent = [];
        let rightContent = [];
        let leftMarkers = [];
        let rightMarkers = [];
        let leftLineNum = 0;
        let rightLineNum = 0;
        let removedCount = 0;
        let addedCount = 0;

        // First pass: collect removed and added blocks for pairing
        let i = 0;
        while (i < lineDiff.length) {
            const part = lineDiff[i];
            const lines = part.value.split('\n');
            // Remove last empty element if line ends with \n
            if (lines[lines.length - 1] === '') lines.pop();

            if (part.removed) {
                // Check if next part is added (modification case)
                const nextPart = lineDiff[i + 1];
                
                if (nextPart && nextPart.added) {
                    // This is a modification - pair removed with added lines
                    const addedLines = nextPart.value.split('\n');
                    if (addedLines[addedLines.length - 1] === '') addedLines.pop();

                    const maxLines = Math.max(lines.length, addedLines.length);

                    for (let j = 0; j < maxLines; j++) {
                        const oldLine = lines[j] || '';
                        const newLine = addedLines[j] || '';

                        if (oldLine && newLine) {
                            // Both exist - compute word diff
                            leftContent.push(oldLine);
                            rightContent.push(newLine);

                            // Add line markers
                            leftMarkers.push({
                                startRow: leftLineNum,
                                startCol: 0,
                                endRow: leftLineNum,
                                endCol: 1,
                                className: 'diff-line-removed',
                                type: 'fullLine'
                            });
                            rightMarkers.push({
                                startRow: rightLineNum,
                                startCol: 0,
                                endRow: rightLineNum,
                                endCol: 1,
                                className: 'diff-line-added',
                                type: 'fullLine'
                            });

                            // Word-level diff
                            const { leftMarkers: wordLeft, rightMarkers: wordRight } = 
                                processWordDiff(oldLine, newLine, leftLineNum, rightLineNum);
                            leftMarkers.push(...wordLeft);
                            rightMarkers.push(...wordRight);

                            removedCount++;
                            addedCount++;
                            leftLineNum++;
                            rightLineNum++;
                        } else if (oldLine) {
                            // Only old line exists - pure removal
                            leftContent.push(oldLine);
                            rightContent.push('');

                            leftMarkers.push({
                                startRow: leftLineNum,
                                startCol: 0,
                                endRow: leftLineNum,
                                endCol: 1,
                                className: 'diff-line-removed',
                                type: 'fullLine'
                            });

                            removedCount++;
                            leftLineNum++;
                            rightLineNum++;
                        } else if (newLine) {
                            // Only new line exists - pure addition
                            leftContent.push('');
                            rightContent.push(newLine);

                            rightMarkers.push({
                                startRow: rightLineNum,
                                startCol: 0,
                                endRow: rightLineNum,
                                endCol: 1,
                                className: 'diff-line-added',
                                type: 'fullLine'
                            });

                            addedCount++;
                            leftLineNum++;
                            rightLineNum++;
                        }
                    }
                    i += 2; // Skip the added part
                    continue;
                } else {
                    // Pure removal - no matching addition
                    lines.forEach(line => {
                        leftContent.push(line);
                        rightContent.push('');

                        leftMarkers.push({
                            startRow: leftLineNum,
                            startCol: 0,
                            endRow: leftLineNum,
                            endCol: 1,
                            className: 'diff-line-removed',
                            type: 'fullLine'
                        });

                        removedCount++;
                        leftLineNum++;
                        rightLineNum++;
                    });
                }
            } else if (part.added) {
                // Pure addition (not paired with removal)
                lines.forEach(line => {
                    leftContent.push('');
                    rightContent.push(line);

                    rightMarkers.push({
                        startRow: rightLineNum,
                        startCol: 0,
                        endRow: rightLineNum,
                        endCol: 1,
                        className: 'diff-line-added',
                        type: 'fullLine'
                    });

                    addedCount++;
                    leftLineNum++;
                    rightLineNum++;
                });
            } else {
                // Unchanged lines
                lines.forEach(line => {
                    leftContent.push(line);
                    rightContent.push(line);
                    leftLineNum++;
                    rightLineNum++;
                });
            }
            i++;
        }

        const hasChanges = removedCount > 0 || addedCount > 0;

        setDiffResult({
            left: {
                content: leftContent.join('\n'),
                markers: leftMarkers,
                stats: { changes: removedCount, lines: leftContent.length }
            },
            right: {
                content: rightContent.join('\n'),
                markers: rightMarkers,
                stats: { changes: addedCount, lines: rightContent.length }
            },
            hasChanges
        });

        setViewMode('diff');
    }, [inputOne, inputTwo]);

    const copyContent = async (side) => {
        const content = side === 'left' ? inputOne : inputTwo;
        
        if (!content.trim()) {
            toast.error('Nothing to copy!', {
                position: "top-center",
                autoClose: 2000,
                hideProgressBar: true
            });
            return;
        }

        try {
            await navigator.clipboard.writeText(content);
            setCopiedSide(side);
            setTimeout(() => setCopiedSide(null), 2000);
        } catch (err) {
            toast.error(`Failed to copy: ${err.message}`, {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: true
            });
        }
    };

    const clearInputs = () => {
        setInputOne('');
        setInputTwo('');
        localStorage.removeItem('compareInputOne');
        localStorage.removeItem('compareInputTwo');
        setDiffResult({
            left: { content: '', markers: [], stats: { changes: 0, lines: 0 } },
            right: { content: '', markers: [], stats: { changes: 0, lines: 0 } },
            hasChanges: false
        });
        if (viewMode === 'diff') {
            setViewMode('edit');
        }
    };

    const switchToEdit = () => {
        setViewMode('edit');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="json-compare-wrapper">
                {/* View Toggle */}
                <div className="view-toggle-container">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'edit' ? 'active' : ''}`}
                            onClick={() => setViewMode('edit')}
                        >
                            Edit Mode
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'diff' ? 'active' : ''}`}
                            onClick={() => diffResult.hasChanges && setViewMode('diff')}
                            disabled={!diffResult.hasChanges}
                            style={{ opacity: diffResult.hasChanges ? 1 : 0.5 }}
                        >
                            Diff View
                        </button>
                    </div>
                </div>

                {viewMode === 'diff' ? (
                    <>
                        {/* Stats Header */}
                        <div className="diff-stats-header">
                            <div className="diff-stats-panel removed">
                                <div className="stats-info">
                                    <span className="stats-badge removed">
                                        ⊖ {diffResult.left.stats.changes} removals
                                    </span>
                                    <span className="stats-lines">
                                        {diffResult.left.stats.lines} lines
                                    </span>
                                </div>
                                <button
                                    className={`copy-btn ${copiedSide === 'left' ? 'copied' : ''}`}
                                    onClick={() => copyContent('left')}
                                >
                                    {copiedSide === 'left' ? (
                                        <><FaCheck size={12} /> Copied</>
                                    ) : (
                                        <><FaCopy size={12} /> Copy</>
                                    )}
                                </button>
                            </div>
                            <div className="diff-stats-panel added">
                                <div className="stats-info">
                                    <span className="stats-badge added">
                                        ⊕ {diffResult.right.stats.changes} additions
                                    </span>
                                    <span className="stats-lines">
                                        {diffResult.right.stats.lines} lines
                                    </span>
                                </div>
                                <button
                                    className={`copy-btn ${copiedSide === 'right' ? 'copied' : ''}`}
                                    onClick={() => copyContent('right')}
                                >
                                    {copiedSide === 'right' ? (
                                        <><FaCheck size={12} /> Copied</>
                                    ) : (
                                        <><FaCopy size={12} /> Copy</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Diff View */}
                        {!diffResult.hasChanges ? (
                            <div className="no-diff-message">
                                <div className="icon"><FaCheckCircle /></div>
                                <p>No differences found. Both texts are identical!</p>
                            </div>
                        ) : (
                            <div className="diff-view-container">
                                <div className="diff-editor-wrapper removed">
                                    <AceEditor
                                        mode="text"
                                        theme="merbivore_soft"
                                        value={diffResult.left.content}
                                        name="diffEditor1"
                                        editorProps={{ $blockScrolling: true }}
                                        readOnly={true}
                                        width="100%"
                                        height="70vh"
                                        fontSize={14}
                                        showPrintMargin={false}
                                        ref={diffEditorRef1}
                                        setOptions={{
                                            showGutter: true,
                                            highlightActiveLine: false
                                        }}
                                    />
                                </div>
                                <div className="diff-editor-wrapper added">
                                    <AceEditor
                                        mode="text"
                                        theme="merbivore_soft"
                                        value={diffResult.right.content}
                                        name="diffEditor2"
                                        editorProps={{ $blockScrolling: true }}
                                        readOnly={true}
                                        width="100%"
                                        height="70vh"
                                        fontSize={14}
                                        showPrintMargin={false}
                                        ref={diffEditorRef2}
                                        setOptions={{
                                            showGutter: true,
                                            highlightActiveLine: false
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Edit View */}
                        <div className="edit-view-container">
                            <div className="editor-wrapper">
                                <div className="editor-label">Original Text</div>
                                <AceEditor
                                    mode="text"
                                    theme="merbivore_soft"
                                    onChange={setInputOne}
                                    value={inputOne}
                                    placeholder="Enter original text here..."
                                    name="editor1"
                                    editorProps={{ $blockScrolling: true }}
                                    enableBasicAutocompletion={true}
                                    enableLiveAutocompletion={true}
                                    enableSnippets={true}
                                    width="100%"
                                    height="100%"
                                    fontSize={14}
                                    showPrintMargin={false}
                                    ref={editorRef1}
                                />
                            </div>
                            <div className="editor-wrapper">
                                <div className="editor-label">Changed Text</div>
                                <AceEditor
                                    mode="text"
                                    theme="merbivore_soft"
                                    onChange={setInputTwo}
                                    value={inputTwo}
                                    placeholder="Enter changed text here..."
                                    name="editor2"
                                    editorProps={{ $blockScrolling: true }}
                                    enableBasicAutocompletion={true}
                                    enableLiveAutocompletion={true}
                                    enableSnippets={true}
                                    width="100%"
                                    height="100%"
                                    fontSize={14}
                                    showPrintMargin={false}
                                    ref={editorRef2}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Action Buttons */}
                <div className="btn-container">
                    {viewMode === 'edit' ? (
                        <>
                            <button className="btn-compare" onClick={computeDiff}>
                                Find Difference
                            </button>
                            <button className="btn-clear" onClick={clearInputs}>
                                Clear
                            </button>
                        </>
                    ) : (
                        <button className="btn-clear" onClick={switchToEdit}>
                            ← Back to Edit
                        </button>
                    )}
                </div>

                <ToastContainer />
            </div>
        </motion.div>
    );
}

export default Compare;
