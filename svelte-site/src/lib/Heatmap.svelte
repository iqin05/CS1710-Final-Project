<script>
	import * as d3 from 'd3';
	import { ALL, REGIONS, f$, fN, fSav } from '#lib/data.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// Field × city heatmap of monthly savings at each field's 25th-percentile entry salary.
	let { data, offers } = $props();

	const FIELDS = [
		'Computer & Math',
		'Management',
		'Engineering & Architecture',
		'Healthcare',
		'Science',
		'Business & Finance',
		'Sales',
		'Education',
		'Arts, Design & Media',
		'Community & Social Service'
	];
	const COLS = [ALL, ...FIELDS];
	const MIN_JOBS = [0, 1000, 5000, 20000];

	let region = $state('All regions');
	let minJobs = $state(1000);
	let sortBy = $state(ALL);

	// Diverging: red for a monthly shortfall, blue for savings, neutral at $0.
	const color = (v) => {
		const t = Math.max(-1, Math.min(1, v / 3200));
		return t < 0 ? d3.interpolateLab('#f0efec', '#d9534f')(-t) : d3.interpolateLab('#f0efec', '#4f7fc0')(t);
	};
	const val = (c, f) => {
		if (f === ALL) return { v: c.savings, jobs: c.jobs };
		const r = data.byField[c.city][f];
		return r ? { v: r.savings, jobs: r.jobs } : null;
	};
	const shown = (x) => x && x.jobs >= minJobs;

	let cities = $derived(
		data.cities
			.filter((c) => region === 'All regions' || c.region === region)
			.sort((a, b) => (val(b, sortBy)?.v ?? -1e9) - (val(a, sortBy)?.v ?? -1e9))
	);
	let medians = $derived(
		COLS.map((f) => {
			const vs = cities.map((c) => val(c, f)).filter(shown).map((x) => x.v);
			return vs.length ? f$(d3.median(vs)) : '–';
		})
	);
	let offerSet = $derived(new Set([offers.A.city, offers.B.city]));

	// Side stats: spread between fields inside a city vs. spread between cities.
	let within = $derived(
		cities
			.map((c) => {
				const vs = FIELDS.map((f) => val(c, f)).filter(shown).map((x) => x.v);
				return vs.length > 1 ? d3.max(vs) - d3.min(vs) : null;
			})
			.filter((x) => x != null)
	);
	let across = $derived(d3.max(cities, (c) => c.savings) - d3.min(cities, (c) => c.savings));
	let ra = $derived(val(data.byCity[offers.A.city], offers.A.field));
	let rb = $derived(val(data.byCity[offers.B.city], offers.B.field));
</script>

<section class="story" id="field">
	<div class="wrap">
		<p class="beat">It depends on your field</p>
		<h2>Your field matters more than your city</h2>
		<p class="lede">
			Each cell is what a graduate in that field could save each month in that metro at the 25th-percentile entry
			salary. The "All fields" column is the blended number a city ranking would show, and it hides a lot.
		</p>
		<div class="filters">
			<div class="seg">
				{#each ['All regions', ...REGIONS] as r (r)}
					<button type="button" aria-pressed={r === region} onclick={() => (region = r)}>{r}</button>
				{/each}
			</div>
			<label>
				Hide cells with fewer than
				<select class="narrow" bind:value={minJobs}>
					{#each MIN_JOBS as n (n)}<option value={n}>{n ? fN(n) + ' jobs' : 'no minimum'}</option>{/each}
				</select>
			</label>
			<span class="note">Click a column heading to sort cities by that field.</span>
		</div>
		<div class="card sidestat">
			<div class="stats">
				<div class="stat">
					<b>{f$(d3.median(within))}/mo</b><span>typical gap between the best and worst field inside one city</span>
				</div>
				<div class="stat">
					<b>{f$(across)}/mo</b><span>gap between the best and worst city when all fields are blended</span>
				</div>
				{#if ra && rb}
					<div class="stat">
						<b>{f$(ra.v)} vs {f$(rb.v)}</b>
						<span
							>{offers.A.city} vs {offers.B.city}, {offers.A.field === ALL ? 'all fields' : offers.A.field}, at typical entry
							pay</span
						>
					</div>
				{/if}
			</div>
			<p>
				In this view, switching fields moves your savings <strong>{d3.median(within) > across ? 'more' : 'less'}</strong>
				than switching cities. Your two offer cities are highlighted in the table.
			</p>
		</div>
		<div class="hm-wrap">
			<table class="hm">
				<thead>
					<tr>
						<th>Metro</th>
						{#each COLS as f (f)}
							<th class="f" class:sorted={f === sortBy} aria-sort={f === sortBy ? 'descending' : 'none'}>
								<button type="button" onclick={() => (sortBy = f)}>{f}{f === sortBy ? ' ↓' : ''}</button>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					<tr class="median">
						<td>Median across metros</td>
						{#each medians as m, i (COLS[i])}<td>{m}</td>{/each}
					</tr>
					{#each cities as c (c.city)}
						<tr class:hl={offerSet.has(c.city)}>
							<td>{c.city}, {c.state}</td>
							{#each COLS as f (f)}
								{@const x = val(c, f)}
								<td
									class="v"
									class:all={f === ALL}
									class:na={!shown(x)}
									style:background={shown(x) ? color(x.v) : null}
									style:color={shown(x) && Math.abs(x.v) > 2300 ? '#fff' : null}
									onpointermove={(e) =>
										showTip(e, {
											title: `${c.city} · ${f}`,
											rows: x
												? [
														[fSav(x.v) + '/mo', 'est. savings at 25th-pct salary'],
														[fN(x.jobs), 'entry-level jobs']
													]
												: [],
											note: x ? null : 'no occupations in this field here'
										})}
									onpointerleave={hideTip}>{shown(x) ? fSav(x.v) : '–'}</td
								>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="legend-ramp">
			<span>−$2,900</span><i></i><span>+$2,900</span>
			<span class="explain"
				>Red cells lose money each month on a modest budget; blue cells save. Hatched = too few jobs or no data.</span
			>
		</div>
	</div>
</section>

<style>
	select.narrow {
		min-width: 110px;
	}
	.sidestat {
		font-size: 13px;
		color: var(--ink-2);
		margin-bottom: 12px;
	}
	.sidestat b {
		font-size: 24px;
		line-height: 1.1;
		margin-top: 14px;
	}
	.sidestat p {
		margin: 10px 0 0;
	}
	.hm-wrap {
		overflow: auto;
		max-height: 640px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
	}
	table.hm {
		border-collapse: separate;
		border-spacing: 2px;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		min-width: 900px;
	}
	th {
		position: sticky;
		top: 0;
		background: var(--surface);
		color: var(--ink-2);
		font-weight: 600;
		padding: 8px 6px;
		text-align: center;
		white-space: normal;
		max-width: 110px;
		line-height: 1.2;
		z-index: 1;
	}
	th button {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
	}
	th.sorted {
		color: var(--ink);
	}
	th:first-child,
	td:first-child {
		text-align: left;
		position: sticky;
		left: 0;
		background: var(--surface);
		z-index: 2;
		padding-left: 10px;
		white-space: nowrap;
	}
	th:first-child {
		z-index: 3;
	}
	td {
		text-align: center;
		padding: 5px 6px;
		border-radius: 3px;
		min-width: 68px;
	}
	td.na {
		color: var(--muted);
		background: repeating-linear-gradient(45deg, transparent 0 4px, var(--grid) 4px 5px);
	}
	tr.median td {
		font-weight: 600;
		color: var(--ink-2);
		background: transparent;
	}
	td.all {
		outline: 1px solid var(--axis);
	}
	tr.hl td:first-child {
		color: var(--accent);
		font-weight: 650;
	}
	.legend-ramp {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--ink-2);
		margin-top: 10px;
	}
	.legend-ramp i {
		display: inline-block;
		width: 120px;
		height: 10px;
		border-radius: 5px;
		background: linear-gradient(90deg, var(--neg), var(--mid) 50%, var(--pos));
	}
	.explain {
		margin-left: 10px;
	}
</style>
