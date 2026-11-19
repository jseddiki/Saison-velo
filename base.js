/* Outils communs, navigation entre les pages */

/* Réglages à compléter par Johan : numéro WhatsApp au format international sans « + » (ex. 4915123456789).
   Vide : le bouton « Je viens » ouvre WhatsApp (ou le partage du téléphone) et l'ami choisit à qui l'envoyer. */
window.CONFIG = { whatsapp: '', prenom: 'Johan' };

(() => {
  const J = (window.J = {});
  const p2 = (n) => String(n).padStart(2, '0');
  const d = new Date();
  J.today = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  J.S0 = '2026-10-26'; J.S1 = '2027-10-31';
  J.add = (s, n) => { const x = new Date(s + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  J.mon = (s) => { const x = new Date(String(s).slice(0, 10) + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - (x.getUTCDay() + 6) % 7); return x.toISOString().slice(0, 10); };
  J.diff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
  J.dm = (s) => (s ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) : '—');
  J.wd = (s, long) => new Date(s + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: long ? 'long' : 'short', timeZone: 'UTC' }).replace('.', '');
  J.mshort = (s) => new Date(s + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  J.mlong = (s) => new Date(s.slice(0, 7) + '-15T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  J.day = (s) => J.wd(s) + ' ' + J.dm(s);
  J.dur = (m) => { if (m == null) return '—'; m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? h + ' h ' + p2(r) : r + ' min'; };
  J.num = (v, dec) => (v == null || v === '' || isNaN(v) ? '—' : Number(v).toLocaleString('fr-FR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }));
  J.signed = (v) => { if (v == null) return '—'; const n = Math.round(Number(v)); return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); };
  J.jx = (date) => { const n = J.diff(J.today, date); return n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : n > 0 ? 'J-' + n : 'il y a ' + -n + ' j'; };
  J.sport = (id) => ({ spt_wSAjGr1yXKlkEVU: 'Home trainer', spt_B41yRYTUXKNmWr8: 'Route', spt_vxmhSsLPpMbXD21: 'Renfo', spt_kNYHjuEzDJRiYCX: 'Course à pied', spt_H5vx5Of2XbeazSo: 'Randonnée' })[id] || 'Autre sport';
  J.bike = (id) => id === 'spt_B41yRYTUXKNmWr8' || id === 'spt_wSAjGr1yXKlkEVU';
  J.zc = ['#8FA3B8', '#4CAF50', '#E8C547', '#F08C28', '#D9452F', '#9C3FC4', '#3A3A3A'];
  J.el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  J.svgIcon = (path) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = path; return s; };
  J.ICON = {
    hand: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V11M16 11V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 14a1.6 1.6 0 0 1 2.6-1.8L7 13.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    dl: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  J.btn = (label, icon, cls) => { const b = J.el('a', 'btn' + (cls ? ' ' + cls : '')); if (icon) b.appendChild(J.svgIcon(J.ICON[icon])); b.appendChild(document.createTextNode(label)); return b; };
  J.wait = (el, d, msg) => {
    if (d.status === 'ok') return false;
    el.replaceChildren(J.el('div', 'sub', d.status === 'error' ? 'Les données n’ont pas pu être chargées. Recharge la page.' : msg || 'Chargement…'));
    return true;
  };

  /* Message « Je viens » : WhatsApp (numéro de CONFIG s'il existe), sinon partage du téléphone */
  J.joinLink = (a, text) => {
    const num = (window.CONFIG.whatsapp || '').replace(/[^0-9]/g, '');
    a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
    a.target = '_blank'; a.rel = 'noopener';
    if (!num && navigator.share) a.addEventListener('click', (ev) => { ev.preventDefault(); navigator.share({ text }).catch(() => {}); });
    return a;
  };
  /* Fichier .ics (agenda) : journée entière, ou heure de début si connue */
  J.ics = (a, ev) => {
    const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const ymd = (s) => s.replace(/-/g, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Saison velo Johan//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:' + ev.uid + '@saison-velo', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'];
    if (ev.heure) { const t = ev.heure.replace(':', '') + '00'; L.push('DTSTART;TZID=Europe/Berlin:' + ymd(ev.debut) + 'T' + t); L.push('DURATION:PT' + Math.max(30, Math.round(ev.minutes || 60)) + 'M'); }
    else { L.push('DTSTART;VALUE=DATE:' + ymd(ev.debut)); L.push('DTEND;VALUE=DATE:' + ymd(J.add(ev.fin || ev.debut, 1))); }
    L.push('SUMMARY:' + esc(ev.titre), 'DESCRIPTION:' + esc(ev.texte), 'END:VEVENT', 'END:VCALENDAR');
    a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(L.join('\r\n'));
    a.setAttribute('download', (ev.debut + ' ' + String(ev.titre).normalize('NFD').replace(/[^A-Za-z0-9 _-]+/g, ' ')).replace(/ +/g, ' ').trim().slice(0, 50) + '.ics');
    return a;
  };
  J.friends = (names) => {
    if (!names || !names.length) return null;
    const box = J.el('span', 'friends');
    const avs = J.el('span');
    names.slice(0, 5).forEach((n, i) => { const a = J.el('span', 'av', String(n).trim().slice(0, 1).toUpperCase()); a.title = n; a.style.background = ['#1F4E79', '#1E9E5A', '#D3313F', '#8E5BD6', '#E07B39'][i % 5]; avs.appendChild(a); });
    box.append(avs, document.createTextNode(names.length === 1 ? names[0] + ' vient' : names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1] + ' viennent'));
    return box;
  };

  J.zbar = (box, secs, labels) => {
    const tot = secs.reduce((a, b) => a + (b || 0), 0);
    if (!tot) return;
    const bar = J.el('div', 'zbar');
    secs.forEach((s, i) => { if (!s) return; const g = J.el('i'); g.style.width = (s / tot * 100) + '%'; g.style.background = J.zc[i]; g.title = 'Z' + (i + 1) + ' : ' + Math.round(s / tot * 100) + ' %'; bar.appendChild(g); });
    box.appendChild(bar);
    if (labels) {
      const lab = J.el('div', 'zlab');
      secs.forEach((s, i) => { const it = J.el('span'); const sw = J.el('i'); sw.style.background = J.zc[i]; it.append(sw, document.createTextNode('Z' + (i + 1) + ' ' + Math.round((s || 0) / tot * 100) + ' %')); lab.appendChild(it); });
      box.appendChild(lab);
    }
  };
  J.metrics = (cells) => {
    const grid = J.el('div', 'metrics');
    for (const [k, v] of cells) { const c = J.el('div'); c.append(J.el('div', 'l', k), J.el('div', 'v', v)); grid.appendChild(c); }
    return grid;
  };
  J.tipAt = (tip, host, ev, w) => {
    const box = host.getBoundingClientRect();
    tip.hidden = false;
    tip.style.left = Math.min(Math.max(0, (ev.clientX || 0) - box.left - 80), host.clientWidth - (w || 180)) + 'px';
    tip.style.top = '6px';
  };

  /* Courbe dans le temps : series = [{pts:[{x:'AAAA-MM-JJ', y}], color, dash, dots, axis:'y2', name}] */
  J.line = (el, series, opt) => {
    opt = opt || {};
    el.textContent = '';
    if (opt.range) { const a = opt.range[0], b = opt.range[1]; series = series.map((s) => Object.assign({}, s, { pts: s.pts.filter((q) => q.x >= a && q.x <= b) })); }
    const all = series.flatMap((s) => s.pts);
    if (!all.length) { el.appendChild(J.el('div', 'sub', opt.empty || 'Pas encore de valeur.')); return; }
    const P = (s) => new Date(s + 'T12:00:00Z');
    const W = Math.max(el.clientWidth, 280), H = opt.h || 210, m = { t: 10, r: series.some((s) => s.axis === 'y2') ? 40 : 8, b: 24, l: 40 };
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', opt.label || 'Courbe');
    const xs = opt.range ? [P(opt.range[0]), P(opt.range[1])] : d3.extent(all, (p) => P(p.x));
    if (+xs[0] === +xs[1]) { xs[0] = d3.utcDay.offset(xs[0], -7); xs[1] = d3.utcDay.offset(xs[1], 7); }
    const x = d3.scaleUtc().domain(xs).range([m.l, W - m.r]);
    const mk = (pts) => { const e = d3.extent(pts, (p) => p.y); const pad = (e[1] - e[0]) * 0.08 || Math.abs(e[0]) * 0.05 || 1; return d3.scaleLinear().domain([opt.zero ? Math.min(0, e[0]) : e[0] - pad, e[1] + pad]).nice().range([H - m.b, m.t]); };
    const y1 = mk(series.filter((s) => s.axis !== 'y2').flatMap((s) => s.pts));
    const y2p = series.filter((s) => s.axis === 'y2').flatMap((s) => s.pts);
    const y2 = y2p.length ? mk(y2p) : null;
    const g = svg.append('g');
    g.selectAll('line.gr').data(y1.ticks(4)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', (v) => y1(v)).attr('y2', (v) => y1(v)).style('stroke', 'var(--line)');
    g.selectAll('text.y1').data(y1.ticks(4)).join('text').attr('x', m.l - 4).attr('y', (v) => y1(v) + 4).attr('text-anchor', 'end').text((v) => J.num(v, opt.dec || 0));
    if (y2) g.selectAll('text.y2').data(y2.ticks(4)).join('text').attr('x', W - m.r + 4).attr('y', (v) => y2(v) + 4).text((v) => J.num(v, opt.dec2 || 0));
    const nt = Math.max(2, Math.floor((W - m.l - m.r) / 70));
    g.selectAll('text.xt').data(x.ticks(nt)).join('text').attr('x', (v) => x(v)).attr('y', H - 6).attr('text-anchor', 'middle').text((v) => d3.utcFormat('%d/%m')(v));
    if (opt.today) { const t = P(J.today); if (t >= xs[0] && t <= xs[1]) g.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--muted)').style('stroke-dasharray', '2 3'); }
    for (const s of series) {
      const y = s.axis === 'y2' ? y2 : y1;
      const pts = s.pts.slice().sort((a, b) => (a.x < b.x ? -1 : 1));
      const ln = d3.line().x((p) => x(P(p.x))).y((p) => y(p.y));
      if (pts.length > 1) g.append('path').datum(pts).attr('d', ln).style('fill', 'none').style('stroke', s.color).style('stroke-width', 2).style('stroke-dasharray', s.dash ? '4 3' : null);
      if (s.dots || pts.length < 2) g.selectAll(null).data(pts).join('circle').attr('cx', (p) => x(P(p.x))).attr('cy', (p) => y(p.y)).attr('r', 3).style('fill', s.color);
    }
    const tip = J.el('div', 'tip'); tip.hidden = true; el.appendChild(tip);
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
        J.tipAt(tip, el, ev, 190);
      })
      .on('pointerleave', () => { tip.hidden = true; });
  };
})();

/* Navigation */
window.jbShow = (page) => {
  const pages = Array.from(document.querySelectorAll('.page'));
  if (!pages.some((s) => s.id === page)) return;
  for (const s of pages) s.hidden = s.id !== page;
  for (const b of document.querySelectorAll('.tab')) b.setAttribute('aria-pressed', String(b.dataset.page === page));
  dash.setLink(page);
};
for (const b of document.querySelectorAll('.tab')) b.addEventListener('click', () => { window.jbShow(b.dataset.page); window.scrollTo({ top: 0 }); });
if (location.hash) window.jbShow(location.hash.slice(1));
window.addEventListener('hashchange', () => window.jbShow(location.hash.slice(1)));
