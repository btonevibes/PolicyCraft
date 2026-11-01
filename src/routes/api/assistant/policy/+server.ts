import { env } from '$env/dynamic/private';
import { generateGeminiText } from '$lib/server/gemini.js';
import { json, error } from '@sveltejs/kit';

export const POST = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(400, 'User authentication error.');
	}
	try {
		const { prompt } = await request.json();
		const text = await generateGeminiText(prompt, env.GEMINI_API_KEY);

		return json({ text: text }, { status: 201 });
	} catch {
		throw error(400, 'Fail to generate responses.');
	}
};
