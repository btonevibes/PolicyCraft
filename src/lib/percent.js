/** @param {number} count @param {number} total */
export function percent(count, total) {
	return total > 0 ? Math.floor((100 / total) * count) : 0;
}
