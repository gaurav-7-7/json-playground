import React from 'react';
import { Button } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { MdOutlineDeleteOutline } from 'react-icons/md';
import './history.css';

function History({ history, isVisible, onSelect, onDelete, clearAllHistory, toggleHistory }) {

    const handleClick = (json) => {
        onSelect(json);
    };

    const handleClearAll = () => {
        clearAllHistory();
    };

    const closePanel = () => {
        toggleHistory();
    };

    const onDeleteItem = (e, index) => {
        e.stopPropagation(); // Prevent triggering the parent click
        onDelete(index);
    };

    return (
        <div className={`history-panel ${isVisible ? 'open' : 'close'}`}>
            <div>
                <h3>
                    <span className="close-icon" onClick={closePanel}>
                        <FaTimes />
                    </span>
                    History
                </h3>
            </div>
            <div className="list-container">
                {history.length === 0 ? (
                    <div className="empty-history">
                        <p>No history yet</p>
                        <span>Validated JSON will appear here</span>
                    </div>
                ) : (
                    <ul>
                        {history.map((entry, index) => (
                            <li 
                                key={`history-${index}-${entry.timestamp}`} 
                                className="history-item-wrapper"
                            >
                                <div 
                                    className="history-item" 
                                    onClick={() => handleClick(entry.json)}
                                >
                                    <span className="json">{entry.json}</span>
                                </div>
                                <div className="meta">
                                    <span 
                                        className="delete-icon" 
                                        onClick={(e) => onDeleteItem(e, index)}
                                        title="Delete this entry"
                                    >
                                        <MdOutlineDeleteOutline />
                                    </span>
                                    <span className="timestamp">{entry.timestamp}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {history.length > 0 && (
                <div className="clearBtn-container">
                    <Button className="btn-clearAll" onClick={handleClearAll}>
                        Clear All
                    </Button>
                </div>
            )}
        </div>
    );
}

export default History;
