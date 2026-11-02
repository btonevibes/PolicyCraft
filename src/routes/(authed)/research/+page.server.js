import { db } from '$lib/firebase';
import { activeResearch } from '$lib/server/research-store.js';
import { collection, getDocs } from 'firebase/firestore';

export async function load() {
	try {
		const current = await activeResearch(db);
		const [snapshot, extra] = await Promise.all([
			getDocs(collection(db, current.catalog)),
			getDocs(collection(db, current.extraCatalog))
		]);
		return {
			metrics: snapshot.docs.flatMap((doc) => doc.data().items || []),
			extra: extra.docs.flatMap((doc) => doc.data().items || []),
			version: current.version,
			updatedAt: current.updatedAt,
			available: true
		};
	} catch {
		return { metrics: [], extra: [], version: 'baseline', updatedAt: '', available: false };
	}
}
