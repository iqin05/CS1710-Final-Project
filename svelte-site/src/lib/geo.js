import * as d3 from 'd3';
import { feature, merge } from 'topojson-client';
import us from 'us-atlas/states-10m.json';

// Lower-48 state shapes (every metro in the data is in the lower 48 or DC).
const DROP = new Set(['02', '15', '72']);
const states = feature(us, us.objects.states);
states.features = states.features.filter((f) => !DROP.has(f.id));
// The lower 48 as one shape, for the country's outer edge.
const nation = merge(
	us,
	us.objects.states.geometries.filter((g) => !DROP.has(g.id))
);

// Postal abbreviations by state name (the data gives each metro's state as an abbreviation).
const ABBR = Object.fromEntries(
	('AL Alabama|AZ Arizona|AR Arkansas|CA California|CO Colorado|CT Connecticut|DE Delaware|FL Florida|' +
		'GA Georgia|ID Idaho|IL Illinois|IN Indiana|IA Iowa|KS Kansas|KY Kentucky|LA Louisiana|ME Maine|' +
		'MD Maryland|MA Massachusetts|MI Michigan|MN Minnesota|MS Mississippi|MO Missouri|MT Montana|' +
		'NE Nebraska|NV Nevada|NH New Hampshire|NJ New Jersey|NM New Mexico|NY New York|NC North Carolina|' +
		'ND North Dakota|OH Ohio|OK Oklahoma|OR Oregon|PA Pennsylvania|RI Rhode Island|SC South Carolina|' +
		'SD South Dakota|TN Tennessee|TX Texas|UT Utah|VT Vermont|VA Virginia|WA Washington|WV West Virginia|' +
		'WI Wisconsin|WY Wyoming')
		.split('|')
		.map((s) => [s.slice(3), s.slice(0, 2)])
);

// A label spot for each state: the center of its largest piece (so Michigan's sits on the lower
// peninsula), with the state's name and postal abbreviation.
function stateLabels(path) {
	return states.features.map((f) => {
		const g = f.geometry;
		const parts = g.type === 'MultiPolygon' ? g.coordinates.map((c) => ({ type: 'Polygon', coordinates: c })) : [g];
		const main = parts.reduce((a, b) => (path.area(b) > path.area(a) ? b : a));
		const name = f.properties.name;
		return { id: f.id, name, abbr: ABBR[name], p: path.centroid(main) };
	});
}

/** An Albers USA projection fitted to width × height, the state paths drawn with it, the outline
 *  of the whole lower 48, and a label spot for each state. */
export function usMap(width, height) {
	const projection = d3.geoAlbersUsa().fitSize([width, height], states);
	const path = d3.geoPath(projection);
	return {
		projection,
		paths: states.features.map((f) => ({ id: f.id, d: path(f) })),
		labels: stateLabels(path),
		outline: path(nation)
	};
}
