<script>
	import * as d3 from 'd3';
	import { f$, fK, fPct, fSav } from '#lib/data.js';
	import { axis, gridAxis } from '#lib/axis.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// MAIN MESSAGE: hero numbers + salary-vs-savings scatter, emphasizing the story cities and the two offers.
	let { data, offers } = $props();

	const ord = (n) => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] || 'th');
	const corr = (xs, ys) => {
		const mx = d3.mean(xs);
		const my = d3.mean(ys);
		const num = d3.sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
		return num / Math.sqrt(d3.sum(xs.map((x) => (x - mx) ** 2)) * d3.sum(ys.map((y) => (y - my) ** 2)));
	};
	// Story numbers, computed once the data arrives.
	let story = $derived.by(() => {
		const rank = (key) => [...data.cities].sort((a, b) => b[key] - a[key]).map((c) => c.city);
		const ny = data.byCity['New York'];
		const det = data.byCity['Detroit'];
		const rS = rank('salary');
		const rV = rank('savings');
		const salaries = data.cities.map((c) => c.salary);
		return {
			text: `A higher starting salary doesn't mean you'll keep more of it. New York pays the ${ord(rS.indexOf('New York') + 1)}-highest typical entry salary in our data but saves the least of all 40 metros, while Detroit pays about ${fK(ny.salary - det.salary)} less and leaves roughly ${f$(det.savings - ny.savings)} more every month.`,
			nums: [
				[f$(ny.salary), 'New York entry salary'],
				[f$(ny.savings) + '/mo', `New York saves · ${ord(rV.indexOf('New York') + 1)} of 40`],
				[f$(det.salary), 'Detroit entry salary'],
				[f$(det.savings) + '/mo', `Detroit saves · ${ord(rV.indexOf('Detroit') + 1)} of 40`]
			],
			rSav: corr(salaries, data.cities.map((c) => c.savings)),
			rExp: corr(salaries, data.cities.map((c) => c.expenses))
		};
	});

	const W = 900;
	const H = 420;
	const M = { l: 60, r: 20, t: 14, b: 40 };
	const x = d3.scaleLinear().domain([58000, 132000]).range([M.l, W - M.r]);
	const y = d3.scaleLinear().domain([0, 2400]).range([H - M.b, M.t]);
	const xAxis = gridAxis(
		d3
			.axisBottom(x)
			.ticks(8)
			.tickFormat((v) => '$' + v / 1000 + 'k'),
		H - M.b - M.t
	);
	const yAxis = gridAxis(
		d3
			.axisLeft(y)
			.ticks(6)
			.tickFormat((v) => '$' + d3.format(',')(v)),
		W - M.l - M.r
	);
	const STORY = new Set(['New York', 'Detroit', 'San Jose', 'Boston', 'Cleveland', 'Miami']);

	let offerSet = $derived(new Set([offers.A.city, offers.B.city]));
	const kind = (d) => (offerSet.has(d.city) ? 'sel' : STORY.has(d.city) ? 'mark' : '');
	// Emphasized dots draw last so they sit on top.
	let dots = $derived([...data.cities].sort((a, b) => (kind(a) ? 1 : 0) - (kind(b) ? 1 : 0)));
	let labeled = $derived(data.cities.filter((d) => kind(d)));
</script>

<section class="story" id="message">
	<div class="wrap">
		<div class="hero">
			<h2>Recent graduates should compare cities by how much they can save, not just what they earn.</h2>
			<p>{story.text}</p>
			<div class="nums">
				{#each story.nums as [v, l]}<div><b>{v}</b><span>{l}</span></div>{/each}
			</div>
		</div>
		<div class="card">
			<h3>A bigger paycheck does not mean more money left over</h3>
			<p class="sub">
				Across 40 metros, entry salary correlates {story.rExp.toFixed(2)} with the cost of a modest budget but only {story.rSav.toFixed(2)} with monthly savings. Blended across all fields; hover any dot.
			</p>
			<svg viewBox="0 0 {W} {H}" role="img" aria-label="Scatterplot of entry salary against estimated monthly savings for 40 metros">
				<g class="axis" transform="translate(0,{H - M.b})" {@attach axis(xAxis)}></g>
				<g class="axis" transform="translate({M.l},0)" {@attach axis(yAxis)}></g>
				<text class="axis-label" x={(W + M.l) / 2} y={H - 6} text-anchor="middle"
					>typical entry-level salary (25th percentile, all fields)</text
				>
				<text class="axis-label" transform="translate(14,{(H - M.b + M.t) / 2}) rotate(-90)" text-anchor="middle"
					>estimated monthly savings</text
				>
				{#each dots as d (d.city)}
					<circle
						class="dot {kind(d)}"
						cx={x(d.salary)}
						cy={y(d.savings)}
						r={offerSet.has(d.city) ? 8 : STORY.has(d.city) ? 6.5 : 5}
						role="img"
						aria-label="{d.city}: {f$(d.salary)} salary, {fSav(d.savings)} a month saved"
						onpointermove={(e) =>
							showTip(e, {
								title: `${d.city}, ${d.state}`,
								meta: d.region,
								rows: [
									[f$(d.salary), 'entry salary'],
									[f$(d.savings) + '/mo', 'est. savings'],
									[fPct(d.rentShare), 'rent share of take-home']
								]
							})}
						onpointerleave={hideTip}
					/>
				{/each}
				{#each labeled as d (d.city)}
					<text class="dotlbl" class:sel={offerSet.has(d.city)} x={x(d.salary) + 10} y={y(d.savings) + 4}
						>{d.city}{d.city === offers.A.city ? ' (Offer A)' : d.city === offers.B.city ? ' (Offer B)' : ''}</text
					>
				{/each}
			</svg>
		</div>
		<p class="prose after">
			Starting salary tracks the <strong>cost</strong> of a modest budget closely, but it barely tracks what is left
			after that budget. The Midwest is where an entry salary goes furthest, not because pay is higher, but because
			rent takes about 20% of take-home instead of 32–45%.
		</p>
	</div>
</section>

<style>
	.hero {
		background: var(--hero-bg);
		color: var(--hero-ink);
		border-radius: 16px;
		padding: 40px 36px;
		margin: 10px 0 18px;
	}
	.hero h2 {
		color: var(--hero-ink);
	}
	.hero p {
		font-size: 16px;
		max-width: 70ch;
		color: rgba(244, 241, 234, 0.8);
		margin: 0;
	}
	.nums {
		display: flex;
		flex-wrap: wrap;
		gap: 28px;
		margin-top: 22px;
	}
	.nums b {
		display: block;
		font-size: 34px;
		font-weight: 650;
		line-height: 1;
	}
	.nums span {
		font-size: 13px;
		color: rgba(244, 241, 234, 0.75);
	}
	.after {
		margin-top: 14px;
	}
</style>
