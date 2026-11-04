<script>
	import * as d3 from 'd3';
	import { fPct } from '#lib/data.js';
	import { axis, gridAxis } from '#lib/axis.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// RISING INSIGHTS 4: getting to work, across the 40 metros, with the two offer cities highlighted.
	// x: average one-way commute (minutes); y: share of workers who commute without a car
	// (public transit or walking). Census ACS 2024.
	let { data, offers } = $props();

	const carFree = (d) => d.transit + d.walk;
	const W = 900;
	const H = 380;
	const M = { l: 56, r: 24, t: 14, b: 44 };
	let x = $derived(
		d3
			.scaleLinear()
			.domain(d3.extent(data.cities, (d) => d.commute))
			.nice()
			.range([M.l, W - M.r])
	);
	let y = $derived(
		d3
			.scaleLinear()
			.domain([0, d3.max(data.cities, carFree) * 1.08])
			.nice()
			.range([H - M.b, M.t])
	);
	let xAxis = $derived(gridAxis(d3.axisBottom(x).ticks(8).tickFormat((v) => v + ' min'), H - M.b - M.t));
	let yAxis = $derived(gridAxis(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')), W - M.l - M.r));

	const keyOf = (city) => (city === offers.A.city ? 'a' : city === offers.B.city ? 'b' : '');
	let dots = $derived([...data.cities].sort((p, q) => (keyOf(p.city) ? 1 : 0) - (keyOf(q.city) ? 1 : 0)));

	let chips = $derived(['A', 'B'].map((k) => ({ k, c: data.byCity[offers[k].city] })));
	let insight = $derived.by(() => {
		const [a, b] = chips.map((ch) => ch.c);
		const [car, noCar] = carFree(a) >= carFree(b) ? [b, a] : [a, b];
		const median = d3.median(data.cities, (d) => d.commute);
		return `The average commute in ${a.city} is ${Math.round(a.commute)} minutes each way, against ${Math.round(b.commute)} in ${b.city} (typical metro: ${Math.round(median)}). In ${noCar.city}, ${fPct(carFree(noCar))} of workers get there by transit or on foot; in ${car.city}, ${fPct(car.driveAlone)} drive alone.`;
	});
</script>

<div class="viz">
		<div class="chips">
			{#each chips as ch (ch.k)}
				<div class="chip {ch.k.toLowerCase()}">
					<b>{ch.c.city}</b>
					<span><strong>{Math.round(ch.c.commute)} min</strong> average commute, one way</span>
					<span>
						<strong>{fPct(ch.c.transit)}</strong> transit · <strong>{fPct(ch.c.walk)}</strong> walk ·
						<strong>{fPct(ch.c.driveAlone)}</strong> drive alone · <strong>{fPct(ch.c.wfh)}</strong> work from home
					</span>
				</div>
			{/each}
		</div>
		<div class="card">
			<h3>Commute time vs. getting there without a car</h3>
			<p class="sub">
				Each dot is a metro. The budget behind our savings numbers assumes you own a car everywhere, so in metros near
				the top, going car-free could leave you more.
			</p>
			<svg viewBox="0 0 {W} {H}" role="img" aria-label="Scatterplot of average commute time against share of car-free commuters for 40 metros">
				<g class="axis" transform="translate(0,{H - M.b})" {@attach axis(xAxis)}></g>
				<g class="axis" transform="translate({M.l},0)" {@attach axis(yAxis)}></g>
				<text class="axis-label" x={W - M.r} y={H - 8} text-anchor="end">Average one-way commute (minutes)</text>
				<text class="axis-label" transform="translate(14,{M.t}) rotate(-90)" text-anchor="end"
					>Commute by transit or on foot</text
				>
				{#each dots as d (d.city)}
					{@const k = keyOf(d.city)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<circle
						class="dot {k}"
						cx={x(d.commute)}
						cy={y(carFree(d))}
						r={k ? 8 : 5.5}
						onpointermove={(e) =>
							showTip(e, {
								title: `${d.city}, ${d.state}`,
								meta: d.region,
								rows: [
									[Math.round(d.commute) + ' min', 'average commute'],
									[fPct(d.transit), 'public transit'],
									[fPct(d.walk), 'walk'],
									[fPct(d.driveAlone), 'drive alone']
								]
							})}
						onpointerleave={hideTip}
					/>
					{#if k}
						<!-- Near the right edge the label goes on the dot's left so it stays inside the chart. -->
						{@const flip = x(d.commute) > W - 110}
						<text
							class="lbl"
							x={x(d.commute) + (flip ? -12 : 12)}
							y={y(carFree(d))}
							dy="0.34em"
							text-anchor={flip ? 'end' : 'start'}>{d.city}</text
						>
					{/if}
				{/each}
			</svg>
		</div>
</div>

<style>
	.chips {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-bottom: 14px;
	}
	@media (max-width: 760px) {
		.chips {
			grid-template-columns: 1fr;
		}
	}
	.chip {
		border-left: 4px solid var(--a);
		background: var(--surface);
		border-radius: 8px;
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		font-size: 13px;
		color: var(--ink-2);
	}
	.chip.b {
		border-left-color: var(--b);
	}
	.chip b {
		font-size: 15px;
		color: var(--ink);
	}
	.chip strong {
		color: var(--ink);
	}
	.dot {
		fill: var(--series-soft);
		fill-opacity: 0.85;
		stroke: var(--surface);
		stroke-width: 1.5;
	}
	.dot.a {
		fill: var(--a);
		fill-opacity: 1;
	}
	.dot.b {
		fill: var(--b);
		fill-opacity: 1;
	}
	.lbl {
		font-size: 12px;
		font-weight: 650;
		fill: var(--ink);
		paint-order: stroke;
		stroke: var(--surface);
		stroke-width: 4px;
	}
</style>
