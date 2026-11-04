<script>
	import { onMount } from 'svelte';
	import { ALL, DEFAULT_OFFERS, loadData, fieldRow, round100 } from '#lib/data.js';
	import Tooltip from '#lib/Tooltip.svelte';
	import Hook from '#lib/Hook.svelte';
	import Compare from '#lib/Compare.svelte';
	import Proto1 from '#lib/Proto1.svelte';
	import Message from '#lib/Message.svelte';
	import Heatmap from '#lib/Heatmap.svelte';
	import Proto2 from '#lib/Proto2.svelte';
	import Timeline from '#lib/Timeline.svelte';
	import Breakdown from '#lib/Breakdown.svelte';

	let data = $state(null);
	let error = $state(null);

	// The reader's two offers. Every section reads these; the hook and the final section edit them.
	let offers = $state(structuredClone(DEFAULT_OFFERS));

	// Changing an offer's city or field resets its salary to that city × field's typical entry pay.
	function setOffer(key, patch) {
		const o = { ...offers[key], ...patch };
		if ((patch.city || patch.field) && patch.salary == null) {
			const r = fieldRow(data, o.city, o.field) ?? fieldRow(data, o.city, ALL);
			o.salary = round100(r.salary);
		}
		offers[key] = o;
	}

	// Two different cities, one field both have (skipping the thin catch-all fields),
	// each paying near its local 25th-percentile salary (±8%).
	function randomize() {
		const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
		const a = pick(data.cities).city;
		let b = pick(data.cities).city;
		while (b === a) b = pick(data.cities).city;
		const field = pick(
			data.fields.filter((f) => f !== 'Other' && f !== 'Office & Admin' && data.byField[a][f] && data.byField[b][f])
		);
		const jitter = () => 1 + (Math.random() - 0.5) * 0.16;
		offers = {
			A: { city: a, field, salary: round100(fieldRow(data, a, field).salary * jitter()) },
			B: { city: b, field, salary: round100(fieldRow(data, b, field).salary * jitter()) }
		};
	}

	const reset = () => (offers = structuredClone(DEFAULT_OFFERS));

	const NAV = [
		['hook', 'Two offers'],
		['compare', 'Side by side'],
		['jobs', 'Jobs'],
		['message', 'The message'],
		['field', 'Your field'],
		['explore', 'Explore'],
		['time', 'Your first $10K'],
		['offer', 'Your offer'],
		['about', 'About']
	];

	onMount(async () => {
		try {
			data = await loadData();
		} catch (e) {
			error = e.message;
		}
	});
</script>

<svelte:head>
	<title>What You Keep</title>
	<meta
		name="description"
		content="CS 1710 data story: where a recent graduate can find work and make financial progress, across 40 U.S. metros."
	/>
</svelte:head>

<nav class="top">
	<div class="wrap">
		<span class="brand">What You Keep</span>
		{#each NAV as [id, label] (id)}<a href="#{id}">{label}</a>{/each}
	</div>
</nav>

{#if error}
	<p class="wrap status">Could not load data: {error}</p>
{:else if !data}
	<p class="wrap status">Loading…</p>
{:else}
	<Hook {data} {offers} {setOffer} onrandomize={randomize} onreset={reset} />
	<Compare {data} {offers} />
	<Proto1 {data} {offers} />
	<Message {data} {offers} />
	<Heatmap {data} {offers} />
	<Proto2 {data} {offers} />
	<Timeline {data} {offers} />
	<Breakdown {data} {offers} {setOffer} />
	<Tooltip />
{/if}

<footer id="about">
	<div class="wrap">
		<p>
			<strong>About the data.</strong> One combined dataset for 40 U.S. metro areas (matched on CBSA code). Cost of
			living from the Economic Policy Institute Family Budget Calculator (single adult, 2026 edition, 2025 dollars).
			Jobs and wages from BLS OEWS (May 2025), keeping the 132 occupations that typically require a bachelor's degree
			and no experience. Population, rent and commutes from the Census ACS 2024. Price levels from BEA Regional Price
			Parities. Unemployment from BLS LAUS (2025). "Entry-level salary" is the employment-weighted 25th-percentile wage
			across those occupations. Savings = estimated take-home at that salary minus EPI's budget excluding taxes; the
			budget assumes car ownership everywhere, so transit-heavy metros such as New York are likely understated.
		</p>
		<p>CS 1710 · Lorena Alvarez, Anna Feng, Ivy Qin</p>
	</div>
</footer>

<style>
	nav.top {
		position: sticky;
		top: 0;
		z-index: 5;
		background: rgba(247, 246, 242, 0.92);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--border);
	}
	nav.top .wrap {
		display: flex;
		gap: 4px 18px;
		align-items: center;
		height: 46px;
		overflow-x: auto;
		white-space: nowrap;
	}
	.brand {
		font-weight: 650;
		margin-right: auto;
	}
	nav a {
		font-size: 13px;
		color: var(--ink-2);
		text-decoration: none;
	}
	nav a:hover {
		color: var(--ink);
	}
	.status {
		padding-top: 40px;
		color: var(--ink-2);
	}
	footer {
		padding: 40px 0 60px;
		color: var(--muted);
		font-size: 13px;
	}
</style>
