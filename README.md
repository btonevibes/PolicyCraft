# PolicyCraft

PolicyCraft is a SvelteKit application used to experiment with policy creation, discussion and case management. It relies on Firebase for authentication, data storage and generative AI features.

## Setup

1. Install Node.js 18 or later.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the project root and provide your Firebase credentials:
   ```bash
   VITE_API_KEY=your-api-key
   VITE_AUTH_DOMAIN=your-auth-domain
   VITE_PROJECT_ID=your-project-id
   VITE_STORAGE_BUCKET=your-storage-bucket
   VITE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_APP_ID=your-app-id
   FIRESTORE_DATABASE_NAME=your-firestore-database-name
   ```
   These variables configure the Svelte application and Cloud Functions.
4. If you plan to use the Firebase Cloud Functions in `functions/`, install its dependencies:
   ```bash
   cd functions && npm install
   ```

## Development

Start a development server with hot reloading:
```bash
npm run dev
```

## Production Build

Create an optimized production build:
```bash
npm run build
```
You can preview the build locally with:
```bash
npm run preview
```

The project uses Vite and SvelteKit, so you can deploy the generated build folder with an adapter suited for your hosting provider.
