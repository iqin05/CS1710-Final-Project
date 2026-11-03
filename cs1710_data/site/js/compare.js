/* RISING INSIGHTS: the two offers side by side at the offered salaries. */
window.Compare = (function(){
  const { f$, fK, fPct, fN, fMo, calc, fieldRow, ALL, on } = App;
  function mount(){ on(render); }
  function stat(parent, v, l){ const s = document.createElement("div"); s.className = "stat"; const b = document.createElement("b"); b.textContent = v; const sp = document.createElement("span"); sp.textContent = l; s.appendChild(b); s.appendChild(sp); parent.appendChild(s); }
  function render(s){
    const A = calc(s.A.city, s.A.salary), B = calc(s.B.city, s.B.salary);
    const hi = A.salary >= B.salary ? A : B, lo = hi === A ? B : A;
    const keeper = A.savings >= B.savings ? A : B;
    const lede = document.getElementById("compareLede");
    lede.textContent = hi === keeper
      ? `${hi.c.city} pays ${f$(hi.salary - lo.salary)} more and also leaves more at the end of the month, by ${f$(hi.savings - lo.savings)}. Here the bigger number happens to win, but look at how much of it the budget eats.`
      : `${hi.c.city} pays ${f$(hi.salary - lo.salary)} more a year, yet ${lo.c.city} leaves ${f$(lo.savings - hi.savings)} more in your pocket every month. The gap is cost, not pay.`;
    const cards = document.getElementById("compareCards"); cards.textContent = "";
    [["A", A, s.A], ["B", B, s.B]].forEach(([k, r, o]) => {
      const card = document.createElement("div"); card.className = "offer " + k.toLowerCase();
      const tag = document.createElement("div"); tag.className = "tag"; tag.innerHTML = "<i></i>"; tag.appendChild(document.createTextNode(`Offer ${k} · ${r.c.city}, ${r.c.state}`)); card.appendChild(tag);
      const h = document.createElement("h3"); h.style.margin = "6px 0 10px"; h.style.fontSize = "22px"; h.textContent = f$(r.salary) + " a year"; card.appendChild(h);
      const st = document.createElement("div"); st.className = "stats";
      stat(st, f$(r.take) + "/mo", "est. take-home");
      stat(st, f$(r.c.expenses) + "/mo", "modest budget, excl. taxes");
      stat(st, (r.savings < 0 ? "−" : "") + f$(Math.abs(r.savings)) + "/mo", r.savings < 0 ? "monthly shortfall" : "left to save");
      stat(st, fMo(r.months), "to save $10,000");
      stat(st, fPct(r.rentShare), "rent share of take-home");
      const fr = fieldRow(o.city, o.field) || fieldRow(o.city, ALL);
      stat(st, fN(fr.jobs), o.field === ALL ? "entry-level jobs" : `entry-level ${o.field} jobs`);
      stat(st, r.c.unemp.toFixed(1) + "%", "unemployment, 2025");
      stat(st, fPct(r.c.young), "residents aged 20–29");
      card.appendChild(st); cards.appendChild(card);
    });
    const bars = document.getElementById("compareBars"); bars.textContent = "";
    const max = Math.max(A.take, B.take, A.c.expenses, B.c.expenses) * 1.05;
    [["A", A], ["B", B]].forEach(([k, r]) => {
      const rows = [["Take-home pay", r.take], ["Rent (studio)", r.housing], ["Rest of budget", r.rest], [r.savings < 0 ? "Shortfall" : "Left to save", r.savings]];
      const title = document.createElement("div"); title.style.cssText = "font-weight:650;margin:10px 0 2px"; title.textContent = `Offer ${k} · ${r.c.city}`; bars.appendChild(title);
      rows.forEach(([l, v]) => {
        const row = document.createElement("div"); row.className = "bar-row " + k.toLowerCase();
        const lbl = document.createElement("span"); lbl.className = "lbl"; lbl.textContent = l;
        const track = document.createElement("div"); track.className = "track"; const fill = document.createElement("div"); fill.className = "fill" + (v < 0 ? " neg" : ""); fill.style.width = Math.min(100, Math.abs(v) / max * 100) + "%"; track.appendChild(fill);
        const val = document.createElement("span"); val.className = "val"; val.textContent = (v < 0 ? "−" : "") + f$(Math.abs(v));
        row.appendChild(lbl); row.appendChild(track); row.appendChild(val); bars.appendChild(row);
      });
    });
  }
  return { mount };
})();
