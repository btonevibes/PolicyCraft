import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { decodeSeries, decodeSourceRows, isMetricId } from '../src/lib/server/research.js';
import { collectionsForVersion } from '../src/lib/server/research-store.js';

test('preserves state, year, and both original Dynamic Democracy values', () => {
	const values = [
		[2020, 'CA', '10.5', '1'],
		[2021, 'NY', '0', '0']
	];
	const compressed = deflateSync(JSON.stringify(values)).toString('base64');
	assert.deepEqual(decodeSeries(compressed), values);
});

test('preserves conflicting estimates and missing source values', () => {
	const source = {
		columns: ['year', 'opinion', 'imputed'],
		rows: [
			['2020', '0.89', '1'],
			['2020', '0.85', '0'],
			['2021', 'NA', '1']
		]
	};
	assert.deepEqual(
		decodeSourceRows(deflateSync(JSON.stringify(source)).toString('base64')),
		source
	);
	assert.throws(
		() => decodeSourceRows(deflateSync('{"columns":["year"],"rows":[[]]}').toString('base64')),
		/Invalid/
	);
});

test('rejects malformed identifiers and non-series payloads', () => {
	assert.equal(isMetricId('abcdef012345abcdef012345'), true);
	assert.equal(isMetricId('../other'), false);
	assert.throws(() => decodeSeries(deflateSync('{}').toString('base64')), /Invalid/);
});

test('snapshot selection stays within research collections', () => {
	assert.equal(collectionsForVersion('baseline').metrics, 'research_20261101_metrics');
	assert.equal(
		collectionsForVersion('0123456789abcdef').extraMetrics,
		'research_v0123456789abcdef_extra_metrics'
	);
	assert.throws(() => collectionsForVersion('../users'), /Invalid research version/);
});
