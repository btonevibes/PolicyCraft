<script lang="ts">
	import { Search, Database, ArrowLeft, ExternalLink } from 'lucide-svelte/icons';
	type ResearchMetric = {
		id: string;
		dataset: string;
		variable: string;
		title: string;
		years: string;
		category: string;
		description?: string;
		sources?: string;
		notes?: string;
		citations?: string[];
	};

	export let data: { metrics: ResearchMetric[]; available: boolean };
	let query = '';
	let source = 'all';
	let visibleCount = 40;
	let selected: ResearchMetric | null = null;
	let observations: Array<[number, string, string, string?]> = [];
	let chosenState = 'all';
	let chosenYear = '';
	let loading = false;
	let problem = '';
	let requestNumber = 0;

	$: matches = data.metrics
		.filter((item) => source === 'all' || item.dataset === source)
		.filter((item) =>
			`${item.title} ${item.variable} ${item.category} ${item.years}`
				.toLowerCase()
				.includes(query.trim().toLowerCase())
		)
		.sort((a, b) => a.title.localeCompare(b.title));
	$: states = [...new Set(observations.map((row) => row[1]))].sort();
	$: filtered = observations
		.filter(
			(row) =>
				(chosenState === 'all' || row[1] === chosenState) &&
				(!chosenYear || String(row[0]) === String(chosenYear))
		)
		.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]));

	async function openMeasure(item: ResearchMetric) {
		const request = ++requestNumber;
		selected = item;
		chosenState = 'all';
		chosenYear = '';
		observations = [];
		loading = true;
		problem = '';
		try {
			const response = await fetch(`/api/research/${item.id}`);
			if (!response.ok) throw new Error('Unable to load this measure.');
			const result = await response.json();
			if (request === requestNumber) {
				selected = result.meta;
				observations = result.observations;
			}
		} catch {
			if (request === requestNumber) problem = 'Could not load this measure. Please try again.';
		} finally {
			if (request === requestNumber) loading = false;
		}
	}
	function backToResults() {
		requestNumber++;
		selected = null;
		observations = [];
		loading = false;
	}
</script>

<svelte:head><title>Research Data | PolicyCraft</title></svelte:head>
<div class="mx-auto max-w-6xl px-3 py-6 sm:px-6">
	<div class="mb-8 flex items-start gap-3">
		<div class="rounded-xl bg-sky-100 p-3 text-sky-800"><Database class="h-6 w-6" /></div>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">Research Data</h1>
			<p class="mt-2 max-w-3xl text-slate-600">
				Explore state policy measures from Correlates of State Policy and Dynamic Democracy. Your
				own policies stay in the Policy Repository.
			</p>
		</div>
	</div>
	<div
		class="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-slate-700"
	>
		These are historical research snapshots, not a live account of current law. Correlates is
		version 2.6; Dynamic Democracy includes its state-policy dataset. Loaded November 2026; these
		copies do not update automatically. Coverage varies by measure and state. For its public-opinion
		and ideology views, visit Dynamic Democracy below.
		<a
			class="font-medium text-sky-800 underline"
			href="https://ippsr.msu.edu/public-policy/correlates-state-policy"
			target="_blank"
			rel="noreferrer">Correlates source <ExternalLink class="inline h-3 w-3" /></a
		>
		<span aria-hidden="true"> · </span>
		<a
			class="font-medium text-sky-800 underline"
			href="https://dynamicdemocracy.shinyapps.io/ShinyApp/"
			target="_blank"
			rel="noreferrer">Dynamic Democracy source <ExternalLink class="inline h-3 w-3" /></a
		>
	</div>

	{#if !data.available}
		<div role="alert" class="rounded-lg border border-amber-300 bg-amber-50 p-4">
			Research data is temporarily unavailable. Please try again.
		</div>
	{:else if data.metrics.length === 0}
		<div role="status" class="rounded-lg border border-amber-300 bg-amber-50 p-4">
			The research data has not been loaded yet.
		</div>
	{:else if !selected}
		<div class="grid gap-4 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px]">
			<label class="block text-sm font-medium"
				>Search measures
				<div class="relative mt-1">
					<Search class="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input
						class="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3"
						bind:value={query}
						on:input={() => (visibleCount = 40)}
						placeholder="Try minimum wage or education"
					/>
				</div>
			</label>
			<label class="block text-sm font-medium"
				>Dataset
				<select
					class="mt-1 w-full rounded-md border border-slate-300 bg-white p-2"
					bind:value={source}
					on:change={() => (visibleCount = 40)}
				>
					<option value="all">Both datasets</option><option value="cspp"
						>Correlates of State Policy</option
					><option value="dynamic">Dynamic Democracy</option>
				</select>
			</label>
		</div>
		<p class="my-4 text-sm text-slate-600">
			{matches.length} measures found{matches.length > visibleCount
				? ` · showing ${visibleCount}`
				: ''}
		</p>
		{#if matches.length === 0}<p class="rounded-lg border p-6 text-slate-600">
				No measures match that search.
			</p>{/if}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each matches.slice(0, visibleCount) as item (item.id)}
				<button
					class="rounded-xl border bg-white p-4 text-left shadow-sm hover:border-sky-500 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
					on:click={() => openMeasure(item)}
				>
					<span class="text-xs font-semibold uppercase tracking-wide text-sky-700"
						>{item.dataset === 'cspp' ? 'Correlates of State Policy' : 'Dynamic Democracy'}</span
					>
					<span class="mt-2 block text-base font-semibold text-slate-900">{item.title}</span>
					<span class="mt-1 block text-sm text-slate-600"
						>{item.category || 'State research'}{item.years ? ` · ${item.years}` : ''}</span
					>
				</button>
			{/each}
		</div>
		{#if matches.length > visibleCount}
			<button
				class="mt-5 rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
				on:click={() => (visibleCount += 40)}>Show more measures</button
			>
		{/if}
	{:else}
		<button
			class="mb-5 inline-flex items-center gap-2 text-sm font-medium text-sky-800 hover:underline"
			on:click={backToResults}><ArrowLeft class="h-4 w-4" /> Back to measures</button
		>
		<section class="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
			<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">
				{selected.dataset === 'cspp'
					? 'Correlates of State Policy · version 2.6'
					: 'Dynamic Democracy · state policies'}
			</p>
			<h2 class="mt-2 text-2xl font-semibold">{selected.title}</h2>
			<p class="mt-1 text-sm text-slate-500">
				Source variable: {selected.variable}{selected.years
					? ` · Reported coverage: ${selected.years}`
					: ''}
			</p>
			{#if loading}<p role="status" class="mt-6">Loading observations…</p>{/if}
			{#if problem}<p role="alert" class="mt-6 text-red-700">{problem}</p>{/if}
			{#if !loading && !problem}
				{#if selected.description}<p class="mt-5 whitespace-pre-line leading-7 text-slate-700">
						{selected.description}
					</p>{/if}
				<details class="mt-4 text-sm">
					<summary class="cursor-pointer font-medium text-sky-800">Sources and citations</summary>
					<p class="mt-3 whitespace-pre-line text-slate-700">
						{selected.sources || 'See the original dataset for source details.'}
					</p>
					{#if selected.notes}<p class="mt-3 whitespace-pre-line text-slate-700">
							{selected.notes}
						</p>{/if}
					{#each selected.citations || [] as citation}{#if citation}<p
								class="mt-3 whitespace-pre-line text-slate-700"
							>
								{citation}
							</p>{/if}{/each}
				</details>
				<div class="mt-6 grid gap-4 sm:grid-cols-2">
					<label class="text-sm font-medium"
						>State <select
							class="mt-1 w-full rounded-md border border-slate-300 bg-white p-2"
							bind:value={chosenState}
							><option value="all">All states</option>{#each states as state}<option value={state}
									>{state}</option
								>{/each}</select
						></label
					>
					<label class="text-sm font-medium"
						>Year <input
							class="mt-1 w-full rounded-md border border-slate-300 p-2"
							inputmode="numeric"
							type="number"
							min="1800"
							max="2100"
							bind:value={chosenYear}
							placeholder="All years"
						/></label
					>
				</div>
				<p class="my-4 text-sm text-slate-600">
					{filtered.length} observations{filtered.length > 250
						? ' · showing the most recent 250; filter by state or year to narrow'
						: ''}. Missing source values are omitted.
				</p>
				{#if selected.dataset === 'dynamic'}<p class="mb-3 text-sm text-slate-600">
						The two value columns retain the source’s original field names; use the description and
						sources above to interpret them.
					</p>{/if}
				{#if filtered.length === 0}<p class="rounded-lg bg-slate-50 p-4">
						No observations match these filters.
					</p>{:else}
					<div class="overflow-x-auto rounded-lg border">
						<table class="w-full text-left text-sm">
							<thead class="bg-slate-50"
								><tr
									><th class="p-3">Year</th><th class="p-3">State</th><th class="p-3"
										>{selected.dataset === 'dynamic' ? 'Policy value' : 'Value'}</th
									>{#if selected.dataset === 'dynamic'}<th class="p-3">Policy_real value</th
										>{/if}</tr
								></thead
							><tbody
								>{#each filtered.slice(0, 250) as row}<tr class="border-t"
										><td class="p-3">{row[0]}</td><td class="p-3">{row[1]}</td><td class="p-3"
											>{row[2] || '—'}</td
										>{#if selected.dataset === 'dynamic'}<td class="p-3">{row[3] || '—'}</td
											>{/if}</tr
									>{/each}</tbody
							>
						</table>
					</div>
				{/if}
			{/if}
		</section>
	{/if}
</div>
