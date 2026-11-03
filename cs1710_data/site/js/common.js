/* Shared data access, formatting, the two "offers" state, tooltip, and offer editor. */
window.App = (function(){
  const D = window.DATA;
  const ALL = "All fields";
  const REGIONS = ["Northeast","Midwest","South","West"];
  const byCity = Object.fromEntries(D.cities.map(c => [c.city, c]));
  const f$ = d3.format("$,.0f"), fK = v => "$" + d3.format(",.1f")(v/1000) + "K", fPct = d3.format(".0%"), fN = d3.format(",");
  const fMo = m => !isFinite(m) ? "never" : m <= 60 ? d3.format(".1f")(m) + " mo" : m < 240 ? d3.format(".1f")(m/12) + " yrs" : d3.format(",.0f")(m/12) + " yrs";
  const fJobs = v => v >= 1e6 ? d3.format(".2s")(v).replace("M","M") : d3.format(".0s")(v).replace("k","k");

  function fieldRow(city, field){
    const c = byCity[city]; if (!c) return null;
    if (field === ALL) return { salary:c.salary, take:c.take, savings:c.savings, jobs:c.jobs };
    return (D.byField[city] || {})[field] || null;
  }
  // monthly economics for an arbitrary salary in a metro (same formula as the dataset's derived columns)
  function calc(city, salary){
    const c = byCity[city];
    const taxes = salary * c.tax / 12, take = salary / 12 - taxes, savings = take - c.expenses;
    return { c, salary, taxes, take, savings, months: savings > 0 ? 10000 / savings : Infinity,
      rentShare: c.housing / take, housing: c.housing, rest: c.expenses - c.housing };
  }
  const round100 = v => Math.round(v/100)*100;

  // ---- offers state ----
  const DEFAULT = { A:{ city:"New York", field:ALL, salary:86700 }, B:{ city:"Detroit", field:ALL, salary:73700 } };
  const state = { A:{...DEFAULT.A}, B:{...DEFAULT.B} };
  const subs = [];
  function on(fn){ subs.push(fn); }
  function emit(){ subs.forEach(fn => fn(state)); }
  function setOffer(key, patch, opts={}){
    const o = state[key]; Object.assign(o, patch);
    if (!opts.keepSalary && (patch.city || patch.field) && !patch.salary){
      const r = fieldRow(o.city, o.field) || fieldRow(o.city, ALL); o.salary = round100(r.salary);
    }
    emit();
  }
  function randomize(){
    const pick = () => D.cities[Math.floor(Math.random()*D.cities.length)].city;
    let a = pick(), b = pick(); while (b === a) b = pick();
    const fields = D.fields.filter(f => f !== "Other" && f !== "Office & Admin" && D.byField[a][f] && D.byField[b][f]);
    const field = fields[Math.floor(Math.random()*fields.length)];
    const jitter = () => 1 + (Math.random()-0.5)*0.16;
    state.A = { city:a, field, salary: round100(fieldRow(a, field).salary * jitter()) };
    state.B = { city:b, field, salary: round100(fieldRow(b, field).salary * jitter()) };
    emit();
  }
  function reset(){ state.A = {...DEFAULT.A}; state.B = {...DEFAULT.B}; emit(); }

  // ---- tooltip ----
  const tip = document.getElementById("tip");
  function showTip(e, build){
    tip.textContent = "";
    const add = (cls, text) => { const div = document.createElement("div"); div.className = cls; div.textContent = text; tip.appendChild(div); return div; };
    const row = (v, l) => { const r = document.createElement("div"); r.className = "row"; const a = document.createElement("strong"); a.textContent = v; const b = document.createElement("span"); b.textContent = l; r.appendChild(a); r.appendChild(b); tip.appendChild(r); };
    build(add, row);
    tip.style.opacity = 1;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = e.clientX + 14, top = e.clientY + 14;
    if (left + w > window.innerWidth - 8) left = e.clientX - w - 14;
    if (top + h > window.innerHeight - 8) top = e.clientY - h - 14;
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  function hideTip(){ tip.style.opacity = 0; }

  // ---- offer editor (used in the hook and in the final section, bound to the same state) ----
  function offerEditor(container, key){
    const o = state[key];
    const el = document.createElement("div"); el.className = "offer " + key.toLowerCase();
    el.innerHTML = `<div class="tag"><i></i>Offer ${key}</div>
      <p>We're pleased to offer you a full-time position in</p><select class="f"></select>
      <p>based in</p><select class="c"></select>
      <p>with a starting salary of</p>
      <div class="stepper"><button type="button" class="dec" aria-label="Decrease salary">−</button><input type="number" class="s" min="20000" max="300000" step="1000"><button type="button" class="inc" aria-label="Increase salary">+</button><small>per year</small></div>`;
    container.appendChild(el);
    const fSel = el.querySelector(".f"), cSel = el.querySelector(".c"), sIn = el.querySelector(".s");
    [ALL].concat(D.fields).forEach(f => { const op = document.createElement("option"); op.value = f; op.textContent = f; fSel.appendChild(op); });
    D.cities.slice().sort((a,b)=>a.city.localeCompare(b.city)).forEach(c => { const op = document.createElement("option"); op.value = c.city; op.textContent = `${c.city}, ${c.state}`; cSel.appendChild(op); });
    fSel.addEventListener("change", () => setOffer(key, { field: fSel.value }));
    cSel.addEventListener("change", () => setOffer(key, { city: cSel.value }));
    sIn.addEventListener("change", () => { const v = Math.max(20000, Math.min(300000, +sIn.value || 0)); setOffer(key, { salary: v }); });
    el.querySelector(".dec").addEventListener("click", () => setOffer(key, { salary: Math.max(20000, state[key].salary - 1000) }));
    el.querySelector(".inc").addEventListener("click", () => setOffer(key, { salary: Math.min(300000, state[key].salary + 1000) }));
    on(s => {
      const o = s[key];
      fSel.value = o.field; cSel.value = o.city; sIn.value = o.salary;
      // grey out fields the city lacks
      Array.from(fSel.options).forEach(op => { op.disabled = op.value !== ALL && !D.byField[o.city][op.value]; });
    });
  }

  // ---- US map ----
  let states = null;
  function loadMap(){
    return fetch("https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json").then(r => r.json())
      .then(us => { states = topojson.feature(us, us.objects.states); states.features = states.features.filter(f => !["02","15","72"].includes(f.id)); })
      .catch(() => { states = null; });
  }
  function drawUS(svg, width, height){
    const proj = d3.geoAlbersUsa().fitSize([width, height], states || {type:"FeatureCollection", features:[]});
    if (!states) proj.scale(width * 1.25).translate([width/2, height/2]);
    const path = d3.geoPath(proj);
    if (states) svg.append("g").selectAll("path").data(states.features).join("path").attr("class","state").attr("d", path);
    return proj;
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return { D, ALL, REGIONS, byCity, f$, fK, fPct, fN, fMo, fJobs, fieldRow, calc, round100, state, on, emit, setOffer, randomize, reset, showTip, hideTip, offerEditor, loadMap, drawUS, prefersReduced };
})();
