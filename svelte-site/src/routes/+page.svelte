<script>
	// From +page.server.js at build time: the default offers, so the title screen draws immediately.
	let { data: prerendered } = $props();

	import { onMount } from 'svelte';
	import { loadData, offerAt, defaultOffers, titleEcon } from '#lib/data.js';
	import Tooltip from '#lib/Tooltip.svelte';
	import Hook from '#lib/Hook.svelte';
	import Industries from '#lib/Industries.svelte';
	import Proto1 from '#lib/Proto1.svelte';
	import Rent from '#lib/Rent.svelte';
	import Commute from '#lib/Commute.svelte';
	import Timeline from '#lib/Timeline.svelte';
	import Message from '#lib/Message.svelte';
	import Compare from '#lib/Compare.svelte';
	import Breakdown from '#lib/Breakdown.svelte';
	import Scrolly from '#lib/Scrolly.svelte';
	import StepStory from '#lib/StepStory.svelte';
	import TitleScreen from '#lib/TitleScreen.svelte';
	import * as story from '#lib/story.js';
	import { fSav } from '#lib/data.js';

	// Each stage is scrollytelling: text steps on the left, a pinned visual on the right (`vis`
	// names the visual; a change cross-fades). Rising insights follow a new grad's train of thought:
	// is there work for me, does it pay, what does the city hire everyone for, where will I live,
	// how will I get to work, and what's left at the end of the month.
	const RISING = [
		{ key: 'me', vis: 'jobs', view: 'bars' },
		{ key: 'pay', vis: 'jobs', view: 'scatter' },
		{ key: 'everyone', vis: 'industries' },
		{ key: 'rent', vis: 'rent' },
		{ key: 'commute', vis: 'commute' },
		{ key: 'savings', vis: 'time' }
	];
	const MESSAGE = [
		{ key: 'claim', vis: 'scatter' },
		{ key: 'why', vis: 'scatter' },
		{ key: 'pattern', vis: 'scatter' }
	];
	const NEXT = [
		{ key: 'table', vis: 'table' },
		{ key: 'try', vis: 'breakdown' }
	];
	// Timeline row height, so all 40 metros fit the pinned panel on this screen.
	let innerHeight = $state(900);
	let laneH = $derived(Math.max(10, Math.min(22, (innerHeight - 340) / 40)));

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
				<StepStory id="rising" steps={RISING} text={risingText} graphic={risingVis} />
			{:else if beat.id === 'message'}
				<StepStory id="message" steps={MESSAGE} text={messageText} graphic={messageVis} />
			{:else}
				<StepStory id="next" steps={NEXT} text={nextText} graphic={nextVis} />
			{/if}
		{/snippet}
	</Scrolly>
	<Tooltip />
{/if}

<svelte:window bind:innerHeight />

<!-- ============ Rising insights: the words ============ -->
{#snippet risingText(s)}
	{#if s.key === 'me'}
		{@const j = story.jobsForMe(data, offers)}
		<h2>Is there work for me there?</h2>
		<p>
			Before comparing paychecks, start where every job search starts. {j.named
				? `In ${j.label}, `
				: 'Counting every entry-level job, '}<strong>{offers.A.city}</strong> ranks #{j.rankA} of {j.total} metros and
			<strong>{offers.B.city}</strong> ranks #{j.rankB}: {j.jobsA} openings against {j.jobsB}{j.ratio
				? `, about ${j.ratio}× as many in ${j.more}`
				: ''}.
		</p>
		{#if !j.named}
			<p>Your offers don't name a field yet. Pick yours in the menu to see your own job market.</p>
		{/if}
	{:else if s.key === 'pay'}
		{@const p = story.payVsJobs(data, offers)}
		{@const what = p.label === 'any field' ? 'entry-level' : p.label}
		<h2>Do more openings mean better pay?</h2>
		<p>Not necessarily. Across the metros, the number of {what} openings tracks the typical salary {p.strength}.</p>
		<p>
			A typical {what} salary is <strong>{p.salA}</strong> in {offers.A.city} and <strong>{p.salB}</strong> in
			{offers.B.city}.
		</p>
	{:else if s.key === 'everyone'}
		{@const e = story.forEveryone(data, offers)}
		<h2>And what do these cities hire everyone for?</h2>
		<p>Zoom out from your own field to each city's whole entry-level job market.</p>
		{#each e as c (c.city)}
			<p>
				<strong>{c.city}</strong> hires new grads mostly in {c.top[0]} ({c.topShare}), {c.top[1]} and {c.top[2]}.{#if c.mine}
					{' '}{c.mine.field} is #{c.mine.rank} of {c.mine.of}, at {c.mine.share}.{/if}
			</p>
		{/each}
		<p>A city built around a few fields can be a great fit for those grads, and a thinner market for everyone else.</p>
	{:else if s.key === 'rent'}
		{@const r = story.rent(data, offers)}
		<h2>Landing the job is half of it. Where will you live?</h2>
		<p>
			A studio rents for <strong>{r.rentHi}</strong> a month in {r.hi}, {r.diff} more than in {r.lo} ({r.rentLo}). The
			typical metro is {r.median}.
		</p>
		<p>
			At your offers, rent would take <strong>{r.shareA}</strong> of your take-home pay in {offers.A.city} and
			<strong>{r.shareB}</strong> in {offers.B.city}.{r.bite
				? ' Pricier cities pay more, but not enough: the higher the rent, the bigger the bite.'
				: ''}
		</p>
	{:else if s.key === 'commute'}
		{@const c = story.commute(data, offers)}
		<h2>Then, how will you get to work?</h2>
		<p>
			The average commute is <strong>{c.minA} minutes</strong> each way in {c.a} and <strong>{c.minB}</strong> in {c.b}
			(typical metro: {c.median}).
		</p>
		<p>
			In {c.rider}, {c.riderShare} of workers get there by transit or on foot; in {c.driver}, {c.driveAlone} drive alone.
			Our budget assumes you own a car everywhere, so going car-free could stretch a paycheck further in transit cities.
		</p>
	{:else}
		{@const v = story.savings(data, offers)}
		<h2>Put it all together: what's left each month?</h2>
		<p>After taxes, rent, getting around and the rest of a modest budget, at your offers:</p>
		{#each v as o (o.k)}
			<div class="left {o.k.toLowerCase()}">
				<span class="who">Offer {o.k} · {o.city} · {o.salary}/yr</span>
				<b>{fSav(o.left)}<small>/mo</small></b>
				<span>{isFinite(o.months) ? `${o.monthsTxt} to save $10,000` : 'never reaches $10,000'}</span>
			</div>
		{/each}
		<p>Every metro is in the chart, on its typical entry salary. Change the field, region or goal to explore.</p>
	{/if}
{/snippet}

<!-- ============ Rising insights: the visuals ============ -->
{#snippet risingVis(s)}
	{#if s.vis === 'jobs'}
		<Proto1 {data} {offers} view={s.view} />
	{:else if s.vis === 'industries'}
		<Industries {data} {offers} />
	{:else if s.vis === 'rent'}
		<Rent {data} {offers} />
	{:else if s.vis === 'commute'}
		<Commute {data} {offers} />
	{:else}
		<Timeline {data} {offers} {laneH} />
	{/if}
{/snippet}

<!-- ============ Main message ============ -->
{#snippet messageText(s)}
	{@const m = story.message(data, offers)}
	{#if s.key === 'claim'}
		<h2 class="claim">Recent graduates should compare cities by how much they can save, not just what they earn.</h2>
		<p>
			{#if m.same}
				Both offers are in {m.hi}, so the comparison comes down to the salaries themselves.
			{:else if m.reversed}
				A higher salary doesn't mean you keep more. {m.hi} pays the {m.hiRank}-highest typical entry salary of the 40
				metros, {m.payGap} more than {m.lo}, yet {m.lo} leaves about <strong>{m.keepGap} more every month</strong>.
			{:else}
				{m.hi} pays {m.payGap} more a year than {m.lo} and also leaves more, but only {m.keepGap} more a month: most of
				the difference in pay goes to the difference in cost.
			{/if}
		</p>
	{:else if s.key === 'why'}
		<h2>Why savings?</h2>
		<p>
			Savings is the honest number: it's what's left after <strong>everything</strong> comes out, from taxes and rent to
			food, getting around, health care and other necessities. A salary is the number before any of that.
		</p>
		{#each m.ranks as r (r.city)}
			<p><strong>{r.city}</strong>: {r.salary} salary ({r.sRank} of 40) → {r.save} a month saved ({r.vRank} of 40)</p>
		{/each}
	{:else}
		<h2>The pattern holds across all 40 metros</h2>
		<p>
			Entry salary tracks the cost of a modest budget closely (correlation {m.rExp}) but barely tracks what's left over
			(correlation {m.rSav}). Higher-paying cities mostly cost more to live in.
		</p>
	{/if}
{/snippet}

<!-- The same scatter through all three steps; its mode follows the step. -->
{#snippet messageVis(s)}
	<Message {data} {offers} mode={s.key === 'claim' ? 'focus' : s.key === 'why' ? 'savings' : 'all'} />
{/snippet}

<!-- ============ Next steps ============ -->
{#snippet nextText(s)}
	{#if s.key === 'table'}
		{@const v = story.verdict(data, offers)}
		<h2>Back to your two offers, now with the full picture</h2>
		<p>
			{#if v.same}
				Both offers are in {v.hi}, so the higher salary simply keeps more.
			{:else if v.biggerWins}
				{v.hi} pays {v.payGap} more and also leaves {v.keepGap} more each month. Here the bigger number wins, but weigh
				the rest of the picture too.
			{:else}
				{v.hi} pays {v.payGap} more a year, yet {v.lo} leaves <strong>{v.keepGap} more in your pocket every month</strong>.
				The gap is cost, not pay.
			{/if}
		</p>
		<p>Savings and time to $10,000 lead the table; everything else you weighed follows.</p>
	{:else}
		<h2>Your turn: try other offers</h2>
		<p>Change either offer's salary, city or field. Every number in the story updates, including these paycheck bars.</p>
	{/if}
{/snippet}

{#snippet nextVis(s)}
	{#if s.vis === 'table'}
		<Compare {data} {offers} />
	{:else}
		<Breakdown {data} {offers} {setOffer} />
	{/if}
{/snippet}

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
	/* Main-message claim, larger than other step headings. */
	:global(.stepstory .text h2.claim) {
		font-size: 28px;
	}
	/* "What's left" figures in the savings step. */
	.left {
		border-left: 4px solid var(--a);
		padding: 4px 0 4px 12px;
		margin: 10px 0;
		display: flex;
		flex-direction: column;
		font-size: 13px;
		color: var(--ink-2);
	}
	.left.b {
		border-left-color: var(--b);
	}
	.left .who {
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		font-weight: 650;
		color: var(--muted);
	}
	.left b {
		font-size: 28px;
		line-height: 1.15;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.left b small {
		font-size: 14px;
		color: var(--ink-2);
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
