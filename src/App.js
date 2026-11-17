import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header/Header';
import Compare from './components/Compare/Compare';
import Parse from './components/Parse/Parse';
import Share from './components/Share/Share';
import Compiler from './components/Compiler/Compiler';
import About from './components/About/About';
import './App.css';

// Lazy load Sprint component so zero bundle footprint for casual visitors
const Sprint = lazy(() => import('./components/Sprint/Sprint'));

function AppContent() {
  const [showSprintOverlay, setShowSprintOverlay] = useState(false);

  return (
    <>
      <Header onToggleSprint={() => setShowSprintOverlay((prev) => !prev)} />

      {showSprintOverlay && (
        <Suspense fallback={null}>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, overflowY: 'auto' }}>
            <Sprint onClose={() => setShowSprintOverlay(false)} />
          </div>
        </Suspense>
      )}

      <Routes>
        <Route path="/" element={<About onToggleSprint={() => setShowSprintOverlay(true)} />} />
        <Route path="/parse" element={<Parse />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/compile" element={<Compiler />} />
        <Route path="/share" element={<Share />} />
        <Route path="/share/:roomKey" element={<Share />} />
        <Route
          path="/sprint"
          element={
            <Suspense fallback={null}>
              <Sprint />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
