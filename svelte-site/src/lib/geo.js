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

/** An Albers USA projection fitted to width × height, the state paths drawn with it, and the
 *  outline of the whole lower 48. */
export function usMap(width, height) {
	const projection = d3.geoAlbersUsa().fitSize([width, height], states);
	const path = d3.geoPath(projection);
	return {
		projection,
		paths: states.features.map((f) => ({ id: f.id, d: path(f) })),
		outline: path(nation)
	};
}
