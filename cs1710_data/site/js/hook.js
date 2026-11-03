/* HOOK: U.S. map with the two offer cities highlighted, offer letters, randomize/reset. */
window.Hook = (function(){
  const { D, f$, fK, ALL, state, on, setOffer, randomize, reset, offerEditor, drawUS, showTip, hideTip } = App;
  let svg, proj, g, W = 760, H = 460;
  function mount(){
    offerEditor(document.getElementById("offerEditors"), "A");
    offerEditor(document.getElementById("offerEditors"), "B");
    document.getElementById("randomize").addEventListener("click", randomize);
    document.getElementById("resetOffers").addEventListener("click", reset);
    const root = d3.select("#hookMap");
    svg = root.append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    proj = drawUS(svg, W, H);
    g = svg.append("g");
    g.selectAll("circle.metro").data(D.cities, d => d.city).join("circle").attr("class","metro")
      .attr("cx", d => proj([d.lon, d.lat])[0]).attr("cy", d => proj([d.lon, d.lat])[1]).attr("r", 5)
      .on("pointermove", (e,d) => showTip(e, (add,row) => { add("t", `${d.city}, ${d.state}`); add("m", d.region); row(f$(d.salary), "typical entry salary"); row(f$(d.savings)+"/mo", "est. savings, all fields"); add("m", "Click to make this Offer A · shift-click for Offer B"); }))
      .on("pointerleave", hideTip)
      .on("click", (e,d) => setOffer(e.shiftKey ? "B" : "A", { city: d.city }));
    svg.append("line").attr("class","link").attr("stroke","var(--axis)").attr("stroke-dasharray","3 3");
    ["A","B"].forEach(k => {
      const gg = svg.append("g").attr("class","pin "+k);
      gg.append("circle").attr("r", 9).attr("fill", k==="A" ? "var(--a)" : "var(--b)").attr("stroke","var(--surface)").attr("stroke-width",2.5);
      gg.append("text").attr("class","lbl").attr("dy","-1.1em");
      gg.append("text").attr("class","lbl2").attr("dy","-0.1em");
    });
    on(render);
  }
  function render(s){
    const pa = proj([App.byCity[s.A.city].lon, App.byCity[s.A.city].lat]), pb = proj([App.byCity[s.B.city].lon, App.byCity[s.B.city].lat]);
    svg.select("line.link").attr("x1", pa[0]).attr("y1", pa[1]).attr("x2", pb[0]).attr("y2", pb[1]);
    [["A", pa, s.A], ["B", pb, s.B]].forEach(([k, p, o]) => {
      const gg = svg.select("g.pin."+k).attr("transform", `translate(${p[0]},${p[1]})`);
      const flip = p[0] > W*0.72 || (k==="B" && Math.abs(pb[0]-pa[0]) < 90 && pb[0] >= pa[0]);
      const anchor = flip ? "end" : "start", dx = flip ? -14 : 14;
      const below = k==="B" && Math.abs(pb[0]-pa[0]) < 120 && Math.abs(pb[1]-pa[1]) < 40;
      gg.select("text.lbl").text(`${o.city}, ${App.byCity[o.city].state}`).attr("text-anchor", anchor).attr("x", dx).attr("dy", below ? "1.6em" : "-1.1em");
      gg.select("text.lbl2").text(`Offer ${k} · ${f$(o.salary)}`).attr("text-anchor", anchor).attr("x", dx).attr("dy", below ? "2.7em" : "-0.1em");
    });
    g.selectAll("circle.metro").classed("dim", d => d.city !== s.A.city && d.city !== s.B.city);
    const box = document.getElementById("hookOffers"); box.textContent = "";
    [["A", s.A], ["B", s.B]].forEach(([k,o]) => {
      const div = document.createElement("div"); div.className = "offerline " + k.toLowerCase();
      const b = document.createElement("b"); b.textContent = `${f$(o.salary)} in ${o.city}`; div.appendChild(b);
      const sm = document.createElement("small"); sm.textContent = o.field === ALL ? "any entry-level field" : o.field; div.appendChild(sm);
      box.appendChild(div);
    });
  }
  return { mount };
})();
