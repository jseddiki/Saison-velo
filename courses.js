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
const JB_STATUTS = ['Inscrit', 'Gardée', 'À décider', 'En attente', 'Sélection requise', 'Refusée'];
const JB_TYPES = [['ab', 'Objectifs A et B'], ['course', 'Autres courses'], ['challenge', 'Challenges'], ['choc', 'Week-ends chocs'], ['prep', 'Objectifs de préparation'], ['meso', 'Mésocycles']];
window.jbF = window.jbF || { statuts: new Set(['Inscrit', 'Gardée', 'À décider', 'En attente', 'Sélection requise']), types: new Set(JB_TYPES.map((t) => t[0])), passe: false, vue: 'saison' };
if (!window.jbF.vue) window.jbF.vue = 'saison';

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
/* Choix de la vue : toute la saison, ou les compétitions seulement */
dash.draw('cvue', (el) => {
  el.replaceChildren();
  const seg = J.el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Vue');
  for (const [k, l] of [['saison', 'Toute la saison'], ['compet', 'Compétitions seulement']]) {
    const b = J.el('button', null, l); b.type = 'button'; b.setAttribute('aria-pressed', String(window.jbF.vue === k));
    b.addEventListener('click', () => { window.jbF.vue = k; dash.draw('cvue'); dash.draw('cstrip'); });
    seg.appendChild(b);
  }
  el.appendChild(seg);
});

/* Vue « compétitions seulement » : la même vue que la saison, resserrée sur les macrocycles de compétition,
   avec le nom de chaque course relié à son point par une petite flèche */
const jbStripCompet = (el, d) => {
  const F = window.jbF, cy = dash.data('cycles'), mc = dash.data('macros');
  const comp = mc.status === 'ok' ? mc.data.filter((m) => /comp[ée]tition/i.test(m.nom)) : [];
  let from = comp.length ? comp[0].debut : J.S0;
  const to = comp.length ? comp[comp.length - 1].fin : J.S1;
  if (!F.passe && J.today > from) from = J.mon(J.today);
  const ev = d.data.filter((e) => jbVisible(e) && (e.fin || e.debut) >= from && e.debut <= to);
  const W = Math.max(el.clientWidth, 1500), L = 92, R = 24, LH = 21;
  const P = (s) => new Date(s + 'T12:00:00Z');
  const x = d3.scaleUtc().domain([P(from), P(J.add(to, 1))]).range([L, W - R]);
  // mesure des noms
  const meas = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); meas.style.position = 'absolute'; meas.style.visibility = 'hidden'; el.appendChild(meas);
  const tm = document.createElementNS('http://www.w3.org/2000/svg', 'text'); meas.appendChild(tm);
  const widthOf = (t, cls) => { tm.setAttribute('class', cls); tm.textContent = t; return tm.getComputedTextLength() + 14; };
  // rangement des étiquettes en niveaux, au-dessus ou en dessous de la ligne
  const place = (items, sides) => {
    const lv = { up: [], dn: [] }; let pref = 0;
    for (const it of items) {
      const order = sides.length > 1 ? [sides[pref], sides[1 - pref]] : sides;
      for (const sd of order) {
        const L2 = lv[sd]; let i = L2.findIndex((end) => end < it.x - 6);
        if (i < 0 && L2.length < 6) { i = L2.length; L2.push(0); }
        if (i >= 0) { L2[i] = it.x + it.w; it.side = sd; it.lv = i; break; }
      }
      if (it.side == null) { it.side = order[0]; it.lv = lv[order[0]].length - 1; }
      if (sides.length > 1) pref = it.side === sides[0] ? 1 : 0;
    }
    return { up: lv.up.length, dn: lv.dn.length };
  };
  const mk = (e, cls) => ({ e, x: x(P(e.debut)), w: widthOf(e.nom.replace(/^Championnats du monde UCI /, 'Mondial '), cls), cls });
  const objs = ev.filter((e) => e.kind === 'ab').map((e) => mk(e, 'race-l'));
  const courses = ev.filter((e) => e.kind === 'course' || e.kind === 'challenge').map((e) => mk(e, 'race-n'));
  const preps = ev.filter((e) => e.kind === 'prep' || e.kind === 'choc').map((e) => mk(e, 'race-n'));
  const nO = place(objs, ['up']), nC = place(courses, ['up', 'dn']), nP = place(preps, ['dn']);
  meas.remove();
  const yM = 22, yA = 50 + nO.up * LH + 10, yC = yA + 34 + nC.up * LH, yP = yC + 30 + nC.dn * LH + 16, H = yP + 22 + nP.dn * LH + 8;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Compétitions de la saison avec leur nom, objectifs au-dessus des autres courses');
  const defs = svg.append('defs');
  defs.append('marker').attr('id', 'fl').attr('viewBox', '0 0 8 8').attr('refX', 7).attr('refY', 4).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M0,0 L8,4 L0,8 z').style('fill', 'var(--muted)');
  const hatch = defs.append('pattern').attr('id', 'hatch2').attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
  hatch.append('rect').attr('width', 6).attr('height', 6).style('fill', 'color-mix(in srgb, var(--warn) 8%, transparent)');
  hatch.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).style('stroke', 'color-mix(in srgb, var(--warn) 35%, transparent)').style('stroke-width', 2);
  const tip = J.el('div', 'tip'); tip.hidden = true;
  const show = (e2, lines) => { tip.replaceChildren(J.el('b', null, lines[0])); for (const l of lines.slice(1)) tip.appendChild(J.el('div', null, l)); J.tipAt(tip, el, e2, 230); };
  const hide = () => { tip.hidden = true; };
  // mois
  const months = d3.utcMonth.range(d3.utcMonth.ceil(P(from)), P(J.add(to, 1)));
  svg.selectAll('line.m').data(months).join('line').attr('x1', (m) => x(m)).attr('x2', (m) => x(m)).attr('y1', 8).attr('y2', H - 6).style('stroke', 'var(--line)').style('stroke-dasharray', '2 4');
  svg.selectAll('text.m').data(months).join('text').attr('x', (m) => x(m) + 4).attr('y', 12).text((m) => m.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', ''));
  // lignes
  for (const [y, t] of [[yA, 'Objectifs'], [yC, 'Courses'], [yP, 'Préparation']]) {
    svg.append('line').attr('x1', L).attr('x2', W - R).attr('y1', y).attr('y2', y).style('stroke', 'var(--line)').style('stroke-width', 1.5);
    svg.append('text').attr('x', 6).attr('y', y + 4).attr('class', 'lane-l').text(t);
  }
  // mésocycles
  if (F.types.has('meso') && cy.status === 'ok') {
    for (const c of cy.data) {
      if ((c.fin || c.debut) < from || c.debut > to) continue;
      const x0 = x(P(c.debut < from ? from : c.debut)), x1 = x(P(J.add((c.fin || c.debut) > to ? to : (c.fin || c.debut), 1)));
      const num = (String(c.nom).match(/Méso ([0-9]+)/) || [])[1] || '';
      const g = svg.append('g');
      g.append('rect').attr('x', x0 + 0.5).attr('y', yM).attr('width', Math.max(1, x1 - x0 - 1)).attr('height', 16).attr('rx', 3).style('fill', /^#[0-9a-f]{6}$/i.test(c.couleur || '') ? c.couleur : 'var(--muted)');
      if (x1 - x0 > 16) g.append('text').attr('x', x0 + 5).attr('y', yM + 12).attr('class', 'meso-l').text(num);
      g.on('pointerenter pointerdown', (e2) => show(e2, [c.nom, J.dm(c.debut) + ' → ' + J.dm(c.fin)])).on('pointerleave', hide);
    }
    svg.append('text').attr('x', 6).attr('y', yM + 12).attr('class', 'lane-l').text('Mésocycles');
  }
  // trous de 5 semaines ou plus entre les courses
  const days = ev.filter(jbRaceKind).map((e) => e.debut).filter((v, i, a2) => a2.indexOf(v) === i).sort();
  for (let i = 0; i < days.length - 1; i++) {
    const n = J.diff(days[i], days[i + 1]);
    if (n >= 35) {
      const xa = x(P(days[i])) + 6, xb = x(P(days[i + 1])) - 6;
      svg.append('rect').attr('x', xa).attr('y', yC - 12).attr('width', Math.max(0, xb - xa)).attr('height', 24).attr('rx', 6).style('fill', 'url(#hatch2)').style('stroke', 'var(--warn)').style('stroke-dasharray', '3 3');
      svg.append('text').attr('x', (xa + xb) / 2).attr('y', yC + 4).attr('text-anchor', 'middle').attr('class', 'gap-l').text(Math.floor(n / 7) + ' sem. sans course');
    }
  }
  // étiquette + petite flèche vers le point
  const label = (it, y0) => {
    const e = it.e, up = it.side === 'up';
    const ty = up ? y0 - 18 - it.lv * LH : y0 + 26 + it.lv * LH;
    const g = svg.append('g').style('cursor', 'pointer');
    g.append('line').attr('x1', it.x).attr('x2', it.x).attr('y1', up ? ty + 4 : ty - 13).attr('y2', up ? y0 - 9 : y0 + 9).style('stroke', 'var(--muted)').style('stroke-width', 1).attr('marker-end', 'url(#fl)');
    g.append('text').attr('x', it.x + 4).attr('y', ty).attr('class', it.cls + (e.statut === 'Refusée' ? ' refused' : '') + (e.debut < J.today ? ' past' : '')).text(e.nom.replace(/^Championnats du monde UCI /, 'Mondial '));
    g.append('rect').attr('x', it.x - 4).attr('y', ty - 13).attr('width', it.w).attr('height', 17).style('fill', 'transparent')
      .on('pointerenter pointerdown', (e2) => show(e2, [e.nom, (e.role ? e.role + ' · ' : '') + J.day(e.debut) + ' · ' + J.jx(e.debut), [e.km ? J.num(e.km) + ' km' : '', e.dplus ? J.num(e.dplus) + ' m D+' : ''].filter(Boolean).join(' · '), e.statut].filter(Boolean)))
      .on('pointerleave', hide)
      .on('click', () => { if (window.jbMoisC && e.kind !== 'prep') { window.jbMoisC = ''; dash.draw('cweeks'); } const t2 = document.getElementById((e.kind === 'prep' ? 'prep-' : 'ev-') + e.id); if (t2) { t2.open = true; t2.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
  };
  for (const it of preps) {
    const e = it.e, x0 = it.x, x1 = Math.max(x0 + 6, x(P(J.add(e.fin || e.debut, 1))));
    svg.append('rect').attr('x', x0).attr('y', yP - 6).attr('width', x1 - x0).attr('height', 12).attr('rx', 3).style('fill', e.kind === 'prep' ? 'var(--pois)' : 'var(--card)').style('stroke', 'var(--pois)').style('stroke-width', 1.5);
    label(it, yP);
  }
  for (const it of courses) {
    const e = it.e;
    label(it, yC);
    if (e.kind === 'challenge') svg.append('path').attr('d', d3.symbol(d3.symbolStar, 120)()).attr('transform', `translate(${it.x},${yC})`).style('fill', '#8E5BD6').style('stroke', 'var(--ink)').style('stroke-width', 1);
    else svg.append('circle').attr('cx', it.x).attr('cy', yC).attr('r', 5.5).style('fill', e.couleur || 'var(--muted)').style('stroke', 'var(--card)').style('stroke-width', 1.5).style('opacity', e.statut === 'Refusée' ? 0.45 : 1);
  }
  for (const it of objs) {
    const e = it.e;
    label(it, yA);
    svg.append('circle').attr('cx', it.x).attr('cy', yA).attr('r', /^A/.test(e.role) ? 9 : 7).style('fill', /^A/.test(e.role) ? 'var(--jaune)' : 'var(--vert)').style('stroke', e.statut === 'Sélection requise' ? 'var(--ink)' : 'var(--card)').style('stroke-width', 1.5).style('stroke-dasharray', e.statut === 'Sélection requise' ? '2 2' : null);
    svg.append('text').attr('x', it.x).attr('y', yA + 3.5).attr('text-anchor', 'middle').attr('class', 'dot-l').text(e.role);
  }
  const tx = x(P(J.today));
  if (tx >= L && tx <= W - R) svg.append('line').attr('x1', tx).attr('x2', tx).attr('y1', 16).attr('y2', H - 6).style('stroke', 'var(--ink)').style('stroke-width', 1.5);
  el.appendChild(tip);
};

dash.draw('cstrip', (el) => {
  const d = dash.data('evenements'), cy = dash.data('cycles');
  if (J.wait(el, d)) return;
  el.textContent = '';
  const F = window.jbF;
  el.classList.toggle('compet', F.vue === 'compet');
  if (F.vue === 'compet') { jbStripCompet(el, d); return; }
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
      .on('click', () => { if (window.jbMoisC && !e.debut.startsWith(window.jbMoisC)) { window.jbMoisC = ''; dash.draw('cweeks'); } const t2 = document.getElementById('ev-' + e.id); if (t2) { t2.open = true; t2.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
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

/* Calendrier des courses : une liste (courses et objectifs seulement), filtrable par mois */
window.jbMoisC = window.jbMoisC || '';
dash.draw('cweeks', (el) => {
  const d = dash.data('evenements'), ob = dash.data('objectifs');
  if (J.wait(el, d)) return;
  el.replaceChildren();
  const F = window.jbF;
  const lieu = {}; if (ob.status === 'ok') for (const o of ob.data) lieu[o.id] = o.lieu || '';
  const from = F.passe ? J.S0 : J.today;
  const all = d.data.filter((e) => jbRaceKind(e) && jbVisible(e) && e.debut >= from);
  // filtre par mois
  const months = Array.from(new Set(all.map((e) => e.debut.slice(0, 7)))).sort();
  if (window.jbMoisC && !months.includes(window.jbMoisC)) window.jbMoisC = '';
  const bar = J.el('div', 'ctrl');
  const lab = J.el('label', null, 'Mois ');
  const sel = J.el('select', 'select'); sel.setAttribute('aria-label', 'Mois');
  sel.appendChild(new Option('Toute la saison (' + all.length + ')', ''));
  for (const m of months) sel.appendChild(new Option(J.mlong(m) + ' (' + all.filter((e) => e.debut.startsWith(m)).length + ')', m, false, m === window.jbMoisC));
  sel.value = window.jbMoisC;
  sel.addEventListener('change', () => { window.jbMoisC = sel.value; dash.draw('cweeks'); });
  lab.appendChild(sel); bar.appendChild(lab); el.appendChild(bar);
  const rows = all.filter((e) => !window.jbMoisC || e.debut.startsWith(window.jbMoisC));
  if (!rows.length) { el.appendChild(J.el('div', 'sub', 'Aucune course avec ces filtres. Rallume un statut ou change de mois.')); return; }
  const head = J.el('div', 'cl-row cl-head');
  for (const t of ['Date', 'Course', 'Lieu', 'Distance', 'D+', '']) head.appendChild(J.el('span', null, t));
  el.appendChild(head);
  let month = '';
  for (const e of rows) {
    const m = e.debut.slice(0, 7);
    if (!window.jbMoisC && m !== month) { month = m; el.appendChild(J.el('div', 'cl-month', J.mlong(m))); }
    const det = J.el('details', 'cl ' + (jbRoleCls(e) ? 'r-' + jbRoleCls(e) : '') + (e.statut === 'Refusée' ? ' refused' : '') + (e.debut < J.today ? ' past' : ''));
    det.id = 'ev-' + e.id;
    const s = J.el('summary', 'cl-row');
    const dt = J.el('span', 'cl-d'); dt.append(J.el('b', null, String(Number(e.debut.slice(8, 10)))), J.el('span', null, J.wd(e.debut) + ' ' + J.mshort(e.debut)));
    const nm = J.el('span', 'cl-n'); nm.appendChild(J.el('b', null, e.nom));
    const tags = J.el('span', 'ci-meta');
    if (e.role) tags.appendChild(J.el('span', 'tag ' + jbRoleCls(e), e.role));
    if (e.statut) { const t = J.el('span', 'tag', e.statut); if (e.couleur) { t.style.color = e.couleur; t.style.borderColor = e.couleur; } tags.appendChild(t); }
    nm.appendChild(tags);
    const l = lieu[e.id] || '';
    const mob = [l, e.km ? J.num(e.km) + ' km' : '', e.dplus ? J.num(e.dplus) + ' m D+' : ''].filter(Boolean).join(' · ');
    if (mob) nm.appendChild(J.el('span', 'cl-mob', mob));
    s.append(dt, nm, J.el('span', 'cl-l', l || '—'), J.el('span', 'cl-v', e.km ? J.num(e.km) + ' km' : '—'), J.el('span', 'cl-v', e.dplus ? J.num(e.dplus) + ' m' : '—'), J.el('span', 'cl-j', e.debut < J.today ? '' : J.jx(e.debut)));
    det.appendChild(s);
    // toutes les infos
    const body = J.el('div', 'cl-b');
    const facts = J.el('div', 'cl-facts');
    const fact = (k, v) => { if (!v) return; const f = J.el('div'); f.append(J.el('span', 'l', k), J.el('span', 'v', v)); facts.appendChild(f); };
    fact('Date', J.wd(e.debut, true) + ' ' + J.dm(e.debut) + '/' + e.debut.slice(0, 4));
    fact('Lieu', l);
    fact('Distance', e.km ? J.num(e.km) + ' km' : '');
    fact('Dénivelé', e.dplus ? J.num(e.dplus) + ' m D+' : '');
    fact('Rôle', e.role);
    fact('Statut', e.statut);
    fact('Dans', e.debut < J.today ? 'passée' : J.jx(e.debut));
    body.appendChild(facts);
    if (e.debut >= J.today && e.statut !== 'Refusée') {
      const a = J.btn('Ajouter à mon agenda', 'cal');
      J.ics(a, { uid: e.id, debut: e.debut, fin: e.fin, titre: e.nom, texte: [l, e.km ? J.num(e.km) + ' km' : '', e.dplus ? J.num(e.dplus) + ' m D+' : '', 'Avec ' + window.CONFIG.prenom].filter(Boolean).join(' · ') });
      const box = J.el('div', 'actions'); box.appendChild(a); body.appendChild(box);
    }
    body.appendChild(J.el('div', 'ev-text', e.texte || 'Pas de description.'));
    det.appendChild(body);
    el.appendChild(det);
  }
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