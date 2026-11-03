/* MAIN MESSAGE: hero numbers + salary-vs-savings scatter with emphasis on New York, Detroit and the two offer cities. */
window.Message = (function(){
  const { D, f$, fK, showTip, hideTip, on, state } = App;
  let svg;
  function corr(xs, ys){ const mx = d3.mean(xs), my = d3.mean(ys); const num = d3.sum(xs.map((x,i)=>(x-mx)*(ys[i]-my))); return num / Math.sqrt(d3.sum(xs.map(x=>(x-mx)**2)) * d3.sum(ys.map(y=>(y-my)**2))); }
  function mount(){
    const ny = App.byCity["New York"], det = App.byCity["Detroit"];
    const rank = key => D.cities.slice().sort((a,b)=>b[key]-a[key]).map(c=>c.city);
    const rS = rank("salary"), rV = rank("savings");
    const ord = n => n + (["th","st","nd","rd"][(n%100>10&&n%100<14)?0:Math.min(n%10,4)%4] || "th");
    document.getElementById("heroText").textContent = `A higher starting salary doesn't mean you'll keep more of it. New York pays the ${ord(rS.indexOf("New York")+1)}-highest typical entry salary in our data but saves the least of all 40 metros, while Detroit pays about ${fK(ny.salary-det.salary)} less and leaves roughly ${f$(det.savings-ny.savings)} more every month.`;
    const nums = document.getElementById("heroNums");
    [[f$(ny.salary), "New York entry salary"], [f$(ny.savings)+"/mo", `New York saves · ${ord(rV.indexOf("New York")+1)} of 40`], [f$(det.salary), "Detroit entry salary"], [f$(det.savings)+"/mo", `Detroit saves · ${ord(rV.indexOf("Detroit")+1)} of 40`]]
      .forEach(([v,l]) => { const d = document.createElement("div"); const b = document.createElement("b"); b.textContent = v; const s = document.createElement("span"); s.textContent = l; d.appendChild(b); d.appendChild(s); nums.appendChild(d); });
    const r = corr(D.cities.map(c=>c.salary), D.cities.map(c=>c.savings)), r2 = corr(D.cities.map(c=>c.salary), D.cities.map(c=>c.expenses));
    document.getElementById("scatterSub").textContent = `Across 40 metros, entry salary correlates ${r2.toFixed(2)} with the cost of a modest budget but only ${r.toFixed(2)} with monthly savings. Blended across all fields; hover any dot.`;
    svg = d3.select("#messageScatter").append("svg");
    on(render);
  }
  function render(s){
    const W = 900, H = 420, M = {l:60, r:20, t:14, b:40};
    svg.attr("viewBox", `0 0 ${W} ${H}`); svg.selectAll("*").remove();
    const x = d3.scaleLinear().domain([58000, 132000]).range([M.l, W-M.r]);
    const y = d3.scaleLinear().domain([0, 2400]).range([H-M.b, M.t]);
    svg.append("g").attr("class","axis").attr("transform", `translate(0,${H-M.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(v=>"$"+v/1000+"k").tickSize(-(H-M.b-M.t))).call(a=>a.select(".domain").remove());
    svg.append("g").attr("class","axis").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(v=>"$"+d3.format(",")(v)).tickSize(-(W-M.l-M.r))).call(a=>a.select(".domain").remove());
    svg.append("text").attr("x",(W+M.l)/2).attr("y",H-6).attr("text-anchor","middle").attr("fill","var(--muted)").attr("font-size",11).text("typical entry-level salary (25th percentile, all fields)");
    svg.append("text").attr("transform",`translate(14,${(H-M.b+M.t)/2}) rotate(-90)`).attr("text-anchor","middle").attr("fill","var(--muted)").attr("font-size",11).text("estimated monthly savings");
    const story = new Set(["New York","Detroit","San Jose","Boston","Cleveland","Miami"]);
    const offers = new Set([s.A.city, s.B.city]);
    const dots = svg.append("g").selectAll("circle").data(D.cities).join("circle").attr("class", d => "dot" + (offers.has(d.city) ? " sel" : story.has(d.city) ? " mark" : "")).attr("cx", d=>x(d.salary)).attr("cy", d=>y(d.savings)).attr("r", d => offers.has(d.city) ? 8 : story.has(d.city) ? 6.5 : 5)
      .on("pointermove", (e,d) => showTip(e, (add,row) => { add("t", `${d.city}, ${d.state}`); add("m", d.region); row(f$(d.salary), "entry salary"); row(f$(d.savings)+"/mo", "est. savings"); row(App.fPct(d.rentShare), "rent share of take-home"); })).on("pointerleave", hideTip);
    const labeled = D.cities.filter(d => story.has(d.city) || offers.has(d.city));
    svg.append("g").selectAll("text").data(labeled).join("text").attr("class", d => "dotlbl" + (offers.has(d.city) ? " sel" : "")).attr("x", d=>x(d.salary)+10).attr("y", d=>y(d.savings)+4).text(d => d.city + (offers.has(d.city) ? (d.city===s.A.city ? " (Offer A)" : " (Offer B)") : ""));
  }
  return { mount };
})();
