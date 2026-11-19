/* Outils communs, navigation entre les pages */
(() => {
  const J = (window.J = {});
  const p2 = (n) => String(n).padStart(2, '0');
  const d = new Date();
  J.today = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  J.add = (s, n) => { const x = new Date(s + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  J.mon = (s) => { const x = new Date(String(s).slice(0, 10) + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - (x.getUTCDay() + 6) % 7); return x.toISOString().slice(0, 10); };
  J.dm = (s) => (s ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) : '—');
  J.day = (s) => new Date(s + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '') + ' ' + J.dm(s);
  J.dur = (m) => { if (m == null) return '—'; m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? h + ' h ' + p2(r) : r + ' min'; };
  J.num = (v, dec) => (v == null || v === '' || isNaN(v) ? '—' : Number(v).toLocaleString('fr-FR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }));
  J.fmt = (v, f) => {
    if (v == null || v === '') return '—';
    if (f === 'int') return J.num(v);
    if (f === 'ef') return J.num(v, 2);
    if (f === 'signed') { const n = Math.round(Number(v)); return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }
    if (f === 'date') return J.dm(String(v));
    return String(v);
  };
  J.sport = (id) => ({ spt_wSAjGr1yXKlkEVU: 'Home trainer', spt_B41yRYTUXKNmWr8: 'Route', spt_vxmhSsLPpMbXD21: 'Renfo', spt_kNYHjuEzDJRiYCX: 'Course à pied' })[id] || 'Autre sport';
  J.zc = ['#8FA3B8', '#4CAF50', '#E8C547', '#F08C28', '#D9452F', '#9C3FC4', '#3A3A3A'];
  J.el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  J.wait = (el, d, msg) => {
    if (d.status === 'ok') return false;
    el.replaceChildren(J.el('div', 'jb-sub', d.status === 'error' ? 'Échec du chargement' : msg || 'Chargement…'));
    return true;
  };
  J.zbar = (box, secs, labels) => {
    const tot = secs.reduce((a, b) => a + (b || 0), 0);
    if (!tot) return;
    const bar = J.el('div', 'jb-zbar');
    secs.forEach((s, i) => { if (!s) return; const g = J.el('i'); g.style.width = (s / tot * 100) + '%'; g.style.background = J.zc[i]; bar.appendChild(g); });
    box.appendChild(bar);
    if (labels) {
      const lab = J.el('div', 'jb-zlab');
      secs.forEach((s, i) => { const it = J.el('span'); const sw = J.el('i'); sw.style.background = J.zc[i]; it.append(sw, document.createTextNode('Z' + (i + 1) + ' ' + Math.round((s || 0) / tot * 100) + ' %')); lab.appendChild(it); });
      box.appendChild(lab);
    }
  };
  J.metrics = (cells) => {
    const grid = J.el('div', 'jb-metrics');
    for (const [k, v] of cells) { const c = J.el('div'); c.append(J.el('div', 'jb-m-l', k), J.el('div', 'jb-m-v', v)); grid.appendChild(c); }
    return grid;
  };
  /* Courbe dans le temps : series = [{pts:[{x:'AAAA-MM-JJ', y}], color, dash, dots, axis:'y2', name, fmt}] */
  J.line = (el, series, opt) => {
    opt = opt || {};
    el.textContent = '';
    if (opt.range) { const a = opt.range[0], b = opt.range[1]; series = series.map((s) => Object.assign({}, s, { pts: s.pts.filter((q) => q.x >= a && q.x <= b) })); }
    const all = series.flatMap((s) => s.pts);
    if (!all.length) { el.appendChild(J.el('div', 'jb-sub', opt.empty || 'Pas encore de valeur.')); return; }
    const P = (s) => new Date(s + 'T12:00:00Z');
    const W = Math.max(el.clientWidth, 280), H = opt.h || 200, m = { t: 10, r: series.some((s) => s.axis === 'y2') ? 40 : 8, b: 24, l: 40 };
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', opt.label || 'Courbe');
    const xs = opt.range ? [P(opt.range[0]), P(opt.range[1])] : d3.extent(all, (p) => P(p.x));
    if (+xs[0] === +xs[1]) { xs[0] = d3.utcDay.offset(xs[0], -7); xs[1] = d3.utcDay.offset(xs[1], 7); }
    const x = d3.scaleUtc().domain(xs).range([m.l, W - m.r]);
    const mk = (pts) => { const e = d3.extent(pts, (p) => p.y); const pad = (e[1] - e[0]) * 0.08 || Math.abs(e[0]) * 0.05 || 1; return d3.scaleLinear().domain([opt.zero ? Math.min(0, e[0]) : e[0] - pad, e[1] + pad]).nice().range([H - m.b, m.t]); };
    const y1 = mk(series.filter((s) => s.axis !== 'y2').flatMap((s) => s.pts));
    const y2p = series.filter((s) => s.axis === 'y2').flatMap((s) => s.pts);
    const y2 = y2p.length ? mk(y2p) : null;
    const g = svg.append('g');
    g.selectAll('line.gr').data(y1.ticks(4)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', (v) => y1(v)).attr('y2', (v) => y1(v)).style('stroke', 'var(--cds-chart-grid)');
    g.selectAll('text.y1').data(y1.ticks(4)).join('text').attr('x', m.l - 4).attr('y', (v) => y1(v) + 4).attr('text-anchor', 'end').text((v) => J.num(v, opt.dec || 0));
    if (y2) g.selectAll('text.y2').data(y2.ticks(4)).join('text').attr('x', W - m.r + 4).attr('y', (v) => y2(v) + 4).text((v) => J.num(v, opt.dec2 || 0));
    const nt = Math.max(2, Math.floor((W - m.l - m.r) / 70));
    g.selectAll('text.xt').data(x.ticks(nt)).join('text').attr('x', (v) => x(v)).attr('y', H - 6).attr('text-anchor', 'middle').text((v) => d3.utcFormat('%d/%m')(v));
    if (opt.today) { const t = P(J.today); if (t >= xs[0] && t <= xs[1]) g.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '2 3'); }
    for (const s of series) {
      const y = s.axis === 'y2' ? y2 : y1;
      const pts = s.pts.slice().sort((a, b) => (a.x < b.x ? -1 : 1));
      const ln = d3.line().x((p) => x(P(p.x))).y((p) => y(p.y));
      if (pts.length > 1) g.append('path').datum(pts).attr('d', ln).style('fill', 'none').style('stroke', s.color).style('stroke-width', 1.7).style('stroke-dasharray', s.dash ? '4 3' : null);
      if (s.dots || pts.length < 2) g.selectAll(null).data(pts).join('circle').attr('cx', (p) => x(P(p.x))).attr('cy', (p) => y(p.y)).attr('r', 3).style('fill', s.color);
    }
    const tip = J.el('div', 'jb-tip'); tip.hidden = true; el.appendChild(tip);
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).style('fill', 'transparent')
      .on('pointermove pointerdown', (ev) => {
        const box = el.getBoundingClientRect(); const px = (ev.clientX - box.left) * W / el.clientWidth; const t = x.invert(px);
        tip.replaceChildren(J.el('b', null, d3.utcFormat('%d/%m/%Y')(t)));
        for (const s of series) {
          if (!s.pts.length) continue;
          const p = s.pts.reduce((b, q) => (Math.abs(P(q.x) - t) < Math.abs(P(b.x) - t) ? q : b), s.pts[0]);
          if (Math.abs(P(p.x) - t) > 1000 * 86400 * (opt.near || 10)) continue;
          tip.appendChild(J.el('div', null, (s.name || '') + ' : ' + J.num(p.y, s.dec || 0) + (s.unit ? ' ' + s.unit : '') + ' (' + J.dm(p.x) + ')' + (p.note ? ' · ' + p.note : '')));
        }
        tip.hidden = false; tip.style.left = Math.min(Math.max(0, ev.clientX - box.left - 80), el.clientWidth - 170) + 'px'; tip.style.top = '4px';
      })
      .on('pointerleave', () => { tip.hidden = true; });
  };
})();

for (const r of document.querySelectorAll('.jb')) {
  r.style.setProperty('--jb-c0', dash.colors[0]);
  r.style.setProperty('--jb-c1', dash.colors[1] || dash.colors[0]);
  r.style.setProperty('--jb-c2', dash.colors[2] || dash.colors[0]);
}

/* Navigation */
window.jbShow = (page) => {
  const pages = Array.from(document.querySelectorAll('.jb-page'));
  if (!pages.some((s) => s.id === page)) return;
  for (const s of pages) s.hidden = s.id !== page;
  for (const b of document.querySelectorAll('.jb-tab')) b.setAttribute('aria-pressed', String(b.dataset.page === page));
  dash.setLink(page);
};
for (const b of document.querySelectorAll('.jb-tab')) b.addEventListener('click', () => window.jbShow(b.dataset.page));
if (location.hash) window.jbShow(location.hash.slice(1));

/* Valeur simple d'une ligne de calcul */
dash.draw('v', (el) => {
  const d = dash.data(el.dataset.source);
  if (d.status !== 'ok' || !d.data || !d.data[0]) { el.textContent = '—'; return; }
  const v = d.data[0][el.dataset.field];
  el.textContent = J.fmt(v, el.dataset.fmt);
  if (el.dataset.field === 'tsb') el.className = v == null ? '' : v < -20 ? 'jb-bad' : v < -10 ? 'jb-warn' : 'jb-ok';
});
