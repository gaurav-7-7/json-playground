/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Dropdown, Modal, Form, Badge, Tabs, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AceEditor from 'react-ace';
import { toast, ToastContainer } from 'react-toastify';
import { 
  FaPlay, 
  FaUndo, 
  FaCopy, 
  FaExchangeAlt, 
  FaCode, 
  FaCheck, 
  FaCog, 
  FaServer, 
  FaExternalLinkAlt,
  FaTerminal
} from 'react-icons/fa';

// Ace editor modes & theme
import 'brace/theme/merbivore_soft';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

import { 
  SUPPORTED_LANGUAGES, 
  executeCode, 
  checkPistonHealth, 
  getCustomPistonUrl, 
  setCustomPistonUrl 
} from '../../services/compilerService';

import './compiler.css';

const DEFAULT_LANG = SUPPORTED_LANGUAGES[0];

function Compiler() {
  const navigate = useNavigate();

  // Selected language state
  const [selectedLang, setSelectedLang] = useState(() => {
    const savedLangId = localStorage.getItem('compiler_last_lang');
    return SUPPORTED_LANGUAGES.find(l => l.id === savedLangId) || DEFAULT_LANG;
  });

  // Code state per language
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem(`compiler_code_${selectedLang.id}`);
    return saved !== null ? saved : selectedLang.defaultCode;
  });

  // Stdin state
  const [stdin, setStdin] = useState(() => {
    return localStorage.getItem('compiler_stdin') || '';
  });

  // Previous code snapshot for "Compare"
  const [previousSnapshot, setPreviousSnapshot] = useState(() => {
    return localStorage.getItem(`compiler_prev_${selectedLang.id}`) || '';
  });

  // Execution & Output state
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [activeRightTab, setActiveRightTab] = useState('output'); // 'output' | 'stdin'
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  // Runner Health & Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getCustomPistonUrl());
  const [enginePreference, setEnginePreference] = useState(() => {
    return localStorage.getItem('compiler_engine_pref') || 'auto';
  });
  const [healthStatus, setHealthStatus] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const editorRef = useRef(null);

  // Check health on mount
  useEffect(() => {
    performHealthCheck();
  }, []);

  // Update code when language changes
  const handleLanguageChange = (lang) => {
    // Save current code before switching
    localStorage.setItem(`compiler_code_${selectedLang.id}`, code);
    
    setSelectedLang(lang);
    localStorage.setItem('compiler_last_lang', lang.id);

    const savedCodeForNewLang = localStorage.getItem(`compiler_code_${lang.id}`);
    setCode(savedCodeForNewLang !== null ? savedCodeForNewLang : lang.defaultCode);
    
    const prevSnap = localStorage.getItem(`compiler_prev_${lang.id}`) || '';
    setPreviousSnapshot(prevSnap);
    setOutput(null);
  };

  // Persist code on edit
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    localStorage.setItem(`compiler_code_${selectedLang.id}`, newCode);
  };

  // Persist stdin
  const handleStdinChange = (newStdin) => {
    setStdin(newStdin);
    localStorage.setItem('compiler_stdin', newStdin);
  };

  // Health check handler
  const performHealthCheck = async (customUrl) => {
    setIsCheckingHealth(true);
    const res = await checkPistonHealth(customUrl || serverUrlInput);
    setHealthStatus(res);
    setIsCheckingHealth(false);
  };

  // Execute Code
  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveRightTab('output');

    // Snapshot before running so user can compare attempts
    if (!previousSnapshot && code !== selectedLang.defaultCode) {
      setPreviousSnapshot(code);
      localStorage.setItem(`compiler_prev_${selectedLang.id}`, code);
    }

    try {
      const result = await executeCode({
        languageId: selectedLang.id,
        code,
        stdin,
        preferredEngine: enginePreference
      });

      setOutput(result);
      if (result.hasError) {
        toast.error(`Execution finished with errors (exit code ${result.exitCode})`, {
          position: "top-right",
          autoClose: 2500
        });
      } else {
        toast.success(`Executed in ${result.executionTimeMs}ms via ${result.engine}`, {
          position: "top-right",
          autoClose: 2000
        });
      }
    } catch (err) {
      setOutput({
        stdout: '',
        stderr: err.message || 'Execution failed',
        exitCode: 1,
        executionTimeMs: 0,
        engine: 'error',
        hasError: true
      });
      toast.error('Execution failed: ' + err.message, { position: "top-right" });
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter to run
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, stdin, selectedLang, enginePreference, isRunning]);

  // Reset to default template
  const handleResetTemplate = () => {
    if (window.confirm(`Reset ${selectedLang.name} code to default starter template?`)) {
      setCode(selectedLang.defaultCode);
      localStorage.setItem(`compiler_code_${selectedLang.id}`, selectedLang.defaultCode);
      setOutput(null);
      toast.info('Template reset', { position: 'top-right', autoClose: 1500 });
    }
  };

  // Snapshot current code for future comparison
  const handleSnapshotCode = () => {
    setPreviousSnapshot(code);
    localStorage.setItem(`compiler_prev_${selectedLang.id}`, code);
    toast.success('Current version snapshotted for Compare!', { position: 'top-right', autoClose: 2000 });
  };

  // Send to Compare: Put previous code on Left, current code on Right
  const handleSendToCompare = () => {
    const leftContent = previousSnapshot || selectedLang.defaultCode;
    const rightContent = code;

    localStorage.setItem('compareInputOne', leftContent);
    localStorage.setItem('compareInputTwo', rightContent);
    toast.info('Redirecting to Compare...', { position: 'top-right', autoClose: 1500 });
    setTimeout(() => {
      navigate('/compare');
    }, 300);
  };

  // Send Output to Parse
  const handleSendToParse = () => {
    if (!output || !output.stdout) {
      toast.warning('No output to send to Parse', { position: 'top-right', autoClose: 2000 });
      return;
    }

    const trimmed = output.stdout.trim();
    localStorage.setItem('lastJsonInput', trimmed);
    toast.info('Redirecting to Parse...', { position: 'top-right', autoClose: 1500 });
    setTimeout(() => {
      navigate('/parse');
    }, 300);
  };

  // Copy code helper
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy output helper
  const handleCopyOutput = () => {
    if (!output) return;
    const textToCopy = output.stdout || output.stderr || '';
    navigator.clipboard.writeText(textToCopy);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  // Save Settings Modal
  const handleSaveSettings = () => {
    setCustomPistonUrl(serverUrlInput);
    localStorage.setItem('compiler_engine_pref', enginePreference);
    setShowSettings(false);
    toast.success('Settings saved', { position: 'top-right', autoClose: 2000 });
    performHealthCheck(serverUrlInput);
  };

  // Check if output looks like JSON
  const isOutputJson = () => {
    if (!output || !output.stdout) return false;
    const trimmed = output.stdout.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  };

  return (
    <div className="compiler-container">
      <ToastContainer theme="dark" />

      {/* Top Action & Navigation Bar */}
      <div className="compiler-toolbar">
        <div className="toolbar-left">
          {/* Language Selector Dropdown */}
          <Dropdown className="lang-dropdown">
            <Dropdown.Toggle id="dropdown-language" className="lang-toggle-btn">
              <span className="lang-icon">{selectedLang.icon}</span>
              <span className="lang-name">{selectedLang.name}</span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="lang-dropdown-menu">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <Dropdown.Item
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang)}
                  active={selectedLang.id === lang.id}
                  className="lang-item"
                >
                  <span className="lang-item-icon">{lang.icon}</span>
                  <span className="lang-item-name">{lang.name}</span>
                  {selectedLang.id === lang.id && <FaCheck className="lang-check" />}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          {/* Engine Status Badge / Quick Settings Trigger */}
          <button 
            className="engine-status-pill" 
            onClick={() => { setShowSettings(true); performHealthCheck(); }}
            title="Click to configure Runner engine"
          >
            <span className={`status-dot ${healthStatus?.ok ? 'online' : 'fallback'}`}></span>
            <span className="engine-label">
              {healthStatus?.ok ? `Local Piston (${healthStatus.latencyMs}ms)` : 'Cloud Runner'}
            </span>
            <FaCog className="engine-cog-icon" />
          </button>
        </div>

        {/* Center / Right Action Buttons */}
        <div className="toolbar-right">
          <Button
            variant="outline-secondary"
            size="sm"
            className="btn-toolbar-action"
            onClick={handleResetTemplate}
            title="Reset code to default template"
          >
            <FaUndo className="me-1" /> Reset
          </Button>

          <Button
            variant="outline-secondary"
            size="sm"
            className="btn-toolbar-action"
            onClick={handleCopyCode}
            title="Copy source code"
          >
            {copiedCode ? <FaCheck className="me-1 text-success" /> : <FaCopy className="me-1" />}
            {copiedCode ? 'Copied' : 'Copy'}
          </Button>

          <Button
            variant="outline-info"
            size="sm"
            className="btn-toolbar-action btn-compare-action"
            onClick={handleSendToCompare}
            title="Compare previous attempt with current code in Compare tab"
          >
            <FaExchangeAlt className="me-1" /> Compare Attempts
          </Button>

          {/* Primary Run Button */}
          <Button
            variant="success"
            size="sm"
            className="btn-run"
            onClick={handleRun}
            disabled={isRunning}
            title="Run Code (Cmd + Enter)"
          >
            <FaPlay className={`me-2 ${isRunning ? 'spinning' : ''}`} />
            {isRunning ? 'Running...' : 'Run Code'}
            <span className="shortcut-hint">⌘↵</span>
          </Button>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="compiler-body">
        {/* Left Side: Editor */}
        <div className="compiler-editor-panel">
          <div className="panel-header">
            <span className="panel-title">
              <FaCode className="me-2 text-info" />
              Source Code ({selectedLang.name})
            </span>
            <div className="panel-header-actions">
              <button 
                className="btn-snapshot" 
                onClick={handleSnapshotCode}
                title="Save current code snapshot as 'Previous Attempt' for comparison"
              >
                Snapshot for Compare
              </button>
            </div>
          </div>
          <div className="editor-wrapper">
            <AceEditor
              ref={editorRef}
              mode={selectedLang.aceMode}
              theme="merbivore_soft"
              value={code}
              onChange={handleCodeChange}
              name="compiler-ace-editor"
              fontSize={14}
              showPrintMargin={false}
              showGutter={true}
              highlightActiveLine={true}
              width="100%"
              height="100%"
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
                showLineNumbers: true,
                tabSize: 2,
                useWorker: false
              }}
            />
          </div>
        </div>

        {/* Right Side: Stdin / Terminal Output */}
        <div className="compiler-output-panel">
          <div className="output-panel-nav">
            <button
              className={`output-nav-tab ${activeRightTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('output')}
            >
              <FaTerminal className="me-2" />
              Output & Console
              {output && (
                <Badge bg={output.hasError ? 'danger' : 'success'} className="ms-2">
                  {output.hasError ? 'Err' : 'OK'}
                </Badge>
              )}
            </button>
            <button
              className={`output-nav-tab ${activeRightTab === 'stdin' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('stdin')}
            >
              Input (stdin)
              {stdin.trim() && <span className="tab-indicator">●</span>}
            </button>
          </div>

          <div className="output-content-area">
            {activeRightTab === 'stdin' ? (
              <div className="stdin-view">
                <div className="stdin-header-desc">
                  Provide standard input passed to your script (e.g. <code>cin</code>, <code>sys.stdin</code>, <code>Scanner</code>, or JSON input):
                </div>
                <textarea
                  className="stdin-textarea"
                  value={stdin}
                  onChange={(e) => handleStdinChange(e.target.value)}
                  placeholder="Enter input here..."
                />
              </div>
            ) : (
              <div className="terminal-view">
                {/* Output Stats Bar */}
                {output && (
                  <div className="output-meta-bar">
                    <div className="meta-left">
                      <span className={`status-tag ${output.hasError ? 'error' : 'success'}`}>
                        Exit Code: {output.exitCode}
                      </span>
                      <span className="runtime-tag">
                        ⏱️ {output.executionTimeMs} ms
                      </span>
                      <span className="engine-tag">
                        Engine: {output.engine}
                      </span>
                    </div>
                    <div className="meta-right">
                      {isOutputJson() && (
                        <button 
                          className="btn-send-parse" 
                          onClick={handleSendToParse}
                          title="Open formatted output in Parse tab"
                        >
                          Send to Parse <FaExternalLinkAlt className="ms-1" size={10} />
                        </button>
                      )}
                      <button 
                        className="btn-copy-output" 
                        onClick={handleCopyOutput}
                        title="Copy output text"
                      >
                        {copiedOutput ? <FaCheck className="text-success" /> : <FaCopy />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Terminal Body */}
                <div className="terminal-screen">
                  {isRunning ? (
                    <div className="terminal-placeholder running">
                      <div className="spinner-border text-info spinner-border-sm me-2" role="status"></div>
                      Executing script on runner...
                    </div>
                  ) : output ? (
                    <>
                      {output.stdout && (
                        <pre className="stdout-text">{output.stdout}</pre>
                      )}
                      {output.stderr && (
                        <pre className="stderr-text">{output.stderr}</pre>
                      )}
                      {!output.stdout && !output.stderr && (
                        <div className="terminal-placeholder">
                          (Program exited with code {output.exitCode} with empty output)
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="terminal-placeholder empty">
                      Click <strong>"Run Code"</strong> or press <code>⌘ + Enter</code> to compile and execute your code.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Runner Settings Modal */}
      <Modal 
        show={showSettings} 
        onHide={() => setShowSettings(false)} 
        centered
        dialogClassName="compiler-settings-modal"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>
            <FaServer className="me-2 text-info" /> Compiler Engine Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="text-light">Execution Preference</Form.Label>
              <Form.Select 
                value={enginePreference} 
                onChange={(e) => setEnginePreference(e.target.value)}
                className="bg-dark text-light border-secondary"
              >
                <option value="auto">Auto (Local Piston with Cloud Fallback)</option>
                <option value="piston">Local Piston Only (Strict)</option>
                <option value="wandbox">Cloud Fallback Only (Wandbox)</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Auto mode attempts your local Docker container first, and seamlessly uses the cloud fallback if Docker is off.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="text-light">Local / Custom Piston URL</Form.Label>
              <div className="input-group">
                <Form.Control
                  type="text"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder="http://localhost:2000"
                  className="bg-dark text-light border-secondary"
                />
                <Button 
                  variant="outline-info" 
                  onClick={() => performHealthCheck(serverUrlInput)}
                  disabled={isCheckingHealth}
                >
                  {isCheckingHealth ? 'Testing...' : 'Test Ping'}
                </Button>
              </div>
            </Form.Group>

            {/* Health Test Result */}
            {healthStatus && (
              <div className={`health-callout ${healthStatus.ok ? 'success' : 'warning'}`}>
                {healthStatus.ok ? (
                  <div>
                    <strong>🟢 Connected to Piston!</strong>
                    <div>Latency: {healthStatus.latencyMs} ms</div>
                    <div>Installed Runtimes: {healthStatus.runtimesCount}</div>
                  </div>
                ) : (
                  <div>
                    <strong>🟡 Piston Not Reachable:</strong>
                    <div>{healthStatus.error}</div>
                    <div className="mt-1 small text-muted">
                      No worries! The app will automatically use the free Cloud runner until you start Docker.
                    </div>
                  </div>
                )}
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSettings(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSaveSettings}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Compiler;
