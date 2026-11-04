<script>
	import * as d3 from 'd3';
	import { ALL, f$, fPct, fN, fMo, fJobs, fSav, fieldRow } from '#lib/data.js';
	import { axis, gridAxis } from '#lib/axis.js';
	import { showTip, hideTip } from '#lib/tooltip.svelte.js';

	// PROTOTYPE 1: industry filter, top-15 bar chart, opportunity-vs-pay scatter, city card.
	let { data, offers } = $props();

	// Follow Offer A until the reader picks something here.
	let field = $derived(offers.A.field);
	let sel = $derived(offers.A.city);
	let per1000 = $state(false);

	let rows = $derived(
		data.cities
			.map((c) => {
				const f = fieldRow(data, c.city, field);
				return f ? { ...c, fjobs: f.jobs, fsal: f.salary, fsav: f.savings, per: (f.jobs / c.totalJobs) * 1000 } : null;
			})
			.filter(Boolean)
	);
	let metric = $derived(per1000 ? (d) => d.per : (d) => d.fjobs);
	let marks = $derived(new Set([offers.A.city, offers.B.city]));
	const fieldLabel = (f) => (f === ALL ? 'all fields' : f);

	// Bars
	const BW = 520;
	const BM = { l: 110, r: 56, t: 4, b: 4 };
	const BH_ROW = 20;
	let top = $derived([...rows].sort((a, b) => metric(b) - metric(a)).slice(0, 15));
	let bh = $derived(BM.t + top.length * BH_ROW + BM.b);
	let bx = $derived(d3.scaleLinear().domain([0, d3.max(top, metric)]).range([0, BW - BM.l - BM.r]));

	// Scatter
	const SW = 520;
	const SH = 360;
	const SM = { l: 52, r: 16, t: 10, b: 36 };
	let sx = $derived(
		d3
			.scaleLog()
			.domain(d3.extent(rows, metric).map((v, i) => (i ? v * 1.6 : v / 1.4)))
			.range([SM.l, SW - SM.r])
	);
	let sy = $derived(
		d3
			.scaleLinear()
			.domain([d3.min(rows, (d) => d.fsal) * 0.92, d3.max(rows, (d) => d.fsal) * 1.05])
			.nice()
			.range([SH - SM.b, SM.t])
	);
	let xAxis = $derived(gridAxis(d3.axisBottom(sx).ticks(5, '~s'), SH - SM.b - SM.t));
	let yAxis = $derived(
		gridAxis(
			d3
				.axisLeft(sy)
				.ticks(6)
				.tickFormat((v) => '$' + d3.format('.0f')(v / 1000) + 'k'),
			SW - SM.l - SM.r
		)
	);
	// Selected and offer cities draw last so they sit on top.
	let dots = $derived(
		[...rows].sort((a, b) => (a.city === sel || marks.has(a.city)) - (b.city === sel || marks.has(b.city)))
	);
	let selected = $derived(rows.find((r) => r.city === sel));

	function tipFor(e, d) {
		showTip(e, {
			title: `${d.city}, ${d.state}`,
			meta: `${d.region} · ${fieldLabel(field)}`,
			rows: [
				[fN(d.fjobs), 'entry-level jobs'],
				[d3.format('.0f')(d.per), 'per 1,000 local jobs'],
				[f$(d.fsal), '25th-pct salary'],
				[fSav(d.fsav) + '/mo', 'est. savings']
			]
		});
	}
	const markClass = (d) => (d.city === sel ? 'sel' : marks.has(d.city) ? 'mark' : '');
</script>

<section class="story" id="jobs">
	<div class="wrap">
		<h2 class="small">Which cities have the most entry-level jobs, for you?</h2>
		<p class="lede">
			40 U.S. metros. Jobs in occupations that typically need a bachelor's degree and no experience (BLS, May 2025).
			Pick an industry; click any city in either chart. Your two offer cities are marked.
		</p>
		<div class="filters">
			<label>
				Industry
				<select bind:value={field}>
					{#each [ALL, ...data.fields] as f (f)}<option value={f}>{f}</option>{/each}
				</select>
			</label>
			<div class="seg">
				<button type="button" aria-pressed={!per1000} onclick={() => (per1000 = false)}>Total jobs</button>
				<button type="button" aria-pressed={per1000} onclick={() => (per1000 = true)}>Per 1,000 local jobs</button>
			</div>
		</div>
		<div class="grid2">
			<div class="card">
				<h3>Top 15 cities by opportunity</h3>
				<p class="sub">{per1000 ? 'Entry-level jobs per 1,000 local jobs' : 'Entry-level jobs'}, {fieldLabel(field)}</p>
				<svg class="hbar" viewBox="0 0 {BW} {bh}" role="img" aria-label="Top 15 metros by entry-level jobs">
					{#each top as d, i (d.city)}
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<g
							class="row"
							style:transform="translate(0px, {BM.t + i * BH_ROW}px)"
							onclick={() => (sel = d.city)}
							onpointermove={(e) => tipFor(e, d)}
							onpointerleave={hideTip}
						>
							<rect class={markClass(d)} x={BM.l} y="2" height={BH_ROW - 4} rx="3" style:width="{bx(metric(d))}px" />
							<text class="name" class:sel={d.city === sel} x={BM.l - 8} y={BH_ROW / 2} dy="0.34em" text-anchor="end"
								>{d.city}{marks.has(d.city) ? ' ●' : ''}</text
							>
							<text class="v" x={BM.l + bx(metric(d)) + 6} y={BH_ROW / 2} dy="0.34em"
								>{per1000 ? d3.format('.0f')(d.per) : fJobs(d.fjobs)}</text
							>
						</g>
					{/each}
				</svg>
			</div>
			<div class="card">
				<h3>Opportunity vs. pay</h3>
				<p class="sub">Each dot is a metro · x: entry-level jobs (log) · y: 25th-pct salary in the field</p>
				<svg viewBox="0 0 {SW} {SH}" role="img" aria-label="Scatterplot of entry-level jobs against salary">
					<g class="axis" transform="translate(0,{SH - SM.b})" {@attach axis(xAxis)}></g>
					<g class="axis" transform="translate({SM.l},0)" {@attach axis(yAxis)}></g>
					<text class="axis-label" x={(SW + SM.l) / 2} y={SH - 4} text-anchor="middle"
						>{per1000 ? 'entry-level jobs per 1,000 local jobs (log scale)' : 'entry-level jobs (log scale)'}</text
					>
					{#each dots as d (d.city)}
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<circle
							class="dot moving {markClass(d)}"
							r={d.city === sel ? 7 : 5}
							style:transform="translate({sx(metric(d))}px, {sy(d.fsal)}px)"
							onclick={() => (sel = d.city)}
							onpointermove={(e) => tipFor(e, d)}
							onpointerleave={hideTip}
						/>
					{/each}
					{#each rows.filter((d) => d.city === sel || marks.has(d.city)) as d (d.city)}
						<text class="dotlbl" class:sel={d.city === sel} x={sx(metric(d)) + 9} y={sy(d.fsal) - 8}>{d.city}</text>
					{/each}
				</svg>
			</div>
		</div>
		{#if selected}
			<div class="infocard">
				<h3>{selected.city}, {selected.state}</h3>
				<p class="meta">{selected.region} · {fieldLabel(field)}</p>
				<div class="stats">
					{#each [
						[fN(selected.fjobs), 'entry-level jobs'],
						[f$(selected.fsal), '25th-pct salary'],
						[f$(Math.round(selected.fsal / (selected.rpp / 100))), 'salary, COL-adjusted'],
						[fSav(selected.fsav) + '/mo', 'est. savings'],
						[fMo(selected.fsav > 0 ? 10000 / selected.fsav : Infinity), 'to save $10k'],
						[f$(selected.rent1br), 'median 1-br rent'],
						[selected.unemp.toFixed(1) + '%', "unemployment '25"],
						[fPct(selected.young), 'residents age 20-29']
					] as [v, l]}
						<div class="stat"><b>{v}</b><span>{l}</span></div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="infocard idle">
				{sel} has no {field} data. Click a bubble or a bar to see a city's profile.
			</div>
		{/if}
	</div>
</section>

<style>
	section.story {
		padding-top: 36px;
	}
	h2.small {
		font-size: 24px;
	}
	.row {
		transition: transform 300ms;
	}
	.moving {
		transition: transform 300ms;
	}
</style>
