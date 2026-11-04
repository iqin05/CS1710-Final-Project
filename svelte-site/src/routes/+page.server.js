import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as d3 from 'd3';
import { cityRow, defaultOffers, titleEcon } from '#lib/data.js';

// Runs once at build time (the page is prerendered). Works out the two default offers from
// static/cities.csv, plus what each keeps in a year and its budget, so the title screen can draw
// its piles of cash in the very first paint, before the browser has downloaded the scripts and the
// full data. Only these few numbers are embedded in the page; everything else loads in the browser.
export function load() {
	const text = readFileSync(join(process.cwd(), 'static', 'cities.csv'), 'utf8');
	const cities = d3.csvParse(text).map(cityRow);
	const data = { byCity: Object.fromEntries(cities.map((c) => [c.city, c])) };
	const offers = defaultOffers(data);
	return { initialOffers: offers, initialEcon: titleEcon(data, offers) };
}
