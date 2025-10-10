import React, { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import BackendControl from './components/BackendControl';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('user');

  // Check URL path to determine which interface to show
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/backend') {
      setCurrentView('backend');
    } else {
      setCurrentView('user');
    }
  }, []);

  return (
    <div className="App">
      <main className="App-main">
        {currentView === 'user' ? <WalletConnect /> : <BackendControl />}
      </main>
    </div>
  );
}

export default App;
