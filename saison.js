/* Page « Ma saison » : frise, chiffres du jour, compte à rebours, 14 jours, bloc en cours, charge par semaine */
window.jbBloc = null; // mésocycle choisi dans la frise (nom), sinon celui en cours

const jbCurMeso = () => { const cy = dash.data('cycles'); return cy.status === 'ok' ? cy.data.find((x) => x.debut <= J.today && (x.fin || x.debut) >= J.today) : null; };
const jbStatus = () => { const s = dash.data('statuts'), m = {}; if (s.status === 'ok') for (const t of s.data) m[t.id] = t; return m; };
const jbShort = (n) => String(n || '').replace(/^Méso [0-9]+ · /, '');

/* ---------- Frise ---------- */
dash.draw('frise', (el) => {
  const mc = dash.data('macros'), cy = dash.data('cycles'), ob = dash.data('objectifs'), nt = dash.data('notes'), ch = dash.data('charge'), cp = dash.data('charge_plan'), pv = dash.data('prevu');
  if (J.wait(el, cy)) return;
  el.textContent = '';
  const W = Math.max(el.clientWidth, 940), H = 330, L = 14, R = 14;
  const P = (s) => new Date(s + 'T12:00:00Z');
  const x = d3.scaleUtc().domain([P(J.S0), P(J.S1)]).range([L, W - R]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Frise de la saison : macrocycles, mésocycles, forme et objectifs');
  const defs = svg.append('defs');
  const gr = defs.append('linearGradient').attr('id', 'gProfil').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
  gr.append('stop').attr('offset', '0%').style('stop-color', 'var(--route)').style('stop-opacity', 0.55);
  gr.append('stop').attr('offset', '100%').style('stop-color', 'var(--route)').style('stop-opacity', 0.06);
  const yMacro = 22, yMeso = 52, yTop = 100, yBase = 262;
  const tip = J.el('div', 'tip'); tip.hidden = true;
  const show = (ev, lines) => { tip.replaceChildren(J.el('b', null, lines[0])); for (const l of lines.slice(1)) tip.appendChild(J.el('div', null, l)); J.tipAt(tip, el, ev, 230); };
  const hide = () => { tip.hidden = true; };

  // Mois
  const months = d3.utcMonth.range(P('2026-11-01'), P(J.S1));
  svg.selectAll('line.m').data(months).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', yMacro).attr('y2', yBase).style('stroke', 'var(--line)').style('stroke-dasharray', '2 4');
  svg.selectAll('text.m').data([P(J.S0)].concat(months)).join('text').attr('x', (d, i) => (i === 0 ? x(d) : x(d) + 4)).attr('y', 12)
    .text((d) => d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '') + (d.getUTCMonth() === 0 ? ' ' + d.getUTCFullYear() : ''));

  // Macrocycles
  const macros = mc.status === 'ok' ? mc.data.filter((m) => m.debut <= J.S1) : [];
  const gm = svg.append('g');
  macros.forEach((m, i) => {
    const x0 = x(P(m.debut)), x1 = x(P(m.fin > J.S1 ? J.S1 : m.fin));
    const g = gm.append('g').style('cursor', 'default');
    g.append('rect').attr('x', x0 + 1).attr('y', yMacro).attr('width', Math.max(2, x1 - x0 - 2)).attr('height', 24).attr('rx', 5).style('fill', i % 2 ? 'var(--soft)' : 'color-mix(in srgb, var(--ink) 9%, var(--card))');
    const t = g.append('text').attr('class', 'lbl-strong').attr('x', x0 + 8).attr('y', yMacro + 17).text(m.num + ' · ' + m.nom);
    const w = x1 - x0 - 14; let s = m.num + ' · ' + m.nom; while (t.node().getComputedTextLength() > w && s.length > 3) { s = s.slice(0, -2); t.text(s + '…'); }
    if (w < 30) t.text(m.num);
    g.on('pointerenter pointerdown', (ev) => show(ev, ['Macro ' + m.num + ' · ' + m.nom, J.dm(m.debut) + ' → ' + J.dm(m.fin)].concat(String(m.contenu || '').split(' · ').slice(0, 4)))).on('pointerleave', hide);
  });

  // Mésocycles
  const cur = jbCurMeso();
  cy.data.forEach((c, i) => {
    const x0 = x(P(c.debut)), x1 = x(P(J.add(c.fin || c.debut, 1)));
    const col = /^#[0-9a-f]{6}$/i.test(c.couleur || '') ? c.couleur : '#5A6774';
    const sel = (window.jbBloc || (cur && cur.nom)) === c.nom;
    const g = svg.append('g').style('cursor', 'pointer').attr('tabindex', 0).attr('role', 'button').attr('aria-label', c.nom);
    g.append('rect').attr('x', x0 + 1).attr('y', yMeso).attr('width', Math.max(2, x1 - x0 - 2)).attr('height', 30).attr('rx', 5).style('fill', col).style('stroke', sel ? 'var(--ink)' : 'none').style('stroke-width', 2.5);
    const num = (String(c.nom).match(/Méso ([0-9]+)/) || [])[1];
    const t = g.append('text').attr('class', 'lbl-meso').attr('x', x0 + 7).attr('y', yMeso + 20).text((num ? num + ' ' : '') + jbShort(c.nom));
    let s = t.text(), w = x1 - x0 - 12; while (t.node().getComputedTextLength() > w && s.length > 2) { s = s.slice(0, -2); t.text(s + '…'); }
    if (w < 24) t.text(num || '');
    const pick = () => { window.jbBloc = c.nom; dash.draw('frise'); dash.draw('bloc'); const b = document.getElementById('bloc'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    g.on('click', pick).on('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } })
      .on('pointerenter', (ev) => show(ev, [c.nom, J.dm(c.debut) + ' → ' + J.dm(c.fin), 'Touche pour voir le détail'])).on('pointerleave', hide);
  });

  // Vacances
  const notes = nt.status === 'ok' ? nt.data : [];
  for (const n of notes) if (n.type === 'availability' && !n.duree_s && n.fin && n.fin > n.debut) svg.append('rect').attr('x', x(P(n.debut))).attr('y', yTop - 6).attr('width', Math.max(3, x(P(J.add(n.fin, 1))) - x(P(n.debut)))).attr('height', yBase - yTop + 6).style('fill', 'var(--vert)').style('opacity', 0.12);

  // Profil : CTL réalisée puis prévue
  const real = ch.status === 'ok' ? ch.data.filter((r) => r.ctl != null && r.date >= J.S0 && r.date <= J.today) : [];
  const plan = cp.status === 'ok' ? cp.data.filter((r) => r.ctl != null && r.date > J.today) : [];
  const ymax = Math.max(100, d3.max(real.concat(plan), (r) => r.ctl) || 0) * 1.08;
  const y = d3.scaleLinear().domain([0, ymax]).range([yBase, yTop]);
  [25, 50, 75, 100].filter((v) => v < ymax).forEach((v) => { svg.append('line').attr('x1', L).attr('x2', W - R).attr('y1', y(v)).attr('y2', y(v)).style('stroke', 'var(--line)').style('opacity', 0.7); svg.append('text').attr('x', W - R).attr('y', y(v) - 3).attr('text-anchor', 'end').style('font-size', '11px').text('CTL ' + v); });
  const area = d3.area().x((r) => x(P(r.date))).y0(yBase).y1((r) => y(r.ctl)).curve(d3.curveMonotoneX);
  const line = d3.line().x((r) => x(P(r.date))).y((r) => y(r.ctl)).curve(d3.curveMonotoneX);
  if (plan.length) { const pp = (real.length ? [real[real.length - 1]] : []).concat(plan); svg.append('path').datum(pp).attr('d', area).style('fill', 'var(--route)').style('opacity', 0.07); svg.append('path').datum(pp).attr('d', line).style('fill', 'none').style('stroke', 'var(--route)').style('stroke-width', 2).style('stroke-dasharray', '5 4').style('opacity', 0.8); }
  if (real.length > 1) { svg.append('path').datum(real).attr('d', area).style('fill', 'url(#gProfil)'); svg.append('path').datum(real).attr('d', line).style('fill', 'none').style('stroke', 'var(--route)').style('stroke-width', 3); }
  svg.append('line').attr('x1', L).attr('x2', W - R).attr('y1', yBase).attr('y2', yBase).style('stroke', 'var(--ink)').style('stroke-width', 1.5);

  // Tests (points sur la ligne de base)
  const tests = pv.status === 'ok' ? pv.data.filter((p) => /TST-|^Test/i.test(p.nom || '')) : [];
  svg.selectAll('circle.test').data(tests).join('circle').attr('cx', (p) => x(P(p.date))).attr('cy', yBase).attr('r', 4).style('fill', 'var(--card)').style('stroke', 'var(--muted)').style('stroke-width', 2)
    .on('pointerenter pointerdown', (ev, p) => show(ev, [p.nom, J.day(p.date)])).on('pointerleave', hide);

  // Drapeaux : A, B, C et week-ends chocs
  const st = jbStatus();
  const flags = [];
  for (const o of ob.status === 'ok' ? ob.data : []) {
    const s = st[o.etiquette] ? st[o.etiquette].nom : '';
    if (o.type === 'a') flags.push({ d: o.date, k: 'a', t: o.code || 'A', n: o.nom, s, km: o.km, dp: o.dplus });
    else if (o.type === 'b') flags.push({ d: o.date, k: 'b', t: 'B', n: o.nom, s, km: o.km, dp: o.dplus });
    else if (o.code === 'C') flags.push({ d: o.date, k: 'c', t: 'C', n: o.nom, s, km: o.km, dp: o.dplus });
  }
  for (const n of notes) {
    if (n.type === 'goal' || /^C · /.test(n.nom || '')) flags.push({ d: n.debut, k: 'c', t: 'C', n: String(n.nom).replace(/^C · /, ''), s: '' });
    else if (/^Week-end choc/i.test(n.nom || '')) flags.push({ d: n.debut, k: 'w', t: 'W', n: n.nom, s: '' });
  }
  const H_ = { a: yTop - 8, b: yTop + 40, c: yTop + 82, w: yTop + 100 };
  const COL = { a: 'var(--jaune)', b: 'var(--vert)', c: 'var(--pois)', w: 'var(--pois)' };
  flags.sort((p, q) => ({ w: 0, c: 1, b: 2, a: 3 }[p.k] - { w: 0, c: 1, b: 2, a: 3 }[q.k]));
  for (const f of flags) {
    const fx = x(P(f.d)), top = H_[f.k];
    const g = svg.append('g').style('cursor', 'default');
    g.append('line').attr('x1', fx).attr('x2', fx).attr('y1', yBase).attr('y2', top).style('stroke', 'var(--ink)').style('stroke-width', f.k === 'a' ? 1.6 : 1).style('opacity', f.s === 'Sélection requise' ? 0.5 : 0.85);
    if (f.k === 'w') g.append('path').attr('d', `M${fx},${top} l9,4 l-9,4 z`).style('fill', 'var(--card)').style('stroke', 'var(--pois)').style('stroke-width', 1.5);
    else g.append('path').attr('d', `M${fx},${top} l${f.k === 'a' ? 20 : 14},${f.k === 'a' ? 7 : 5} l-${f.k === 'a' ? 20 : 14},${f.k === 'a' ? 7 : 5} z`).style('fill', COL[f.k]).style('stroke', f.s === 'Sélection requise' ? 'var(--ink)' : 'none').style('stroke-dasharray', '2 2');
    if (f.k === 'a') {
      const nextA = flags.filter((q) => q.k === 'a' && q.d > f.d).map((q) => x(P(q.d))).sort((p, q) => p - q)[0];
      const room = (nextA != null ? nextA : W - R) - fx - 30;
      const t = g.append('text').attr('class', 'lbl-strong').attr('x', fx + 24).attr('y', top + 12);
      let s = f.t + ' · ' + f.n.replace(/^Championnats du monde UCI /, 'Mondial '); t.text(s);
      while (t.node().getComputedTextLength() > room && s.length > 4) { s = s.slice(0, -2); t.text(s + '…'); }
    }
    g.append('rect').attr('x', fx - 6).attr('y', top - 2).attr('width', 26).attr('height', yBase - top + 2).style('fill', 'transparent')
      .on('pointerenter pointerdown', (ev) => show(ev, [(f.k === 'w' ? '' : f.t + ' · ') + f.n, J.day(f.d) + ' · ' + J.jx(f.d)].concat(f.km ? [J.num(f.km) + ' km' + (f.dp ? ' · ' + J.num(f.dp) + ' m D+' : '')] : []).concat(f.s ? [f.s] : []))).on('pointerleave', hide);
  }

  // Aujourd'hui et le cycliste
  const tx = x(P(J.today));
  svg.append('line').attr('x1', tx).attr('x2', tx).attr('y1', yMacro - 4).attr('y2', yBase + 22).style('stroke', 'var(--ink)').style('stroke-width', 1.5);
  svg.append('text').attr('x', tx).attr('y', yBase + 36).attr('text-anchor', 'middle').style('font-weight', 600).style('fill', 'var(--ink)').text('aujourd’hui');
  const last = real[real.length - 1];
  if (last) svg.append('g').attr('transform', `translate(${tx - 15},${y(last.ctl) - 24})`).html(window.jbRiderSVG());
  // Fin de la saison
  svg.append('text').attr('x', W - R).attr('y', yBase + 36).attr('text-anchor', 'end').text('fin de saison 31/10/2027');
  el.appendChild(tip);
  // centre la vue sur aujourd'hui (mobile)
  const sc = el.closest('.frise-scroll'); if (sc && sc.scrollLeft === 0 && sc.clientWidth < W) sc.scrollLeft = Math.max(0, tx - sc.clientWidth * 0.35);
});

/* Petit cycliste stylisé (générique) : 30 × 24 */
window.jbRiderSVG = (col) => {
  const c = col || 'var(--ink)';
  return `<g fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="18" r="5" fill="var(--card)"/><circle cx="24" cy="18" r="5" fill="var(--card)"/>
    <path d="M6 18 L12 10 L20 10 L24 18 M12 10 L15 18 L20 10 M10 8 H14 M20 10 L19 7 H22"/>
    <path d="M15 18 L13 12 L17 6.5 L21 8" stroke="var(--jaune)" stroke-width="2.6"/>
  </g><circle cx="18.5" cy="3.6" r="2.6" fill="var(--jaune)" stroke="${c}" stroke-width="1.2"/>`;
};

/* ---------- Chiffres du jour ---------- */
dash.draw('today-label', (el) => { el.textContent = J.wd(J.today, true) + ' ' + Number(J.today.slice(8, 10)) + ' ' + new Date(J.today + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' }); });

dash.draw('signs', (el) => {
  const r = dash.data('resume'), w = dash.data('semaines'), v = dash.data('vfc'), wk = dash.data('wkg');
  if (J.wait(el, r)) return;
  el.replaceChildren();
  const d = r.data[0] || {};
  const sign = (label, val, unit, sub, cls, meter) => {
    const s = J.el('div', 'sign'); s.appendChild(J.el('div', 'sign-l', label));
    const v = J.el('div', 'sign-v' + (cls ? ' ' + cls : ''), val); if (unit) v.appendChild(J.el('small', null, unit)); s.appendChild(v);
    if (sub) s.appendChild(J.el('div', 'sign-s', sub));
    if (meter != null) { const m = J.el('div', 'meter'); const i = J.el('i'); i.style.width = Math.max(0, Math.min(100, meter)) + '%'; m.appendChild(i); s.appendChild(m); }
    el.appendChild(s);
  };
  const tsb = d.tsb;
  const tsbTxt = tsb == null ? '' : tsb < -20 ? 'grosse fatigue, récupère' : tsb < -10 ? 'fatigue de travail' : tsb < 5 ? 'équilibre' : tsb < 20 ? 'frais' : 'très frais';
  sign('Forme (CTL)', J.num(d.ctl), null, 'fatigue (ATL) ' + J.num(d.atl));
  sign('Fraîcheur (TSB)', J.signed(tsb), null, tsbTxt, tsb == null ? '' : tsb < -20 ? 'bad' : tsb < -10 ? 'warn' : 'ok');
  const lastWkg = wk.status === 'ok' && wk.data.length ? wk.data[wk.data.length - 1].wkg : null;
  sign('CP', J.num(d.cp), 'W', (lastWkg ? J.num(lastWkg, 2) + ' W/kg · ' : '') + 'test du ' + J.dm(d.cp_date));
  sign('PMA', J.num(d.pma), 'W', 'test du ' + J.dm(d.pma_date));
  if (w.status === 'ok') {
    const cw = w.data.find((x) => x.lundi === J.mon(J.today));
    if (cw) { const tgt = cw.cible != null ? cw.cible : cw.prevu; sign('Cette semaine', J.num(cw.realise), '/' + J.num(tgt), 'TSS faits sur ' + (cw.cible != null ? 'la cible du bloc' : 'le prévu'), null, tgt ? cw.realise / tgt * 100 : 0); }
  }
  if (v.status === 'ok' && v.data.length) { const lv = v.data[v.data.length - 1]; sign('VFC du matin', J.num(lv.rmssd), 'ms', 'FC repos ' + J.num(lv.fcrepos) + ' bpm · ' + J.dm(lv.date)); }
});

/* ---------- Compte à rebours (dossards) ---------- */
dash.draw('bibs', (el) => {
  const ob = dash.data('objectifs');
  if (J.wait(el, ob)) return;
  el.replaceChildren();
  const st = jbStatus();
  const a = ob.data.filter((o) => o.type === 'a' && o.date >= J.today).sort((p, q) => (p.date < q.date ? -1 : 1));
  const nb = ob.data.filter((o) => o.type === 'b' && o.date >= J.today).sort((p, q) => (p.date < q.date ? -1 : 1))[0];
  const list = a.concat(nb ? [nb] : []).sort((p, q) => ((p.code || 'Z') < (q.code || 'Z') ? -1 : 1));
  if (!list.length) { el.appendChild(J.el('div', 'sub', 'Aucun objectif à venir.')); return; }
  for (const o of list) {
    const s = st[o.etiquette] ? st[o.etiquette].nom : '';
    const b = J.el('article', 'bib' + (o.type === 'b' ? ' b' : '') + (s === 'Sélection requise' ? ' cond' : ''));
    b.appendChild(J.el('div', 'bib-code', (o.type === 'b' ? 'Prochain B' : 'Objectif ' + o.code) + (s === 'Sélection requise' ? ' · si sélection' : '')));
    const n = J.el('div', 'bib-num', String(J.diff(J.today, o.date))); n.appendChild(J.el('small', null, 'jours')); b.appendChild(n);
    b.appendChild(J.el('div', 'bib-name', o.nom));
    b.appendChild(J.el('div', 'bib-date', J.wd(o.date, true) + ' ' + J.dm(o.date) + (o.km ? ' · ' + J.num(o.km) + ' km' : '') + (o.dplus ? ' · ' + J.num(o.dplus) + ' m D+' : '')));
    b.appendChild(J.el('div', 'bib-band'));
    el.appendChild(b);
  }
});

/* ---------- 14 prochains jours ---------- */
dash.draw('days14', (el) => {
  const pv = dash.data('prevu'), nt = dash.data('notes'), ob = dash.data('objectifs'), s7 = dash.data('seances7');
  if (J.wait(el, pv)) return;
  el.replaceChildren();
  const grid = J.el('div', 'days');
  const moments = {}; if (s7.status === 'ok') for (const s of s7.data) moments[s.id] = s.moment;
  const MOM = { morning: 'matin', noon: 'midi', afternoon: 'après-midi', evening: 'soir' };
  for (let i = 0; i < 14; i++) {
    const d = J.add(J.today, i);
    const ses = pv.data.filter((p) => p.date === d);
    const races = ob.status === 'ok' ? ob.data.filter((o) => o.date === d) : [];
    const ns = nt.status === 'ok' ? nt.data.filter((n) => n.debut <= d && (n.fin || n.debut) >= d) : [];
    const box = J.el('div', 'day' + (i === 0 ? ' today' : '') + (!ses.length && !races.length ? ' off' : ''));
    const h = J.el('div', 'day-h'); h.append(J.el('span', null, i === 0 ? 'aujourd’hui' : i === 1 ? 'demain' : J.wd(d)), J.el('b', null, String(Number(d.slice(8, 10))))); box.appendChild(h);
    const mt = J.meteo && J.meteo(d); if (mt) box.appendChild(J.el('div', 'wx', mt));
    for (const r of races) { const p = J.el('span', 'pill race'); p.append(J.el('b', null, r.nom), document.createTextNode(r.type ? r.type.toUpperCase() : 'course')); box.appendChild(p); }
    for (const n of ns) {
      const choc = /^Week-end choc/i.test(n.nom || '');
      if (!choc && !(n.type === 'availability' || n.type === 'goal' || /^C · /.test(n.nom || ''))) continue;
      const p = J.el('span', 'pill ' + (choc || n.type === 'goal' ? 'choc' : 'note')); p.append(J.el('b', null, n.nom), document.createTextNode(n.duree_s ? 'dispo ' + J.dur(n.duree_s / 60) : n.type === 'availability' ? 'indisponibilité ou dispo' : '')); box.appendChild(p);
    }
    for (const s of ses) {
      const p = J.el('span', 'pill' + (s.sport === 'spt_vxmhSsLPpMbXD21' ? ' renfo' : J.bike(s.sport) ? '' : ' autre'));
      p.append(J.el('b', null, s.nom), document.createTextNode(J.sport(s.sport) + ' · ' + J.dur(s.duree_min) + (s.tss != null ? ' · ' + Math.round(s.tss) + ' TSS' : '') + (MOM[moments[s.id]] ? ' · ' + MOM[moments[s.id]] : '')));
      p.title = s.nom; box.appendChild(p);
    }
    grid.appendChild(box);
  }
  el.appendChild(grid);
});

/* ---------- Bloc en cours (ou choisi dans la frise) ---------- */
dash.draw('bloc', (el) => {
  const cy = dash.data('cycles'), se = dash.data('semaines'), ms = dash.data('mesos'), mc = dash.data('macros'), rl = dash.data('reel');
  if (J.wait(el, cy)) return;
  el.replaceChildren();
  el.id = 'bloc';
  const cur = jbCurMeso();
  const c = cy.data.find((x) => x.nom === window.jbBloc) || cur || cy.data[0];
  if (!c) return;
  const isCur = cur && cur.nom === c.nom;
  const top = J.el('div', 'bloc-top');
  const h = J.el('h2', null, c.nom); h.id = 't-bloc'; h.style.color = 'inherit';
  const left = J.el('div'); left.append(h, J.el('div', 'sub', J.dm(c.debut) + ' → ' + J.dm(c.fin) + (isCur ? ' · bloc en cours' : c.fin < J.today ? ' · bloc terminé' : ' · commence ' + J.jx(c.debut))));
  top.appendChild(left);
  if (!isCur && cur) { const b = J.el('button', 'chipbtn', 'Revenir au bloc en cours'); b.type = 'button'; b.addEventListener('click', () => { window.jbBloc = null; dash.draw('frise'); dash.draw('bloc'); }); top.appendChild(b); }
  el.appendChild(top);
  const col = /^#[0-9a-f]{6}$/i.test(c.couleur || '') ? c.couleur : 'var(--route)';
  el.style.borderTop = '6px solid ' + col;

  const num = Number((String(c.nom).match(/Méso ([0-9]+)/) || [])[1]);
  const q = ms.status === 'ok' ? ms.data.find((x) => x.num === num) : null;
  const m = mc.status === 'ok' ? mc.data.find((x) => x.debut <= c.debut && x.fin >= c.debut) : null;
  const ctx = [];
  if (m) ctx.push('Macro ' + m.num + ' · ' + m.nom);
  if (q) ctx.push('Qualités : ' + q.qualites, 'Type de charge : ' + q.charge);
  if (ctx.length) { const p = J.el('p', 'lede'); p.style.marginTop = '8px'; p.textContent = ctx.join('. ') + '.'; el.appendChild(p); }

  // Semaines du bloc
  const weeks = se.status === 'ok' ? se.data.filter((w) => w.lundi >= J.mon(c.debut) && w.lundi <= (c.fin || c.debut)) : [];
  if (weeks.length) {
    const bar = J.el('div', 'weeks');
    const nowW = J.mon(J.today);
    for (const w of weeks) { const s = J.el('span', w.lundi < nowW ? 'done' : w.lundi === nowW ? 'now' : ''); s.title = 'Semaine du ' + J.dm(w.lundi) + ' : cible ' + (w.cible ?? '—') + ', prévu ' + w.prevu + ', réalisé ' + w.realise + ' TSS'; bar.appendChild(s); }
    el.appendChild(bar);
    const i = weeks.findIndex((w) => w.lundi === nowW);
    el.appendChild(J.el('div', 'sub', i >= 0 ? 'Semaine ' + (i + 1) + ' sur ' + weeks.length : weeks.length + ' semaines'));
  }

  // Description : objectifs, texte, charge par semaine, progression
  const lines = String(c.description || '').split(String.fromCharCode(10)).map((l) => l.trim()).filter(Boolean);
  const objs = [], prose = [], prog = []; let mode = 'prose', charge = '';
  for (const l of lines) {
    if (/^Objectifs du bloc/i.test(l)) { mode = 'obj'; continue; }
    if (/^Charge par semaine/i.test(l)) { charge = l; mode = 'prose'; continue; }
    if (/^Progression/i.test(l)) { mode = 'prog'; continue; }
    if (mode === 'obj' && /[.]$/.test(l)) mode = 'prose';
    (mode === 'obj' ? objs : mode === 'prog' ? prog : prose).push(l);
  }
  const g2 = J.el('div', 'grid2'); g2.style.marginTop = '14px';
  const a = J.el('div');
  if (prose.length) for (const p of prose) { const e = J.el('p', null, p); e.style.margin = '0 0 8px'; a.appendChild(e); }
  if (objs.length) { a.appendChild(J.el('h3', null, 'Objectifs du bloc')); const ul = J.el('ul', 'checks'); for (const o of objs) ul.appendChild(J.el('li', null, o.charAt(0).toUpperCase() + o.slice(1))); a.appendChild(ul); }
  if (prog.length) { const h3 = J.el('h3', null, 'Progression des séances'); h3.style.marginTop = '14px'; a.appendChild(h3); const ul = J.el('ul', 'prog'); for (const p of prog) ul.appendChild(J.el('li', null, p)); a.appendChild(ul); }
  g2.appendChild(a);
  const b = J.el('div');
  if (weeks.length) {
    b.appendChild(J.el('h3', null, 'Charge par semaine'));
    const tb = J.el('table'); tb.style.cssText = 'width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums';
    const tr0 = J.el('tr'); for (const t of ['Semaine', 'Cible', 'Prévu', 'Réalisé']) { const th = J.el('th', null, t); th.style.cssText = 'text-align:' + (t === 'Semaine' ? 'left' : 'right') + ';font-weight:600;color:var(--muted);padding:4px 0;border-bottom:1px solid var(--line)'; tr0.appendChild(th); }
    tb.appendChild(tr0);
    for (const w of weeks) {
      const tr = J.el('tr'); const past = w.lundi < J.mon(J.today);
      const pct = w.cible ? w.realise / w.cible : null;
      for (const [k, v] of [['s', 'du ' + J.dm(w.lundi)], ['c', w.cible != null ? J.num(w.cible) : '—'], ['p', J.num(w.prevu)], ['r', past || w.lundi === J.mon(J.today) ? J.num(w.realise) : '—']]) {
        const td = J.el('td', null, v); td.style.cssText = 'padding:5px 0;border-bottom:1px solid var(--line);text-align:' + (k === 's' ? 'left' : 'right');
        if (k === 'r' && past && pct != null) td.className = pct >= 0.9 ? 'ok' : pct >= 0.7 ? 'warn' : 'bad';
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    }
    b.appendChild(tb);
  } else if (charge) b.appendChild(J.el('p', 'sub', charge));
  // Intensités du bloc
  const tot = [0, 0, 0, 0, 0, 0, 0]; let n = 0;
  if (rl.status === 'ok') for (const r of rl.data) { if (r.date < c.debut || r.date > (c.fin || c.debut) || !r.zones) continue; const s = String(r.zones).split(';').map(Number); if (s.length !== 7) continue; n++; s.forEach((v, i) => { tot[i] += v || 0; }); }
  const h3 = J.el('h3', null, 'Intensités du bloc'); h3.style.marginTop = '16px'; b.appendChild(h3);
  if (n) { b.appendChild(J.el('div', 'sub', n + ' séances avec puissance · ' + J.num(tot.reduce((x, y) => x + y, 0) / 3600, 1) + ' h')); J.zbar(b, tot, true); }
  else b.appendChild(J.el('div', 'sub', c.debut > J.today ? 'Le bloc n’a pas encore commencé.' : 'Pas encore de séance avec puissance dans ce bloc.'));
  g2.appendChild(b);
  el.appendChild(g2);
});

/* ---------- Charge par semaine ---------- */
window.jbWMode = 'bloc';
for (const b of document.querySelectorAll('.wmode')) {
  b.addEventListener('click', () => {
    window.jbWMode = b.dataset.mode;
    for (const o of document.querySelectorAll('.wmode')) o.setAttribute('aria-pressed', String(o === b));
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
dash.draw('wtitle', (el) => { const w = window.jbWeeksWindow(); el.textContent = w ? w.titre : ''; });
dash.draw('weeks', (el) => {
  const d = dash.data('semaines'), vol = dash.data('volume');
  if (J.wait(el, d)) return;
  const win = window.jbWeeksWindow(); if (!win) { el.textContent = '—'; return; }
  el.textContent = '';
  const vb = {}; if (vol.status === 'ok') for (const v of vol.data) vb[v.lundi] = v;
  const rows = win.rows, cur = J.mon(J.today);
  const W = Math.max(el.clientWidth, 280), H = 250, m = { t: 22, r: 6, b: 34, l: 36 };
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'TSS prévu et réalisé par semaine, avec la cible du mésocycle');
  const x = d3.scaleBand().domain(rows.map((r) => r.lundi)).range([m.l, W - m.r]).padding(0.18);
  const ymax = d3.max(rows, (r) => Math.max(r.prevu, r.realise, r.cible || 0)) || 100;
  const y = d3.scaleLinear().domain([0, ymax * 1.08]).nice().range([H - m.b, m.t]);
  const g = svg.append('g'), bw = x.bandwidth(), st = x.step(), off = st * x.paddingInner() / 2;
  g.selectAll('line.gr').data(y.ticks(4)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', (v) => y(v)).attr('y2', (v) => y(v)).style('stroke', 'var(--line)');
  g.selectAll('text.yt').data(y.ticks(4)).join('text').attr('x', m.l - 4).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').text((v) => v);
  g.selectAll('rect.vac').data(rows.filter((r) => r.vacances)).join('rect').attr('x', (r) => x(r.lundi) - off).attr('width', st + 0.5).attr('y', m.t - 14).attr('height', H - m.b - m.t + 14).style('fill', 'var(--vert)').style('opacity', 0.14);
  if (rows.some((r) => r.lundi === cur)) g.append('rect').attr('x', x(cur) - off).attr('y', m.t - 14).attr('width', st).attr('height', H - m.b - m.t + 14).style('fill', 'var(--soft)').style('opacity', 0.9);
  g.selectAll('rect.cyc').data(rows).join('rect').attr('x', (r) => x(r.lundi) - off).attr('width', st + 0.5).attr('y', H - m.b + 2).attr('height', 5).style('fill', (r) => r.couleur || 'transparent');
  g.selectAll('rect.pl').data(rows).join('rect').attr('x', (r) => x(r.lundi)).attr('width', bw).attr('y', (r) => y(r.prevu)).attr('height', (r) => y(0) - y(r.prevu)).attr('rx', 2).style('fill', 'var(--soft)').style('stroke', 'var(--muted)').style('stroke-width', 1);
  const ins = bw > 10 ? bw * 0.18 : 0;
  g.selectAll('rect.re').data(rows).join('rect').attr('x', (r) => x(r.lundi) + ins).attr('width', bw - 2 * ins).attr('y', (r) => y(r.realise)).attr('height', (r) => y(0) - y(r.realise)).attr('rx', 2).style('fill', 'var(--c0)');
  g.selectAll('line.tg').data(rows.filter((r) => r.cible != null)).join('line').attr('x1', (r) => x(r.lundi) - 2).attr('x2', (r) => x(r.lundi) + bw + 2).attr('y1', (r) => y(r.cible)).attr('y2', (r) => y(r.cible)).style('stroke', 'var(--ink)').style('stroke-width', 2).style('stroke-dasharray', '4 3');
  g.selectAll('text.ob').data(rows.filter((r) => r.objectif)).join('text').attr('x', (r) => x(r.lundi) + bw / 2).attr('y', m.t - 6).attr('text-anchor', 'middle').style('font-weight', 600).style('fill', 'var(--ink)').text((r) => Array.from(new Set(r.objectif.split(' · ').map((s) => s.slice(0, 1)))).join(st < 14 ? '' : '+'));
  const step = Math.max(1, Math.ceil(42 / st));
  const lab = rows.filter((r, i) => (window.jbWMode === 'saison' ? r.lundi.slice(8, 10) <= '07' : i % step === 0));
  g.selectAll('text.xt').data(lab).join('text').attr('x', (r) => x(r.lundi) + bw / 2).attr('y', H - m.b + 20).attr('text-anchor', 'middle').text((r) => (window.jbWMode === 'saison' ? J.mshort(r.lundi) : J.dm(r.lundi)));
  const tip = J.el('div', 'tip'); tip.hidden = true; el.appendChild(tip);
  const show = (ev, r) => {
    tip.replaceChildren(J.el('b', null, 'Semaine du ' + J.dm(r.lundi)));
    const v = vb[r.lundi];
    const lines = [['Prévu', r.prevu + ' TSS'], ['Réalisé', r.realise + ' TSS' + (r.cible ? ' (' + Math.round(r.realise / r.cible * 100) + ' % de la cible)' : '')], ['Cible', r.cible != null ? r.cible + ' TSS' : '—'], ['Bloc', r.cycle || '—']];
    if (v) lines.push(['Volume', J.num(v.heures, 1) + ' h' + (v.km ? ' · ' + J.num(v.km) + ' km' : '') + (v.dplus ? ' · ' + J.num(v.dplus) + ' m D+' : '')]);
    if (r.objectif) for (const o of r.objectif.split(' · ')) lines.push([o[0] === 'W' ? 'Week-end choc' : 'Objectif ' + o[0], o.slice(2).replace(/^Week-end choc · /, '')]);
    if (r.vacances) lines.push(['Vacances', r.vacances]);
    for (const [k, val] of lines) tip.appendChild(J.el('div', null, k + ' : ' + val));
    J.tipAt(tip, el, ev, 200);
  };
  g.selectAll('rect.hit').data(rows).join('rect').attr('x', (r) => x(r.lundi) - off).attr('width', st).attr('y', m.t - 14).attr('height', H - m.b - m.t + 14).style('fill', 'transparent').style('cursor', 'pointer')
    .on('pointerenter', show).on('pointerdown', show).on('pointerleave', () => { tip.hidden = true; });
});
