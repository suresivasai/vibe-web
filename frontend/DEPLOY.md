# Frontend deployment

1. Put your real VITE_* values in a local `.env` (never commit it), including the Render API/socket URL.
2. Run:
   npm ci
   npm run build
3. Deploy the generated `dist` folder to Firebase Hosting:
   firebase deploy --only hosting
