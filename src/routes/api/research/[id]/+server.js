import { db } from '$lib/firebase';
import { decodeSeries, isMetricId } from '$lib/server/research.js';
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
	const result = await getDoc(doc(db, store.metrics, params.id));
	if (!result.exists()) throw error(404, 'Measure not found.');
	const record = result.data();
	return json(
		{ meta: record.meta, observations: decodeSeries(record.data) },
		{
			headers: { 'cache-control': 'private, no-store' }
		}
	);
}
