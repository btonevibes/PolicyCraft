import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGeminiText } from '../src/lib/server/gemini.js';

test('sends the prompt using a server-side key and returns the response text', async () => {
	let request;
	const fakeFetch = async (url, init) => {
		request = { url, init };
		return {
			ok: true,
			json: async () => ({ candidates: [{ content: { parts: [{ text: 'A policy' }] } }] })
		};
	};
	const text = await generateGeminiText('Suggest a policy', 'private-key', fakeFetch);
	assert.equal(text, 'A policy');
	assert.equal(request.init.headers['x-goog-api-key'], 'private-key');
	assert.equal(JSON.parse(request.init.body).contents[0].parts[0].text, 'Suggest a policy');
	assert.equal(request.url.includes('private-key'), false);
});

test('rejects a failed provider response without exposing its details', async () => {
	await assert.rejects(
		generateGeminiText('prompt', 'private-key', async () => ({ ok: false, status: 429 })),
		/unavailable/i
	);
});
