import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { decodeSeries, isMetricId } from '../src/lib/server/research.js';

test('preserves state, year, and both original Dynamic Democracy values', () => {
	const values = [
		[2020, 'CA', '10.5', '1'],
		[2021, 'NY', '0', '0']
	];
	const compressed = deflateSync(JSON.stringify(values)).toString('base64');
	assert.deepEqual(decodeSeries(compressed), values);
});

test('rejects malformed identifiers and non-series payloads', () => {
	assert.equal(isMetricId('abcdef012345abcdef012345'), true);
	assert.equal(isMetricId('../other'), false);
	assert.throws(() => decodeSeries(deflateSync('{}').toString('base64')), /Invalid/);
});
