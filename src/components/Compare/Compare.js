import React, { useState, useCallback } from 'react';
import { diffLines } from 'diff';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './compare.css';

function Compare() {
    const [inputOne, setInputOne] = useState('');
    const [inputTwo, setInputTwo] = useState('');
    const [compared, setCompared] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [diffResult, setDiffResult] = useState([]);
    
    const textareaHeight = expanded ? '30rem' : '17rem';

    const handleInputOneChange = (event) => {
        setInputOne(event.target.value);
        setCompared(false);
    };

    const handleInputTwoChange = (event) => {
        setInputTwo(event.target.value);
        setCompared(false);
    };

    const expandWindow = () => {
        setExpanded(!expanded);
    };

    const compareInputs = useCallback(() => {
        if (!inputOne.trim() && !inputTwo.trim()) {
            alert('Please enter text in both fields to compare.');
            return;
        }
        
        const diff = diffLines(inputOne, inputTwo);
        setDiffResult(diff);
        setCompared(true);
    }, [inputOne, inputTwo]);

    const renderLineNumbers = (text) => {
        const lines = text.split('\n');
        return lines.map((_, index) => (
            <div key={index} className="line-number">
                {index + 1}
            </div>
        ));
    };

    const renderDiffSide = (isLeft) => {
        if (!compared) {
            const text = isLeft ? inputOne : inputTwo;
            return (
                <div className="diff-preview">
                    <div className="line-numbers-column">
                        {renderLineNumbers(text)}
                    </div>
                    <div className="text-content">
                        {text || <span className="placeholder-text">Enter text...</span>}
                    </div>
                </div>
            );
        }

        let lineNumber = 1;
        const content = [];

        diffResult.forEach((part, index) => {
            const shouldShow = isLeft ? !part.added : !part.removed;
            
            if (shouldShow) {
                const lines = part.value.split('\n');
                if (lines[lines.length - 1] === '') lines.pop();
                
                lines.forEach((line, lineIndex) => {
                    const lineClass = part.removed && isLeft ? 'removed-line' : 
                                     part.added && !isLeft ? 'added-line' : 
                                     'unchanged-line';

                    content.push(
                        <div key={`${index}-${lineIndex}`} className={`diff-line ${lineClass}`}>
                            <div className="line-number-display">
                                {lineNumber}
                            </div>
                            <div className="line-content">
                                {line}
                            </div>
                        </div>
                    );
                    lineNumber++;
                });
            }
        });

        return <div className="diff-result-container">{content}</div>;
    };

    return (
        <div className="compare-wrapper">
            <div className="compare-card">
                <button 
                    onClick={expandWindow}
                    className="expand-button"
                >
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    <span className="expand-text">{expanded ? 'Collapse' : 'Expand'}</span>
                </button>
                
                <h3 className="compare-heading">
                    Check Difference
                </h3>
                
                <div className="textareas-container">
                    {!compared ? (
                        <>
                            <textarea
                                value={inputOne}
                                onChange={handleInputOneChange}
                                placeholder="Enter first text..."
                                className="diff-textarea"
                                style={{ height: textareaHeight }}
                            />
                            <textarea
                                value={inputTwo}
                                onChange={handleInputTwoChange}
                                placeholder="Enter second text..."
                                className="diff-textarea"
                                style={{ height: textareaHeight }}
                            />
                        </>
                    ) : (
                        <>
                            <div className="diff-panel" style={{ height: textareaHeight }}>
                                {renderDiffSide(true)}
                            </div>
                            <div className="diff-panel" style={{ height: textareaHeight }}>
                                {renderDiffSide(false)}
                            </div>
                        </>
                    )}
                </div>
                
                <div className="button-container">
                    <button 
                        onClick={compareInputs}
                        className="btn-compare"
                    >
                        Compare
                    </button>
                    {compared && (
                        <button 
                            onClick={() => {
                                setCompared(false);
                                setDiffResult([]);
                            }}
                            className="btn-reset"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Compare;