<script>
	import { ALL, f$, fPct, fN, fMo, fSav, calc, fieldRow } from '#lib/data.js';

	// RISING INSIGHTS: the two offers side by side at the offered salaries.
	let { data, offers } = $props();

	let A = $derived(calc(data, offers.A.city, offers.A.salary));
	let B = $derived(calc(data, offers.B.city, offers.B.salary));
	let hi = $derived(A.salary >= B.salary ? A : B);
	let lo = $derived(hi === A ? B : A);
	let keeper = $derived(A.savings >= B.savings ? A : B);

	let lede = $derived(
		hi === keeper
			? `${hi.c.city} pays ${f$(hi.salary - lo.salary)} more and also leaves more at the end of the month, by ${f$(hi.savings - lo.savings)}. Here the bigger number happens to win, but look at how much of it the budget eats.`
			: `${hi.c.city} pays ${f$(hi.salary - lo.salary)} more a year, yet ${lo.c.city} leaves ${f$(lo.savings - hi.savings)} more in your pocket every month. The gap is cost, not pay.`
	);

	function stats(r, o) {
		const fr = fieldRow(data, o.city, o.field) ?? fieldRow(data, o.city, ALL);
		return [
			[f$(r.take) + '/mo', 'est. take-home'],
			[f$(r.c.expenses) + '/mo', 'modest budget, excl. taxes'],
			[fSav(r.savings) + '/mo', r.savings < 0 ? 'monthly shortfall' : 'left to save'],
			[fMo(r.months), 'to save $10,000'],
			[fPct(r.rentShare), 'rent share of take-home'],
			[fN(fr.jobs), o.field === ALL ? 'entry-level jobs' : `entry-level ${o.field} jobs`],
			[r.c.unemp.toFixed(1) + '%', 'unemployment, 2025'],
			[fPct(r.c.young), 'residents aged 20–29']
		];
	}

	// Both offers' bars share one dollar scale.
	let max = $derived(Math.max(A.take, B.take, A.c.expenses, B.c.expenses) * 1.05);
	const barRows = (r) => [
		['Take-home pay', r.take],
		['Rent (studio)', r.housing],
		['Rest of budget', r.rest],
		[r.savings < 0 ? 'Shortfall' : 'Left to save', r.savings]
	];
	let pair = $derived([
		['A', A, offers.A],
		['B', B, offers.B]
	]);
</script>

<section class="story" id="compare">
	<div class="wrap">
		<p class="beat">Rising insights</p>
		<h2>Put the two offers side by side</h2>
		<p class="lede">{lede}</p>
		<div class="compare">
			{#each pair as [k, r, o] (k)}
				<div class="offer {k.toLowerCase()}">
					<div class="tag"><i></i>Offer {k} · {r.c.city}, {r.c.state}</div>
					<h3>{f$(r.salary)} a year</h3>
					<div class="stats">
						{#each stats(r, o) as [v, l]}
							<div class="stat"><b>{v}</b><span>{l}</span></div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<div class="card bars">
			<h3>What each paycheck covers in a month</h3>
			<p class="sub">
				Estimated take-home at the offered salary against EPI's modest single-adult budget for that metro. Bars are
				on one shared dollar scale.
			</p>
			{#each pair as [k, r] (k)}
				<div class="bar-title">Offer {k} · {r.c.city}</div>
				{#each barRows(r) as [l, v]}
					<div class="bar-row {k.toLowerCase()}">
						<span class="lbl">{l}</span>
						<div class="track">
							<div class="fill" class:neg={v < 0} style:width="{Math.min(100, (Math.abs(v) / max) * 100)}%"></div>
						</div>
						<span class="val">{fSav(v)}</span>
					</div>
				{/each}
			{/each}
		</div>
	</div>
</section>

<style>
	.compare {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	@media (max-width: 760px) {
		.compare {
			grid-template-columns: 1fr;
		}
	}
	.offer {
		border: 1px solid var(--border);
		border-top: 4px solid var(--a);
		border-radius: 12px;
		background: var(--surface);
		padding: 14px 16px;
	}
	.offer.b {
		border-top-color: var(--b);
	}
	.tag {
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--ink-2);
	}
	.tag i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--a);
		display: inline-block;
	}
	.offer.b .tag i {
		background: var(--b);
	}
	.offer h3 {
		margin: 6px 0 10px;
		font-size: 22px;
	}
	.bars {
		margin-top: 16px;
	}
	.bar-title {
		font-weight: 650;
		margin: 10px 0 2px;
	}
	.bar-row {
		display: grid;
		grid-template-columns: 140px 1fr 90px;
		gap: 10px;
		align-items: center;
		font-size: 13px;
		margin: 6px 0;
	}
	.lbl {
		color: var(--ink-2);
	}
	.val {
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.track {
		height: 12px;
		background: var(--mid);
		border-radius: 4px;
		overflow: hidden;
	}
	.fill {
		height: 100%;
		background: var(--series);
		border-radius: 0 4px 4px 0;
		transition: width 300ms;
	}
	.bar-row.b .fill {
		background: var(--accent);
	}
	.fill.neg {
		background: var(--neg);
	}
</style>
