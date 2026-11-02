import { db } from '$lib/firebase';
import { RESEARCH_CATALOG } from '$lib/server/research.js';
import { collection, getDocs } from 'firebase/firestore';

export async function load() {
	try {
		const snapshot = await getDocs(collection(db, RESEARCH_CATALOG));
		return { metrics: snapshot.docs.flatMap((doc) => doc.data().items || []), available: true };
	} catch {
		return { metrics: [], available: false };
	}
}
