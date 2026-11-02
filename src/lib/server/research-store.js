import { doc, getDoc } from 'firebase/firestore';
import { EXTRA_CATALOG, EXTRA_METRICS, RESEARCH_CATALOG, RESEARCH_METRICS } from './research.js';

/** @param {string} version */
export function collectionsForVersion(version) {
	if (version === 'baseline')
		return {
			version,
			catalog: RESEARCH_CATALOG,
			metrics: RESEARCH_METRICS,
			extraCatalog: EXTRA_CATALOG,
			extraMetrics: EXTRA_METRICS
		};
	if (!/^[a-f0-9]{16}$/.test(version)) throw new Error('Invalid research version');
	const prefix = `research_v${version}`;
	return {
		version,
		catalog: `${prefix}_catalog`,
		metrics: `${prefix}_metrics`,
		extraCatalog: `${prefix}_extra_catalog`,
		extraMetrics: `${prefix}_extra_metrics`
	};
}

/** @param {import('firebase/firestore').Firestore} db */
export async function activeResearch(db) {
	const snapshot = await getDoc(doc(db, 'research_refresh', 'active'));
	if (!snapshot.exists()) return { ...collectionsForVersion('baseline'), updatedAt: '2026-11-01' };
	const info = snapshot.data();
	return { ...collectionsForVersion(info.version), updatedAt: info.updatedAt };
}
