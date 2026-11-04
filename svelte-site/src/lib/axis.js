import * as d3 from 'd3';

/**
 * Attachment for an axis <g>: `<g class="axis" {@attach axis(gen)}>`, where gen is
 * `(selection) => selection.call(d3.axisBottom(x)…)`. Re-runs whenever gen changes.
 * This is the only place the page hands a DOM node to a D3 selection.
 */
export const axis = (gen) => (node) => {
	d3.select(node).call(gen);
};

/** Gridline-style axis: ticks stretched across the plot, no domain line. */
export const gridAxis = (axisFn, size) => (g) =>
	g.call(axisFn.tickSize(-size)).call((a) => a.select('.domain').remove());
