<script>
	import * as d3 from 'd3';
	import { ALL, f$, fK, fPct, fMo, fSav } from '#lib/data.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// RISING INSIGHTS 5, the main insight: what's left each month, and how long to a savings goal.
	// One lane per metro; the two offer cities' lanes are highlighted, and the cards above give each
	// offer's own numbers at its offered salary. Changing the field or region "races" every marker
	// from the start line; moving the goal slider glides them to their new spots.
	// laneH: row height, so all 40 metros fit the pinned panel (the page sizes it to the screen).
	let { data, offers, laneH = 22 } = $props();

	const offerKey = (city) => (city === offers.A.city ? 'a' : city === offers.B.city ? 'b' : '');

	const REGIONS = ['All regions', 'Northeast', 'Midwest', 'South', 'West'];
	const M = { top: 26, right: 118, bottom: 6, left: 148 };
	const DIV = 34;
	const RACE_MS = 1500;

	let field = $derived(offers.A.field);
	let region = $state('All regions');
	let goal = $state(10000);
	let tableView = $state(false);
	let chartW = $state(0);

	// ---------- data ----------
	let rows = $derived.by(() => {
		const out = [];
		for (const c of data.cities) {
			const f = field === ALL ? { salary: c.salary, take: c.take, savings: c.savings, jobs: c.jobs } : data.byField[c.city]?.[field];
			if (!f) continue;
			if (region !== 'All regions' && c.region !== region) continue;
			out.push({ ...c, ...f, months: f.savings > 0 ? goal / f.savings : Infinity });
		}
		// Fastest first; metros that never get there go last, least-bad shortfall first.
		return out.sort((a, b) =>
			isFinite(a.months) && isFinite(b.months)
				? a.months - b.months
				: isFinite(a.months)
					? -1
					: isFinite(b.months)
						? 1
						: b.savings - a.savings
		);
	});
	let finite = $derived(rows.filter((d) => isFinite(d.months)));
	let never = $derived(rows.filter((d) => !isFinite(d.months)));
	let missing = $derived(
		field === ALL
			? 0
			: data.cities.filter((c) => (region === 'All regions' || c.region === region) && !data.byField[c.city]?.[field]).length
	);

	// ---------- layout ----------
	let width = $derived(Math.max(560, chartW || 800));
	let innerW = $derived(width - M.left - M.right);
	// Axis runs to the slowest finite metro, rounded up to 6 months, between 6 months and 5 years.
	let cap = $derived(
		finite.length ? Math.min(60, Math.max(6, Math.ceil((d3.max(finite, (d) => d.months) || 0) / 6) * 6)) : 12
	);
	let x = $derived(d3.scaleLinear().domain([0, cap]).range([0, innerW]));
	let ticks = $derived(d3.range(0, cap + 0.1, cap <= 12 ? 3 : cap <= 24 ? 6 : 12));
	let showDivider = $derived(never.length > 0 && finite.length > 0);
	let LANE = $derived(laneH);
	let height = $derived(M.top + rows.length * LANE + (showDivider ? DIV : 0) + M.bottom);
	let divY = $derived(M.top + finite.length * LANE);
	let yOf = $derived(
		new Map(rows.map((d, i) => [d.city, M.top + i * LANE + (showDivider && !isFinite(d.months) ? DIV : 0)]))
	);
	const tickLabel = (d) => (d === 0 ? 'start' : d % 12 === 0 ? d / 12 + (d === 12 ? ' yr' : ' yrs') : d + ' mo');
	// Marker distance from the start line (the "never" group sits at the far end).
	const endX = (d) => (isFinite(d.months) ? x(Math.min(d.months, cap)) : innerW);

	// ---------- motion ----------
	// phase 'start' parks every marker on the start line with no transition; 'run' sends them out.
	const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let phase = $state('start');
	let mode = $state('race');
	$effect(() => {
		field;
		region; // re-race whenever the field or region changes
		mode = 'race';
		phase = 'start';
		let id2;
		const id1 = requestAnimationFrame(() => (id2 = requestAnimationFrame(() => (phase = 'run'))));
		return () => {
			cancelAnimationFrame(id1);
			cancelAnimationFrame(id2);
		};
	});
	const raceDur = (d) => (isFinite(d.months) ? Math.min(d.months, cap) * (RACE_MS / cap) : RACE_MS);
	function markStyle(d) {
		if (phase === 'start' || reduceMotion) return 'none';
		return mode === 'race' ? `transform ${raceDur(d)}ms linear` : 'transform 250ms cubic-bezier(0.33, 1, 0.68, 1)';
	}
	function valStyle(d) {
		if (phase === 'start' || reduceMotion) return 'none';
		return mode === 'race'
			? `opacity 200ms linear ${raceDur(d)}ms`
			: 'transform 250ms cubic-bezier(0.33, 1, 0.68, 1)';
	}
	const markX = (d) => (phase === 'start' && isFinite(d.months) ? 0 : endX(d));
	const stemScale = (d) => (!isFinite(d.months) ? 1 : phase === 'start' ? 0 : endX(d) / innerW);

	// ---------- text ----------
	let insight = $derived.by(() => {
		if (!finite.length) return [['On a typical entry salary in this field, no metro shown here clears the monthly budget.', false]];
		const fast = finite[0];
		const slow = finite[finite.length - 1];
		const fieldTxt = field === ALL ? 'entry-level salary' : `entry-level ${field} salary`;
		const parts = [
			[`On a typical ${fieldTxt}, `, false],
			[`${fast.city} (${fK(fast.salary)})`, true],
			[` gets to ${f$(goal)} in ${fMo(fast.months)}`, false]
		];
		if (finite.length > 1) parts.push(['; ', false], [`${slow.city} (${fK(slow.salary)})`, true], [` takes ${fMo(slow.months)}`, false]);
		parts.push(['. ', false]);
		if (never.length)
			parts.push([`${never.length} metro${never.length === 1 ? '' : 's'} never get there because the budget exceeds take-home. `, false]);
		// The two offer cities, on the same typical salaries as the lanes: the higher-paying one first.
		// Skipped when either is outside the current field/region view, or both pay the same.
		const a = rows.find((d) => d.city === offers.A.city);
		const b = rows.find((d) => d.city === offers.B.city);
		if (a && b && a !== b && a.salary !== b.salary) {
			const [hi, lo] = a.salary > b.salary ? [a, b] : [b, a];
			const x = (p, q) => d3.format('.1f')(p / q) + '×';
			let tail;
			if (isFinite(hi.months) && isFinite(lo.months))
				tail =
					hi.months > lo.months
						? `, yet takes ${x(hi.months, lo.months)} longer to reach the goal.`
						: `, and gets there ${hi.months < lo.months ? x(lo.months, hi.months) + ' faster' : 'just as fast'}.`;
			else if (isFinite(lo.months)) tail = `, yet never reaches the goal while ${lo.city} does in ${fMo(lo.months)}.`;
			else if (isFinite(hi.months)) tail = `, and reaches the goal in ${fMo(hi.months)} while ${lo.city} never does.`;
			else tail = ', but neither reaches the goal.';
			parts.push([`${hi.city} pays about `, false], [fK(hi.salary - lo.salary) + ' more', true], [` than ${lo.city}`, false], [tail, false]);
		}
		return parts;
	});
	let note = $derived(
		`${rows.length} metro${rows.length === 1 ? '' : 's'} · goal ${f$(goal)}` + (missing ? ` · ${missing} without ${field} data` : '')
	);

	// ---------- interaction ----------
	function laneTip(e, d) {
		showTip(e, {
			title: `${d.city}, ${d.state}`,
			meta: `${d.region} · ${field === ALL ? 'all fields' : field}`,
			big: isFinite(d.months) ? `${fMo(d.months)} to ${f$(goal)}` : `never reaches ${f$(goal)}`,
			rows: [
				[f$(d.salary), 'entry salary (25th pct)'],
				[f$(d.take) + '/mo', 'est. take-home'],
				['−' + f$(d.expenses) + '/mo', 'budget excl. taxes'],
				[fSav(d.savings) + '/mo', d.savings < 0 ? 'shortfall' : 'left to save'],
				[fPct(d.rentShare), 'rent share of take-home']
			]
		});
	}
	function focusTip(e, d) {
		const b = e.currentTarget.getBoundingClientRect();
		laneTip({ clientX: b.left + M.left + 40, clientY: b.top }, d);
	}
	function pickField(f) {
		field = f;
	}
</script>

<div class="viz tl">
		<div class="filters" role="group" aria-label="Filters">
			<label>
				Industry
				<select value={field} onchange={(e) => pickField(e.currentTarget.value)}>
					{#each [ALL, ...data.fields] as f (f)}<option value={f}>{f}</option>{/each}
				</select>
			</label>
			<div class="seg" role="group" aria-label="Region">
				{#each REGIONS as r (r)}
					<button type="button" aria-pressed={r === region} onclick={() => (region = r)}>{r}</button>
				{/each}
			</div>
			<label class="goal">
				Goal
				<input
					type="range"
					min="1000"
					max="50000"
					step="500"
					aria-label="Savings goal in dollars"
					value={goal}
					oninput={(e) => {
						mode = 'glide';
						goal = +e.currentTarget.value;
					}}
				/>
				<output>{f$(goal)}</output>
			</label>
			<button class="ghost" aria-pressed={tableView} onclick={() => (tableView = !tableView)}>Table view</button>
		</div>
		<p class="insight">
			{#each insight as [t, strong]}{#if strong}<strong>{t}</strong>{:else}{t}{/if}{/each}
		</p>
		<section class="card">
			<div class="title-row">
				<h3>Months to reach the goal</h3>
				<span class="sub">{note}</span>
			</div>
			<div class="legend" aria-hidden="true">
				<span><i></i>metro, typical entry salary in the selected field</span>
				<span><i class="oa"></i>{offers.A.city} (Offer A)</span>
				<span><i class="ob"></i>{offers.B.city} (Offer B)</span>
				<span><i class="never"></i>never: budget exceeds take-home</span>
			</div>
			<div bind:clientWidth={chartW} hidden={tableView}>
				{#if rows.length}
					<svg
						viewBox="0 0 {width} {height}"
						{width}
						{height}
						role="img"
						aria-label="Sorted lanes of metros with a marker at the month each reaches the savings goal"
					>
						<g class="grid">
							{#each ticks as t (t)}
								<g transform="translate({M.left + x(t)},0)">
									<line class:zero={t === 0} y1={M.top - 4} y2={height - M.bottom} />
									<text text-anchor="middle" y={M.top - 10}>{tickLabel(t)}</text>
								</g>
							{/each}
						</g>
						{#each rows as d (d.city)}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<g
								class="lane {offerKey(d.city) ? 'offer offer-' + offerKey(d.city) : ''}"
								class:never={!isFinite(d.months)}
								style:transform="translate(0px, {yOf.get(d.city)}px)"
								tabindex="0"
								role="img"
								aria-label="{d.city}, {d.state}: {fMo(d.months)}"
								onpointermove={(e) => laneTip(e, d)}
								onpointerleave={hideTip}
								onfocus={(e) => focusTip(e, d)}
								onblur={hideTip}
							>
								<rect class="hit" {width} height={LANE} rx="4" />
								<text class="name" x={M.left - 10} y={LANE / 2} dy="0.34em" text-anchor="end"
									>{d.city}<tspan class="st">{' ' + d.state}</tspan></text
								>
								<rect
									class="stem"
									x={M.left}
									y={LANE / 2 - 1}
									width={innerW}
									height="2"
									rx="1"
									style:transform="scaleX({stemScale(d)})"
									style:transition={markStyle(d)}
								/>
								<circle
									class="dot"
									r="5"
									cx={M.left}
									cy={LANE / 2}
									style:transform="translateX({markX(d)}px)"
									style:transition={markStyle(d)}
								/>
								<text
									class="val"
									x={M.left + 10}
									y={LANE / 2}
									dy="0.34em"
									style:transform="translateX({endX(d)}px)"
									style:opacity={phase === 'start' && mode === 'race' ? 0 : 1}
									style:transition={valStyle(d)}
									>{isFinite(d.months)
										? fMo(d.months) + (d.months > cap ? ' ›' : '')
										: `never · −${f$(-d.savings)}/mo`}</text
								>
							</g>
						{/each}
						{#if showDivider}
							<g class="divider" transform="translate(0,{divY + DIV / 2})">
								<line x1={M.left} x2={M.left + innerW} y1={-DIV / 2 + 4} y2={-DIV / 2 + 4} />
								<text x={M.left} dy="0.32em"
									>Budget exceeds take-home at this salary: the goal is never reached ({never.length} metro{never.length === 1
										? ''
										: 's'})</text
								>
							</g>
						{/if}
					</svg>
				{:else}
					<div class="empty">No metros in this region report this field.</div>
				{/if}
			</div>
			{#if tableView}
				<table>
					<caption>Months to save {f$(goal)} on a typical entry salary, {field === ALL ? 'all fields' : field}</caption>
					<thead>
						<tr>
							{#each ['Metro', 'Region', 'Entry salary', 'Take-home / mo', 'Budget / mo', 'Savings / mo', 'Months to goal'] as h}
								<th scope="col">{h}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as d (d.city)}
							<tr>
								<td>{d.city}, {d.state}</td>
								<td>{d.region}</td>
								<td>{f$(d.salary)}</td>
								<td>{f$(d.take)}</td>
								<td>{f$(d.expenses)}</td>
								<td>{fSav(d.savings)}</td>
								<td>{isFinite(d.months) ? d3.format('.1f')(d.months) : 'never'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
</div>

<style>
	.insight {
		margin: 0 0 14px;
		color: var(--ink-2);
		max-width: 80ch;
	}
	.insight strong {
		color: var(--ink);
		font-weight: 600;
	}
	.title-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 18px;
		align-items: baseline;
		justify-content: space-between;
	}
	.goal input[type='range'] {
		width: 150px;
		accent-color: var(--series);
	}
	.goal output {
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		font-weight: 600;
		font-size: 13px;
		min-width: 62px;
		text-transform: none;
		letter-spacing: 0;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		color: var(--ink-2);
		font-size: 12px;
		margin: 2px 0 6px;
	}
	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.legend i {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--series);
	}
	.legend i.oa {
		background: var(--a);
	}
	.legend i.ob {
		background: var(--b);
	}
	.legend i.never {
		background: transparent;
		border: 2px solid var(--muted);
		width: 9px;
		height: 9px;
	}
	.grid line {
		stroke: var(--grid);
		shape-rendering: crispEdges;
	}
	.grid line.zero {
		stroke: var(--axis);
	}
	.grid text {
		fill: var(--muted);
		font-size: 11px;
	}
	.lane {
		transition: transform 500ms;
		outline: none;
	}
	.lane .hit {
		fill: transparent;
	}
	.lane:hover .hit,
	.lane:focus .hit {
		fill: var(--grid);
		fill-opacity: 0.55;
	}
	.lane .name {
		fill: var(--ink-2);
		font-size: 12px;
	}
	.lane .st {
		fill: var(--muted);
		font-size: 11px;
	}
	.lane .val {
		fill: var(--muted);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.lane .stem {
		fill: var(--series);
		transform-box: fill-box;
		transform-origin: left center;
	}
	.lane .dot {
		fill: var(--series);
		stroke: var(--surface);
		stroke-width: 2;
	}
	.lane.never .stem {
		fill: var(--grid);
	}
	.lane.never .dot {
		fill: var(--surface);
		stroke: var(--muted);
	}
	/* The two offer cities' lanes. */
	.lane.offer .name,
	.lane.offer .val {
		fill: var(--ink);
		font-weight: 700;
	}
	.lane.offer-a .stem,
	.lane.offer-a .dot {
		fill: var(--a);
	}
	.lane.offer-b .stem,
	.lane.offer-b .dot {
		fill: var(--b);
	}
	.lane.offer .hit {
		fill: var(--grid);
		fill-opacity: 0.35;
	}
	.divider text {
		fill: var(--ink-2);
		font-size: 12px;
		font-weight: 600;
	}
	.divider line {
		stroke: var(--axis);
		shape-rendering: crispEdges;
	}
	.empty {
		padding: 24px 0;
		color: var(--muted);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		margin-top: 6px;
	}
	caption {
		text-align: left;
		color: var(--ink-2);
		font-size: 12px;
		padding: 4px 8px;
	}
	th,
	td {
		text-align: right;
		padding: 6px 8px;
		border-bottom: 1px solid var(--grid);
		font-variant-numeric: tabular-nums;
	}
	th:first-child,
	td:first-child,
	th:nth-child(2),
	td:nth-child(2) {
		text-align: left;
	}
	th {
		color: var(--ink-2);
		font-weight: 600;
		font-size: 12px;
	}
</style>
