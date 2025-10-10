import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import QRCode from "react-qr-code";

export default function WalletConnect() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddressLocal] = useState(null);
  const [networkName, setNetworkName] = useState(null);
  const [balance, setBalance] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUri, setQrCodeUri] = useState("");
  const [wcProvider, setWcProvider] = useState(null);
  const [qrTimeout, setQrTimeout] = useState(null);
  const [copied, setCopied] = useState(false);
  const [signatureRequest, setSignatureRequest] = useState(null);
  const [signatureInterval, setSignatureInterval] = useState(null);
  const [pollingPaused, setPollingPaused] = useState(false);

  // Backend API configuration
  const BACKEND_URL = "https://aml-manager-backend.onrender.com";

  // ----------------------------
  // Backend Connection Functions
  // ----------------------------
  async function connectToBackend() {
    try {
      console.log("Connecting to backend:", BACKEND_URL);
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Backend connected successfully:", data);
        return true;
      } else {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to connect to backend:", error);
      return false;
    }
  }

  async function sendWalletStatusToBackend(walletAddress, network) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wallet/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          network,
          status: 'connected',
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Wallet status sent to backend successfully:", data);
        return data;
      } else {
        throw new Error(`Failed to send wallet status: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to send wallet status to backend:", error);
      throw error;
    }
  }

  const handleSignatureRequest = useCallback(async (request) => {
    if (!wcProvider || !connected) {
      console.log("Wallet not connected, cannot handle signature request");
      return;
    }

    try {
      console.log("Handling signature request:", request);
      
      // Check if provider is connected
      if (!wcProvider.connected) {
        console.log("WalletConnect provider not connected, attempting to reconnect...");
        await wcProvider.enable();
      }
      
      // Create the message to sign
      const message = `Off-chain signature request from backend control at ${new Date().toISOString()}`;
      
      console.log("Requesting signature from wallet...");
      console.log("Message:", message);
      console.log("Wallet address:", walletAddress);
      console.log("Provider connected:", wcProvider.connected);
      
      // Try multiple signature methods
      let signature;
      let methodUsed = '';
      
      try {
        console.log("Attempting WalletConnect personal_sign...");
        signature = await wcProvider.request({
          method: 'personal_sign',
          params: [message, walletAddress], // message, address
        });
        methodUsed = 'personal_sign';
        console.log("WalletConnect personal_sign successful");
      } catch (wcError) {
        console.log("WalletConnect personal_sign failed, trying eth_sign:", wcError);
        
        try {
          console.log("Attempting WalletConnect eth_sign...");
          // Convert message to hex
          const messageHex = '0x' + Buffer.from(message, 'utf8').toString('hex');
          signature = await wcProvider.request({
            method: 'eth_sign',
            params: [walletAddress, messageHex],
          });
          methodUsed = 'eth_sign';
          console.log("WalletConnect eth_sign successful");
        } catch (ethError) {
          console.log("WalletConnect eth_sign failed, trying ethers.js:", ethError);
          
          try {
            console.log("Attempting ethers.js signMessage...");
            const provider = new ethers.BrowserProvider(wcProvider);
            const signer = await provider.getSigner();
            signature = await signer.signMessage(message);
            methodUsed = 'ethers_signMessage';
            console.log("ethers.js signMessage successful");
          } catch (ethersError) {
            console.log("All signature methods failed:", ethersError);
            throw ethersError;
          }
        }
      }

      console.log("Signature received:", signature);
      console.log("Method used:", methodUsed);
      
      // Mark signature as completed in backend
      await fetch(`${BACKEND_URL}/api/wallet/signature-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setSignatureRequest(null);
      alert(`✅ Signature completed successfully using ${methodUsed}!`);
      
    } catch (error) {
      console.error("Failed to handle signature request:", error);
      alert("❌ Failed to sign message: " + error.message);
      
      // Mark signature as failed in backend
      try {
        await fetch(`${BACKEND_URL}/api/wallet/signature-completed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (backendError) {
        console.error("Failed to mark signature as completed:", backendError);
      }
    }
  }, [wcProvider, connected, walletAddress, BACKEND_URL]);

  const checkForSignatureRequest = useCallback(async () => {
    // Don't poll if we already have a pending signature request
    if (signatureRequest && signatureRequest.status === 'pending') {
      console.log("⏸️ Already processing signature request, skipping poll...");
      return;
    }

    // Don't poll if paused due to rate limiting
    if (pollingPaused) {
      console.log("⏸️ Polling paused due to rate limiting, skipping poll...");
      return;
    }

    try {
      console.log("🔍 Polling for signature request...");
      const response = await fetch(`${BACKEND_URL}/api/wallet/signature-request`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📋 Signature request response:", data);
        if (data && data.status === 'pending') {
          console.log("✅ Signature request detected, handling...");
          setSignatureRequest(data);
          await handleSignatureRequest(data);
        } else {
          console.log("⏳ No pending signature request");
        }
      } else if (response.status === 429) {
        console.log("⏸️ Rate limited, pausing polling for 30 seconds...");
        setPollingPaused(true);
        // Resume polling after 30 seconds
        setTimeout(() => {
          setPollingPaused(false);
          console.log("🔄 Resuming polling after rate limit cooldown...");
        }, 30000);
      } else {
        console.log("❌ Failed to fetch signature request:", response.status);
      }
    } catch (error) {
      console.error("❌ Failed to check for signature request:", error);
    }
  }, [handleSignatureRequest, BACKEND_URL, signatureRequest, pollingPaused]);

  // Start polling when wallet is connected
  useEffect(() => {
    if (connected && wcProvider && !signatureInterval) {
      console.log("🚀 Starting automatic signature request polling...");
      const interval = setInterval(() => {
        checkForSignatureRequest();
      }, 10000); // Check every 10 seconds to avoid rate limiting
      setSignatureInterval(interval);
    }
    
    // Cleanup on unmount or when disconnected
    if (!connected && signatureInterval) {
      console.log("🛑 Stopping signature request polling...");
      clearInterval(signatureInterval);
      setSignatureInterval(null);
    }
    
    return () => {
      if (signatureInterval) {
        clearInterval(signatureInterval);
        setSignatureInterval(null);
      }
    };
  }, [connected, wcProvider, checkForSignatureRequest, signatureInterval]);

  // Connect via WalletConnect (Trust Wallet)
  // ----------------------------
  async function connectWalletConnect() {
    if (!process.env.REACT_APP_WC_PROJECT_ID) {
      alert("Missing REACT_APP_WC_PROJECT_ID in environment. Please set it in your .env file.");
      return;
    }
  
    setLoading(true);
    
    // Cleanup any previous instances
    cleanupWalletConnect();
    
    // Try different chain configurations for maximum Trust Wallet compatibility
    const chainConfigs = [
      { chains: [], name: "No specific chains (let wallet choose)" },
      { chains: [1], name: "Ethereum Mainnet" },
      { chains: [1, 11155111], name: "Mainnet + Sepolia" },
      { chains: [11155111], name: "Sepolia Testnet Only" }
    ];
    
    for (let i = 0; i < chainConfigs.length; i++) {
      try {
        console.log(`Trying configuration ${i + 1}: ${chainConfigs[i].name}`);
        await tryWalletConnectConnection(chainConfigs[i]);
        return; // Success, exit the function
      } catch (error) {
        console.log(`Configuration ${i + 1} failed:`, error.message);
        if (i === chainConfigs.length - 1) {
          // Last attempt failed, throw the error
          throw error;
        }
        // Continue to next configuration
      }
    }
  }

  async function tryWalletConnectConnection(config) {
    const rpcMap = {
      1: "https://mainnet.infura.io/v3/f6527979b9684449bcc93f9311c64b04", // Ethereum Mainnet
      5: "https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID", // Ethereum Goerli
      11155111: "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID" // Ethereum Sepolia
    };
  
    const initConfig = {
      projectId: process.env.REACT_APP_WC_PROJECT_ID,
      showQrModal: false, // We'll handle QR display ourselves
      methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData_v4", "eth_sign"],
      metadata: {
        name: "AML Asset Manager",
        description: "AML Asset Manager Demo",
        url: window.location.origin,
        icons: ["https://avatars.githubusercontent.com/u/37784886"]
      }
    };
  
    // Only add chains and rpcMap if chains are specified
    if (config.chains.length > 0) {
      initConfig.chains = config.chains;
      initConfig.rpcMap = config.chains.reduce((acc, chainId) => {
        if (rpcMap[chainId]) {
          acc[chainId] = rpcMap[chainId];
        }
        return acc;
      }, {});
    }
  
    const wcProvider = await EthereumProvider.init(initConfig);
  
    // Set up event listeners
    wcProvider.on("display_uri", (uri) => {
      console.log("QR Code URI:", uri);
      setQrCodeUri(uri);
      setShowQR(true);
  
      // Set timeout for QR code (5 minutes)
      const timeout = setTimeout(() => {
        console.log("QR code expired");
        setShowQR(false);
        setQrCodeUri("");
      }, 5 * 60 * 1000); // 5 minutes
  
      setQrTimeout(timeout);
    });
  
    wcProvider.on("connect", (connectInfo) => {
      console.log("WalletConnect connected:", connectInfo);
      setShowQR(false);
      if (qrTimeout) {
        clearTimeout(qrTimeout);
        setQrTimeout(null);
      }
  
      // Log session details
      console.log("Session:", connectInfo.params[0]);
    });
  
    wcProvider.on("disconnect", (error) => {
      console.log("WalletConnect disconnected:", error);
      setConnected(false);
      setWcProvider(null);
      setShowQR(false);
    });
  
    wcProvider.on("session_delete", () => {
      console.log("WalletConnect session deleted");
      setConnected(false);
      setWcProvider(null);
      setShowQR(false);
    });
  
    wcProvider.on("session_event", (event) => {
      console.log("WalletConnect session event:", event);
    });
  
    wcProvider.on("session_update", (event) => {
      console.log("WalletConnect session update:", event);
    });
  
    setWcProvider(wcProvider);
    await wcProvider.enable();
  
    // ✅ FIX: Use BrowserProvider so we have signer support
    const provider = new ethers.BrowserProvider(wcProvider);
  
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(address);
  
    console.log("✅ Connected via WalletConnect:", address);
    console.log("Connected to network:", network.name, "Chain ID:", network.chainId);
  
    // Handle mainnet connections
    if (network.chainId === 1n) {
      console.log('Connected to mainnet via WalletConnect.');
      setWalletAddressLocal(address);
      setNetworkName('mainnet');
      setBalance(ethers.formatEther(balance));
      setConnected(true);
      setShowQR(false);
  
      // Send wallet status to backend
      try {
        await connectToBackend();
        await sendWalletStatusToBackend(address, 'mainnet');
      } catch (error) {
        console.error("Failed to send wallet status to backend:", error);
      }
  
      return;
    } else if (network.chainId === 11155111n) {
      console.log('Connected to Sepolia testnet via WalletConnect.');
      setWalletAddressLocal(address);
      setNetworkName(network.name);
      setBalance(ethers.formatEther(balance));
      setConnected(true);
      setShowQR(false);
  
      // Send wallet status to backend
      try {
        await connectToBackend();
        await sendWalletStatusToBackend(address, 'sepolia');
      } catch (error) {
        console.error("Failed to send wallet status to backend:", error);
      }
  
      return;
    } else if (network.chainId !== 5n) {
      console.warn('Connected to unsupported network via WalletConnect. This app only supports Sepolia testnet.');
      alert('You connected to an unsupported network. This app only works with Sepolia testnet. Please switch to Sepolia testnet in your wallet.');
      setLoading(false);
      return;
    }
  
    setWalletAddressLocal(address);
    setNetworkName(network.name);
    setBalance(ethers.formatEther(balance));
    setConnected(true);
    setShowQR(false);
  }
  // ----------------------------
  // Copy WalletConnect URI
  // ----------------------------
  async function copyWalletConnectURI() {
    if (!qrCodeUri) {
      alert('No WalletConnect URI available');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(qrCodeUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy WalletConnect URI:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = qrCodeUri;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }



  // ----------------------------
  // Cleanup WalletConnect
  // ----------------------------
  function cleanupWalletConnect() {
    if (wcProvider) {
      wcProvider.disconnect();
      setWcProvider(null);
    }
    if (qrTimeout) {
      clearTimeout(qrTimeout);
      setQrTimeout(null);
    }
    setShowQR(false);
    setQrCodeUri("");
  }

  // ----------------------------
  // Disconnect Wallet
  // ----------------------------
  function disconnectWallet() {
    cleanupWalletConnect();
    if (wcProvider) {
      wcProvider.disconnect();
    }
    if (qrTimeout) {
      clearTimeout(qrTimeout);
      setQrTimeout(null);
    }
    
    // Clear signature request polling
    if (signatureInterval) {
      clearInterval(signatureInterval);
      setSignatureInterval(null);
    }
    setSignatureRequest(null);
    setPollingPaused(false);
    
    setWalletAddressLocal(null);
    setNetworkName(null);
    setBalance(null);
    setConnected(false);
    setShowQR(false);
    setQrCodeUri("");
    setWcProvider(null);
    setCopied(false);
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
              <h1 className="dashboard-title">Asset Manager</h1>
              <p className="dashboard-subtitle">Enterprise Compliance Platform</p>
            </div>
          </div>
          <div className="header-actions">
            {connected && (
              <div className="connection-indicator">
                <div className="status-dot"></div>
                <span className="status-text">Connected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        {!showQR && !connected && (
          <>
            {/* Welcome Section */}
            <div className="welcome-section">
              <h2 className="welcome-title">Welcome to Asset Manager</h2>
              <p className="welcome-description">
                Secure compliance verification for digital asset transfers with enterprise-grade security and real-time monitoring.
              </p>
            </div>
          </>
        )}

      {showQR ? (
        <div className="space-y-4">
          <div className="text-center">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <QRCode value={qrCodeUri} size={200} />
            </div>
            
            {/* Copy WalletConnect URI Button */}
            <div className="mt-4">
              <button 
                onClick={copyWalletConnectURI}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? '✅ URI Copied!' : '📋 Copy WalletConnect URI'}
              </button>
            </div>
          </div>
        </div>
      ) : connected ? (
        <div className="wallet-dashboard">
          {/* Wallet Status Card */}
          <div className="wallet-status-card">
            <div className="wallet-header">
              <div className="wallet-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="wallet-info">
                <h3 className="wallet-title">Wallet Connected</h3>
                <p className="wallet-address">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
              </div>
              <div className="connection-status">
                <div className="status-indicator"></div>
                <span className="status-text">Active</span>
              </div>
            </div>

            <div className="wallet-details">
              <div className="detail-row">
                <div className="detail-label">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  Network
                </div>
                <div className="detail-value">
                  <span className="network-badge">{networkName}</span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-label">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Balance
                </div>
                <div className="detail-value">
                  <span className="balance-amount">{balance ? `${parseFloat(balance).toFixed(6)} ETH` : "Loading..."}</span>
                </div>
              </div>
            </div>

            {/* Polling Status */}
            {pollingPaused && (
              <div className="polling-status">
                <div className="status-icon">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="status-content">
                  <div className="status-title">Polling Paused</div>
                  <div className="status-description">Rate limited - will resume in 30 seconds</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="wallet-actions">
              <button 
                onClick={disconnectWallet} 
                className="disconnect-button"
              >
                <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Disconnect Wallet</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="connect-section">
          <div className="connect-content">
            <h3 className="connect-title">Connect Your Wallet</h3>
            <p className="connect-description">
              Connect your wallet to access the Asset Manager platform and begin secure compliance verification.
            </p>
            
            <button 
              onClick={connectWalletConnect} 
              disabled={loading}
              className="connect-button"
            >
              {loading ? (
                <>
                  <svg className="loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
