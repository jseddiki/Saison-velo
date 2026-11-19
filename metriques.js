/* Page Métriques */
const jbC = (i) => dash.colors[i] || dash.colors[0];

/* Filtres de période, un par graphique */
window.jbTF = window.jbTF || {};
for (const b of document.querySelectorAll('.jb-tf')) {
  b.addEventListener('click', () => {
    const ch = b.dataset.chart;
    window.jbTF[ch] = b.dataset.mode;
    for (const o of document.querySelectorAll('.jb-tf')) if (o.dataset.chart === ch) o.setAttribute('aria-pressed', String(o === b));
    dash.draw(ch);
  });
}
const jbRange = (ch) => {
  const mode = window.jbTF[ch] || 'realise';
  const S0 = '2026-10-26', S1 = '2027-10-31';
  if (mode === 'saison') return { r: [S0, S1], t: 'Saison : 26/10/2026 → 31/10/2027' };
  if (mode === 'macro') {
    const mc = dash.data('macros');
    const m = mc.status === 'ok' ? mc.data.find((x) => x.debut <= J.today && x.fin >= J.today) : null;
    if (m) return { r: [m.debut, m.fin], t: 'Macro ' + m.num + ' · ' + m.nom + ' · ' + J.dm(m.debut) + ' → ' + J.dm(m.fin) };
  }
  if (mode === 'meso') {
    const cy = dash.data('cycles');
    const c = cy.status === 'ok' ? cy.data.find((x) => x.debut <= J.today && (x.fin || x.debut) >= J.today) : null;
    if (c) return { r: [c.debut, c.fin || c.debut], t: c.nom + ' · ' + J.dm(c.debut) + ' → ' + J.dm(c.fin || c.debut) };
  }
  return { r: [S0, J.today], t: 'Réalisé : 26/10/2026 → aujourd’hui' };
};
const jbHead = (el, ch) => { const g = jbRange(ch); const s = J.el('div', 'jb-sub', g.t); el.appendChild(s); const box = J.el('div', 'jb-chart'); el.appendChild(box); return { box, range: g.r }; };
const jbVals = (d) => (d.status === 'ok' ? d.data.filter((x) => x.valeur != null).map((x) => ({ x: x.date, y: Number(x.valeur), note: x.commentaire })) : []);

dash.draw('mforme', (el) => {
  const r = dash.data('charge'), p = dash.data('charge_plan');
  if (J.wait(el, r)) return;
  el.replaceChildren(); const h = jbHead(el, 'mforme');
  const pl = p.status === 'ok' ? p.data.filter((x) => x.date > J.today) : [];
  const s = (rows, k) => rows.filter((x) => x[k] != null).map((x) => ({ x: x.date, y: x[k] }));
  J.line(h.box, [
    { name: 'CTL', color: jbC(0), pts: s(r.data, 'ctl') }, { name: 'ATL', color: jbC(1), pts: s(r.data, 'atl') }, { name: 'TSB', color: jbC(2), pts: s(r.data, 'tsb') },
    { name: 'CTL prévue', color: jbC(0), dash: true, pts: s(pl, 'ctl') }, { name: 'ATL prévue', color: jbC(1), dash: true, pts: s(pl, 'atl') }, { name: 'TSB prévue', color: jbC(2), dash: true, pts: s(pl, 'tsb') }
  ], { h: 230, today: true, near: 2, range: h.range, label: 'Forme, fatigue et fraîcheur' });
});

dash.draw('mcp', (el) => {
  const c = dash.data('cp'), p = dash.data('pma');
  if (J.wait(el, c)) return;
  el.replaceChildren(); const h = jbHead(el, 'mcp');
  J.line(h.box, [{ name: 'CP', unit: 'W', color: jbC(0), dots: true, pts: jbVals(c) }, { name: 'PMA', unit: 'W', color: jbC(1), dots: true, pts: jbVals(p) }], { near: 60, range: h.range, today: true, label: 'CP et PMA', empty: 'Pas de test sur cette période.' });
});

dash.draw('mwkg', (el) => {
  const w = dash.data('wkg'), p = dash.data('poids');
  if (J.wait(el, w)) return;
  el.replaceChildren(); const h = jbHead(el, 'mwkg');
  J.line(h.box, [
    { name: 'CP', unit: 'W/kg', dec: 2, color: jbC(0), dots: true, pts: w.data.map((x) => ({ x: x.date, y: x.wkg })) },
    { name: 'Poids', unit: 'kg', dec: 1, color: jbC(1), dots: true, axis: 'y2', pts: jbVals(p) }
  ], { dec: 1, dec2: 0, near: 60, range: h.range, today: true, label: 'CP en W/kg et poids', empty: 'Pas de valeur sur cette période.' });
});

dash.draw('mef', (el) => {
  const d = dash.data('facteur');
  if (J.wait(el, d)) return;
  el.replaceChildren(); const h = jbHead(el, 'mef');
  const pts = jbVals(d);
  const ht = (q) => /home|(^|[^a-z])HT([^a-z]|$)/i.test(q.note || '');
  J.line(h.box, [{ name: 'Route', dec: 2, color: jbC(0), dots: true, pts: pts.filter((q) => !ht(q)) }, { name: 'HT', dec: 2, color: jbC(1), dots: true, pts: pts.filter(ht) }], { dec: 2, near: 20, range: h.range, today: true, label: 'Facteur d’endurance', empty: 'Pas de valeur sur cette période.' });
});

dash.draw('mvfc', (el) => {
  const d = dash.data('vfc');
  if (J.wait(el, d)) return;
  el.replaceChildren(); const h = jbHead(el, 'mvfc');
  J.line(h.box, [
    { name: 'RMSSD', unit: 'ms', color: jbC(0), dots: true, pts: d.data.filter((r) => r.rmssd != null).map((r) => ({ x: r.date, y: r.rmssd })) },
    { name: 'FC repos', unit: 'bpm', color: jbC(1), dots: true, axis: 'y2', pts: d.data.filter((r) => r.fcrepos != null).map((r) => ({ x: r.date, y: r.fcrepos })) }
  ], { near: 3, range: h.range, today: true, label: 'RMSSD et FC repos', empty: 'Pas de mesure VFC de l’app Nolio sur cette période.' });
});

dash.draw('mgluc', (el) => {
  const g = dash.data('glucides'), mx = dash.data('glucides_max');
  if (J.wait(el, g)) return;
  el.replaceChildren(); const h = jbHead(el, 'mgluc');
  J.line(h.box, [{ name: 'Sortie', unit: 'g/h', color: jbC(0), dots: true, pts: jbVals(g) }, { name: 'Validés max', unit: 'g/h', color: jbC(1), dots: true, pts: jbVals(mx) }], { zero: true, near: 10, range: h.range, today: true, label: 'Glucides par heure', empty: 'Pas de valeur sur cette période : l’analyse du soir la remplit après chaque sortie.' });
});

dash.draw('mprofil', (el) => {
  const d = dash.data('profil');
  if (J.wait(el, d)) return;
  el.textContent = '';
  const rows = d.data, lab = { 5: '5 s', 60: '1 min', 300: '5 min', 720: '12 min', 1200: '20 min', 3600: '1 h', 10800: '3 h' };
  const keys = [['saison', 0], ['precedente', 1], ['tout', 2]];
  const W = Math.max(el.clientWidth, 280), H = 220, m = { t: 14, r: 8, b: 26, l: 40 };
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Profil de puissance');
  const x0 = d3.scaleBand().domain(rows.map((r) => r.duree_s)).range([m.l, W - m.r]).padding(0.18);
  const x1 = d3.scaleBand().domain(keys.map((k) => k[0])).range([0, x0.bandwidth()]).padding(0.06);
  const ymax = d3.max(rows, (r) => Math.max(r.saison || 0, r.precedente || 0, r.tout || 0)) || 100;
  const y = d3.scaleSqrt().domain([0, ymax * 1.05]).range([H - m.b, m.t]);
  const g = svg.append('g');
  g.selectAll('line.gr').data(y.ticks(4)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', (v) => y(v)).attr('y2', (v) => y(v)).style('stroke', 'var(--cds-chart-grid)');
  g.selectAll('text.yt').data(y.ticks(4)).join('text').attr('x', m.l - 4).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').text((v) => v);
  for (const [k, ci] of keys) g.selectAll(null).data(rows.filter((r) => r[k] != null)).join('rect').attr('x', (r) => x0(r.duree_s) + x1(k)).attr('width', x1.bandwidth()).attr('y', (r) => y(r[k])).attr('height', (r) => y(0) - y(r[k])).style('fill', jbC(ci));
  g.selectAll('text.xt').data(rows).join('text').attr('x', (r) => x0(r.duree_s) + x0.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').text((r) => lab[r.duree_s] || r.duree_s);
  const tip = J.el('div', 'jb-tip'); tip.hidden = true; el.appendChild(tip);
  const show = (ev, r) => {
    tip.replaceChildren(J.el('b', null, lab[r.duree_s] || r.duree_s));
    for (const [k, t] of [['saison', 'Cette saison'], ['precedente', 'Saison précédente'], ['tout', 'Tout temps']]) tip.appendChild(J.el('div', null, t + ' : ' + (r[k] != null ? r[k] + ' W' : '—') + (r[k + '_date'] ? ' (' + J.dm(r[k + '_date']) + '/' + r[k + '_date'].slice(2, 4) + ')' : '')));
    tip.hidden = false; const box = el.getBoundingClientRect(); tip.style.left = Math.min(Math.max(0, ev.clientX - box.left - 80), el.clientWidth - 190) + 'px'; tip.style.top = '4px';
  };
  g.selectAll('rect.hit').data(rows).join('rect').attr('x', (r) => x0(r.duree_s)).attr('width', x0.bandwidth()).attr('y', m.t).attr('height', H - m.t - m.b).style('fill', 'transparent').on('pointerenter', show).on('pointerdown', show).on('pointerleave', () => { tip.hidden = true; });
});
