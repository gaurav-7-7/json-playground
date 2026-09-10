import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header/Header';
import Compare from './components/Compare/Compare';
import Parse from './components/Parse/Parse';
import Share from './components/Share/Share';
import About from './components/About/About';
import './App.css';

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<About />} />
        <Route path="/parse" element={<Parse />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/share" element={<Share />} />
        <Route path="/share/:roomKey" element={<Share />} />
      </Routes>
    </Router>
  );
}

export default App;
