import test from 'node:test';
import assert from 'node:assert/strict';
import { createServiceAuthenticator } from '../src/lib/server/service-auth.js';

test('concurrent requests wait for one service sign-in', async () => {
	let attempts = 0;
	const auth = { currentUser: null };
	const signIn = async () => {
		attempts++;
		await new Promise((resolve) => setTimeout(resolve, 10));
		auth.currentUser = { uid: 'owner' };
		return { user: auth.currentUser };
	};
	const ensure = createServiceAuthenticator(auth, signIn, {
		email: 'service@example.invalid',
		password: 'secret',
		uid: 'owner'
	});
	const users = await Promise.all([ensure(), ensure()]);
	assert.equal(attempts, 1);
	assert.deepEqual(
		users.map((user) => user.uid),
		['owner', 'owner']
	);
});

test('rejects a service account whose UID does not match the configured owner', async () => {
	const auth = { currentUser: null };
	const ensure = createServiceAuthenticator(auth, async () => ({ user: { uid: 'wrong' } }), {
		email: 'service@example.invalid',
		password: 'secret',
		uid: 'owner'
	});
	await assert.rejects(ensure(), /service account/i);
});
