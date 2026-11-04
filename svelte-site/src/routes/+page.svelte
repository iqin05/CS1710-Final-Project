<script>
	import { onMount } from 'svelte';
	import { loadData, offerAt, defaultOffers } from '#lib/data.js';
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

	// The scroll index: one step per storyboard beat.
	const BEATS = [
		{ id: 'hook', label: 'Hook' },
		{ id: 'rising', label: 'Rising insights' },
		{ id: 'message', label: 'Main message' },
		{ id: 'solution', label: 'Solution / next steps' }
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

<header class="title-screen">
	<h1>Beyond the First Paycheck</h1>
	<a class="cue" href="#hook">
		<span>Scroll to begin</span>
		<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
			<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</a>
</header>

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
	.title-screen {
		min-height: 100vh;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0 16px;
		text-align: center;
		position: relative;
	}
	.title-screen h1 {
		font-size: clamp(40px, 8vw, 96px);
		line-height: 1.02;
		letter-spacing: -0.025em;
		max-width: 12ch;
		margin: 0;
	}
	.cue {
		position: absolute;
		bottom: 32px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 650;
		color: var(--muted);
		text-decoration: none;
	}
	.cue:hover {
		color: var(--ink);
	}
	.cue svg {
		animation: nudge 1.8s ease-in-out infinite;
	}
	@keyframes nudge {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(5px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cue svg {
			animation: none;
		}
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
