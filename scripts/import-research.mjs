import { readFile } from 'node:fs/promises';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
	collection,
	doc,
	getDocs,
	getFirestore,
	limit,
	query,
	writeBatch
} from 'firebase/firestore';
import { RESEARCH_CATALOG, RESEARCH_METRICS } from '../src/lib/server/research.js';

const input = process.argv[2];
if (!input) throw new Error('Supply the prepared JSONL file path.');
const required = [
	'VITE_API_KEY',
	'VITE_PROJECT_ID',
	'POLICYCRAFT_SERVICE_EMAIL',
	'POLICYCRAFT_SERVICE_PASSWORD',
	'POLICYCRAFT_SERVICE_UID'
];
if (required.some((name) => !process.env[name])) throw new Error('Missing Firebase configuration.');
const lines = (await readFile(input, 'utf8')).trim().split('\n');
const entries = lines.map((line) => JSON.parse(line));
if (
	entries.length !== 3206 ||
	entries.some((entry) => !/^[a-f0-9]{24}$/.test(entry.meta?.id) || !entry.data)
) {
	throw new Error('Prepared dataset failed validation.');
}
const app = initializeApp({
	apiKey: process.env.VITE_API_KEY,
	projectId: process.env.VITE_PROJECT_ID,
	authDomain: process.env.VITE_AUTH_DOMAIN
});
const auth = getAuth(app);
const user = await signInWithEmailAndPassword(
	auth,
	process.env.POLICYCRAFT_SERVICE_EMAIL,
	process.env.POLICYCRAFT_SERVICE_PASSWORD
);
if (user.user.uid !== process.env.POLICYCRAFT_SERVICE_UID)
	throw new Error('Unexpected Firebase account.');
const db = getFirestore(app);
const existing = await getDocs(query(collection(db, RESEARCH_CATALOG), limit(1)));
if (!existing.empty) throw new Error('Research catalog already exists; refusing to replace it.');

for (let offset = 0; offset < entries.length; offset += 40) {
	const batch = writeBatch(db);
	for (const entry of entries.slice(offset, offset + 40))
		batch.set(doc(db, RESEARCH_METRICS, entry.meta.id), entry);
	await batch.commit();
	if (offset % 400 === 0)
		console.log(`Imported ${Math.min(offset + 40, entries.length)} / ${entries.length} measures`);
}
const summaries = entries.map(({ meta }) => {
	const { id, dataset, variable, title, years, category, count } = meta;
	return { id, dataset, variable, title, years, category, count };
});
const batch = writeBatch(db);
for (let i = 0; i < summaries.length; i += 100) {
	batch.set(doc(db, RESEARCH_CATALOG, String(i / 100).padStart(3, '0')), {
		items: summaries.slice(i, i + 100)
	});
}
await batch.commit();
console.log(`Research catalog published with ${summaries.length} measures.`);
await auth.signOut();
process.exit(0);
