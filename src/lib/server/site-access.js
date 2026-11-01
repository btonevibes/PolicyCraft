import { createHash, timingSafeEqual } from 'node:crypto';

/** @param {string | null} header @param {string | undefined} password */
export function isOwnerAuthorized(header, password) {
	if (!password || password.length < 24 || !header || header.length > 1024) return false;
	const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header);
	if (!match) return false;
	const supplied = Buffer.from(match[1], 'base64');
	const expected = Buffer.from(`owner:${password}`, 'utf8');
	/** @param {Buffer} value */
	const digest = (value) => createHash('sha256').update(value).digest();
	return timingSafeEqual(digest(supplied), digest(expected));
}
