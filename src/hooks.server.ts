import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { auth, db } from '$lib/firebase';
import { createServiceAuthenticator } from '$lib/server/service-auth.js';
import { isOwnerAuthorized } from '$lib/server/site-access.js';
import { error, redirect, type Handle } from '@sveltejs/kit';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Firestore rules permit only this server's dedicated Firebase account.
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

	if (
		env.POLICYCRAFT_PRIVATE_DEPLOYMENT !== 'true' ||
		!env.POLICYCRAFT_ACCESS_PASSWORD ||
		env.POLICYCRAFT_ACCESS_PASSWORD.length < 24
	) {
		throw error(503, 'Private deployment is not configured.');
	}
	if (
		!isOwnerAuthorized(event.request.headers.get('authorization'), env.POLICYCRAFT_ACCESS_PASSWORD)
	) {
		return new Response('Sign in to PolicyCraft.', {
			status: 401,
			headers: {
				'www-authenticate': 'Basic realm="PolicyCraft", charset="UTF-8"',
				'cache-control': 'no-store'
			}
		});
	}
	if (
		!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) &&
		event.request.headers.get('origin') !== event.url.origin
	) {
		throw error(403, 'Request origin is not allowed.');
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
