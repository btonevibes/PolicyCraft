<script lang="ts">
	import { extent, max, min } from 'd3-array';
	import { scaleLinear } from 'd3-scale';
	import { line } from 'd3-shape';
	type Point = { year: number; state: string; value: number | null };
	type NumericPoint = Point & { value: number };
	export let rows: Point[] = [];
	export let title = '';
	export let view = 'timeline';
	export let year = '';
	export let stateNames: Record<string, string> = {};
	let width = 0;
	const colors = ['#125e78', '#914d12'];
	const dash = ['', '8 4'];
	const h = 290;
	$: w = Math.max(width, 280);
	$: plotWidth = Math.max(w - 100, 160);
	$: states = [...new Set(rows.map((r) => r.state))];
	$: selected = rows.filter(
		(r): r is NumericPoint =>
			r.value !== null &&
			Number.isFinite(r.value) &&
			(view !== 'year' || String(r.year) === String(year))
	);
	$: counts = selected.reduce(
		(map, r) => map.set(`${r.state}:${r.year}`, (map.get(`${r.state}:${r.year}`) || 0) + 1),
		new Map<string, number>()
	);
	$: duplicates = new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
	$: clean = selected.filter((r) => !duplicates.has(`${r.state}:${r.year}`));
	$: bounds = extent(clean, (r) => r.year);
	$: x = scaleLinear()
		.domain(
			bounds[0] === undefined || bounds[1] === undefined
				? [0, 1]
				: bounds[0] === bounds[1]
					? [bounds[0] - 1, bounds[1] + 1]
					: [bounds[0], bounds[1]]
		)
		.range([58, plotWidth]);
	$: low = min(clean, (r) => r.value) ?? 0;
	$: high = max(clean, (r) => r.value) ?? 1;
	$: y = scaleLinear()
		.domain([
			Math.min(0, low),
			Math.max(high, 0) === Math.min(0, low) ? Math.min(0, low) + 1 : Math.max(high, 0)
		])
		.nice()
		.range([h - 46, 20]);
	$: xTicks = clean.length ? x.ticks(w < 480 ? 3 : 5).filter(Number.isInteger) : [];
	$: yTicks = clean.length ? y.ticks(4) : [];
	$: groups = states.map((state, i) => {
		const points = selected.filter((r) => r.state === state).sort((a, b) => a.year - b.year);
		const byYear = new Map(points.map((r) => [r.year, r]));
		const years = points.length
			? Array.from(
					{ length: points[points.length - 1].year - points[0].year + 1 },
					(_, i) => byYear.get(points[0].year + i) || null
				)
			: [];
		const path = line<NumericPoint | null>()
			.defined((r) => r !== null && !duplicates.has(`${r.state}:${r.year}`))
			.x((r) => x(r!.year))
			.y((r) => y(r!.value))(years);
		return {
			state,
			path,
			points: points.filter((r) => !duplicates.has(`${r.state}:${r.year}`)),
			color: colors[i % colors.length],
			pattern: dash[i % dash.length]
		};
	});
	$: barScale = scaleLinear()
		.domain([Math.min(0, low), Math.max(0, high) || 1])
		.range([0, Math.max(w - 220, 80)]);
</script>

<div class="chart" bind:clientWidth={width}>
	<h3>{title}</h3>
	{#if duplicates.size}<p class="notice">
			Some values have multiple estimates. They are listed below, not plotted.
		</p>{/if}
	{#if !clean.length}<p>No single numeric values for this selection.</p>
	{:else if view === 'timeline'}
		<div class="legend">
			{#each groups as group}<span
					><svg width="32" height="12" aria-hidden="true"
						><line
							x1="0"
							x2="30"
							y1="6"
							y2="6"
							stroke={group.color}
							stroke-width="3"
							stroke-dasharray={group.pattern}
						/></svg
					>
					{stateNames[group.state] || group.state}</span
				>{/each}
		</div>
		<svg
			width={w}
			height={h}
			role="img"
			aria-label={`${title}. Exact values are in the table below.`}
		>
			{#each yTicks as tick}<line
					x1="58"
					x2={plotWidth}
					y1={y(tick)}
					y2={y(tick)}
					stroke="#dce4e7"
				/><text x="50" y={y(tick) + 5} text-anchor="end">{tick}</text>{/each}
			{#each xTicks as tick}<text x={x(tick)} y={h - 15} text-anchor="middle">{tick}</text>{/each}
			{#each groups as group}<path
					d={group.path || ''}
					fill="none"
					stroke={group.color}
					stroke-width="3"
					stroke-dasharray={group.pattern}
				/>{#each group.points as point}<circle
						cx={x(point.year)}
						cy={y(point.value)}
						r="3.5"
						fill={group.color}
					/>{/each}{/each}
		</svg>
	{:else}
		<div class="bars">
			{#each clean as row}<div class="bar-row">
					<span>{stateNames[row.state] || row.state}</span>
					<div class="bar-track">
						<div
							class="bar"
							style={`margin-left:${Math.min(barScale(0), barScale(row.value))}px;width:${Math.abs(barScale(row.value) - barScale(0))}px`}
						></div>
					</div>
					<strong>{Number(row.value.toPrecision(5))}</strong>
				</div>{/each}
		</div>
	{/if}
</div>

<style>
	.chart {
		width: 100%;
		min-width: 0;
		padding: 12px 0;
	}
	.chart h3 {
		font-size: 18px;
		margin: 0 0 8px;
	}
	.chart p {
		font-size: 16px;
		line-height: 1.3;
	}
	.chart svg {
		display: block;
		max-width: 100%;
	}
	.chart svg text {
		font-size: 16px;
		fill: #243e49;
	}
	.legend {
		display: flex;
		gap: 24px;
		flex-wrap: wrap;
		font-size: 16px;
	}
	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.bars {
		display: grid;
		gap: 12px;
		margin: 14px 0;
	}
	.bar-row {
		display: grid;
		grid-template-columns: minmax(100px, 135px) 1fr 80px;
		gap: 10px;
		align-items: center;
		font-size: 16px;
	}
	.bar-track {
		height: 22px;
		background: #e8eff0;
	}
	.bar {
		height: 100%;
		background: #126b78;
	}
	.bar-row strong {
		font-variant-numeric: tabular-nums;
	}
	.notice {
		color: #724500;
	}
</style>
