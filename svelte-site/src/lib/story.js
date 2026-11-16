import * as d3 from 'd3';
import { ALL, f$, fK, fN, fPct, fMo, calc, fieldRow, fieldShares } from '#lib/data.js';

// The words of the scrollytelling steps, computed from the data and the reader's two offers so the
// narrative follows whatever offers they set. Each function returns plain strings; the page lays
// them out. Visuals live in their own components.

const ord = (n) => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] || 'th');
const corr = (xs, ys) => {
	const mx = d3.mean(xs);
	const my = d3.mean(ys);
	const num = d3.sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
	return num / Math.sqrt(d3.sum(xs.map((x) => (x - mx) ** 2)) * d3.sum(ys.map((y) => (y - my) ** 2)));
};
const fieldName = (f) => (f === ALL ? 'any field' : f);

/** The two offer cities' rows, A then B. */
export const cities = (data, offers) => [data.byCity[offers.A.city], data.byCity[offers.B.city]];

/** Step: is there work in my field? (Offer A's field drives the jobs view.) */
export function jobsForMe(data, offers) {
	const field = offers.A.field;
	const rows = data.cities
		.map((c) => ({ c, f: fieldRow(data, c.city, field) }))
		.filter((r) => r.f)
		.sort((p, q) => q.f.jobs - p.f.jobs);
	const rank = (city) => rows.findIndex((r) => r.c.city === city) + 1;
	const [a, b] = cities(data, offers);
	const ja = fieldRow(data, a.city, field)?.jobs ?? 0;
	const jb = fieldRow(data, b.city, field)?.jobs ?? 0;
	const [more, fewer, jm, jf] = ja >= jb ? [a, b, ja, jb] : [b, a, jb, ja];
	return {
		field,
		label: fieldName(field),
		named: field !== ALL,
		total: rows.length,
		rankA: rank(a.city),
		rankB: rank(b.city),
		jobsA: fN(ja),
		jobsB: fN(jb),
		ratio: jf ? d3.format('.1f')(jm / jf) : null,
		more: more.city,
		fewer: fewer.city
	};
}

/** Step: does more opportunity mean more pay, in my field? */
export function payVsJobs(data, offers) {
	const field = offers.A.field;
	const rows = data.cities.map((c) => fieldRow(data, c.city, field)).filter(Boolean);
	const r = corr(rows.map((f) => Math.log(f.jobs)), rows.map((f) => f.salary));
	const [a, b] = cities(data, offers);
	const fa = fieldRow(data, a.city, field);
	const fb = fieldRow(data, b.city, field);
	return {
		label: fieldName(field),
		strength: Math.abs(r) < 0.3 ? 'barely' : Math.abs(r) < 0.6 ? 'only loosely' : 'fairly closely',
		salA: fa ? f$(fa.salary) : '—',
		salB: fb ? f$(fb.salary) : '—'
	};
}

/** Step: what does each city hire everyone for? */
export function forEveryone(data, offers) {
	return cities(data, offers).map((c, i) => {
		const rows = fieldShares(data, c.city);
		const field = offers[i ? 'B' : 'A'].field;
		const k = rows.findIndex((r) => r.field === field);
		return {
			city: c.city,
			top: rows.slice(0, 3).map((r) => r.field),
			topShare: fPct(rows[0].share),
			mine: field === ALL ? null : { field, rank: k + 1, of: rows.length, share: fPct(rows[k]?.share ?? 0) }
		};
	});
}

/** A field in a city's top three at least this many times its national share is a regional standout. */
const STANDOUT = 1.4;

/**
 * Step: are the offer cities' hiring mixes national patterns or regional anomalies? One sentence.
 * The national leader is the field ranked #1 in the most metros; a standout is the field in a
 * city's top three whose share of the city's entry-level jobs is furthest above its national share
 * (all 40 metros pooled), when that is at least STANDOUT times.
 */
export function nationalMix(data, offers) {
	const N = data.cities.length;
	const shares = new Map(data.cities.map((c) => [c.city, fieldShares(data, c.city)]));
	const total = d3.sum(data.cities, (c) => c.jobs);
	const national = (f) => d3.sum(data.cities, (c) => data.byField[c.city]?.[f]?.jobs ?? 0) / total;
	const leads = d3.rollup([...shares.values()], (v) => v.length, (rows) => rows[0].field);
	const [leader, n] = [...leads].sort((p, q) => q[1] - p[1])[0];

	const names = [...new Set([offers.A.city, offers.B.city])];
	const info = names.map((city) => {
		const top3 = shares.get(city).slice(0, 3);
		const best = top3.map((r) => ({ ...r, ratio: r.share / national(r.field) })).sort((p, q) => q.ratio - p.ratio)[0];
		// Where this city's share of that field ranks among all metros (1 = highest).
		const rank = 1 + [...shares.values()].filter((rows) => (rows.find((r) => r.field === best.field)?.share ?? 0) > best.share).length;
		return { city, leads: top3[0].field === leader, best, rank, standout: best.ratio >= STANDOUT };
	});
	const poss = (list) => list.map((d) => d.city + "'s").join(' and ');
	const standouts = info.filter((d) => d.standout);
	const usual = info.filter((d) => !d.standout);
	const notLeading = info.filter((d) => !d.leads);

	let s = `Nationally, ${leader} is the top new-grad field in ${n} of ${N} metros`;
	s += notLeading.length ? `, though not in ${notLeading.map((d) => d.city).join(' or ')}` : ', so that lead is no local quirk';
	if (!standouts.length) return `${s}, and the rest of ${poss(usual)} top fields track the national mix too.`;
	s += `; the real regional ${standouts.length > 1 ? 'anomalies are' : 'anomaly is'} `;
	// The first standout is spelled out; a second is kept short so the sentence stays readable.
	const high = (d) => (d.rank === 1 ? 'highest' : ord(d.rank) + '-highest');
	const x = (d) => d3.format('.1f')(d.best.ratio) + '×';
	s += standouts
		.map((d, i) =>
			i === 0
				? `${d.city}'s ${d.best.field}, at ${x(d)} its national share (${high(d)} of ${N} metros)`
				: `${d.city}'s ${d.best.field} (${x(d)}, ${high(d)})`
		)
		.join(' and ');
	if (usual.length) s += `, while ${poss(usual)} top fields track the national mix`;
	return s + '.';
}

/** Step: where will I live? */
export function rent(data, offers) {
	const ms = ['A', 'B'].map((k) => calc(data, offers[k].city, offers[k].salary));
	const [hi, lo] = ms[0].housing >= ms[1].housing ? ms : [ms[1], ms[0]];
	const xs = data.cities.map((d) => d.housing);
	const r = corr(xs, data.cities.map((d) => d.rentShare));
	return {
		hi: hi.c.city,
		lo: lo.c.city,
		rentHi: f$(hi.housing),
		rentLo: f$(lo.housing),
		diff: f$(hi.housing - lo.housing),
		median: f$(d3.median(xs)),
		shareA: fPct(ms[0].rentShare),
		shareB: fPct(ms[1].rentShare),
		bite: r > 0.3
	};
}

/** Step: how will I get to work? */
export function commute(data, offers) {
	const [a, b] = cities(data, offers);
	const carFree = (c) => c.transit + c.walk;
	const [driver, rider] = carFree(a) >= carFree(b) ? [b, a] : [a, b];
	return {
		a: a.city,
		b: b.city,
		minA: Math.round(a.commute),
		minB: Math.round(b.commute),
		median: Math.round(d3.median(data.cities, (d) => d.commute)),
		rider: rider.city,
		riderShare: fPct(carFree(rider)),
		driver: driver.city,
		driveAlone: fPct(driver.driveAlone)
	};
}

/** Step: what's actually left each month, and how long to $10,000? (at the offered salaries) */
export function savings(data, offers) {
	return ['A', 'B'].map((k) => {
		const m = calc(data, offers[k].city, offers[k].salary);
		return { k, city: offers[k].city, salary: f$(offers[k].salary), left: m.savings, months: m.months, monthsTxt: fMo(m.months) };
	});
}

/** Main message: the two offer cities on their typical entry salaries, among all 40. */
export function message(data, offers) {
	const rank = (key) => [...data.cities].sort((p, q) => q[key] - p[key]).map((c) => c.city);
	const rS = rank('salary');
	const rV = rank('savings');
	const [a, b] = cities(data, offers);
	const [hi, lo] = a.salary >= b.salary ? [a, b] : [b, a];
	const salaries = data.cities.map((c) => c.salary);
	return {
		same: a === b,
		hi: hi.city,
		lo: lo.city,
		hiRank: ord(rS.indexOf(hi.city) + 1),
		payGap: fK(hi.salary - lo.salary),
		keepGap: f$(Math.abs(lo.savings - hi.savings)),
		reversed: hi.savings < lo.savings,
		ranks: [a, b].map((c) => ({ city: c.city, salary: f$(c.salary), sRank: ord(rS.indexOf(c.city) + 1), save: f$(c.savings), vRank: ord(rV.indexOf(c.city) + 1) })),
		rExp: corr(salaries, data.cities.map((c) => c.expenses)).toFixed(2),
		rSav: corr(salaries, data.cities.map((c) => c.savings)).toFixed(2)
	};
}

/** Next steps: the headline comparison at the offered salaries. */
export function verdict(data, offers) {
	const A = calc(data, offers.A.city, offers.A.salary);
	const B = calc(data, offers.B.city, offers.B.salary);
	const [hi, lo] = A.salary >= B.salary ? [A, B] : [B, A];
	const keeper = A.savings >= B.savings ? A : B;
	return {
		same: A.c === B.c,
		hi: hi.c.city,
		lo: lo.c.city,
		payGap: f$(hi.salary - lo.salary),
		keepGap: f$(Math.abs(hi.savings - lo.savings)),
		biggerWins: hi === keeper
	};
}
