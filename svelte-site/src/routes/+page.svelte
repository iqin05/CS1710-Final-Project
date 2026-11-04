<script>
	// From +page.server.js at build time: the default offers, so the title screen draws immediately.
	let { data: prerendered } = $props();

	import { onMount } from 'svelte';
	import { loadData, offerAt, defaultOffers, titleEcon } from '#lib/data.js';
	import Tooltip from '#lib/Tooltip.svelte';
	import Hook from '#lib/Hook.svelte';
	import Compare from '#lib/Compare.svelte';
	import Proto1 from '#lib/Proto1.svelte';
	import Message from '#lib/Message.svelte';
	import Heatmap from '#lib/Heatmap.svelte';
	import Proto2 from '#lib/Proto2.svelte';
	import Timeline from '#lib/Timeline.svelte';
	import Breakdown from '#lib/Breakdown.svelte';
	import Scrolly from '#lib/Scrolly.svelte';
	import TitleScreen from '#lib/TitleScreen.svelte';

	// The scroll index: one step per storyboard beat.
	const BEATS = [
		{ id: 'hook' },
		{ id: 'rising' },
		{ id: 'message' },
		{ id: 'solution' }
	];

	let data = $state(null);
	let error = $state(null);

	// The reader's two offers. Every section reads these; the hook and the final section edit them.
	// Set from the data on load, before any section renders.
	let offers = $state(null);

	// Changing an offer's city or field resets its salary to that city × field's entry-level pay.
	function setOffer(key, patch) {
		const o = { ...offers[key], ...patch };
		offers[key] = (patch.city || patch.field) && patch.salary == null ? offerAt(data, o.city, o.field) : o;
	}

	// Two different cities, one field both have (skipping the thin catch-all fields),
	// each at its local entry-level (25th-percentile) salary.
	function randomize() {
		const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
		const a = pick(data.cities).city;
		let b = pick(data.cities).city;
		while (b === a) b = pick(data.cities).city;
		const field = pick(
			data.fields.filter((f) => f !== 'Other' && f !== 'Office & Admin' && data.byField[a][f] && data.byField[b][f])
		);
		offers = { A: offerAt(data, a, field), B: offerAt(data, b, field) };
	}

	const reset = () => (offers = defaultOffers(data));


	onMount(async () => {
		try {
			const d = await loadData();
			offers = defaultOffers(d);
			data = d;
		} catch (e) {
			error = e.message;
		}
	});
</script>

<svelte:head>
	<title>Beyond the First Paycheck</title>
	<meta
		name="description"
		content="CS 1710 data story: where a recent graduate can find work and make financial progress, across 40 U.S. metros."
	/>
</svelte:head>

<TitleScreen
	offers={offers ?? prerendered.initialOffers}
	econ={data && offers ? titleEcon(data, offers) : prerendered.initialEcon}
/>

{#if error}
	<p class="wrap status">Could not load data: {error}</p>
{:else if !data}
	<p class="wrap status">Loading…</p>
{:else}
	<Scrolly steps={BEATS}>
		{#snippet scene(beat)}
			{#if beat.id === 'hook'}
				<Hook {data} {offers} {setOffer} onrandomize={randomize} onreset={reset} />
			{:else if beat.id === 'rising'}
				<Compare {data} {offers} />
			{:else if beat.id === 'message'}
				<Message {data} {offers} />
			{:else}
				<!-- The tool, then industry, time to $10K, job opportunities, and the full picture. -->
				<Proto2 {data} {offers} />
				<Heatmap {data} {offers} />
				<Timeline {data} {offers} />
				<Proto1 {data} {offers} />
				<Breakdown {data} {offers} {setOffer} />
			{/if}
		{/snippet}
	</Scrolly>
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
