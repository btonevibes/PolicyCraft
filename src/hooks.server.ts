import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { auth, db } from '$lib/firebase';
import { createServiceAuthenticator } from '$lib/server/service-auth.js';
import { error, redirect, type Handle } from '@sveltejs/kit';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// The deployed site must be private at the Netlify edge. The dedicated Firebase
// account is allowed by Firestore rules and is never exposed to the browser.
const ensureService = createServiceAuthenticator(auth, signInWithEmailAndPassword, {
	email: env.POLICYCRAFT_SERVICE_EMAIL,
	password: env.POLICYCRAFT_SERVICE_PASSWORD,
	uid: env.POLICYCRAFT_SERVICE_UID
});

export const handle: Handle = async ({ event, resolve }) => {
	if (building) {
		event.locals.user = null;
		event.locals.stage = null;
		return resolve(event);
	}

	if (env.POLICYCRAFT_PRIVATE_DEPLOYMENT !== 'true') {
		throw error(503, 'Private deployment is not configured.');
	}

	// The old course sign-in actions change the shared Firebase auth state. They
	// are disabled in the single-owner deployment, including direct POSTs.
	if (['/login', '/register', '/logout'].includes(event.url.pathname)) {
		throw redirect(303, '/');
	}

	const serviceUser = await ensureService();
	event.locals.user = { userId: serviceUser.uid, displayName: 'Owner', email: '', role: 'admin' };
	const stage = await getDoc(doc(db, 'meta', 'code'));
	event.locals.stage = stage.exists() ? stage.data().stage ?? null : null;
	return resolve(event);
};
