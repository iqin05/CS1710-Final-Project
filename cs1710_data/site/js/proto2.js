/* PROTOTYPE 2: U.S. bubble map with brushing, industry + region filters, linked bar chart, city card. */
window.Proto2 = (function(){
  const { D, ALL, REGIONS, f$, fPct, fN, fMo, fJobs, fieldRow, drawUS, showTip, hideTip, on } = App;
  const st = { field: ALL, region: "All regions", brushed: null, sel: null };
  let root, mapSvg, proj, barSvg, brushG, pts, brush;
  const W = 640, H = 400;
  function rows(){ return D.cities.map(c => { const f = fieldRow(c.city, st.field); return f ? { ...c, fjobs: f.jobs, fsal: f.salary, fsav: f.savings } : null; }).filter(Boolean); }
  function inView(d){ if (st.brushed){ const [[x0,y0],[x1,y1]] = st.brushed; const p = proj([d.lon,d.lat]); return p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1; } return st.region==="All regions" || d.region===st.region; }
  function mount(){
    root = d3.select("#proto2");
    const filt = root.append("div").attr("class","filters");
    const sel = filt.append("label").text("Industry ").append("select");
    sel.selectAll("option").data([ALL].concat(D.fields)).join("option").attr("value", d=>d).text(d=>d);
    sel.on("change", function(){ st.field = this.value; render(); });
    const seg = filt.append("div").attr("class","seg");
    seg.selectAll("button").data(["All regions"].concat(REGIONS)).join("button").attr("type","button").text(d=>d).attr("aria-pressed", d=>d===st.region).on("click", (e,d) => { st.region = d; st.brushed = null; brushG.call(brush.move, null); seg.selectAll("button").attr("aria-pressed", x=>x===d); render(); });
    const clearBtn = filt.append("button").attr("class","ghost").text("Clear brush ✕").style("display","none").on("click", () => { st.brushed = null; brushG.call(brush.move, null); render(); });
    const grid = root.append("div").attr("class","grid-main-side");
    const c1 = grid.append("div").attr("class","card"); c1.append("h3").text("U.S. metro map"); c1.append("p").attr("class","sub").text("Bubble size = entry-level jobs in the field · drag to brush an area · click a bubble for details");
    mapSvg = c1.append("svg").attr("class","map").attr("viewBox", `0 0 ${W} ${H}`);
    proj = drawUS(mapSvg, W, H);
    pts = mapSvg.append("g");
    brush = d3.brush().extent([[0,0],[W,H]]).on("brush end", (e) => { st.brushed = e.selection; clearBtn.style("display", e.selection ? null : "none"); render(); });
    brushG = mapSvg.append("g").attr("class","brush").call(brush);
    brushG.select(".overlay").style("cursor","crosshair");
    const c2 = grid.append("div").attr("class","card"); c2.append("h3").attr("id","p2title").text("Top cities"); c2.append("p").attr("class","sub").attr("id","p2sub");
    barSvg = c2.append("svg").attr("class","hbar");
    root.append("div").attr("class","infocard idle").attr("id","p2card").text("Click a bubble or a bar to see a city's full profile.");
    on(s => { st.field = s.A.field; sel.property("value", st.field); render(); });
  }
  function render(){
    const data = rows();
    const r = d3.scaleSqrt().domain([0, d3.max(data, d=>d.fjobs)]).range([2, 22]);
    const circles = pts.selectAll("circle.metro").data(data, d=>d.city).join("circle").attr("class","metro").attr("cx", d=>proj([d.lon,d.lat])[0]).attr("cy", d=>proj([d.lon,d.lat])[1])
      .on("click", (e,d) => { st.sel = d.city; render(); })
      .on("pointermove", (e,d) => showTip(e, (add,row) => { add("t", `${d.city}, ${d.state}`); add("m", `${d.region} · ${st.field===ALL?"all fields":st.field}`); row(fN(d.fjobs), "entry-level jobs"); row(f$(d.fsal), "25th-pct salary"); row((d.fsav<0?"−":"")+f$(Math.abs(d.fsav))+"/mo", "est. savings"); }))
      .on("pointerleave", hideTip);
    circles.transition().duration(300).attr("r", d=>r(d.fjobs));
    circles.classed("dim", d => !inView(d)).classed("sel", d => d.city===st.sel);
    pts.raise(); brushG.raise(); pts.style("pointer-events","none"); circles.style("pointer-events","all");
    // bars
    const vis = data.filter(inView).sort((a,b)=>b.fjobs-a.fjobs).slice(0, 15);
    d3.select("#p2title").text(st.brushed ? `Top cities — brushed area (${vis.length})` : `Top cities — ${st.region}`);
    d3.select("#p2sub").text(`${st.field===ALL?"All fields":st.field} · entry-level jobs`);
    const BW = 360, M = {l:96, r:44}, bh = 22, BH = Math.max(1, vis.length)*bh + 8;
    barSvg.attr("viewBox", `0 0 ${BW} ${BH}`);
    const x = d3.scaleLinear().domain([0, d3.max(vis, d=>d.fjobs) || 1]).range([0, BW-M.l-M.r]);
    const g = barSvg.selectAll("g.row").data(vis, d=>d.city).join(enter => { const g = enter.append("g").attr("class","row"); g.append("rect"); g.append("text").attr("class","name"); g.append("text").attr("class","v"); return g; });
    g.attr("transform", (d,i)=>`translate(0,${4+i*bh})`).style("cursor","pointer").on("click", (e,d)=>{ st.sel=d.city; render(); });
    g.select("rect").attr("x", M.l).attr("y", 2).attr("height", bh-5).attr("rx", 3).attr("class", d=>d.city===st.sel?"sel":null).transition().duration(300).attr("width", d=>x(d.fjobs));
    g.select("text.name").attr("x", M.l-8).attr("y", bh/2).attr("dy","0.3em").attr("text-anchor","end").attr("class", d=>"name"+(d.city===st.sel?" sel":"")).text(d=>d.city);
    g.select("text.v").attr("x", d=>M.l+x(d.fjobs)+5).attr("y", bh/2).attr("dy","0.3em").text(d=>fJobs(d.fjobs));
    if (!vis.length) barSvg.selectAll("g.row").remove();
    card(data);
  }
  function card(data){
    const el = document.getElementById("p2card"); const d = data.find(x=>x.city===st.sel);
    el.textContent = ""; el.classList.toggle("idle", !d);
    if (!d){ el.textContent = st.sel ? `${st.sel} has no ${st.field} data.` : "Click a bubble or a bar to see a city's full profile."; return; }
    const h = document.createElement("h3"); h.textContent = `${d.city}, ${d.state}`; const m = document.createElement("p"); m.className="meta"; m.textContent = `${d.region} · ${st.field===ALL?"all fields":st.field}`; el.appendChild(h); el.appendChild(m);
    const stt = document.createElement("div"); stt.className="stats";
    const S=(v,l)=>{const s=document.createElement("div");s.className="stat";const b=document.createElement("b");b.textContent=v;const sp=document.createElement("span");sp.textContent=l;s.appendChild(b);s.appendChild(sp);stt.appendChild(s);};
    S(fN(d.fjobs),"entry-level jobs"); S(f$(d.fsal),"25th-pct salary"); S(f$(Math.round(d.fsal/(d.rpp/100))),"salary, COL-adjusted"); S((d.fsav<0?"−":"")+f$(Math.abs(d.fsav))+"/mo","est. savings"); S(fMo(d.fsav>0?10000/d.fsav:Infinity),"to save $10k"); S(f$(d.rent1br),"median 1-br rent"); S(d.unemp.toFixed(1)+"%","unemployment '25"); S(fPct(d.young),"residents age 20-29"); S(d.commute.toFixed(0)+" min","mean commute"); S(fPct(d.transit),"commute by transit");
    el.appendChild(stt);
  }
  return { mount };
})();
