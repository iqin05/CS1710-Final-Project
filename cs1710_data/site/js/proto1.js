/* PROTOTYPE 1: industry filter, top-15 bar chart, opportunity-vs-pay scatter, city card. */
window.Proto1 = (function(){
  const { D, ALL, f$, fK, fPct, fN, fMo, fJobs, fieldRow, showTip, hideTip, on, state } = App;
  const st = { field: ALL, per1000: false, sel: "New York" };
  let root, barSvg, scSvg;
  function rows(){
    return D.cities.map(c => { const f = fieldRow(c.city, st.field); if (!f) return null;
      return { ...c, fjobs: f.jobs, fsal: f.salary, fsav: f.savings, per: f.jobs / c.totalJobs * 1000 }; }).filter(Boolean);
  }
  function mount(){
    root = d3.select("#proto1");
    const filt = root.append("div").attr("class","filters");
    const lab = filt.append("label").text("Industry ");
    const sel = lab.append("select");
    sel.selectAll("option").data([ALL].concat(D.fields)).join("option").attr("value", d=>d).text(d=>d);
    sel.on("change", function(){ st.field = this.value; render(); });
    const seg = filt.append("div").attr("class","seg");
    seg.selectAll("button").data([["Total jobs", false], ["Per 1,000 local jobs", true]]).join("button").attr("type","button").text(d=>d[0]).attr("aria-pressed", d => d[1]===st.per1000)
      .on("click", (e,d) => { st.per1000 = d[1]; seg.selectAll("button").attr("aria-pressed", x => x[1]===st.per1000); render(); });
    const grid = root.append("div").attr("class","grid2");
    const c1 = grid.append("div").attr("class","card"); c1.append("h3").text("Top 15 cities by opportunity"); c1.append("p").attr("class","sub").attr("id","p1sub1");
    barSvg = c1.append("svg");
    const c2 = grid.append("div").attr("class","card"); c2.append("h3").text("Opportunity vs. pay"); c2.append("p").attr("class","sub").text("Each dot is a metro · x: entry-level jobs (log) · y: 25th-pct salary in the field");
    scSvg = c2.append("svg");
    root.append("div").attr("class","infocard").attr("id","p1card");
    on(s => { st.field = s.A.field; sel.property("value", st.field); st.sel = s.A.city; render(); });
  }
  function render(){
    const data = rows(), metric = d => st.per1000 ? d.per : d.fjobs;
    const marks = new Set([state.A.city, state.B.city]);
    root.select("#p1sub1").text(`${st.per1000 ? "Entry-level jobs per 1,000 local jobs" : "Entry-level jobs"}, ${st.field === ALL ? "all fields" : st.field}`);
    // bars
    const top = data.slice().sort((a,b)=>metric(b)-metric(a)).slice(0,15);
    const W = 520, M = {l:110, r:56, t:4, b:4}, bh = 20, H = M.t + top.length*bh + M.b;
    barSvg.attr("viewBox", `0 0 ${W} ${H}`).attr("class","hbar");
    const x = d3.scaleLinear().domain([0, d3.max(top, metric)]).range([0, W - M.l - M.r]);
    const g = barSvg.selectAll("g.row").data(top, d=>d.city).join(enter => { const g = enter.append("g").attr("class","row"); g.append("rect"); g.append("text").attr("class","name"); g.append("text").attr("class","v"); return g; });
    g.attr("transform", (d,i) => `translate(0,${M.t + i*bh})`).style("cursor","pointer")
      .on("click", (e,d) => { st.sel = d.city; render(); })
      .on("pointermove", (e,d) => tipFor(e,d)).on("pointerleave", hideTip);
    g.select("rect").attr("x", M.l).attr("y", 2).attr("height", bh-4).attr("rx", 3).transition().duration(300).attr("width", d => x(metric(d)));
    g.select("rect").attr("class", d => d.city===st.sel ? "sel" : marks.has(d.city) ? "mark" : null);
    g.select("text.name").attr("x", M.l - 8).attr("y", bh/2).attr("dy","0.34em").attr("text-anchor","end").text(d => d.city + (marks.has(d.city) ? " ●" : "")).attr("class", d => "name" + (d.city===st.sel ? " sel" : ""));
    g.select("text.v").attr("y", bh/2).attr("dy","0.34em").attr("x", d => M.l + x(metric(d)) + 6).text(d => st.per1000 ? d3.format(".0f")(d.per) : fJobs(d.fjobs));
    // scatter
    const SW = 520, SH = 360, SM = {l:52, r:16, t:10, b:36};
    scSvg.attr("viewBox", `0 0 ${SW} ${SH}`);
    const sx = d3.scaleLog().domain(d3.extent(data, metric).map((v,i)=> i ? v*1.6 : v/1.4)).range([SM.l, SW-SM.r]);
    const sy = d3.scaleLinear().domain([d3.min(data, d=>d.fsal)*0.92, d3.max(data, d=>d.fsal)*1.05]).nice().range([SH-SM.b, SM.t]);
    scSvg.selectAll("g.axis").remove();
    scSvg.append("g").attr("class","axis").attr("transform", `translate(0,${SH-SM.b})`).call(d3.axisBottom(sx).ticks(5, st.per1000 ? "~s" : "~s").tickSize(-(SH-SM.b-SM.t))).call(a => a.select(".domain").remove());
    scSvg.append("g").attr("class","axis").attr("transform", `translate(${SM.l},0)`).call(d3.axisLeft(sy).ticks(6).tickFormat(v => "$" + d3.format(".0f")(v/1000) + "k").tickSize(-(SW-SM.l-SM.r))).call(a => a.select(".domain").remove());
    scSvg.selectAll("text.axlbl").data([0]).join("text").attr("class","axlbl").attr("x", (SW+SM.l)/2).attr("y", SH-4).attr("text-anchor","middle").attr("fill","var(--muted)").attr("font-size",11).text(st.per1000 ? "entry-level jobs per 1,000 local jobs (log scale)" : "entry-level jobs (log scale)");
    const dots = scSvg.selectAll("circle.dot").data(data, d=>d.city).join("circle").attr("class","dot").attr("r", 5)
      .on("click", (e,d) => { st.sel = d.city; render(); }).on("pointermove", (e,d) => tipFor(e,d)).on("pointerleave", hideTip);
    dots.transition().duration(300).attr("cx", d => sx(metric(d))).attr("cy", d => sy(d.fsal));
    dots.attr("class", d => "dot" + (d.city===st.sel ? " sel" : marks.has(d.city) ? " mark" : "")).attr("r", d => d.city===st.sel ? 7 : 5).raise();
    const lbl = data.filter(d => d.city===st.sel || marks.has(d.city));
    scSvg.selectAll("text.dotlbl").data(lbl, d=>d.city).join("text").attr("class", d => "dotlbl" + (d.city===st.sel ? " sel" : "")).attr("x", d => sx(metric(d)) + 9).attr("y", d => sy(d.fsal) - 8).text(d => d.city);
    card();
  }
  function tipFor(e,d){ showTip(e, (add,row) => { add("t", `${d.city}, ${d.state}`); add("m", `${d.region} · ${st.field===ALL ? "all fields" : st.field}`); row(fN(d.fjobs), "entry-level jobs"); row(d3.format(".0f")(d.per), "per 1,000 local jobs"); row(f$(d.fsal), "25th-pct salary"); row((d.fsav<0?"−":"")+f$(Math.abs(d.fsav))+"/mo", "est. savings"); }); }
  function card(){
    const el = document.getElementById("p1card"); el.textContent = ""; el.classList.remove("idle");
    const d = rows().find(r => r.city===st.sel); if (!d){ el.classList.add("idle"); el.textContent = `${st.sel} has no ${st.field} data. Click a bubble or a bar to see a city's profile.`; return; }
    const h = document.createElement("h3"); h.textContent = `${d.city}, ${d.state}`; const m = document.createElement("p"); m.className = "meta"; m.textContent = `${d.region} · ${st.field===ALL ? "all fields" : st.field}`; el.appendChild(h); el.appendChild(m);
    const stt = document.createElement("div"); stt.className = "stats";
    const S = (v,l) => { const s = document.createElement("div"); s.className = "stat"; const b = document.createElement("b"); b.textContent = v; const sp = document.createElement("span"); sp.textContent = l; s.appendChild(b); s.appendChild(sp); stt.appendChild(s); };
    S(fN(d.fjobs), "entry-level jobs"); S(f$(d.fsal), "25th-pct salary"); S(f$(Math.round(d.fsal / (d.rpp/100))), "salary, COL-adjusted"); S((d.fsav<0?"−":"")+f$(Math.abs(d.fsav))+"/mo", "est. savings");
    S(fMo(d.fsav>0 ? 10000/d.fsav : Infinity), "to save $10k"); S(f$(d.rent1br), "median 1-br rent"); S(d.unemp.toFixed(1)+"%", "unemployment '25"); S(fPct(d.young), "residents age 20-29");
    el.appendChild(stt);
  }
  return { mount };
})();
