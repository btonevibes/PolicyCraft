import { collection, doc, getDoc, getDocs, runTransaction } from 'firebase/firestore';
import { collectionsForVersion } from '../src/lib/server/research-store.js';

// Only explicitly registered, content-addressed research snapshots are eligible.
export function versionsToPrune(registered, protectedVersions) {
	if (!protectedVersions.length || !protectedVersions[0])
		throw new Error('Missing active snapshot');
	for (const version of [...registered, ...protectedVersions]) {
		if (version === 'baseline') continue;
		collectionsForVersion(version);
	}
	return registered.filter(
		(version) => version !== 'baseline' && !protectedVersions.includes(version)
	);
}

// Registry entries cover only snapshots created by this publisher, never user records.
export async function pruneResearchSnapshots(db, protectedVersions) {
	const active = doc(db, 'research_refresh', 'active');
	const registry = collection(db, 'research_refresh_versions');
	const readVersion = (snap) => (snap.exists() ? snap.data().version : 'baseline');
	const activeVersion = readVersion(await getDoc(active));
	if (activeVersion !== protectedVersions[0])
		throw new Error('Active snapshot changed during cleanup');
	const registered = await getDocs(registry);
	for (const version of versionsToPrune(
		registered.docs.map((d) => d.id),
		protectedVersions
	)) {
		const names = collectionsForVersion(version);
		for (const name of [names.metrics, names.catalog, names.extraMetrics, names.extraCatalog]) {
			const records = await getDocs(collection(db, name));
			for (let i = 0; i < records.docs.length; i += 200) {
				await runTransaction(db, async (tx) => {
					if (readVersion(await tx.get(active)) !== activeVersion)
						throw new Error('Active snapshot changed during cleanup');
					for (const record of records.docs.slice(i, i + 200)) tx.delete(record.ref);
				});
			}
		}
		await runTransaction(db, async (tx) => {
			if (readVersion(await tx.get(active)) !== activeVersion)
				throw new Error('Active snapshot changed during cleanup');
			tx.delete(doc(registry, version));
		});
		console.log(`Removed obsolete research snapshot ${version}.`);
	}
}
