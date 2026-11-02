import { db } from '$lib/firebase';
import { decodeSeries, isMetricId, RESEARCH_METRICS } from '$lib/server/research.js';
import { error, json } from '@sveltejs/kit';
import { doc, getDoc } from 'firebase/firestore';

export async function GET({ params }) {
	if (!isMetricId(params.id)) throw error(404, 'Measure not found.');
	const result = await getDoc(doc(db, RESEARCH_METRICS, params.id));
	if (!result.exists()) throw error(404, 'Measure not found.');
	const record = result.data();
	return json(
		{ meta: record.meta, observations: decodeSeries(record.data) },
		{
			headers: { 'cache-control': 'private, no-store' }
		}
	);
}
