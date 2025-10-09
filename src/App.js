import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import './App.css';

function App() {
  const [provider, setProvider] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  return (
    <div className="App">
      <main className="App-main">
        <WalletConnect 
          setProvider={setProvider}
          setWalletAddress={setWalletAddress}
        />
      </main>
    </div>
  );
}

export default App;
