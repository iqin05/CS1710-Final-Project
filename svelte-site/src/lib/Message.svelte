<script>
	import * as d3 from 'd3';
	import { ALL, f$, fK, fPct, fSav, REGIONS, leftOverRow, fLeftMonth, metrosInField } from '#lib/data.js';
	import { axis, gridAxis } from '#lib/axis.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// MAIN MESSAGE visual: compare cities by what you can save, not what you earn. The salary-vs-
	// savings scatter of all 40 metros; the words for this stage are in the story steps (story.js).
	// mode, set by the story step:
	//   'focus'   the two offers ringed and labeled, the gap between them drawn, other metros dimmed
	//   'savings' the default chart (all 40 at full strength), with the offers ringed and labeled and
	//             the savings axis emphasized, to match the "Why savings?" text
	//   'all'     the default chart: all 40 metros equal, nothing emphasized
	// Every point is the same size in every mode: size encodes nothing here.
	let { data, offers, mode = 'focus' } = $props();

	// Every metro on its typical entry-level (25th-percentile) salary in the offers' field, so the
	// two offers sit at exactly the salaries the rest of the story uses.
	let field = $derived(offers.A.field);
	let metros = $derived(metrosInField(data, field));
	const fieldLabel = (f) => (f === ALL ? 'all fields' : f);

	const corr = (xs, ys) => {
		const mx = d3.mean(xs);
		const my = d3.mean(ys);
		const num = d3.sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
		return num / Math.sqrt(d3.sum(xs.map((x) => (x - mx) ** 2)) * d3.sum(ys.map((y) => (y - my) ** 2)));
	};
	// The two correlations quoted in the chart's subtitle: across the 40 metros, how closely entry
	// salary tracks the cost of a modest budget, and how closely it tracks monthly savings.
	let story = $derived.by(() => {
		const salaries = metros.map((c) => c.salary);
		return {
			rSav: corr(salaries, metros.map((c) => c.savings)),
			rExp: corr(salaries, metros.map((c) => c.expenses))
		};
	});

	const W = 900;
	const H = 420;
	const M = { l: 60, r: 20, t: 14, b: 40 };
	// Domains fit the field's metros; the savings axis always includes $0, so a shortfall reads as
	// below the line.
	let x = $derived(
		d3
			.scaleLinear()
			.domain(d3.extent(metros, (d) => d.salary))
			.nice()
			.range([M.l, W - M.r])
	);
	let y = $derived(
		d3
			.scaleLinear()
			.domain([Math.min(0, d3.min(metros, (d) => d.savings)), d3.max(metros, (d) => d.savings)])
			.nice()
			.range([H - M.b, M.t])
	);
	let xAxis = $derived(
		gridAxis(
			d3
				.axisBottom(x)
				.ticks(8)
				.tickFormat((v) => '$' + v / 1000 + 'k'),
			H - M.b - M.t
		)
	);
	let yAxis = $derived(
		gridAxis(
			d3
				.axisLeft(y)
				.ticks(6)
				.tickFormat((v) => (v < 0 ? '−$' : '$') + d3.format(',')(Math.abs(v))),
			W - M.l - M.r
		)
	);
	// Region is color alone (rose, green, amber, blue), every metro a plain circle. The four hues
	// share one chroma (OKLCH C 0.14) and lightness within 0.02 (L 0.60–0.62, hues 330/160/60/260),
	// so no region looks heavier or more important than another: regions are categories, not a
	// ranking. Checked with the dataviz skill's validator on this surface (--pairs all): every check
	// passes outright, color-blind separation ΔE 8.4 and every mark at least 3:1, so color carries
	// the regions without a second encoding. Blue and orange mean Offer A / B elsewhere, so the offer
	// cities' own regions (Northeast, Midwest) get rose and green, and the offers here are marked with
	// a dark ring, a larger dot and a label instead of their colors.
	const REGION_COLOR = { Northeast: '#ae5ea8', Midwest: '#019f68', South: '#bb6802', West: '#5285d9' };

	// The two offer cities stand out (full color, larger, ringed, labeled); every other metro is dimmed
	// for context. A dashed line joins the two offers, labeled with the gap in pay and in savings.
	let offerSet = $derived(new Set([offers.A.city, offers.B.city]));
	let others = $derived(metros.filter((d) => !offerSet.has(d.city)));
	let offerPts = $derived(
		['A', 'B']
			.map((k) => ({ k, c: metros.find((d) => d.city === offers[k].city) }))
			.filter((o, i, arr) => o.c && arr.findIndex((p) => p.c === o.c) === i)
	);
	let gap = $derived.by(() => {
		if (offerPts.length < 2) return null;
		const [a, b] = offerPts.map((o) => o.c);
		const [hi, lo] = a.salary >= b.salary ? [a, b] : [b, a];
		const [x1, y1, x2, y2] = [x(a.salary), y(a.savings), x(b.salary), y(b.savings)];
		const moreSave = lo.savings > hi.savings;
		// The label sits just off the middle of the line, on its upper side, so it never crosses it.
		const len = Math.hypot(x2 - x1, y2 - y1) || 1;
		let [nx, ny] = [(y2 - y1) / len, -(x2 - x1) / len];
		if (ny > 0) [nx, ny] = [-nx, -ny];
		const off = 16 + Math.abs(ny) * 12;
		return {
			x1,
			y1,
			x2,
			y2,
			lx: (x1 + x2) / 2 + nx * off,
			ly: (y1 + y2) / 2 + ny * off,
			anchor: nx < -0.25 ? 'end' : nx > 0.25 ? 'start' : 'middle',
			// Mostly-upward offsets stack both lines above the point; sideways ones center on it.
			dy1: ny < -0.6 ? '-1.45em' : '-0.3em',
			pay: `${hi.city} pays ${fK(hi.salary - lo.salary)} more a year`,
			keep: moreSave
				? `${lo.city} has ${f$(lo.savings - hi.savings)} more left over a month`
				: `and has ${f$(hi.savings - lo.savings)} more left over a month`
		};
	});
	const tip = (e, d) =>
		showTip(e, {
			title: `${d.city}, ${d.state}`,
			meta: d.region,
			rows: [
				[f$(d.salary), 'entry salary'],
				leftOverRow(d.savings),
				[fPct(d.rentShare), 'rent share of take-home']
			]
		});
</script>

<div class="viz">
		<div class="card">
			<h3>A bigger paycheck does not mean more money left over</h3>
			<p class="sub">
				Across {metros.length} metros, entry salary in {fieldLabel(field)} correlates {story.rExp.toFixed(2)} with the cost of a modest budget but only {story.rSav.toFixed(2)} with what’s left over each month. Hover any dot.
			</p>
			<div class="legend" aria-hidden="true">
				{#each REGIONS as r (r)}
					<span>
						<svg viewBox="-6 -6 12 12" width="12" height="12"><circle r="5" fill={REGION_COLOR[r]} /></svg>{r}
					</span>
				{/each}
				<span class="offers-key" class:shown={mode !== 'all'}>
					<svg viewBox="-9 -9 18 18" width="16" height="16"
						><circle r="6" fill="none" stroke="var(--ink)" stroke-width="2" /></svg
					>your two offers
				</span>
			</div>
			<svg viewBox="0 0 {W} {H}" role="img" aria-label="Scatterplot of {fieldLabel(field)} entry salary against what’s left over each month for {metros.length} metros, colored by region">
				<g class="axis" transform="translate(0,{H - M.b})" {@attach axis(xAxis)}></g>
				<g class="axis" transform="translate({M.l},0)" {@attach axis(yAxis)}></g>
				<text class="axis-label" x={(W + M.l) / 2} y={H - 6} text-anchor="middle"
					>typical entry-level salary (25th percentile, {fieldLabel(field)})</text
				>
				<text
					class="axis-label ylab"
					class:em={mode === 'savings'}
					transform="translate(14,{(H - M.b + M.t) / 2}) rotate(-90)"
					text-anchor="middle">What’s Left Over each month (est.)</text
				>
				<!-- Other metros: dimmed in 'focus', full strength otherwise. -->
				{#each others as d (d.city)}
					<circle
						class="pt"
						class:dim={mode === 'focus'}
						cx={x(d.salary)}
						cy={y(d.savings)}
						r="5"
						fill={REGION_COLOR[d.region]}
						role="img"
						aria-label="{d.city} ({d.region}): {f$(d.salary)} salary, {fLeftMonth(d.savings)}"
						onpointermove={(e) => tip(e, d)}
						onpointerleave={hideTip}
					/>
				{/each}
				<!-- The distance between the two offers ('focus' only). -->
				{#if gap}
					<g class="gapg" class:shown={mode === 'focus'} aria-hidden={mode !== 'focus'}>
						<line class="gap" x1={gap.x1} y1={gap.y1} x2={gap.x2} y2={gap.y2} />
						<text class="gap-lbl" x={gap.lx} y={gap.ly} text-anchor={gap.anchor}>
							<tspan x={gap.lx} dy={gap.dy1}>{gap.pay}</tspan>
							<tspan x={gap.lx} dy="1.25em">{gap.keep}</tspan>
						</text>
					</g>
				{/if}
				<!-- The two offers, drawn last: ringed and labeled except in 'all'. Same size as every point. -->
				{#each offerPts as o (o.k)}
					<circle
						class="pt"
						class:offer={mode !== 'all'}
						cx={x(o.c.salary)}
						cy={y(o.c.savings)}
						r="5"
						fill={REGION_COLOR[o.c.region]}
						role="img"
						aria-label="Offer {o.k}, {o.c.city} ({o.c.region}): {f$(o.c.salary)} salary, {fLeftMonth(o.c.savings)}"
						onpointermove={(e) => tip(e, o.c)}
						onpointerleave={hideTip}
					/>
					<text class="offer-lbl" class:shown={mode !== 'all'} x={x(o.c.salary) + 11} y={y(o.c.savings)} dy="0.34em"
						>{o.c.city} (Offer {o.k})</text
					>
				{/each}
			</svg>
		</div>
</div>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin: 0 0 6px;
		font-size: 12px;
		color: var(--ink-2);
	}
	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.legend svg {
		overflow: visible;
	}
	/* Region marks: a surface ring keeps overlapping marks apart. */
	.pt {
		stroke: var(--surface);
		stroke-width: 1.5;
		cursor: default;
	}
	/* Modes change by transition, so moving between story steps eases rather than jumps. */
	.pt {
		transition:
			fill-opacity 400ms,
			stroke 400ms,
			stroke-width 400ms;
	}
	/* Context metros recede in 'focus'; the offers get a dark ring. */
	.pt.dim {
		fill-opacity: 0.28;
	}
	.pt.dim:hover {
		fill-opacity: 0.8;
	}
	.pt.offer {
		stroke: var(--ink);
		stroke-width: 2.5;
	}
	.offer-lbl,
	.offers-key,
	.gapg {
		opacity: 0;
		transition: opacity 400ms;
	}
	.offer-lbl.shown,
	.offers-key.shown,
	.gapg.shown {
		opacity: 1;
	}
	/* 'savings': the savings axis title steps forward. */
	.ylab {
		transition:
			fill 400ms,
			font-size 400ms;
	}
	.ylab.em {
		fill: var(--ink);
		font-weight: 700;
		font-size: 13px;
	}
	.offer-lbl {
		font-size: 14px;
		font-weight: 700;
		fill: var(--ink);
		paint-order: stroke;
		stroke: var(--surface);
		stroke-width: 4px;
		pointer-events: none;
	}
	/* The line between the offers and its label. */
	.gap {
		stroke: var(--ink);
		stroke-width: 1.5;
		stroke-dasharray: 5 4;
		pointer-events: none;
	}
	.gap-lbl {
		font-size: 13px;
		font-weight: 600;
		fill: var(--ink-2);
		paint-order: stroke;
		stroke: var(--surface);
		stroke-width: 4px;
		pointer-events: none;
	}
</style>
