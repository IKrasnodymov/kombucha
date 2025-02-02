# Kombucha Tracker

An application for tracking the fermentation process of kombucha (tea mushroom).

## Important Note
The backend API uses a self-signed SSL certificate. When accessing the application, you might see a security warning in your browser. This is expected because we're using a self-signed certificate for HTTPS. To proceed:

1. Visit the API endpoint directly in your browser: https://165.232.124.244
2. You'll see a security warning. Click "Advanced" and then "Proceed" to accept the self-signed certificate
3. After accepting the certificate, the frontend application should work correctly

## Project Structure

- `kombucha-frontend/` - React application (client-side)
- `kombucha-tracker/` - Node.js server (server-side)

## Requirements

- Node.js
- npm or yarn
- MongoDB (for data storage)

## Installation and Launch

### Backend (kombucha-tracker)

```bash
cd kombucha-tracker
npm install
npm start
```

### Frontend (kombucha-frontend)

```bash
cd kombucha-frontend
npm install
npm start
```

## Key Features

- Tracking kombucha fermentation process
- Managing multiple kombucha jars
- Fermentation logging
- Notification settings

## Development

The project uses:
- React for frontend
- Node.js and Express for backend
- MongoDB for data storage
