import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc, writeBatch } from 'firebase/firestore';
import { decodeSeries, decodeSourceRows } from '../src/lib/server/research.js';
import { collectionsForVersion } from '../src/lib/server/research-store.js';

const dir = process.argv[2];
if (!dir) throw new Error('Supply the prepared data directory.');
const originalsRaw = await readFile(`${dir}/metrics.jsonl`);
const extraRaw = await readFile(`${dir}/extended-staging.jsonl`);
const performance = JSON.parse(await readFile(`${dir}/extended-staging-report.json`, 'utf8'));
const parse = (raw) =>
	raw
		.toString('utf8')
		.trim()
		.split('\n')
		.map((line) => JSON.parse(line));
const original = parse(originalsRaw),
	extra = parse(extraRaw);
const allowed = new Set([
	'opinion',
	'proximity',
	'mass_cultural',
	'mass_economic',
	'policy_constant',
	'policy_evolving',
	'policy_cultural',
	'policy_economic'
]);
if (
	original.length < 3000 ||
	extra.length < 140 ||
	new Set(original.map((x) => x.meta.id)).size !== original.length ||
	new Set(extra.map((x) => x.id)).size !== extra.length
)
	throw new Error('Dataset failed count validation.');
if ([...allowed].some((dataset) => !extra.some((x) => x.dataset === dataset)))
	throw new Error('A source dataset is missing.');
for (const item of original)
	if (
		!/^[a-f0-9]{24}$/.test(item.meta.id) ||
		decodeSeries(item.data).length !== item.meta.count ||
		Buffer.byteLength(JSON.stringify(item)) > 900000
	)
		throw new Error('Invalid original metric.');
for (const item of extra)
	if (
		!allowed.has(item.dataset) ||
		!/^[a-f0-9]{24}$/.test(item.id) ||
		decodeSourceRows(item.data).rows.length !== item.count ||
		Buffer.byteLength(JSON.stringify(item)) > 900000
	)
		throw new Error('Invalid extra metric.');
const version = createHash('sha256')
	.update(originalsRaw)
	.update(extraRaw)
	.digest('hex')
	.slice(0, 16);
const store = collectionsForVersion(version);
console.log(
	`Validated ${original.length} original and ${extra.length} additional measures; version ${version}.`
);
if (process.argv.includes('--dry-run')) process.exit(0);
const required = [
	'VITE_API_KEY',
	'VITE_AUTH_DOMAIN',
	'VITE_PROJECT_ID',
	'POLICYCRAFT_SERVICE_EMAIL',
	'POLICYCRAFT_SERVICE_PASSWORD',
	'POLICYCRAFT_SERVICE_UID'
];
if (required.some((key) => !process.env[key])) throw new Error('Missing Firebase configuration.');
const app = initializeApp({
	apiKey: process.env.VITE_API_KEY,
	authDomain: process.env.VITE_AUTH_DOMAIN,
	projectId: process.env.VITE_PROJECT_ID
});
const auth = getAuth(app);
const user = await signInWithEmailAndPassword(
	auth,
	process.env.POLICYCRAFT_SERVICE_EMAIL,
	process.env.POLICYCRAFT_SERVICE_PASSWORD
);
if (user.user.uid !== process.env.POLICYCRAFT_SERVICE_UID)
	throw new Error('Unexpected Firebase account.');
const db = getFirestore(app),
	active = doc(db, 'research_refresh', 'active');
if (
	!Number.isFinite(performance.seconds_both_encodings_and_roundtrip) ||
	!Number.isFinite(performance.columns_and_rows_zlib_bytes)
)
	throw new Error('Missing performance measurements.');
const measuredAt = new Date().toISOString();
await setDoc(doc(db, 'research_refresh_metrics', measuredAt.replace(/[:.]/g, '-')), {
	measuredAt,
	version,
	rows: performance.rows,
	groups: performance.groups,
	seconds: performance.seconds_both_encodings_and_roundtrip,
	compactBytes: performance.columns_and_rows_zlib_bytes,
	repeatedFieldBytes: performance.dictionary_zlib_bytes
});
const current = await getDoc(active);
if (current.exists() && current.data().version === version) {
	console.log('Source data unchanged; current snapshot retained.');
} else {
	async function writeRecords(name, records, id) {
		for (let i = 0; i < records.length; i += 20) {
			const batch = writeBatch(db);
			for (const record of records.slice(i, i + 20)) batch.set(doc(db, name, id(record)), record);
			await batch.commit();
		}
	}
	await writeRecords(store.metrics, original, (r) => r.meta.id);
	await writeRecords(store.extraMetrics, extra, (r) => r.id);
	const summaries = original.map(({ meta }) => {
		const { id, dataset, variable, title, years, category, count } = meta;
		return { id, dataset, variable, title, years, category, count };
	});
	const extraSummaries = extra.map(({ id, dataset, variable, title, count, source_file }) => ({
		id,
		dataset,
		variable,
		title,
		count,
		source_file
	}));
	async function writeCatalog(name, items) {
		const batch = writeBatch(db);
		for (let i = 0; i < items.length; i += 50)
			batch.set(doc(db, name, String(i / 50).padStart(4, '0')), { items: items.slice(i, i + 50) });
		await batch.commit();
	}
	await writeCatalog(store.catalog, summaries);
	await writeCatalog(store.extraCatalog, extraSummaries);
	await setDoc(active, {
		version,
		updatedAt: new Date().toISOString(),
		originalCount: original.length,
		extraCount: extra.length
	});
	console.log(`Published research version ${version}.`);
}
await auth.signOut();
process.exit(0);
