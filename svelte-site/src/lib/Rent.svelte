<script>
	import * as d3 from 'd3';
	import { f$, fPct, calc } from '#lib/data.js';
	import { axis, gridAxis } from '#lib/axis.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// RISING INSIGHTS 3: rent across the 40 metros, with the two offer cities highlighted.
	// x: monthly studio rent (HUD fair market rent, what a new mover pays); y: that rent as a share of
	// take-home pay on the metro's typical entry-level salary.
	let { data, offers } = $props();

	const W = 900;
	const H = 400;
	const M = { l: 56, r: 24, t: 14, b: 44 };
	let x = $derived(
		d3
			.scaleLinear()
			.domain(d3.extent(data.cities, (d) => d.housing))
			.nice()
			.range([M.l, W - M.r])
	);
	let y = $derived(
		d3
			.scaleLinear()
			.domain([0, d3.max(data.cities, (d) => d.rentShare) * 1.08])
			.nice()
			.range([H - M.b, M.t])
	);
	let xAxis = $derived(gridAxis(d3.axisBottom(x).ticks(8).tickFormat(d3.format('$,')), H - M.b - M.t));
	let yAxis = $derived(gridAxis(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')), W - M.l - M.r));

	const keyOf = (city) => (city === offers.A.city ? 'a' : city === offers.B.city ? 'b' : '');
	// Offer cities draw last so they sit on top.
	let dots = $derived([...data.cities].sort((p, q) => (keyOf(p.city) ? 1 : 0) - (keyOf(q.city) ? 1 : 0)));

	// Rank by rent, most expensive first.
	let byRent = $derived([...data.cities].sort((p, q) => q.housing - p.housing).map((c) => c.city));
	const ord = (n) => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] || 'th');

	// Each offer at its offered salary.
	let chips = $derived(
		['A', 'B'].map((k) => {
			const o = offers[k];
			const m = calc(data, o.city, o.salary);
			return { k, o, c: m.c, rent: m.housing, share: m.rentShare, rank: byRent.indexOf(o.city) + 1 };
		})
	);
	// Does rent take a bigger share where rent is higher? (Correlation across the 40 metros.)
	let rentVsShare = $derived.by(() => {
		const xs = data.cities.map((d) => d.housing);
		const ys = data.cities.map((d) => d.rentShare);
		const mx = d3.mean(xs);
		const my = d3.mean(ys);
		const num = d3.sum(xs.map((v, i) => (v - mx) * (ys[i] - my)));
		return num / Math.sqrt(d3.sum(xs.map((v) => (v - mx) ** 2)) * d3.sum(ys.map((v) => (v - my) ** 2)));
	});
	let insight = $derived.by(() => {
		const [a, b] = chips;
		const [hi, lo] = a.rent >= b.rent ? [a, b] : [b, a];
		const median = d3.median(data.cities, (d) => d.housing);
		const pattern =
			rentVsShare > 0.3
				? ' Salaries are higher where rent is higher, but not by enough: across the 40 metros, the pricier the rent, the bigger the bite it takes from the paycheck.'
				: '';
		return `A studio in ${hi.c.city} rents for ${f$(hi.rent)} a month, ${f$(hi.rent - lo.rent)} more than in ${lo.c.city} (${f$(lo.rent)}); the typical metro is ${f$(median)}.${pattern}`;
	});
</script>

<div class="viz">
		<div class="chips">
			{#each chips as ch (ch.k)}
				<div class="chip {ch.k.toLowerCase()}">
					<b>{ch.c.city}</b>
					<span><strong>{f$(ch.rent)}/mo</strong> studio · {ord(ch.rank)} priciest of 40</span>
					<span><strong>{fPct(ch.share)}</strong> of take-home at your offer ({f$(ch.o.salary)})</span>
				</div>
			{/each}
		</div>
		<div class="card">
			<h3>Studio rent vs. how much of the paycheck it takes</h3>
			<p class="sub">
				Each dot is a metro. Rent share is on that metro's typical entry-level salary; the cards above use your offers.
			</p>
			<svg viewBox="0 0 {W} {H}" role="img" aria-label="Scatterplot of studio rent against rent share of take-home pay for 40 metros">
				<g class="axis" transform="translate(0,{H - M.b})" {@attach axis(xAxis)}></g>
				<g class="axis" transform="translate({M.l},0)" {@attach axis(yAxis)}></g>
				<text class="axis-label" x={W - M.r} y={H - 8} text-anchor="end">Monthly studio rent (fair market rent)</text>
				<text class="axis-label" transform="translate(14,{M.t}) rotate(-90)" text-anchor="end"
					>Rent as share of take-home pay</text
				>
				{#each dots as d (d.city)}
					{@const k = keyOf(d.city)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<circle
						class="dot {k}"
						cx={x(d.housing)}
						cy={y(d.rentShare)}
						r={k ? 8 : 5.5}
						onpointermove={(e) =>
							showTip(e, {
								title: `${d.city}, ${d.state}`,
								meta: d.region,
								rows: [
									[f$(d.housing) + '/mo', 'studio rent'],
									[fPct(d.rentShare), 'of take-home, typical entry salary'],
									[f$(d.salary), 'typical entry salary']
								]
							})}
						onpointerleave={hideTip}
					/>
					{#if k}
						<!-- Near the right edge the label goes on the dot's left so it stays inside the chart. -->
						{@const flip = x(d.housing) > W - 110}
						<text
							class="lbl"
							x={x(d.housing) + (flip ? -12 : 12)}
							y={y(d.rentShare)}
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
