/* Page « Courses » : la saison des courses en un coup d'œil, des filtres, le calendrier semaine par semaine
   (avec les trous entre les courses), puis les objectifs de préparation (C et week-ends chocs). */

/* Tous les événements de la page, rangés par genre */
dash.calc('evenements', {
  title: 'Courses et objectifs de préparation',
  description: 'Courses (objectifs A et B, C qui sont des courses, challenges, autres courses) avec leur statut, et objectifs de préparation (notes C et week-ends chocs).',
  inputs: ['objectifs', 'notes', 'statuts'],
  fn: (objectifs, notes, statuts) => {
    const tag = {}; for (const s of statuts) tag[s.id] = s;
    const out = [];
    for (const o of objectifs) {
      const t = tag[o.etiquette] || {};
      const h = String(o.entete || '').toUpperCase();
      let kind = 'course', role = '';
      if (o.type === 'a') { kind = 'ab'; role = o.code || 'A'; }
      else if (o.type === 'b') { kind = 'ab'; role = 'B'; }
      else if (h.startsWith('CHALLENGE')) { kind = 'challenge'; role = 'Challenge'; }
      else if (o.code === 'C' || h.includes('OBJECTIF C')) role = 'C';
      else if (/^C (CANDIDATE|POSSIBLE|PARTIELLE)/.test(h)) role = 'C possible';
      out.push({ id: o.id, debut: o.date, fin: o.date, nom: o.nom, kind, role, statut: t.nom || '', couleur: /^#[0-9a-f]{6}$/i.test(t.couleur || '') ? t.couleur : '', km: o.km, dplus: o.dplus, texte: o.texte || '' });
    }
    for (const n of notes) {
      if (n.type === 'goal' || /^C · /.test(n.nom || '')) out.push({ id: n.id, debut: n.debut, fin: n.fin || n.debut, nom: String(n.nom).replace(/^C · /, ''), kind: 'prep', role: 'C', statut: '', couleur: '', km: null, dplus: null, texte: n.texte || '' });
      else if (/^Week-end choc/i.test(n.nom || '')) out.push({ id: n.id, debut: n.debut, fin: n.fin || n.debut, nom: String(n.nom).replace(/^Week-end choc[ ]*/, 'Week-end choc '), kind: 'choc', role: 'Week-end choc', statut: '', couleur: '', km: null, dplus: null, texte: n.texte || '' });
    }
    return out.sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  }
});

/* Filtres */
const JB_STATUTS = ['Gardée', 'À décider', 'En attente', 'Sélection requise', 'Refusée'];
const JB_TYPES = [['ab', 'Objectifs A et B'], ['course', 'Autres courses'], ['challenge', 'Challenges'], ['choc', 'Week-ends chocs'], ['prep', 'Objectifs de préparation'], ['meso', 'Mésocycles']];
window.jbF = window.jbF || { statuts: new Set(['Gardée', 'À décider', 'En attente', 'Sélection requise']), types: new Set(JB_TYPES.map((t) => t[0])), passe: false };

const jbVisible = (e) => {
  const F = window.jbF;
  if (!F.types.has(e.kind)) return false;
  if ((e.kind === 'ab' || e.kind === 'course' || e.kind === 'challenge') && e.statut && !F.statuts.has(e.statut)) return false;
  return true;
};
const jbRaceKind = (e) => e.kind === 'ab' || e.kind === 'course' || e.kind === 'challenge';
const jbRoleCls = (e) => (/^A/.test(e.role) ? 'a' : e.role === 'B' ? 'b' : e.role === 'C' ? 'c' : e.kind === 'challenge' ? 'ch' : e.kind === 'choc' ? 'choc' : '');
const jbRedraw = () => { for (const n of ['cfilters', 'cstrip', 'cweeks', 'cprep']) dash.draw(n); };

dash.draw('cfilters', (el) => {
  const d = dash.data('evenements');
  if (J.wait(el, d)) return;
  el.replaceChildren();
  const F = window.jbF;
  const row = (label, items) => { const r = J.el('div', 'fl-row'); r.appendChild(J.el('span', 'fl-l', label)); const box = J.el('div', 'filters'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', label); for (const it of items) box.appendChild(it); r.appendChild(box); el.appendChild(r); };
  const chip = (txt, on, click, color) => { const b = J.el('button', 'chipbtn', txt); b.type = 'button'; b.setAttribute('aria-pressed', String(on)); if (color) { const s = J.el('i', 'dot'); s.style.background = color; b.prepend(s); } b.addEventListener('click', click); return b; };
  const st = {}; const sd = dash.data('statuts'); if (sd.status === 'ok') for (const s of sd.data) st[s.nom] = s.couleur;
  const cnt = (s) => d.data.filter((e) => jbRaceKind(e) && e.statut === s && (F.passe || e.debut >= J.today)).length;
  row('Statut', JB_STATUTS.map((s) => chip(s + ' · ' + cnt(s), F.statuts.has(s), () => { F.statuts.has(s) ? F.statuts.delete(s) : F.statuts.add(s); jbRedraw(); }, st[s])));
  row('Afficher', JB_TYPES.map(([k, l]) => chip(l, F.types.has(k), () => { F.types.has(k) ? F.types.delete(k) : F.types.add(k); jbRedraw(); })));
  const p = chip('Afficher le passé', F.passe, () => { F.passe = !F.passe; jbRedraw(); });
  row('Période', [p]);
});

/* La saison en un coup d'œil : trois lignes (objectifs, courses, préparation) et les trous */
dash.draw('cstrip', (el) => {
  const d = dash.data('evenements'), cy = dash.data('cycles');
  if (J.wait(el, d)) return;
  el.textContent = '';
  const F = window.jbF;
  const from = F.passe ? J.S0 : J.mon(J.today);
  const ev = d.data.filter((e) => jbVisible(e) && (e.fin || e.debut) >= from);
  const W = Math.max(el.clientWidth, 900), L = 92, R = 14, H = 196;
  const P = (s) => new Date(s + 'T12:00:00Z');
  const x = d3.scaleUtc().domain([P(from), P(J.S1)]).range([L, W - R]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Courses de la saison sur une ligne de temps, avec les trous entre les courses');
  const yM = 22, yA = 70, yC = 112, yP = 152;
  const tip = J.el('div', 'tip'); tip.hidden = true;
  const show = (e2, lines) => { tip.replaceChildren(J.el('b', null, lines[0])); for (const l of lines.slice(1)) tip.appendChild(J.el('div', null, l)); J.tipAt(tip, el, e2, 230); };
  const hide = () => { tip.hidden = true; };
  // mois
  const months = d3.utcMonth.range(d3.utcMonth.ceil(P(from)), P(J.S1));
  svg.selectAll('line.m').data(months).join('line').attr('x1', (m) => x(m)).attr('x2', (m) => x(m)).attr('y1', 8).attr('y2', H - 8).style('stroke', 'var(--line)').style('stroke-dasharray', '2 4');
  svg.selectAll('text.m').data(months).join('text').attr('x', (m) => x(m) + 4).attr('y', 12).text((m) => m.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '') + (m.getUTCMonth() === 0 ? ' ' + m.getUTCFullYear() : ''));
  // lignes
  for (const [y, t] of [[yA, 'Objectifs'], [yC, 'Courses'], [yP, 'Préparation']]) {
    svg.append('line').attr('x1', L).attr('x2', W - R).attr('y1', y).attr('y2', y).style('stroke', 'var(--line)').style('stroke-width', 1.5);
    svg.append('text').attr('x', 6).attr('y', y + 4).attr('class', 'lane-l').text(t);
  }
  // mésocycles
  if (F.types.has('meso') && cy.status === 'ok') for (const c of cy.data) {
    if ((c.fin || c.debut) < from) continue;
    const x0 = x(P(c.debut < from ? from : c.debut)), x1 = x(P(J.add(c.fin || c.debut, 1)));
    const num = (String(c.nom).match(/Méso ([0-9]+)/) || [])[1] || '';
    const g = svg.append('g');
    g.append('rect').attr('x', x0 + 0.5).attr('y', yM).attr('width', Math.max(1, x1 - x0 - 1)).attr('height', 16).attr('rx', 3).style('fill', /^#[0-9a-f]{6}$/i.test(c.couleur || '') ? c.couleur : 'var(--muted)');
    if (x1 - x0 > 16) g.append('text').attr('x', x0 + 5).attr('y', yM + 12).attr('class', 'meso-l').text(num);
    g.on('pointerenter pointerdown', (e2) => show(e2, [c.nom, J.dm(c.debut) + ' → ' + J.dm(c.fin)])).on('pointerleave', hide);
  }
  svg.append('text').attr('x', 6).attr('y', yM + 12).attr('class', 'lane-l').text(F.types.has('meso') ? 'Mésocycles' : '');
  // trous entre les courses (5 semaines ou plus sans course)
  const races = ev.filter(jbRaceKind).map((e) => e.debut).filter((v, i, a) => a.indexOf(v) === i).sort();
  const bounds = [from].concat(races);
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i], b = bounds[i + 1], days = J.diff(a, b);
    if (days >= 35) {
      const xa = x(P(a)) + (i ? 5 : 0), xb = x(P(b)) - 5;
      svg.append('rect').attr('x', xa).attr('y', yA - 16).attr('width', Math.max(0, xb - xa)).attr('height', yC - yA + 32).attr('rx', 6).style('fill', 'url(#hatch)').style('stroke', 'var(--warn)').style('stroke-dasharray', '3 3');
      svg.append('text').attr('x', (xa + xb) / 2).attr('y', (yA + yC) / 2 + 4).attr('text-anchor', 'middle').attr('class', 'gap-l').text(Math.floor(days / 7) + ' sem. sans course');
    }
  }
  const hatch = svg.append('defs').append('pattern').attr('id', 'hatch').attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
  hatch.append('rect').attr('width', 6).attr('height', 6).style('fill', 'color-mix(in srgb, var(--warn) 8%, transparent)');
  hatch.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).style('stroke', 'color-mix(in srgb, var(--warn) 35%, transparent)').style('stroke-width', 2);
  // préparation : barres sur leurs jours
  for (const e of ev.filter((e) => e.kind === 'prep' || e.kind === 'choc')) {
    const x0 = x(P(e.debut)), x1 = Math.max(x0 + 6, x(P(J.add(e.fin || e.debut, 1))));
    const g = svg.append('g');
    g.append('rect').attr('x', x0).attr('y', yP - 6).attr('width', x1 - x0).attr('height', 12).attr('rx', 3).style('fill', e.kind === 'prep' ? 'var(--pois)' : 'var(--card)').style('stroke', 'var(--pois)').style('stroke-width', 1.5);
    g.append('rect').attr('x', x0 - 4).attr('y', yP - 12).attr('width', x1 - x0 + 8).attr('height', 24).style('fill', 'transparent')
      .on('pointerenter pointerdown', (e2) => show(e2, [e.nom, e.role + ' · ' + J.dm(e.debut) + (e.fin !== e.debut ? ' → ' + J.dm(e.fin) : '') + ' · ' + J.jx(e.debut)])).on('pointerleave', hide);
  }
  // courses et objectifs
  const boxes = [];
  for (const e of ev.filter(jbRaceKind).sort((p, q) => (p.kind === 'ab') - (q.kind === 'ab'))) {
    const cx = x(P(e.debut)), ab = e.kind === 'ab', y = ab ? yA : yC;
    const g = svg.append('g').style('cursor', 'pointer');
    const fill = ab ? (/^A/.test(e.role) ? 'var(--jaune)' : 'var(--vert)') : e.kind === 'challenge' ? '#8E5BD6' : e.couleur || 'var(--muted)';
    if (e.kind === 'challenge') g.append('path').attr('d', d3.symbol(d3.symbolStar, 120)()).attr('transform', `translate(${cx},${y})`).style('fill', fill).style('stroke', 'var(--ink)').style('stroke-width', 1);
    else g.append('circle').attr('cx', cx).attr('cy', y).attr('r', ab ? (/^A/.test(e.role) ? 9 : 7) : 5.5).style('fill', fill).style('stroke', e.statut === 'Sélection requise' ? 'var(--ink)' : 'var(--card)').style('stroke-width', 1.5).style('stroke-dasharray', e.statut === 'Sélection requise' ? '2 2' : null).style('opacity', e.statut === 'Refusée' ? 0.45 : 1);
    if (ab) {
      g.append('text').attr('x', cx).attr('y', y + 3.5).attr('text-anchor', 'middle').attr('class', 'dot-l').text(e.role);
      const t = g.append('text').attr('class', 'race-l').attr('x', cx).attr('y', y - 16).attr('text-anchor', 'middle').text(e.nom.replace(/^Championnats du monde UCI /, 'Mondial ').replace(/^Crit[ée]r[iu]+m du /i, '').slice(0, 26));
      const w = t.node().getComputedTextLength() / 2 + 4;
      const box = { a: cx - w, b: cx + w };
      if (boxes.some((q) => box.a < q.b && box.b > q.a)) t.remove(); else boxes.push(box);
    }
    g.on('pointerenter pointerdown', (e2) => show(e2, [e.nom, (e.role ? e.role + ' · ' : '') + J.day(e.debut) + ' · ' + J.jx(e.debut), [e.km ? J.num(e.km) + ' km' : '', e.dplus ? J.num(e.dplus) + ' m D+' : ''].filter(Boolean).join(' · '), e.statut].filter(Boolean)))
      .on('pointerleave', hide)
      .on('click', () => { const t2 = document.getElementById('ev-' + e.id); if (t2) { t2.open = true; t2.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
  }
  const tx = x(P(J.today));
  if (tx >= L) { svg.append('line').attr('x1', tx).attr('x2', tx).attr('y1', 16).attr('y2', H - 6).style('stroke', 'var(--ink)').style('stroke-width', 1.5); }
  el.appendChild(tip);
});

/* Calendrier semaine par semaine */
const jbItem = (e, pre) => {
  const det = J.el('details', 'ci ' + (jbRoleCls(e) ? 'r-' + jbRoleCls(e) : '') + (e.statut === 'Refusée' ? ' refused' : '') + ((e.fin || e.debut) < J.today ? ' past' : ''));
  det.id = (pre || 'ev-') + e.id;
  const s = J.el('summary');
  s.appendChild(J.el('span', 'ci-d', J.wd(e.debut) + ' ' + J.dm(e.debut) + (e.fin && e.fin !== e.debut ? ' → ' + J.dm(e.fin) : '')));
  const mid = J.el('span', 'ci-m');
  mid.appendChild(J.el('span', 'ci-n', e.nom));
  const meta = J.el('span', 'ci-meta');
  if (e.role) meta.appendChild(J.el('span', 'tag ' + jbRoleCls(e), e.role));
  if (e.statut) { const t = J.el('span', 'tag', e.statut); if (e.couleur) { t.style.color = e.couleur; t.style.borderColor = e.couleur; } meta.appendChild(t); }
  const kd = [e.km ? J.num(e.km) + ' km' : '', e.dplus ? J.num(e.dplus) + ' m D+' : ''].filter(Boolean).join(' · ');
  if (kd) meta.appendChild(J.el('span', null, kd));
  mid.appendChild(meta);
  s.appendChild(mid);
  s.appendChild(J.el('span', 'ci-j', (e.fin || e.debut) < J.today ? '' : J.jx(e.debut)));
  det.appendChild(s);
  const body = J.el('div', 'ci-b');
  if ((e.fin || e.debut) >= J.today && e.statut !== 'Refusée') {
    const a = J.btn('Ajouter à mon agenda', 'cal');
    J.ics(a, { uid: e.id, debut: e.debut, fin: e.fin, titre: e.nom, texte: [kd, 'Avec ' + window.CONFIG.prenom].filter(Boolean).join(' · ') });
    const box = J.el('div', 'actions'); box.appendChild(a); body.appendChild(box);
  }
  body.appendChild(J.el('div', 'ev-text', e.texte || 'Pas de description.'));
  det.appendChild(body);
  return det;
};

dash.draw('cweeks', (el) => {
  const d = dash.data('evenements'), cy = dash.data('cycles');
  if (J.wait(el, d)) return;
  el.replaceChildren();
  const F = window.jbF;
  const from = F.passe ? J.mon(J.S0) : J.mon(J.today);
  const ev = d.data.filter((e) => jbVisible(e) && e.kind !== 'prep' && (e.fin || e.debut) >= from);
  const cycles = cy.status === 'ok' ? cy.data : [];
  const mesoOf = (w) => cycles.find((c) => c.debut <= J.add(w, 6) && (c.fin || c.debut) >= w);
  const weeks = [];
  for (let w = from; w <= J.S1; w = J.add(w, 7)) weeks.push(w);
  let empty = [], emptyItems = [], emptyMesos = [];
  const flushGap = () => {
    if (!empty.length) return;
    const n = empty.length, big = n >= 5;
    const g = J.el('div', 'gap' + (big ? ' big' : ''));
    const hd = J.el('div', 'gap-h');
    hd.appendChild(J.el('b', null, (big ? 'Trou de ' : '') + (n === 1 ? '1 semaine sans course' : n + ' semaines sans course')));
    hd.appendChild(J.el('span', null, 'du ' + J.dm(empty[0]) + ' au ' + J.dm(J.add(empty[n - 1], 6))));
    g.appendChild(hd);
    if (emptyItems.length || emptyMesos.length) {
      const l = J.el('div', 'wk-l');
      const all = emptyItems.map((e) => [e.debut, jbItem(e)]).concat(emptyMesos.map((m) => { const dv = J.el('div', 'meso-div in-gap'); dv.style.setProperty('--mc', /^#[0-9a-f]{6}$/i.test(m.couleur || '') ? m.couleur : 'var(--muted)'); dv.append(J.el('b', null, m.nom), J.el('span', null, J.dm(m.debut) + ' → ' + J.dm(m.fin))); return [m.debut, dv]; }));
      all.sort((p, q) => (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0));
      for (const [, n] of all) l.appendChild(n);
      g.appendChild(l);
    }
    el.appendChild(g);
    empty = []; emptyItems = []; emptyMesos = [];
  };
  let lastMeso = null;
  for (const w of weeks) {
    const m = mesoOf(w);
    const items = ev.filter((e) => e.debut >= w && e.debut <= J.add(w, 6));
    const races = items.filter(jbRaceKind);
    const mesoStarts = F.types.has('meso') && m && m.nom !== lastMeso && m.debut >= w && m.debut <= J.add(w, 6);
    if (m) lastMeso = m.nom;
    if (!races.length) { empty.push(w); emptyItems.push(...items); if (mesoStarts) emptyMesos.push(m); continue; }
    flushGap();
    if (mesoStarts) {
      const dv = J.el('div', 'meso-div'); dv.style.setProperty('--mc', /^#[0-9a-f]{6}$/i.test(m.couleur || '') ? m.couleur : 'var(--muted)');
      dv.append(J.el('b', null, m.nom), J.el('span', null, J.dm(m.debut) + ' → ' + J.dm(m.fin)));
      el.appendChild(dv);
    }
    const row = J.el('div', 'wk' + (w === J.mon(J.today) ? ' now' : ''));
    if (F.types.has('meso') && m) row.style.setProperty('--mc', /^#[0-9a-f]{6}$/i.test(m.couleur || '') ? m.couleur : 'var(--line)');
    const h = J.el('div', 'wk-h');
    h.append(J.el('b', null, 'sem. du ' + J.dm(w)), J.el('span', null, races.length === 1 ? '1 course' : races.length + ' courses'));
    row.appendChild(h);
    const list = J.el('div', 'wk-l');
    for (const e of items) list.appendChild(jbItem(e));
    row.appendChild(list);
    el.appendChild(row);
  }
  flushGap();
  if (!el.childElementCount) el.appendChild(J.el('div', 'sub', 'Rien avec ces filtres. Rallume un statut ou un type.'));
});

/* Objectifs de préparation (C et week-ends chocs), à part */
dash.draw('cprep', (el) => {
  const d = dash.data('evenements');
  if (J.wait(el, d)) return;
  el.replaceChildren();
  const F = window.jbF;
  const from = F.passe ? J.S0 : J.today;
  const ev = d.data.filter((e) => (e.kind === 'prep' || (e.kind === 'choc' && F.types.has('choc'))) && (e.fin || e.debut) >= from);
  if (!F.types.has('prep')) { el.appendChild(J.el('div', 'sub', 'Masqués par le filtre « Objectifs de préparation ».')); return; }
  if (!ev.length) { el.appendChild(J.el('div', 'sub', 'Aucun objectif de préparation à venir.')); return; }
  for (const e of ev) el.appendChild(jbItem(e, 'prep-'));
});
