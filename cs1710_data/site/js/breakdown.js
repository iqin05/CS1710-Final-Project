/* NEXT STEPS: the two offers as one-month paycheck breakdowns at the entered salaries. */
window.Breakdown = (function(){
  const { f$, fMo, calc, offerEditor, on, ALL } = App;
  const COL = { rent:"#2f4f7f", rest:"#7f9cc4", tax:"#c3c2b7", left:"#3d6fb0", short:"#c0392b" };
  function mount(){
    offerEditor(document.getElementById("offerEditors2"), "A");
    offerEditor(document.getElementById("offerEditors2"), "B");
    on(render);
  }
  function render(s){
    const root = document.getElementById("breakdown"); root.textContent = "";
    const A = calc(s.A.city, s.A.salary), B = calc(s.B.city, s.B.salary);
    const gross = Math.max(A.salary, B.salary) / 12;
    [["A", A, s.A], ["B", B, s.B]].forEach(([k, r, o]) => {
      const card = document.createElement("div"); card.className = "card"; card.style.marginBottom = "12px";
      const h = document.createElement("h3"); h.textContent = `Offer ${k} · ${r.c.city}, ${r.c.state} · ${f$(r.salary)} a year (${f$(r.salary/12)} a month)`; card.appendChild(h);
      const sub = document.createElement("p"); sub.className = "sub"; sub.textContent = o.field === ALL ? "any entry-level field" : o.field; card.appendChild(sub);
      const bar = document.createElement("div"); bar.className = "seg-bar";
      const segs = [["rent", r.housing, "Rent (studio)"], ["rest", r.rest, "Food, transport, health, other"], ["tax", r.taxes, "Taxes"]];
      if (r.savings >= 0) segs.push(["left", r.savings, "Left to save"]);
      segs.forEach(([key, v, lbl]) => { const d = document.createElement("div"); d.style.background = COL[key]; d.style.width = (v / gross * 100) + "%"; d.title = `${lbl}: ${f$(v)}`; bar.appendChild(d); });
      if (r.savings < 0) { const d = document.createElement("div"); d.style.background = COL.short; d.style.width = (-r.savings / gross * 100) + "%"; d.style.outline = "2px dashed " + COL.short; d.style.outlineOffset = "-2px"; d.title = `Shortfall: ${f$(-r.savings)}`; bar.appendChild(d); }
      card.appendChild(bar);
      const k2 = document.createElement("div"); k2.className = "k";
      segs.concat(r.savings < 0 ? [["short", -r.savings, "Shortfall"]] : []).forEach(([key, v, lbl]) => { const sp = document.createElement("span"); const i = document.createElement("i"); i.style.background = COL[key]; sp.appendChild(i); sp.appendChild(document.createTextNode(`${lbl} ${f$(v)}`)); k2.appendChild(sp); });
      card.appendChild(k2);
      const left = document.createElement("p"); left.className = "left"; left.textContent = (r.savings < 0 ? "−" : "") + f$(Math.abs(r.savings)) + " a month";
      const sm = document.createElement("small"); sm.textContent = r.savings < 0 ? "short of a modest budget" : `left to save · ${fMo(r.months)} to a $10,000 emergency fund`; left.appendChild(sm); card.appendChild(left);
      root.appendChild(card);
    });
    const v = document.getElementById("verdict");
    const hi = A.salary >= B.salary ? A : B, lo = hi === A ? B : A, keep = A.savings >= B.savings ? A : B;
    v.textContent = hi === keep
      ? `Here ${hi.c.city} wins on both counts: it pays ${f$(hi.salary - lo.salary)} more and keeps ${f$(hi.savings - lo.savings)} more a month. Still, ${Math.round((1 - hi.savings / (hi.salary/12)) * 100)}% of the bigger paycheck is gone before you save a dollar.`
      : `${hi.c.city} pays ${f$(hi.salary - lo.salary)} more, but ${lo.c.city} leaves ${f$(lo.savings - hi.savings)} more a month and gets you to $10,000 ${isFinite(hi.months) ? d3.format(".1f")(hi.months / lo.months) + "× faster" : "while " + hi.c.city + " never does"}. Pick the city that works for you, not the one with the biggest number.`;
  }
  return { mount };
})();
