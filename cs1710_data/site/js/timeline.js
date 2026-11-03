window.Timeline = (function(){
  let root;
  const CITIES = App.D.cities, BYFIELD = App.D.byField, FIELDS = App.D.fields;
  const $ = id => root.querySelector('#tl_'+id);
  const TEMPLATE = `
  <div class="filters" role="group" aria-label="Filters">
    <label for="tl_field">Industry <select id="tl_field"></select></label>
    <div class="seg" id="tl_region" role="group" aria-label="Region"></div>
    <label class="goal" for="tl_goal">Goal
      <input type="range" id="tl_goal" min="1000" max="50000" step="500" value="10000" aria-label="Savings goal in dollars">
      <output id="tl_goalOut" for="tl_goal">$10,000</output>
    </label>
    <button class="ghost" id="tl_tableToggle" aria-pressed="false">Table view</button>
  </div>
  <p class="insight" id="tl_insight"></p>
  <section class="card">
    <div style="display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline;justify-content:space-between"><h3>Months to reach the goal</h3><span class="sub" id="tl_note"></span></div>
    <div class="legend" aria-hidden="true"><span><i></i>metro, typical entry salary in the selected field</span><span><i class="acc"></i>pinned metro</span><span><i class="never"></i>never: budget exceeds take-home</span></div>
    <div id="tl_chart" role="img" aria-label="Sorted lanes of metros with a marker at the month each reaches the savings goal"></div>
    <table id="tl_table" hidden></table>
  </section>
  <section class="infocard idle" id="tl_detail" aria-live="polite"><div class="head"><div><h3>Click a metro to pin its breakdown</h3><p class="meta">Hover any lane for the numbers; click to keep them here.</p></div></div></section>`;

  const REGIONS = ["All regions","Northeast","Midwest","South","West"];
  const ALL = "All fields";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { field: ALL, region: "All regions", goal: 10000, pinned: null };

  const f$ = d3.format("$,.0f");
  const fK = v => "$" + d3.format(",.1f")(v/1000) + "K";
  const fMo = m => !isFinite(m) ? "never"
    : m <= 60 ? d3.format(".1f")(m) + " mo"
    : m < 240 ? d3.format(".1f")(m/12) + " yrs"
    : d3.format(",.0f")(m/12) + " yrs";
  const fPct = d3.format(".0%");

  function mount(){
    root = document.getElementById('timeline');
    root.innerHTML = TEMPLATE;
    init();
    App.on(s => { state.field = s.A.field; fieldSel.property('value', state.field); update(true); });
  }
  let fieldSel, regionBox, goalIn, goalOut, tableBtn, table, chartEl, svg, gGrid, gLanes, gDiv, tip;
  function init(){
  // ---------- controls ----------
  fieldSel = d3.select($("field"));
  fieldSel.selectAll("option").data([ALL].concat(FIELDS)).join("option").attr("value", d=>d).text(d=>d);
  fieldSel.on("change", function(){ state.field = this.value; state.pinned = null; update(true); });

  regionBox = d3.select($("region"));
  regionBox.selectAll("button").data(REGIONS).join("button")
    .attr("type","button").attr("aria-pressed", d => d===state.region)
    .text(d=>d)
    .on("click", (e,d)=>{ state.region = d; regionBox.selectAll("button").attr("aria-pressed", x => x===d); update(true); });

  goalIn = $("goal"); goalOut = $("goalOut");
  goalIn.addEventListener("input", ()=>{ state.goal = +goalIn.value; goalOut.textContent = f$(state.goal); update(false); });

  tableBtn = $("tableToggle"); table = $("table");
  tableBtn.addEventListener("click", ()=>{
    const on = tableBtn.getAttribute("aria-pressed") !== "true";
    tableBtn.setAttribute("aria-pressed", on); table.hidden = !on; chartEl.style.display = on ? "none" : "";
  });

  chartEl = $("chart");
  svg = d3.select(chartEl).append("svg");
  gGrid = svg.append("g").attr("class","grid");
  gLanes = svg.append("g").attr("class","lanes");
  gDiv = svg.append("g").attr("class","divider");
  tip = document.getElementById("tip");
  update(true);
  let resizeT; new ResizeObserver(()=>{ clearTimeout(resizeT); resizeT = setTimeout(()=>update(false), 80); }).observe(chartEl);
  }
  // ---------- data ----------
  function rows(){
    const out = [];
    for (const c of CITIES){
      let f;
      if (state.field === ALL) f = { salary:c.salary, take:c.take, savings:c.savings, jobs:c.jobs };
      else f = (BYFIELD[c.city] || {})[state.field];
      if (!f) continue;
      if (state.region !== "All regions" && c.region !== state.region) continue;
      const months = f.savings > 0 ? state.goal / f.savings : Infinity;
      out.push(Object.assign({}, c, f, { months }));
    }
    out.sort((a,b)=> (isFinite(a.months)&&isFinite(b.months)) ? a.months-b.months
                   : isFinite(a.months) ? -1 : isFinite(b.months) ? 1 : b.savings-a.savings);
    return out;
  }

  // ---------- chart ----------
  const M = { top: 26, right: 118, bottom: 6, left: 148 }, LANE = 22, DIV = 34;

  function update(race){
    const data = rows();
    const width = Math.max(560, chartEl.clientWidth || 800);
    const innerW = width - M.left - M.right;
    const finite = data.filter(d=>isFinite(d.months)), never = data.filter(d=>!isFinite(d.months));
    const maxF = d3.max(finite, d=>d.months) || 0;
    const cap = finite.length ? Math.min(60, Math.max(6, Math.ceil(maxF/6)*6)) : 12;
    const x = d3.scaleLinear().domain([0, cap]).range([0, innerW]);
    const step = cap <= 12 ? 3 : cap <= 24 ? 6 : 12;
    const ticks = d3.range(0, cap + 0.1, step);

    const height = M.top + data.length*LANE + (never.length && finite.length ? DIV : 0) + M.bottom;
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

    // y positions
    const yOf = {}; let y = M.top;
    finite.forEach(d=>{ yOf[d.city] = y; y += LANE; });
    const divY = y; if (never.length && finite.length) y += DIV;
    never.forEach(d=>{ yOf[d.city] = y; y += LANE; });

    // grid
    const g = gGrid.selectAll("g.t").data(ticks, d=>d);
    const gE = g.enter().append("g").attr("class","t");
    gE.append("line"); gE.append("text").attr("text-anchor","middle").attr("y", M.top - 10);
    g.exit().remove();
    gGrid.selectAll("g.t").attr("transform", d=>`translate(${M.left + x(d)},0)`)
      .select("line").attr("class", d=> d===0 ? "zero" : null).attr("y1", M.top - 4).attr("y2", height - M.bottom);
    gGrid.selectAll("g.t").select("text").text(d => d===0 ? "start" : d%12===0 ? (d/12)+(d===12?" yr":" yrs") : d+" mo");

    // divider between finite and never groups
    const dv = gDiv.selectAll("g").data(never.length && finite.length ? [1] : []);
    const dvE = dv.enter().append("g");
    dvE.append("line"); dvE.append("text").attr("x", M.left).attr("dy", "0.32em");
    dv.exit().remove();
    gDiv.selectAll("g").attr("transform", `translate(0,${divY + DIV/2})`)
      .select("line").attr("x1", M.left).attr("x2", M.left + innerW).attr("y1", -DIV/2 + 4).attr("y2", -DIV/2 + 4);
    gDiv.selectAll("g").select("text").text(`Budget exceeds take-home at this salary: the goal is never reached (${never.length} metro${never.length===1?"":"s"})`);

    // lanes
    const dur = reduceMotion ? 0 : 500;
    const lanes = gLanes.selectAll("g.lane").data(data, d=>d.city);
    const enter = lanes.enter().append("g").attr("class","lane").attr("tabindex", 0)
      .attr("transform", d=>`translate(0,${yOf[d.city]})`).style("opacity", 0);
    enter.append("rect").attr("class","hit").attr("x", 0).attr("y", 0).attr("height", LANE).attr("rx", 4);
    enter.append("text").attr("class","name").attr("x", M.left - 10).attr("y", LANE/2).attr("dy","0.34em").attr("text-anchor","end");
    enter.append("line").attr("class","stem").attr("y1", LANE/2).attr("y2", LANE/2).attr("x1", M.left).attr("x2", M.left);
    enter.append("circle").attr("class","dot").attr("r", 5).attr("cy", LANE/2).attr("cx", M.left);
    enter.append("text").attr("class","val").attr("y", LANE/2).attr("dy","0.34em");
    enter.on("pointerenter", function(e,d){ d3.select(this).classed("hover", true); showTip(e,d); })
      .on("pointermove", (e,d)=> showTip(e,d))
      .on("pointerleave", function(){ d3.select(this).classed("hover", false); hideTip(); })
      .on("focus", function(e,d){ const b = this.getBoundingClientRect(); showTip({clientX:b.left + M.left + 40, clientY:b.top}, d); })
      .on("blur", hideTip)
      .on("click", (e,d)=> pin(d.city))
      .on("keydown", (e,d)=>{ if (e.key==="Enter" || e.key===" ") { e.preventDefault(); pin(d.city); } });
    lanes.exit().transition().duration(dur).style("opacity", 0).remove();

    const all = enter.merge(lanes)
      .classed("never", d=>!isFinite(d.months))
      .classed("pinned", d=>d.city===state.pinned)
      .attr("aria-label", d=>`${d.city}, ${d.state}: ${fMo(d.months)}`);
    all.transition().duration(dur).style("opacity", 1).attr("transform", d=>`translate(0,${yOf[d.city]})`);
    all.select(".hit").attr("width", width);
    all.select(".name").each(function(d){
      const t = d3.select(this); t.text(null);
      t.append("tspan").text(d.city);
      t.append("tspan").attr("class","st").text(" " + d.state);
    });

    // marks: race from the start line, or glide from where they are
    const endX = d => M.left + (isFinite(d.months) ? x(Math.min(d.months, cap)) : innerW);
    const msPerMonth = reduceMotion ? 0 : 1500 / cap;
    const raceDur = d => isFinite(d.months) ? Math.min(d.months, cap) * msPerMonth : 1500;
    if (race){
      all.select(".stem").attr("x2", d=>isFinite(d.months) ? M.left : M.left + innerW);
      all.select(".dot").attr("cx", M.left).style("opacity", d=>isFinite(d.months) ? 1 : 0);
      all.select(".val").style("opacity", 0);
    }
    all.select(".stem").transition("x").duration(d=> race ? raceDur(d) : (reduceMotion ? 0 : 250)).ease(race ? d3.easeLinear : d3.easeCubicOut)
      .attr("x2", d=>isFinite(d.months) ? endX(d) : M.left + innerW);
    all.select(".dot").transition("x").duration(d=> race ? raceDur(d) : (reduceMotion ? 0 : 250)).ease(race ? d3.easeLinear : d3.easeCubicOut)
      .attr("cx", endX).style("opacity", 1);
    const val = all.select(".val")
      .text(d=> isFinite(d.months) ? (d.months > cap ? fMo(d.months) + " ›" : fMo(d.months)) : `never · −${f$(-d.savings)}/mo`);
    if (race){
      val.interrupt("x").style("opacity", 0).attr("x", d=>endX(d) + 10)
        .transition("x").delay(d=>raceDur(d)).duration(reduceMotion ? 0 : 200).style("opacity", 1);
    } else {
      val.interrupt("x").style("opacity", 1)
        .transition("x").duration(reduceMotion ? 0 : 250).ease(d3.easeCubicOut).attr("x", d=>endX(d) + 10);
    }

    // empty state
    d3.select(chartEl).selectAll(".empty").data(data.length ? [] : [1]).join("div").attr("class","empty")
      .text("No metros in this region report this field.");

    // note, insight, table, detail
    const missing = CITIES.filter(c => (state.region==="All regions" || c.region===state.region) && state.field!==ALL && !(BYFIELD[c.city]||{})[state.field]).length;
    $("note").textContent =
      `${data.length} metro${data.length===1?"":"s"} · goal ${f$(state.goal)}` + (missing ? ` · ${missing} without ${state.field} data` : "");
    renderInsight(data, finite, never);
    renderTable(data);
    renderDetail(data);
  }

  // ---------- insight line ----------
  function renderInsight(data, finite, never){
    const el = $("insight"); el.textContent = "";
    if (!finite.length){ el.textContent = "On a typical entry salary in this field, no metro shown here clears the monthly budget."; return; }
    const fast = finite[0], slow = finite[finite.length-1];
    const field = state.field===ALL ? "entry-level salary" : `entry-level ${state.field} salary`;
    const parts = [];
    parts.push(["On a typical ", false], [field, false], [", ", false], [`${fast.city} (${fK(fast.salary)})`, true],
      [` gets to ${f$(state.goal)} in ${fMo(fast.months)}`, false]);
    if (finite.length > 1) parts.push([`; `, false], [`${slow.city} (${fK(slow.salary)})`, true], [` takes ${fMo(slow.months)}`, false]);
    parts.push([". ", false]);
    if (never.length) parts.push([`${never.length} metro${never.length===1?"":"s"} never get there because the budget exceeds take-home.`, false], [" ", false]);
    const ny = data.find(d=>d.city==="New York"), det = data.find(d=>d.city==="Detroit");
    if (ny && det && ny.salary > det.salary){
      const diff = fK(ny.salary - det.salary);
      let tail;
      if (isFinite(ny.months) && isFinite(det.months)) tail = `, yet takes ${d3.format(".1f")(ny.months/det.months)}× longer to reach the goal.`;
      else if (isFinite(det.months)) tail = `, yet never reaches the goal while Detroit does in ${fMo(det.months)}.`;
      else tail = ".";
      parts.push(["New York pays about ", false], [diff + " more", true], [" than Detroit", false], [tail, false]);
    }
    for (const [t, strong] of parts){
      if (strong){ const s = document.createElement("strong"); s.textContent = t; el.appendChild(s); }
      else el.appendChild(document.createTextNode(t));
    }
  }

  // ---------- tooltip ----------
  function showTip(e, d){
    tip.textContent = "";
    const add = (cls, text) => { const div = document.createElement("div"); div.className = cls; div.textContent = text; tip.appendChild(div); return div; };
    add("t", `${d.city}, ${d.state}`);
    add("m", `${d.region} · ${state.field===ALL ? "all fields" : state.field}`);
    add("big", isFinite(d.months) ? `${fMo(d.months)} to ${f$(state.goal)}` : `never reaches ${f$(state.goal)}`);
    const row = (v, l) => { const r = document.createElement("div"); r.className = "row";
      const a = document.createElement("strong"); a.textContent = v; const b = document.createElement("span"); b.textContent = l;
      r.appendChild(a); r.appendChild(b); tip.appendChild(r); };
    row(f$(d.salary), "entry salary (25th pct)");
    row(f$(d.take) + "/mo", "est. take-home");
    row("−" + f$(d.expenses) + "/mo", "budget excl. taxes");
    row((d.savings<0?"−":"") + f$(Math.abs(d.savings)) + "/mo", d.savings<0 ? "shortfall" : "left to save");
    row(fPct(d.rentShare), "rent share of take-home");
    tip.style.opacity = 1;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = e.clientX + 14, top = e.clientY + 14;
    if (left + w > window.innerWidth - 8) left = e.clientX - w - 14;
    if (top + h > window.innerHeight - 8) top = e.clientY - h - 14;
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  function hideTip(){ tip.style.opacity = 0; }

  // ---------- pin + detail ----------
  function pin(city){
    state.pinned = state.pinned === city ? null : city;
    gLanes.selectAll("g.lane").classed("pinned", d=>d.city===state.pinned);
    d3.select(table).selectAll("tr").classed("pinned", function(){ return this.dataset.city === state.pinned; });
    renderDetail(rows());
  }
  function renderDetail(data){
    const el = $("detail"); el.textContent = "";
    const d = data.find(r=>r.city===state.pinned);
    const head = document.createElement("div"); head.className = "head";
    const left = document.createElement("div");
    const h3 = document.createElement("h3"); const meta = document.createElement("p"); meta.className = "meta";
    left.appendChild(h3); left.appendChild(meta); head.appendChild(left); el.appendChild(head);
    if (!d){
      el.classList.add("idle");
      h3.textContent = state.pinned ? `${state.pinned} is not in the current view` : "Click a metro to pin its breakdown";
      meta.textContent = "Hover any lane for the numbers; click to keep them here.";
      return;
    }
    el.classList.remove("idle");
    h3.textContent = `${d.city}, ${d.state}`;
    meta.textContent = `${d.region} · ${state.field===ALL ? "all entry-level fields" : state.field} · goal ${f$(state.goal)}`;
    const clear = document.createElement("button"); clear.className = "ghost"; clear.type = "button"; clear.textContent = "Clear";
    clear.addEventListener("click", ()=> pin(d.city)); head.appendChild(clear);
    const stats = document.createElement("div"); stats.className = "stats";
    const stat = (v, l) => { const s = document.createElement("div"); s.className = "stat"; const b = document.createElement("b"); b.textContent = v;
      const sp = document.createElement("span"); sp.textContent = l; s.appendChild(b); s.appendChild(sp); stats.appendChild(s); };
    stat(isFinite(d.months) ? fMo(d.months) : "never", `to save ${f$(state.goal)}`);
    stat(f$(d.salary), "entry salary, 25th pct");
    stat(f$(d.take) + "/mo", "est. take-home");
    stat(f$(d.expenses) + "/mo", "budget excl. taxes");
    stat((d.savings<0?"−":"") + f$(Math.abs(d.savings)) + "/mo", d.savings<0 ? "monthly shortfall" : "left to save");
    stat(fPct(d.rentShare), "rent share of take-home");
    stat(d3.format(",")(d.jobs), state.field===ALL ? "entry-level jobs" : `entry-level ${state.field} jobs`);
    stat(d.unemp.toFixed(1) + "%", "unemployment, 2025");
    stat(fPct(d.young), "residents aged 20–29");
    el.appendChild(stats);
    const b = document.createElement("p"); b.className = "budget";
    b.textContent = "Monthly budget: ";
    [["housing (studio)", d.housing], ["food", d.food], ["transportation", d.transport], ["healthcare", d.health], ["other necessities", d.other]]
      .forEach(([l, v], i)=>{ if (i) b.appendChild(document.createTextNode(" · ")); const s = document.createElement("b"); s.textContent = f$(v); b.appendChild(s); b.appendChild(document.createTextNode(" " + l)); });
    b.appendChild(document.createTextNode(`. Effective tax rate ${fPct(d.tax)}.`));
    el.appendChild(b);
  }

  // ---------- table view ----------
  function renderTable(data){
    table.textContent = "";
    const cap = document.createElement("caption"); cap.textContent = `Months to save ${f$(state.goal)} on a typical entry salary, ${state.field===ALL ? "all fields" : state.field}`; cap.style.textAlign = "left"; cap.style.color = "var(--ink-2)"; cap.style.fontSize = "12px"; cap.style.padding = "4px 8px";
    table.appendChild(cap);
    const thead = document.createElement("thead"), tr = document.createElement("tr");
    ["Metro","Region","Entry salary","Take-home / mo","Budget / mo","Savings / mo","Months to goal"].forEach(h=>{ const th = document.createElement("th"); th.scope = "col"; th.textContent = h; tr.appendChild(th); });
    thead.appendChild(tr); table.appendChild(thead);
    const tb = document.createElement("tbody");
    for (const d of data){
      const r = document.createElement("tr"); r.dataset.city = d.city; if (d.city===state.pinned) r.className = "pinned";
      [`${d.city}, ${d.state}`, d.region, f$(d.salary), f$(d.take), f$(d.expenses), (d.savings<0?"−":"") + f$(Math.abs(d.savings)), isFinite(d.months) ? d3.format(".1f")(d.months) : "never"]
        .forEach(v=>{ const td = document.createElement("td"); td.textContent = v; r.appendChild(td); });
      r.addEventListener("click", ()=> pin(d.city)); r.style.cursor = "pointer";
      tb.appendChild(r);
    }
    table.appendChild(tb);
  }

  return { mount };
})();
