import { db } from '$lib/firebase';
import { decodeSourceRows, isMetricId } from '$lib/server/research.js';
import { activeResearch, collectionsForVersion } from '$lib/server/research-store.js';
import { error, json } from '@sveltejs/kit';
import { doc, getDoc } from 'firebase/firestore';

export async function GET({ params, url }) {
	if (!isMetricId(params.id)) throw error(404, 'Measure not found.');
	let store;
	try {
		store = url.searchParams.has('v')
			? collectionsForVersion(url.searchParams.get('v') || '')
			: await activeResearch(db);
	} catch {
		throw error(404, 'Version not found.');
	}
	const result = await getDoc(doc(db, store.extraMetrics, params.id));
	if (!result.exists()) throw error(404, 'Measure not found.');
	const { data, ...meta } = result.data();
	return json(
		{ meta, ...decodeSourceRows(data) },
		{ headers: { 'cache-control': 'private, no-store' } }
	);
}
