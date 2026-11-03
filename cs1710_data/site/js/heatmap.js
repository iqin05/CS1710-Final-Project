/* ADDITIONAL VIZ 1: field x city heatmap of monthly savings. */
window.Heatmap = (function(){
  const { D, ALL, REGIONS, f$, fN, showTip, hideTip, on, state } = App;
  const FIELDS = ["Computer & Math","Management","Engineering & Architecture","Healthcare","Science","Business & Finance","Sales","Education","Arts, Design & Media","Community & Social Service"];
  const st = { region: "All regions", minJobs: 1000, sort: ALL };
  let root, tbl, side;
  const color = v => { const t = Math.max(-1, Math.min(1, v / 3200)); return t < 0 ? d3.interpolateLab("#f0efec", "#d9534f")(-t) : d3.interpolateLab("#f0efec", "#4f7fc0")(t); };
  function val(c, f){ if (f === ALL) return { v: c.savings, jobs: c.jobs }; const r = D.byField[c.city][f]; return r ? { v: r.savings, jobs: r.jobs } : null; }
  function mount(){
    root = d3.select("#heatmap");
    const filt = root.append("div").attr("class","filters");
    const seg = filt.append("div").attr("class","seg");
    seg.selectAll("button").data(["All regions"].concat(REGIONS)).join("button").attr("type","button").text(d=>d).attr("aria-pressed", d=>d===st.region).on("click", (e,d) => { st.region = d; seg.selectAll("button").attr("aria-pressed", x=>x===d); render(); });
    const lab = filt.append("label").text("Hide cells with fewer than ");
    const sel = lab.append("select").style("min-width","110px");
    sel.selectAll("option").data([0, 1000, 5000, 20000]).join("option").attr("value", d=>d).text(d => d ? fN(d) + " jobs" : "no minimum");
    sel.property("value", st.minJobs).on("change", function(){ st.minJobs = +this.value; render(); });
    filt.append("span").style("font-size","12px").style("color","var(--muted)").text("Click a column heading to sort cities by that field.");
    side = root.append("div").attr("class","card sidestat").style("margin-bottom","12px");
    const wrap = root.append("div").attr("class","hm-wrap").style("max-height","640px");
    tbl = wrap.append("table").attr("class","hm");
    root.append("div").attr("class","legend-ramp").html('<span>−$2,900</span><i></i><span>+$2,900</span><span style="margin-left:10px">Red cells lose money each month on a modest budget; blue cells save. Hatched = too few jobs or no data.</span>');
    on(render);
  }
  function render(){
    const cols = [ALL].concat(FIELDS);
    let cities = D.cities.filter(c => st.region === "All regions" || c.region === st.region);
    cities.sort((a,b) => { const va = val(a, st.sort), vb = val(b, st.sort); return (vb ? vb.v : -1e9) - (va ? va.v : -1e9); });
    tbl.selectAll("*").remove();
    const thead = tbl.append("thead").append("tr");
    thead.append("th").text("Metro");
    thead.selectAll("th.f").data(cols).join("th").attr("class", d => "f" + (d===st.sort ? " sorted" : "")).text(d => d + (d===st.sort ? " ↓" : "")).on("click", (e,d) => { st.sort = d; render(); });
    const tb = tbl.append("tbody");
    const med = tb.append("tr").attr("class","median"); med.append("td").text("Median across metros");
    med.selectAll("td.m").data(cols).join("td").attr("class","m").text(f => { const vs = cities.map(c=>val(c,f)).filter(x=>x && x.jobs>=st.minJobs).map(x=>x.v); return vs.length ? f$(d3.median(vs)) : "–"; });
    const offers = new Set([state.A.city, state.B.city]);
    const tr = tb.selectAll("tr.c").data(cities, d=>d.city).join("tr").attr("class", d => "c" + (offers.has(d.city) ? " hl" : ""));
    tr.append("td").text(d => `${d.city}, ${d.state}`);
    tr.selectAll("td.v").data(c => cols.map(f => ({ c, f, x: val(c, f) }))).join("td")
      .attr("class", d => "v" + (d.f===ALL ? " all" : "") + (!d.x || d.x.jobs < st.minJobs ? " na" : ""))
      .style("background", d => d.x && d.x.jobs >= st.minJobs ? color(d.x.v) : null)
      .style("color", d => d.x && d.x.jobs >= st.minJobs && Math.abs(d.x.v) > 2300 ? "#fff" : null)
      .text(d => d.x && d.x.jobs >= st.minJobs ? (d.x.v < 0 ? "−" : "") + f$(Math.abs(d.x.v)) : "–")
      .on("pointermove", (e,d) => showTip(e, (add,row) => { add("t", `${d.c.city} · ${d.f}`); if (d.x){ row((d.x.v<0?"−":"")+f$(Math.abs(d.x.v))+"/mo", "est. savings at 25th-pct salary"); row(fN(d.x.jobs), "entry-level jobs"); } else add("m","no occupations in this field here"); }))
      .on("pointerleave", hideTip);
    // side stats
    const within = cities.map(c => { const vs = FIELDS.map(f=>val(c,f)).filter(x=>x && x.jobs>=st.minJobs).map(x=>x.v); return vs.length>1 ? d3.max(vs)-d3.min(vs) : null; }).filter(x=>x!=null);
    const across = d3.max(cities, c=>c.savings) - d3.min(cities, c=>c.savings);
    side.html("");
    const row = side.append("div").attr("class","stats");
    const S = (v,l) => { const d = row.append("div").attr("class","stat"); d.append("b").style("font-size","24px").text(v); d.append("span").text(l); };
    S(f$(d3.median(within)) + "/mo", "typical gap between the best and worst field inside one city");
    S(f$(across) + "/mo", "gap between the best and worst city when all fields are blended");
    const a = state.A, b = state.B; const ra = val(App.byCity[a.city], a.field), rb = val(App.byCity[b.city], b.field);
    if (ra && rb) S(`${f$(ra.v)} vs ${f$(rb.v)}`, `${a.city} vs ${b.city}, ${a.field === ALL ? "all fields" : a.field}, at typical entry pay`);
    side.append("p").style("margin","10px 0 0").html(`In this view, switching fields moves your savings <strong>${d3.median(within) > across ? "more" : "less"}</strong> than switching cities. Your two offer cities are highlighted in the table.`);
  }
  return { mount };
})();
