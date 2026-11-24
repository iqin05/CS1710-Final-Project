import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as d3 from 'd3';
import { cityRow, fieldIndex, defaultOffers, titleEcon } from '#lib/data.js';

// Runs once at build time (the page is prerendered). Works out the two story offers (Business and
// Finance, 25th-percentile salary) from static/cities.csv and static/city_by_field.csv, plus what
// each keeps in a year and its budget, so the title screen can draw
// its piles of cash in the very first paint, before the browser has downloaded the scripts and the
// full data. Only these few numbers are embedded in the page; everything else loads in the browser.
export function load() {
	const read = (f) => d3.csvParse(readFileSync(join(process.cwd(), 'static', f), 'utf8'));
	const cities = read('cities.csv').map(cityRow);
	const data = { byCity: Object.fromEntries(cities.map((c) => [c.city, c])), byField: fieldIndex(read('city_by_field.csv')) };
	const offers = defaultOffers(data);
	return { initialOffers: offers, initialEcon: titleEcon(data, offers) };
}
