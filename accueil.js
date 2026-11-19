/* Page d'accueil */
window.jbWMode = 'bloc';
for (const b of document.querySelectorAll('.jb-wmode')) {
  b.addEventListener('click', () => {
    window.jbWMode = b.dataset.mode;
    for (const o of document.querySelectorAll('.jb-wmode')) o.setAttribute('aria-pressed', String(o === b));
    dash.draw('weeks'); dash.draw('wtitle');
  });
}

window.jbWeeksWindow = () => {
  const d = dash.data('semaines'), mc = dash.data('macros');
  if (d.status !== 'ok' || !d.data.length) return null;
  const all = d.data, cur = J.mon(J.today);
  if (window.jbWMode === 'bloc') { const a = J.add(cur, -21), b = J.add(cur, 42); return { rows: all.filter((w) => w.lundi >= a && w.lundi <= b), titre: '3 semaines passées, la semaine en cours et les 6 suivantes' }; }
  if (window.jbWMode === 'macro') {
    const m = mc.status === 'ok' ? mc.data.find((x) => x.debut <= J.today && x.fin >= J.today) : null;
    if (m) return { rows: all.filter((w) => w.lundi >= J.mon(m.debut) && w.lundi <= m.fin), titre: 'Macro ' + m.num + ' · ' + m.nom + ' · ' + J.dm(m.debut) + ' → ' + J.dm(m.fin) };
    return { rows: all, titre: 'Macrocycle introuvable dans la note Saison : saison entière' };
  }
  return { rows: all, titre: 'Saison : du 26/10/2026 au 31/10/2027' };
};

dash.draw('wtitle', (el) => { const w = window.jbWeeksWindow(); el.textContent = w ? w.titre : '—'; });

dash.draw('weeks', (el) => {
  const d = dash.data('semaines');
  if (J.wait(el, d)) return;
  const win = window.jbWeeksWindow(); if (!win) { el.textContent = '—'; return; }
  el.textContent = '';
  const rows = win.rows, cur = J.mon(J.today);
  const W = Math.max(el.clientWidth, 280), H = 240, m = { t: 22, r: 6, b: 34, l: 34 };
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'TSS prévu et réalisé par semaine, avec la cible du mésocycle');
  const x = d3.scaleBand().domain(rows.map((r) => r.lundi)).range([m.l, W - m.r]).padding(0.18);
  const ymax = d3.max(rows, (r) => Math.max(r.prevu, r.realise, r.cible || 0)) || 100;
  const y = d3.scaleLinear().domain([0, ymax * 1.08]).nice().range([H - m.b, m.t]);
  const g = svg.append('g'), bw = x.bandwidth(), st = x.step(), off = st * x.paddingInner() / 2;
  g.selectAll('line.gr').data(y.ticks(4)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', (v) => y(v)).attr('y2', (v) => y(v)).style('stroke', 'var(--cds-chart-grid)');
  g.selectAll('text.yt').data(y.ticks(4)).join('text').attr('x', m.l - 4).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').text((v) => v);
  g.selectAll('rect.vac').data(rows.filter((r) => r.vacances)).join('rect').attr('x', (r) => x(r.lundi) - off).attr('width', st + 0.5).attr('y', m.t - 14).attr('height', H - m.b - m.t + 14).style('fill', 'var(--color-ok)').style('opacity', 0.14);
  if (rows.some((r) => r.lundi === cur)) g.append('rect').attr('x', x(cur) - off).attr('y', m.t - 14).attr('width', st).attr('height', H - m.b - m.t + 14).style('fill', 'var(--cds-chart-muted)').style('opacity', 0.45);
  g.selectAll('rect.cyc').data(rows).join('rect').attr('x', (r) => x(r.lundi) - off).attr('width', st + 0.5).attr('y', H - m.b + 2).attr('height', 4).style('fill', (r) => r.couleur || 'transparent');
  g.selectAll('rect.pl').data(rows).join('rect').attr('x', (r) => x(r.lundi)).attr('width', bw).attr('y', (r) => y(r.prevu)).attr('height', (r) => y(0) - y(r.prevu)).style('fill', 'var(--cds-chart-muted)').style('stroke', 'var(--cds-chart-axis)').style('stroke-width', 1);
  const ins = bw > 10 ? bw * 0.18 : 0;
  g.selectAll('rect.re').data(rows).join('rect').attr('x', (r) => x(r.lundi) + ins).attr('width', bw - 2 * ins).attr('y', (r) => y(r.realise)).attr('height', (r) => y(0) - y(r.realise)).style('fill', dash.colors[0]);
  g.selectAll('line.tg').data(rows.filter((r) => r.cible != null)).join('line').attr('x1', (r) => x(r.lundi) - 2).attr('x2', (r) => x(r.lundi) + bw + 2).attr('y1', (r) => y(r.cible)).attr('y2', (r) => y(r.cible)).style('stroke', 'var(--cds-chart-reference)').style('stroke-width', 2).style('stroke-dasharray', '4 3');
  g.selectAll('text.ob').data(rows.filter((r) => r.objectif)).join('text').attr('x', (r) => x(r.lundi) + bw / 2).attr('y', m.t - 6).attr('text-anchor', 'middle').style('font-weight', 600).text((r) => Array.from(new Set(r.objectif.split(' · ').map((s) => s.slice(0, 1)))).join(st < 14 ? '' : '+'));
  const step = Math.max(1, Math.ceil(42 / st));
  const lab = rows.filter((r, i) => (window.jbWMode === 'saison' ? r.lundi.slice(8, 10) <= '07' : i % step === 0));
  g.selectAll('text.xt').data(lab).join('text').attr('x', (r) => x(r.lundi) + bw / 2).attr('y', H - m.b + 18).attr('text-anchor', 'middle').text((r) => (window.jbWMode === 'saison' ? new Date(r.lundi + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '') : J.dm(r.lundi)));
  const tip = J.el('div', 'jb-tip'); tip.hidden = true; el.appendChild(tip);
  const show = (ev, r) => {
    tip.replaceChildren(J.el('b', null, 'Semaine du ' + J.dm(r.lundi)));
    const lines = [['Prévu', r.prevu + ' TSS'], ['Réalisé', r.realise + ' TSS'], ['Cible', r.cible != null ? r.cible + ' TSS' : '—'], ['Bloc', r.cycle || '—']];
    if (r.objectif) for (const o of r.objectif.split(' · ')) lines.push([o[0] === 'W' ? 'Week-end choc' : 'Objectif ' + o[0], o.slice(2).replace(/^Week-end choc · /, '')]);
    if (r.vacances) lines.push(['Vacances', r.vacances]);
    for (const [k, v] of lines) tip.appendChild(J.el('div', null, k + ' : ' + v));
    tip.hidden = false; const box = el.getBoundingClientRect();
    tip.style.left = Math.min(Math.max(0, (ev.clientX || 0) - box.left - 80), el.clientWidth - 170) + 'px'; tip.style.top = '8px';
  };
  g.selectAll('rect.hit').data(rows).join('rect').attr('x', (r) => x(r.lundi) - off).attr('width', st).attr('y', m.t - 14).attr('height', H - m.b - m.t + 14).style('fill', 'transparent').style('cursor', 'pointer')
    .on('pointerenter', show).on('pointerdown', show).on('pointerleave', () => { tip.hidden = true; });
});

dash.draw('zmeso', (el) => {
  const d = dash.data('zones_meso');
  if (J.wait(el, d)) return;
  el.replaceChildren();
  if (!d.data.length || !d.data.some((r) => r.heures > 0)) { el.appendChild(J.el('div', 'jb-sub', 'Pas encore de séance avec puissance dans ce mésocycle.')); return; }
  const h = d.data.reduce((a, r) => a + r.heures, 0);
  el.appendChild(J.el('div', 'jb-sub', d.data[0].meso + ' · ' + d.data[0].seances + ' séances · ' + J.num(h, 1) + ' h avec puissance'));
  J.zbar(el, d.data.map((r) => r.heures), true);
});

dash.draw('quests', (el) => {
  const d = dash.data('quetes');
  if (J.wait(el, d, 'Chargement des quêtes…')) return;
  el.replaceChildren();
  for (const q of d.data) {
    const pal = String(q.paliers).split(';').map(Number);
    const ev = q.label === 'everest';
    const lab = (v) => (ev ? (v / 8848).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + '× Ev.' : v.toLocaleString('fr-FR'));
    const card = J.el('div', 'jb-card' + (q.valeur == null ? ' jb-locked' : ''));
    const top = J.el('div', 'jb-q-top');
    top.append(J.el('span', 'jb-q-title', q.titre), J.el('span', 'jb-q-val', q.valeur == null ? '—' : Math.round(q.valeur).toLocaleString('fr-FR') + ' ' + q.unite));
    card.appendChild(top);
    const bar = J.el('div', 'jb-bar'); const fill = J.el('i'); let pct = 0;
    if (q.valeur != null) { const lo = q.atteints > 0 ? pal[q.atteints - 1] : 0; const hi = q.prochain != null ? q.prochain : pal[pal.length - 1]; pct = q.prochain == null ? 100 : Math.max(0, Math.min(100, (q.valeur - lo) / (hi - lo) * 100)); }
    fill.style.width = pct + '%'; bar.appendChild(fill); card.appendChild(bar);
    const bs = J.el('div', 'jb-badges');
    pal.forEach((p, i) => bs.appendChild(J.el('span', 'jb-badge' + (i < q.atteints ? ' jb-won' : i === q.atteints && q.valeur != null ? ' jb-nextb' : ''), (i < q.atteints ? '★ ' : '') + lab(p))));
    card.appendChild(bs);
    const nxt = q.prochain != null && q.valeur != null ? 'Prochain badge : ' + lab(q.prochain) + (ev ? '' : ' ' + q.unite) + ' (encore ' + Math.max(0, Math.ceil(q.prochain - q.valeur)).toLocaleString('fr-FR') + ' ' + q.unite + ')' : q.prochain == null && q.valeur != null ? 'Tous les badges gagnés !' : '';
    card.appendChild(J.el('div', 'jb-q-note', [q.note, nxt].filter(Boolean).join(' · ')));
    el.appendChild(card);
  }
});
