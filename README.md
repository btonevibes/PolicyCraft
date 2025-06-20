# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/main/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```
## Environment variables

Copy .env.example to .env and fill in your Firebase values:

```bash
cp .env.example .env
```
Then edit `.env` with your credentials.


## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## GitHub Pages

This repository is configured to deploy the static build to GitHub Pages using
the provided workflow in `.github/workflows/deploy.yml`. Every push to the
`main` branch triggers a build with `BASE_PATH=/PolicyCraft` and publishes the
contents of the generated `build` directory to the `gh-pages` branch.

To preview the deployment locally run `npm run build` and open the files in the
`build` directory.

## Deployment

Build the static site and prepare it for deployment with:

```bash
npm run build
```
