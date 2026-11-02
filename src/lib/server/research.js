import { inflateSync } from 'node:zlib';

export const RESEARCH_CATALOG = 'research_20261101_catalog';
export const RESEARCH_METRICS = 'research_20261101_metrics';
export const EXTRA_CATALOG = 'research_extra_20261101_catalog';
export const EXTRA_METRICS = 'research_extra_20261101_metrics';

/** @param {string} encoded */
export function decodeSeries(encoded) {
	const data = JSON.parse(inflateSync(Buffer.from(encoded, 'base64')).toString('utf8'));
	if (!Array.isArray(data)) throw new Error('Invalid research series');
	return data;
}

/** Decode the source rows without merging duplicate estimates. @param {string} encoded */
export function decodeSourceRows(encoded) {
	const data = JSON.parse(inflateSync(Buffer.from(encoded, 'base64')).toString('utf8'));
	if (!Array.isArray(data.columns) || !Array.isArray(data.rows))
		throw new Error('Invalid source rows');
	if (
		data.columns.some((/** @type {unknown} */ name) => typeof name !== 'string') ||
		data.rows.some(
			(/** @type {unknown} */ row) => !Array.isArray(row) || row.length !== data.columns.length
		)
	)
		throw new Error('Invalid source rows');
	return data;
}

/** @param {string} value */
export function isMetricId(value) {
	return /^[0-9a-f]{24}$/.test(value);
}
