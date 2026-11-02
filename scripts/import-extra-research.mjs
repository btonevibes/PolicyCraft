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
import { EXTRA_CATALOG, EXTRA_METRICS, decodeSourceRows } from '../src/lib/server/research.js';

const input = process.argv[2];
if (!input) throw new Error('Supply the prepared JSONL path.');
const entries = (await readFile(input, 'utf8'))
	.trim()
	.split('\n')
	.map((line) => JSON.parse(line));
if (entries.length !== 148 || new Set(entries.map((entry) => entry.id)).size !== entries.length)
	throw new Error('Unexpected dataset.');
for (const entry of entries) {
	if (!/^[a-f0-9]{24}$/.test(entry.id) || decodeSourceRows(entry.data).rows.length !== entry.count)
		throw new Error('Invalid source record.');
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
if (!(await getDocs(query(collection(db, EXTRA_CATALOG), limit(1)))).empty)
	throw new Error('Research catalog already exists; refusing to replace it.');
for (let offset = 0; offset < entries.length; offset += 20) {
	const batch = writeBatch(db);
	for (const entry of entries.slice(offset, offset + 20))
		batch.set(doc(db, EXTRA_METRICS, entry.id), entry);
	await batch.commit();
	console.log(`Imported ${Math.min(offset + 20, entries.length)} / ${entries.length}`);
}
const catalog = entries.map(({ id, dataset, title, variable, count, source_file }) => ({
	id,
	dataset,
	title,
	variable,
	count,
	source_file
}));
const batch = writeBatch(db);
for (let i = 0; i < catalog.length; i += 50)
	batch.set(doc(db, EXTRA_CATALOG, String(i / 50).padStart(3, '0')), {
		items: catalog.slice(i, i + 50)
	});
await batch.commit();
console.log(`Published ${catalog.length} measures.`);
await auth.signOut();
process.exit(0);
