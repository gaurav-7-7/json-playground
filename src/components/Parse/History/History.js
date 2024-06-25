import React from 'react';
import { Button } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa'
import './history.css'

function History({ history, isVisible, onSelect, clearAllHistory, toggleHistory }) {

    const handleClick = (json) => {
        onSelect(json);
    };

    const handleClearAll = () => {
        clearAllHistory();
    };

    const closePanel = () => {
        toggleHistory();
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
            <ul>
                {history.map((entry, index) => (
                    <span>
                        <li key={index} className="history-item" onClick={() => handleClick(entry.json)}>
                            <span className="json">{entry.json}</span>
                        </li>
                        <li>
                            <span className="timestamp">{entry.timestamp}</span>
                        </li>
                    </span>
                ))}
            </ul>
            <div className="clearBtn-container">
                <Button className="btn-clearAll" onClick={handleClearAll}>Clear All</Button>
            </div>
        </div>
    );
}

export default History;
