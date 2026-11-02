import { inflateSync } from 'node:zlib';

export const RESEARCH_CATALOG = 'research_20261101_catalog';
export const RESEARCH_METRICS = 'research_20261101_metrics';

/** @param {string} encoded */
export function decodeSeries(encoded) {
	const data = JSON.parse(inflateSync(Buffer.from(encoded, 'base64')).toString('utf8'));
	if (!Array.isArray(data)) throw new Error('Invalid research series');
	return data;
}

/** @param {string} value */
export function isMetricId(value) {
	return /^[0-9a-f]{24}$/.test(value);
}
