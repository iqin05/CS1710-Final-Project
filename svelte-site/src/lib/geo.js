import * as d3 from 'd3';
import { feature } from 'topojson-client';
import us from 'us-atlas/states-10m.json';

// Lower-48 state shapes (every metro in the data is in the lower 48 or DC).
const DROP = new Set(['02', '15', '72']);
const states = feature(us, us.objects.states);
states.features = states.features.filter((f) => !DROP.has(f.id));

/** An Albers USA projection fitted to width × height, plus the state paths drawn with it. */
export function usMap(width, height) {
	const projection = d3.geoAlbersUsa().fitSize([width, height], states);
	const path = d3.geoPath(projection);
	return { projection, paths: states.features.map((f) => ({ id: f.id, d: path(f) })) };
}
