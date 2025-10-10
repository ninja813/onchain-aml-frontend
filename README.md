# AML User Interface

This is the user-facing React application for wallet connection and off-chain signature.

## Features

- Wallet connection via WalletConnect
- Manual off-chain signature request
- Backend integration for signature submission
- Clean, simple interface

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. The application will run on `http://localhost:3000` (or next available port)

## Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect via WalletConnect
2. **Request Signature**: Click "Request Signature" to get off-chain signature
3. **Sign Message**: Wallet will prompt for signature
4. **Automatic Backend**: Signature is automatically sent to backend

## Backend Integration

- Connects to backend at `http://localhost:3000`
- Automatically sends signature data to backend
- Real-time status monitoring

## Deployment

Build for production:
```bash
npm run build
```

Deploy the `build` folder to your hosting service.
