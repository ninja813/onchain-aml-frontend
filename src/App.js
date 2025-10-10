import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import './App.css';

function App() {
  return (
    <div className="App">
      <main className="App-main">
        <WalletConnect />
      </main>
    </div>
  );
}

export default App;
