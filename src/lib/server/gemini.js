/**
 * @param {unknown} prompt
 * @param {string | undefined} apiKey
 * @param {typeof fetch} fetchImpl
 */
export async function generateGeminiText(prompt, apiKey, fetchImpl = fetch) {
	if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 30000 || !apiKey) {
		throw new Error('AI request is unavailable');
	}
	const response = await fetchImpl(
		'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: { thinkingConfig: { thinkingLevel: 'low' } }
			}),
			signal: AbortSignal.timeout(20000)
		}
	);
	if (!response.ok) throw new Error('AI request is unavailable');
	/** @type {{candidates?: Array<{content?: {parts?: Array<{text?: string}>}}>}} */
	const data = await response.json();
	const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
	if (!text) throw new Error('AI response is unavailable');
	return text;
}
