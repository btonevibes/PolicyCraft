# PolicyCraft

This configuration runs PolicyCraft as a **single-owner, private Netlify project**.
Netlify's private-project access control is the sign-in boundary for the entire
site, including its API routes. The server uses a dedicated Firebase account;
Firestore rules must limit access to that account's UID.

**Do not deploy this configuration as a public Netlify project.** The
`POLICYCRAFT_PRIVATE_DEPLOYMENT` variable is an operator assertion, not an
authentication mechanism. Verify that an unauthenticated visitor cannot reach
the site or its function endpoints before publishing or updating the Pages link.

## Configuration

Set the variables listed in `.env.example` in Netlify. The Firebase service
password and Gemini key are secrets and must be configured for both builds and
functions without committing their values. The Firebase web configuration is
not a secret. The project uses the default Firestore database.

The `meta/about`, `meta/code`, and `users/<service UID>` documents must exist
before first use. The rules in `config/firestore.rules` restrict Firestore to
this project's service account. Keep rules restricted to that account and
test both authorized and anonymous access after any rule change.

Install dependencies with `npm ci`, then use `npm run dev` for a local server or
`npm run build` for the Netlify server build. `node --test tests/*.test.mjs` runs
the focused backend tests. Local access bypasses Netlify's outer protection, so
bind the development server to loopback and keep its credentials private.

The Gemini Developer API can use its free tier while the project has no Cloud
Billing account. Prompts and responses may be used by Google to improve its
products; see the provider's current terms and quotas before using it.
