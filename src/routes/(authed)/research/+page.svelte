<script lang="ts">
	import ResearchChart from '$lib/components/ResearchChart.svelte';
	type Metric = {
		id: string;
		dataset: string;
		variable: string;
		title: string;
		category?: string;
		years?: string;
		description?: string;
		sources?: string;
		notes?: string;
		citations?: string[];
	};
	type Row = {
		year: number;
		state: string;
		value: number | null;
		raw: string;
		kind: string;
		details: string;
	};
	type Payload = {
		meta: Metric;
		observations: Array<[number, string, string, string?]>;
		columns: string[];
		rows: string[][];
	};
	export let data: {
		metrics: Metric[];
		extra: Metric[];
		available: boolean;
		version: string;
		updatedAt: string;
	};
	const statesByName: Record<string, string> = {
		Alabama: 'AL',
		Alaska: 'AK',
		Arizona: 'AZ',
		Arkansas: 'AR',
		California: 'CA',
		Colorado: 'CO',
		Connecticut: 'CT',
		Delaware: 'DE',
		'District of Columbia': 'DC',
		Florida: 'FL',
		Georgia: 'GA',
		Hawaii: 'HI',
		Idaho: 'ID',
		Illinois: 'IL',
		Indiana: 'IN',
		Iowa: 'IA',
		Kansas: 'KS',
		Kentucky: 'KY',
		Louisiana: 'LA',
		Maine: 'ME',
		Maryland: 'MD',
		Massachusetts: 'MA',
		Michigan: 'MI',
		Minnesota: 'MN',
		Mississippi: 'MS',
		Missouri: 'MO',
		Montana: 'MT',
		Nebraska: 'NE',
		Nevada: 'NV',
		'New Hampshire': 'NH',
		'New Jersey': 'NJ',
		'New Mexico': 'NM',
		'New York': 'NY',
		'North Carolina': 'NC',
		'North Dakota': 'ND',
		Ohio: 'OH',
		Oklahoma: 'OK',
		Oregon: 'OR',
		Pennsylvania: 'PA',
		'Rhode Island': 'RI',
		'South Carolina': 'SC',
		'South Dakota': 'SD',
		Tennessee: 'TN',
		Texas: 'TX',
		Utah: 'UT',
		Vermont: 'VT',
		Virginia: 'VA',
		Washington: 'WA',
		'West Virginia': 'WV',
		Wisconsin: 'WI',
		Wyoming: 'WY'
	};
	const labels: Record<string, string> = {
		cspp: 'Correlates',
		dynamic: 'State policies',
		opinion: 'Public opinion',
		proximity: 'Policy proximity',
		mass_cultural: 'Public ideology · cultural',
		mass_economic: 'Public ideology · economic',
		policy_constant: 'Policy ideology · constant',
		policy_evolving: 'Policy ideology · evolving',
		policy_cultural: 'Policy ideology · cultural',
		policy_economic: 'Policy ideology · economic'
	};
	const stateNames: Record<string, string> = Object.fromEntries(
		Object.entries(statesByName).map(([name, code]) => [code, name])
	);
	let query = '',
		category = 'all',
		displayCount = 40;
	let selected: Metric | null = null,
		rows: Row[] = [],
		firstState = '',
		secondState = '',
		year = '',
		view = 'timeline',
		mode = 'both',
		loading = false,
		problem = '',
		request = 0;
	$: all = [...data.metrics, ...data.extra];
	$: matches = all
		.filter(
			(m) =>
				category === 'all' ||
				m.dataset === category ||
				(category === 'ideology' &&
					(m.dataset.startsWith('mass_') || m.dataset.startsWith('policy_')))
		)
		.filter((m) =>
			`${m.title} ${m.variable} ${m.category || ''}`
				.toLowerCase()
				.includes(query.toLowerCase().trim())
		)
		.sort((a, b) => a.title.localeCompare(b.title));
	$: states = [...new Set(rows.map((r) => r.state))]
		.filter((state) => Object.values(statesByName).includes(state))
		.sort((a, b) => (stateNames[a] || a).localeCompare(stateNames[b] || b));
	$: visible = rows.filter((r) => r.state === firstState || r.state === secondState);
	$: years = [...new Set(visible.map((r) => r.year))].sort((a, b) => b - a);
	$: if (years.length && !years.includes(Number(year))) year = String(years[0]);
	$: shown = visible
		.filter(
			(r) =>
				(mode === 'both' ? ['policy', 'opinion'].includes(r.kind) : r.kind === mode) &&
				(view !== 'year' || String(r.year) === year)
		)
		.sort((a, b) => b.year - a.year || a.state.localeCompare(b.state));
	$: kinds = [...new Set(shown.map((r) => r.kind))];
	$: hasOpinion = rows.some((r) => r.kind === 'opinion');
	$: hasPolicy = rows.some((r) => r.kind === 'policy');
	$: anyMulti = (() => {
		const counts = new Map<string, number>();
		for (const r of shown) {
			const k = `${r.kind}:${r.state}:${r.year}`;
			counts.set(k, (counts.get(k) || 0) + 1);
		}
		return [...counts.values()].some((n) => n > 1);
	})();
	function numeric(value: string) {
		if (!value || value === 'NA' || value === 'N/A') return null;
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	function loadedDate(value: string) {
		if (!value) return 'unknown';
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return 'unknown';
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			timeZone: 'America/Los_Angeles'
		}).format(parsed);
	}
	function displayValue(row: Row) {
		if (row.value === null) return row.raw || '—';
		if (row.value !== 0 && Math.abs(row.value) < 0.001) return row.value.toPrecision(3);
		return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(row.value);
	}
	function kindOf(dataset: string) {
		return dataset === 'opinion'
			? 'opinion'
			: dataset === 'proximity'
				? 'proximity'
				: dataset.startsWith('policy_') || dataset.startsWith('mass_')
					? 'ideology'
					: 'policy';
	}
	function kindLabel(kind: string) {
		return (
			(
				{
					policy: 'State policy / measure',
					opinion: 'Public opinion',
					proximity: 'Policy proximity',
					ideology: 'Ideology'
				} as Record<string, string>
			)[kind] || kind
		);
	}
	function normalizeOriginal(payload: Payload): Row[] {
		return payload.observations.map((r) => ({
			year: Number(r[0]),
			state: String(r[1]),
			raw: String(r[2] ?? ''),
			value: numeric(String(r[2] ?? '')),
			kind: 'policy',
			details: r.length > 3 ? `Source policy_real: ${r[3] || '—'}` : ''
		}));
	}
	function normalizeExtra(payload: Payload): Row[] {
		const at = (r: string[], key: string) => {
			const i = payload.columns.indexOf(key);
			return i < 0 ? '' : r[i] ?? '';
		};
		const kind = kindOf(payload.meta.dataset);
		return payload.rows
			.map((r: string[]) => {
				const raw = at(
					r,
					kind === 'opinion' ? 'opinion' : kind === 'proximity' ? 'proximity' : 'median'
				);
				const name = at(r, 'state_name');
				const state = at(r, 'abb') || at(r, 'state_abb') || statesByName[name] || name;
				const fields =
					kind === 'opinion'
						? ['issue', 'opinion_sd', 'imputed', 'years_opinion']
						: kind === 'proximity'
							? ['opinion', 'policy_value', 'policy_real', 'imputed']
							: ['lower', 'upper', 'sd'];
				return {
					year: Number(at(r, 'year')),
					state,
					raw,
					value: numeric(raw),
					kind,
					details: fields.map((f) => `${f}: ${at(r, f) || '—'}`).join(' · ')
				};
			})
			.filter((r: Row) => r.state && Number.isInteger(r.year));
	}
	async function openMetric(metric: Metric) {
		const current = ++request;
		selected = metric;
		rows = [];
		loading = true;
		problem = '';
		const kind = kindOf(metric.dataset);
		mode = kind === 'policy' ? 'policy' : kind;
		const targets: Metric[] = [metric];
		if (
			metric.dataset === 'dynamic' ||
			metric.dataset === 'opinion' ||
			metric.dataset === 'proximity'
		) {
			for (const item of all.filter(
				(m) =>
					m.variable === metric.variable && ['dynamic', 'opinion', 'proximity'].includes(m.dataset)
			))
				if (!targets.some((t) => t.id === item.id)) targets.push(item);
		}
		try {
			const loaded = await Promise.all(
				targets.map(async (target) => {
					const extra = !['cspp', 'dynamic'].includes(target.dataset);
					const response = await fetch(
						`/api/${extra ? 'research-extra' : 'research'}/${target.id}?v=${encodeURIComponent(data.version)}`
					);
					if (!response.ok) throw new Error('Unable to load data');
					const payload: Payload = await response.json();
					return {
						target,
						meta: payload.meta,
						rows: extra ? normalizeExtra(payload) : normalizeOriginal(payload)
					};
				})
			);
			if (current !== request) return;
			rows = loaded.flatMap((item) => item.rows);
			selected = loaded.find((item) => item.target.id === metric.id)?.meta || metric;
			const available = [...new Set(rows.map((r) => r.state))].sort();
			firstState = available.includes('CA') ? 'CA' : available[0] || '';
			secondState = available.includes('TX') ? 'TX' : available.find((s) => s !== firstState) || '';
			const latest = Math.max(
				...rows.filter((r) => r.state === firstState || r.state === secondState).map((r) => r.year)
			);
			year = Number.isFinite(latest) ? String(latest) : '';
			if (
				metric.dataset !== 'proximity' &&
				rows.some((r) => r.kind === 'policy') &&
				rows.some((r) => r.kind === 'opinion')
			)
				mode = 'both';
		} catch {
			if (current === request) problem = 'Could not load this data. Try again.';
		} finally {
			if (current === request) loading = false;
		}
	}
	function back() {
		request++;
		selected = null;
		rows = [];
		loading = false;
	}
</script>

<svelte:head><title>Research Data | PolicyCraft</title></svelte:head>
<main class="research">
	{#if !selected}
		<header>
			<h1>Research Data</h1>
			<p>Compare state policies, public opinion and ideology.</p>
		</header>
		<p class="subtle">
			Historical research data · Loaded {loadedDate(data.updatedAt)} ·
			<a href="https://dynamicdemocracy.shinyapps.io/ShinyApp/" target="_blank" rel="noreferrer"
				>Dynamic Democracy</a
			>
			·
			<a
				href="https://ippsr.msu.edu/public-policy/correlates-state-policy"
				target="_blank"
				rel="noreferrer">Correlates</a
			>
		</p>
		{#if !data.available}<p role="alert">Research data is unavailable. Try again.</p>{:else}
			<div class="filters">
				<label
					>Search<input
						bind:value={query}
						on:input={() => (displayCount = 40)}
						placeholder="Try Medicaid or minimum wage"
					/></label
				><label
					>Data<select bind:value={category} on:change={() => (displayCount = 40)}
						><option value="all">All data</option><option value="dynamic">State policies</option
						><option value="opinion">Public opinion</option><option value="proximity"
							>Policy proximity</option
						><option value="ideology">Ideology</option><option value="cspp">Correlates</option
						></select
					></label
				>
			</div>
			<p>{matches.length} measures</p>
			<div class="results">
				{#each matches.slice(0, displayCount) as item (item.id)}<button
						class="result"
						on:click={() => openMetric(item)}
						><strong>{item.title}</strong><span
							>{labels[item.dataset] || item.dataset}{item.years ? ` · ${item.years}` : ''}</span
						></button
					>{/each}
			</div>
			{#if matches.length > displayCount}<button
					class="button"
					on:click={() => (displayCount += 40)}>Show more</button
				>{/if}{/if}
	{:else}
		<button class="back" on:click={back}>← All research</button>
		<header>
			<h1>{selected.title}</h1>
			<p>
				{labels[selected.dataset] || selected.dataset}{selected.years ? ` · ${selected.years}` : ''}
			</p>
		</header>
		{#if loading}<p role="status">Loading…</p>{:else if problem}<p role="alert">{problem}</p>{:else}
			<details>
				<summary>About this data</summary>
				<p>{selected.description || 'Source records from the research dataset.'}</p>
				{#if selected.sources}<p>{selected.sources}</p>{/if}{#if selected.notes}<p>
						{selected.notes}
					</p>{/if}
				<p>
					<a
						href={selected.dataset === 'cspp'
							? 'https://ippsr.msu.edu/public-policy/correlates-state-policy'
							: 'https://dynamicdemocracy.shinyapps.io/ShinyApp/'}
						target="_blank"
						rel="noreferrer">Open source</a
					>
				</p>
			</details>
			<div class="filters">
				<label
					>First state<select bind:value={firstState}
						>{#each states as state}<option value={state}>{stateNames[state] || state}</option
							>{/each}</select
					></label
				><label
					>Second state<select bind:value={secondState}
						><option value="">None</option>{#each states as state}<option value={state}
								>{stateNames[state] || state}</option
							>{/each}</select
					></label
				><label
					>Year<select bind:value={year}
						>{#each years as y}<option value={String(y)}>{y}</option>{/each}</select
					></label
				>
			</div>
			{#if hasPolicy && hasOpinion}<div class="controls" aria-label="Data shown">
					<button
						class:active={mode === 'both'}
						aria-pressed={mode === 'both'}
						on:click={() => (mode = 'both')}>Both</button
					><button
						class:active={mode === 'policy'}
						aria-pressed={mode === 'policy'}
						on:click={() => (mode = 'policy')}>Policy</button
					><button
						class:active={mode === 'opinion'}
						aria-pressed={mode === 'opinion'}
						on:click={() => (mode = 'opinion')}>Public opinion</button
					>{#if rows.some((r) => r.kind === 'proximity')}<button
							class:active={mode === 'proximity'}
							aria-pressed={mode === 'proximity'}
							on:click={() => (mode = 'proximity')}>Proximity</button
						>{/if}
				</div>{/if}
			<div class="controls" aria-label="Chart view">
				<button
					class:active={view === 'timeline'}
					aria-pressed={view === 'timeline'}
					on:click={() => (view = 'timeline')}>Over time</button
				><button
					class:active={view === 'year'}
					aria-pressed={view === 'year'}
					on:click={() => (view = 'year')}>Compare {year}</button
				>
			</div>
			{#if anyMulti}<p class="warning">
					Some state-years have multiple source records. All appear in the table; those values are
					not plotted.
				</p>{/if}
			{#each kinds as kind}<section class="chart-panel">
					<ResearchChart
						title={kindLabel(kind)}
						rows={shown.filter((r) => r.kind === kind && r.value !== null)}
						{stateNames}
						{view}
						{year}
					/>
				</section>{/each}
			<p class="subtle">
				Public opinion is modeled from surveys. Policy numbers use the source’s coding. Different
				measures use different scales.
			</p>
			<h2>Source values</h2>
			<p class="subtle">
				Showing {Math.min(shown.length, 250)} of {shown.length} records. Narrow the selection to see
				more.
			</p>
			<div class="table-scroll">
				<table>
					<thead
						><tr><th>Year</th><th>State</th><th>Data</th><th>Value</th><th>Details</th></tr></thead
					><tbody
						>{#each shown.slice(0, 250) as row}<tr
								><td>{row.year}</td><td>{stateNames[row.state] || row.state}</td><td
									>{kindLabel(row.kind)}</td
								><td>{displayValue(row)}</td><td
									><details>
										<summary>Source</summary>
										<p>Exact value: {row.raw || '—'}</p>
										<p>{row.details || '—'}</p>
									</details></td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>
		{/if}
	{/if}
</main>

<style>
	.research {
		max-width: 1180px;
		margin: auto;
		padding: 24px;
		color: #172b36;
		font-size: 16px;
		line-height: 1.35;
	}
	.research h1 {
		font-size: 28px;
		line-height: 1.15;
		margin: 0 0 6px;
	}
	.research h2 {
		font-size: 20px;
		margin: 20px 0 4px;
	}
	.research p {
		margin: 8px 0;
	}
	.research a,
	.back {
		color: #075e72;
		text-decoration: underline;
	}
	.subtle {
		color: #425d68;
		font-size: 16px;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin: 16px 0;
	}
	.filters label {
		display: grid;
		gap: 4px;
		flex: 1 1 180px;
		font-weight: 600;
	}
	.filters input,
	.filters select {
		width: 100%;
		border: 1px solid #8c9fa7;
		border-radius: 4px;
		padding: 9px;
		background: white;
		font: inherit;
		font-weight: 400;
	}
	.results {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
		gap: 8px;
	}
	.result {
		border: 1px solid #d2dfe2;
		text-align: left;
		border-radius: 5px;
		background: white;
		padding: 12px;
		display: grid;
		gap: 4px;
	}
	.result span {
		color: #425d68;
		font-size: 16px;
	}
	.result:hover {
		border-color: #126b78;
	}
	.button,
	.controls button {
		border: 1px solid #8fa4ab;
		border-radius: 4px;
		background: white;
		padding: 8px 13px;
		font: inherit;
	}
	.button {
		margin-top: 12px;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 12px 0;
	}
	.controls .active {
		background: #174f5e;
		color: white;
		border-color: #174f5e;
	}
	.back {
		border: 0;
		background: none;
		padding: 0;
		margin: 0 0 12px;
		font: inherit;
	}
	.chart-panel {
		border-top: 1px solid #d5e0e3;
		margin-top: 10px;
	}
	.warning {
		border-left: 4px solid #a56a17;
		padding: 8px 10px;
		background: #fff6e7;
	}
	.table-scroll {
		overflow: auto;
		border: 1px solid #d5e0e3;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 690px;
	}
	th,
	td {
		padding: 9px;
		text-align: left;
		vertical-align: top;
		border-bottom: 1px solid #e1e9eb;
	}
	th {
		background: #f5f8f8;
	}
	details {
		margin: 10px 0;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible,
	select:focus-visible {
		outline: 3px solid #13758b;
		outline-offset: 2px;
	}
	@media (max-width: 600px) {
		.research {
			padding: 16px;
		}
		.research h1 {
			font-size: 24px;
		}
		.filters {
			gap: 8px;
		}
		.filters label {
			flex-basis: 45%;
		}
	}
</style>
