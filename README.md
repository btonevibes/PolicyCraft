# PolicyCraft

This configuration runs PolicyCraft as a **single-owner app on Netlify**.
The server requires the username `owner` and an app password for pages and API
routes. The server uses a separate Firebase account; Firestore rules must limit
database access to that account's UID.

The `POLICYCRAFT_PRIVATE_DEPLOYMENT` flag alone does not authenticate anyone.
The app also requires a strong `POLICYCRAFT_ACCESS_PASSWORD` of at least 24
characters. Verify that unauthenticated requests to the home page, API routes,
and direct function endpoints are denied before updating the Pages link.

## Configuration

Set the variables listed in `.env.example` in Netlify. The Firebase service
password, app access password, and Gemini key are secrets and must be configured
for both builds and functions without committing their values. The Firebase web configuration is
not a secret. The project uses the default Firestore database.

The `meta/about`, `meta/code`, and `users/<service UID>` documents must exist
before first use. The rules in `config/firestore.rules` restrict Firestore to
this project's service account. Keep rules restricted to that account and
test both authorized and anonymous access after any rule change.

Install dependencies with `npm ci`, then use `npm run dev` for a local server or
`npm run build` for the Netlify server build. `node --test tests/*.test.mjs` runs
the focused backend tests. Bind the development server to loopback and keep its
credentials private.

The Gemini Developer API can use its free tier while the project has no Cloud
Billing account. Prompts and responses may be used by Google to improve its
products; see the provider's current terms and quotas before using it.
