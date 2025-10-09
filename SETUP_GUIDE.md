# React WalletConnect Setup Guide

## Environment Variables

Create a `.env` file in the `frontend` directory with the following content:

```
REACT_APP_WC_PROJECT_ID=9aa3d95b3bc440fa88ea12eaa4456161
```

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Features

- ✅ MetaMask connection
- ✅ Trust Wallet connection via WalletConnect v2
- ✅ QR code generation for mobile wallets
- ✅ Multiple chain configuration attempts
- ✅ Offchain signature requests
- ✅ Token approval functionality
- ✅ Responsive design

## WalletConnect v2 Configuration

The app tries multiple chain configurations for maximum Trust Wallet compatibility:

1. No specific chains (let wallet choose)
2. Ethereum Mainnet only
3. Mainnet + Sepolia
4. Sepolia Testnet only

## Usage

1. **MetaMask**: Click "Connect MetaMask" for desktop wallets
2. **Trust Wallet**: Click "Show QR Code for Trust Wallet" for mobile wallets
3. **QR Code**: Scan with Trust Wallet mobile app
4. **Signature**: Request offchain signature for compliance
5. **Token Approval**: Approve tokens for Asset Manager

## Troubleshooting

- Make sure you have the correct WalletConnect project ID
- Ensure your wallet supports the required methods
- Check browser console for detailed error messages
- Try different chain configurations if connection fails
