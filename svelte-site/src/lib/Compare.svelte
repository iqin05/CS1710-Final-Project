<script>
	import { ALL, f$, fPct, fN, fMo, fSav, calc, fieldRow, fieldShares } from '#lib/data.js';

	// NEXT STEPS: the two offers side by side with every factor the story covered, at the offered
	// salaries. Savings and time to $10,000 lead and are highlighted; the rest follow in story order.
	let { data, offers } = $props();

	let A = $derived(calc(data, offers.A.city, offers.A.salary));
	let B = $derived(calc(data, offers.B.city, offers.B.salary));
	let hi = $derived(A.salary >= B.salary ? A : B);
	let lo = $derived(hi === A ? B : A);
	let keeper = $derived(A.savings >= B.savings ? A : B);

	let lede = $derived(
		A.c === B.c
			? `Both offers are in ${A.c.city}, so the higher salary simply keeps more.`
			: hi === keeper
				? `${hi.c.city} pays ${f$(hi.salary - lo.salary)} more and also leaves ${f$(hi.savings - lo.savings)} more at the end of each month. Here the bigger number wins, but weigh the rest of the picture too.`
				: `${hi.c.city} pays ${f$(hi.salary - lo.salary)} more a year, yet ${lo.c.city} leaves ${f$(lo.savings - hi.savings)} more in your pocket every month. The gap is cost, not pay.`
	);

	// Field standing: rank among the city's fields and jobs in the offer's field.
	function fieldInfo(o) {
		if (o.field === ALL) return { rank: '—', jobs: fieldRow(data, o.city, ALL).jobs, label: 'all fields' };
		const rows = fieldShares(data, o.city);
		const i = rows.findIndex((r) => r.field === o.field);
		return { rank: i >= 0 ? `#${i + 1} of ${rows.length}` : 'not reported', jobs: rows[i]?.jobs ?? 0, label: o.field };
	}
	const carFree = (c) => c.transit + c.walk;

	// One row per factor: label, the two values, and which side is better (for a subtle mark) when
	// "better" is clear. Savings rows come first and are highlighted.
	let rows = $derived.by(() => {
		const fa = fieldInfo(offers.A);
		const fb = fieldInfo(offers.B);
		const better = (va, vb, lowerIsBetter = false) =>
			va === vb ? null : (lowerIsBetter ? va < vb : va > vb) ? 'A' : 'B';
		return [
			{ key: 'save', label: 'Left to save each month', a: fSav(A.savings), b: fSav(B.savings), win: better(A.savings, B.savings), hero: true },
			{
				key: 'months',
				label: 'Time to save $10,000',
				a: fMo(A.months),
				b: fMo(B.months),
				win: better(A.months, B.months, true),
				hero: true
			},
			{ key: 'salary', label: 'Salary', a: f$(A.salary) + '/yr', b: f$(B.salary) + '/yr', win: better(A.salary, B.salary) },
			{ key: 'take', label: 'Take-home pay (after taxes)', a: f$(A.take) + '/mo', b: f$(B.take) + '/mo', win: better(A.take, B.take) },
			{
				key: 'rent',
				label: 'Studio rent',
				a: `${f$(A.housing)}/mo · ${fPct(A.rentShare)} of take-home`,
				b: `${f$(B.housing)}/mo · ${fPct(B.rentShare)} of take-home`,
				win: better(A.rentShare, B.rentShare, true)
			},
			{ key: 'rest', label: 'Everyday costs (food, car, health, other)', a: f$(A.rest) + '/mo', b: f$(B.rest) + '/mo', win: better(A.rest, B.rest, true) },
			{
				key: 'field',
				label: 'Your field in the city',
				a: offers.A.field === ALL ? 'any field (none named)' : `${fa.label} · ${fa.rank} by jobs`,
				b: offers.B.field === ALL ? 'any field (none named)' : `${fb.label} · ${fb.rank} by jobs`,
				win: null
			},
			{ key: 'jobs', label: 'Entry-level jobs in your field', a: fN(fa.jobs), b: fN(fb.jobs), win: better(fa.jobs, fb.jobs) },
			{
				key: 'commute',
				label: 'Commute',
				a: `${Math.round(A.c.commute)} min · ${fPct(carFree(A.c))} car-free`,
				b: `${Math.round(B.c.commute)} min · ${fPct(carFree(B.c))} car-free`,
				win: better(A.c.commute, B.c.commute, true)
			},
			{ key: 'unemp', label: 'Unemployment (2025)', a: A.c.unemp.toFixed(1) + '%', b: B.c.unemp.toFixed(1) + '%', win: better(A.c.unemp, B.c.unemp, true) },
			{ key: 'young', label: 'Residents aged 20–29', a: fPct(A.c.young), b: fPct(B.c.young), win: null }
		];
	});
</script>

<div class="viz">
		<div class="card table-card">
			<table>
				<caption class="sr">The two offers compared on every factor in the story</caption>
				<thead>
					<tr>
						<th scope="col"></th>
						<th scope="col" class="a"><i></i>Offer A · {A.c.city}, {A.c.state}</th>
						<th scope="col" class="b"><i></i>Offer B · {B.c.city}, {B.c.state}</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r (r.key)}
						<tr class:hero={r.hero}>
							<th scope="row">{r.label}</th>
							<td class:win={r.win === 'A'}>{r.a}</td>
							<td class:win={r.win === 'B'}>{r.b}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="note">
				Bold marks the stronger side where one is clearly better. Savings already subtracts taxes, rent and everyday
				costs, which is why it leads.
			</p>
		</div>
</div>

<style>
	.table-card {
		padding: 6px 18px 14px;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	thead th {
		text-align: left;
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--ink-2);
		padding: 12px 10px 8px;
		border-bottom: 1px solid var(--border);
	}
	thead th i {
		display: inline-block;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--a);
		margin-right: 6px;
	}
	thead th.b i {
		background: var(--b);
	}
	tbody th {
		text-align: left;
		font-weight: 500;
		color: var(--ink-2);
		padding: 9px 10px;
		width: 30%;
	}
	td {
		padding: 9px 10px;
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
	}
	tbody tr + tr {
		border-top: 1px solid var(--grid);
	}
	td.win {
		color: var(--ink);
		font-weight: 650;
	}
	/* The savings rows lead, larger and on a tinted band. */
	tr.hero {
		background: var(--mid);
	}
	tr.hero th {
		color: var(--ink);
		font-weight: 650;
	}
	tr.hero td {
		font-size: 20px;
		color: var(--ink);
	}
	tr.hero td.win {
		font-weight: 750;
	}
	.note {
		margin: 10px 0 0;
		font-size: 12px;
		color: var(--muted);
	}
</style>
