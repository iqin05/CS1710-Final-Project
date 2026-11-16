import * as d3 from 'd3';
import { asset } from '$app/paths';

// Shared data access and formatting. Mirrors the old site's js/common.js and
// site/build_data.py, but reads the CSVs directly instead of a generated data.js.

export const ALL = 'All fields';
export const REGIONS = ['Northeast', 'Midwest', 'South', 'West'];

export const f$ = d3.format('$,.0f');
export const fK = (v) => '$' + d3.format(',.1f')(v / 1000) + 'K';
export const fPct = d3.format('.0%');
export const fN = d3.format(',');

// Time-to-save rule. Savings = take-home pay minus the monthly budget (excl. taxes). When expenses
// meet or exceed take-home, savings is zero or negative, the goal can never be reached, and every
// time-to-save output reads UNREACHABLE.
export const GOAL = 10000;
export const UNREACHABLE = 'Goal unreachable on current budget';
/** Months to save `goal` at `savings` a month; Infinity when expenses meet or exceed take-home. */
export const monthsToSave = (savings, goal = GOAL) => (savings > 0 ? goal / savings : Infinity);

export const fMo = (m) =>
	!isFinite(m)
		? UNREACHABLE
		: m <= 60
			? d3.format('.1f')(m) + ' mo'
			: m < 240
				? d3.format('.1f')(m / 12) + ' yrs'
				: d3.format(',.0f')(m / 12) + ' yrs';
export const fJobs = (v) => (v >= 1e6 ? d3.format('.2s')(v) : d3.format('.0s')(v));
// The primary metric, take-home pay minus the monthly budget, is shown to readers as "What’s Left
// Over" (code still calls it `savings`).
export const LEFT_OVER = 'What’s Left Over';
/**
 * A tooltip row for what's left over: [value, label]. A negative amount reads as money short each
 * month rather than a bare minus sign.
 */
export const leftOverRow = (v, suffix = '') =>
	v < 0 ? [f$(-v) + '/mo', 'short each month' + suffix] : [f$(v) + '/mo', 'left over each month' + suffix];
// What's left over, in words instead of a minus sign: "$1,200", or "$659 short" for a deficit.
export const fSav = (v) => (v < 0 ? f$(-v) + ' short' : f$(v));
// The same as a phrase: "$1,200 a month left over" / "$659 a month short".
export const fLeftMonth = (v) => (v < 0 ? `${f$(-v)} a month short` : `${f$(v)} a month left over`);

const num = (v, nd = 0) => (nd ? +(+v).toFixed(nd) : Math.round(+v));

// Every CSV value arrives as a string; convert to the short keys the views use.
export function cityRow(r) {
	return {
		city: r.city,
		state: r.state,
		region: r.region,
		lat: +r.lat,
		lon: +r.lon,
		salary: num(r.entry_salary_p25),
		salaryMed: num(r.entry_salary_median),
		take: num(r.est_monthly_take_home),
		savings: num(r.est_monthly_savings),
		expenses: num(r.epi_monthly_expenses_excl_taxes),
		housing: num(r.epi_monthly_housing),
		food: num(r.epi_monthly_food),
		transport: num(r.epi_monthly_transportation),
		health: num(r.epi_monthly_healthcare),
		other: num(r.epi_monthly_other_necessities),
		tax: num(r.epi_effective_tax_rate, 4),
		rentShare: num(r.rent_share_of_take_home, 3),
		jobs: num(r.entry_level_jobs),
		jobsPer1000: num(r.entry_jobs_per_1000, 1),
		totalJobs: num(r.total_jobs),
		unemp: num(r.unemployment_rate, 1),
		young: num(r.share_age_20_29, 3),
		rent1br: num(r.rent_1br),
		colAdj: num(r.salary_col_adjusted),
		rpp: num(r.rpp_all_items, 1),
		commute: num(r.mean_commute_min, 1),
		transit: num(r.pct_commute_transit, 3),
		walk: num(r.pct_commute_walk, 3),
		wfh: num(r.pct_work_from_home, 3),
		driveAlone: num(r.pct_commute_drive_alone, 3)
	};
}

/** Load both CSVs. Returns { cities, byCity, byField, fields }. */
export async function loadData() {
	const [cityRows, fieldRows] = await Promise.all([
		d3.csv(asset('cities.csv')),
		d3.csv(asset('city_by_field.csv'))
	]);
	const cities = cityRows.map(cityRow);
	const byField = {};
	for (const r of fieldRows) {
		(byField[r.city] ??= {})[r.field] = {
			salary: num(r.entry_salary_p25),
			take: num(r.est_monthly_take_home),
			savings: num(r.est_monthly_savings),
			jobs: num(r.entry_level_jobs)
		};
	}
	// Alphabetical, with the catch-all "Other" last.
	const fields = [...new Set(fieldRows.map((r) => r.field))].filter((f) => f !== 'Other').sort();
	fields.push('Other');
	return { cities, byCity: Object.fromEntries(cities.map((c) => [c.city, c])), byField, fields };
}

/** Salary, take-home, savings and jobs for a city in one field (or all fields). */
export function fieldRow(data, city, field) {
	const c = data.byCity[city];
	if (!c) return null;
	if (field === ALL) return { salary: c.salary, take: c.take, savings: c.savings, jobs: c.jobs };
	return data.byField[city]?.[field] ?? null;
}

/**
 * A metro's career fields ranked by entry-level jobs, largest first (the catch-all "Other" left
 * out): [{ field, jobs, share }], where share is the field's part of all the metro's entry-level jobs.
 */
export function fieldShares(data, city) {
	const c = data.byCity[city];
	return data.fields
		.filter((f) => f !== 'Other')
		.map((f) => {
			const jobs = data.byField[city]?.[f]?.jobs ?? 0;
			return { field: f, jobs, share: jobs / c.jobs };
		})
		.sort((a, b) => b.jobs - a.jobs);
}

/** Monthly economics for any salary in a metro; same formula as the dataset's derived columns. */
export function calc(data, city, salary) {
	const c = data.byCity[city];
	const taxes = (salary * c.tax) / 12;
	const take = salary / 12 - taxes;
	const savings = take - c.expenses;
	return {
		c,
		salary,
		taxes,
		take,
		savings,
		months: monthsToSave(savings),
		rentShare: c.housing / take,
		housing: c.housing,
		rest: c.expenses - c.housing
	};
}

/** Size of one cash bundle on the title screen. */
export const SALARY_STEP = 5000;
/** The − / + buttons in the "Try other offers" step move a salary by this much. */
export const SALARY_ADJUST = 1000;

/**
 * The locked baseline salary for an offer: the typical entry-level (25th-percentile) salary for that
 * city and field. OEWS wages cover all workers, not just new hires, so the 25th percentile stands in
 * for starting pay (close to NACE's class-of-2025 average). Uses all fields
 * when the city has no data for the field. Offers vary only by location and industry.
 */
export function baselineSalary(data, city, field) {
	const r = fieldRow(data, city, field) ?? fieldRow(data, city, ALL);
	return r.salary;
}

/** An offer in `city`/`field` at its baseline (25th-percentile entry-level) salary. */
export function offerAt(data, city, field) {
	return { city, field, salary: baselineSalary(data, city, field) };
}

/**
 * What the title screen needs for each offer: a year of spending at the offered salary, split into
 * taxes, rent, and everyday costs (the rest of the metro's budget). Needs only `data.byCity`.
 */
export function titleEcon(data, offers) {
	const one = (o) => {
		const m = calc(data, o.city, o.salary);
		return { taxes: m.taxes * 12, rent: m.housing * 12, everyday: m.rest * 12 };
	};
	return { A: one(offers.A), B: one(offers.B) };
}

/** The opening pair: New York vs. Detroit, any field, at their local entry-level salaries. */
export const defaultOffers = (data) => ({ A: offerAt(data, 'New York', ALL), B: offerAt(data, 'Detroit', ALL) });
