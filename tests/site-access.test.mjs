import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { isOwnerAuthorized } from '../src/lib/server/site-access.js';

const password = randomBytes(24).toString('base64url');
const header = (name, pass) => 'Basic ' + Buffer.from(`${name}:${pass}`).toString('base64');

test('only the configured owner credentials allow access', () => {
	assert.equal(isOwnerAuthorized(header('owner', password), password), true);
	assert.equal(isOwnerAuthorized(header('owner', 'wrong'), password), false);
	assert.equal(isOwnerAuthorized(header('other', password), password), false);
	assert.equal(isOwnerAuthorized(null, password), false);
});

test('missing or weak configuration never grants access', () => {
	assert.equal(isOwnerAuthorized(header('owner', 'weak'), 'weak'), false);
	assert.equal(isOwnerAuthorized(header('owner', password), undefined), false);
});
