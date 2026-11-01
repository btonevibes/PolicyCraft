import test from 'node:test';
import assert from 'node:assert/strict';
import { percent } from '../src/lib/percent.js';

test('an empty vote total displays zero rather than an invalid number', () => {
	assert.equal(percent(0, 0), 0);
});

test('a nonempty vote total preserves the existing rounded-down percentage', () => {
	assert.equal(percent(1, 3), 33);
});
