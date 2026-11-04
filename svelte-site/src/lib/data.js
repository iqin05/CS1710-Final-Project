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
export const fMo = (m) =>
	!isFinite(m)
		? 'never'
		: m <= 60
			? d3.format('.1f')(m) + ' mo'
			: m < 240
				? d3.format('.1f')(m / 12) + ' yrs'
				: d3.format(',.0f')(m / 12) + ' yrs';
export const fJobs = (v) => (v >= 1e6 ? d3.format('.2s')(v) : d3.format('.0s')(v));
// Signed money for savings, with a true minus sign: −$659/mo.
export const fSav = (v) => (v < 0 ? '−' : '') + f$(Math.abs(v));

const num = (v, nd = 0) => (nd ? +(+v).toFixed(nd) : Math.round(+v));

// Every CSV value arrives as a string; convert to the short keys the views use.
function cityRow(r) {
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
		transit: num(r.pct_commute_transit, 3)
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
		months: savings > 0 ? 10000 / savings : Infinity,
		rentShare: c.housing / take,
		housing: c.housing,
		rest: c.expenses - c.housing
	};
}

/** Offer salaries move in $5,000 steps; offers start at the nearest step to the data's salary. */
export const SALARY_STEP = 5000;
export const roundSalary = (v) => Math.round(v / SALARY_STEP) * SALARY_STEP;

/** An offer in `city`/`field` at that metro's entry-level (25th-percentile) salary, rounded. */
export function offerAt(data, city, field) {
	const r = fieldRow(data, city, field) ?? fieldRow(data, city, ALL);
	return { city, field, salary: roundSalary(r.salary) };
}

/** The opening pair: New York vs. Detroit, any field, at their local entry-level salaries. */
export const defaultOffers = (data) => ({ A: offerAt(data, 'New York', ALL), B: offerAt(data, 'Detroit', ALL) });
