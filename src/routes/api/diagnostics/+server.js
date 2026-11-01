import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { generateGeminiText } from '$lib/server/gemini.js';

async function check(name, action) {
	const start = Date.now();
	try {
		const result = await action();
		return { name, ok: true, ms: Date.now() - start, result };
	} catch (e) {
		return {
			name,
			ok: false,
			ms: Date.now() - start,
			error: e.name,
			code: e.code || e.cause?.code
		};
	}
}

export async function GET() {
	const results = await Promise.all([
		check('dns', async () =>
			(await lookup('generativelanguage.googleapis.com', { all: true })).map((x) => x.family)
		),
		check(
			'fetch-google',
			async () =>
				(
					await fetch('https://generativelanguage.googleapis.com/', {
						signal: AbortSignal.timeout(5000)
					})
				).status
		),
		check(
			'ipv4-google',
			() =>
				new Promise((resolve, reject) => {
					const req = https.get(
						'https://generativelanguage.googleapis.com/',
						{ family: 4, timeout: 5000 },
						(res) => {
							res.resume();
							resolve(res.statusCode);
						}
					);
					req.on('timeout', () => req.destroy(new Error('timeout')));
					req.on('error', reject);
				})
		),
		check('gemini', async () => (await generateGeminiText('Say hello.', env.GEMINI_API_KEY)).length)
	]);
	return json(results);
}
