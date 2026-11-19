/* Page « Le jeu » : la route vers l'objectif A, le niveau, les médailles */
window.jbGoal = 'A1';
const JB_LEVELS = [
  [0, 'Cyclotouriste'], [1000, 'Randonneur'], [2500, 'Cyclosportif'], [5000, 'Rouleur'], [8000, 'Grimpeur'],
  [12000, 'Baroudeur'], [17000, 'Ultra'], [23000, 'Forçat de la route'], [30000, 'Légende']
];

dash.draw('game', (el) => {
  const g = dash.data('jeu'), t = dash.data('totaux');
  if (J.wait(el, g, 'Préparation de la route…')) return;
  el.replaceChildren();
  if (!g.data.length) { el.appendChild(J.el('div', 'sub', 'Aucun objectif A daté dans Nolio : la route apparaîtra dès qu’il y en aura un.')); return; }
  if (!g.data.some((x) => x.code === window.jbGoal)) window.jbGoal = (g.data.find((x) => !x.passe) || g.data[0]).code;
  const G = g.data.find((x) => x.code === window.jbGoal);
  const xp = t.status === 'ok' && t.data[0] ? t.data[0].tss : 0;

  // En-tête : niveau et choix de l'objectif
  const head = J.el('div', 'game-head');
  let li = 0; JB_LEVELS.forEach((l, i) => { if (xp >= l[0]) li = i; });
  const nxt = JB_LEVELS[li + 1];
  const lvl = J.el('div', 'lvl');
  lvl.appendChild(J.el('div', 'lvl-badge', String(li + 1)));
  const lt = J.el('div'); lt.appendChild(J.el('div', 'lvl-name', JB_LEVELS[li][1]));
  lt.appendChild(J.el('div', 'sub', J.num(xp) + ' points (1 TSS = 1 point)' + (nxt ? ' · niveau suivant à ' + J.num(nxt[0]) : ' · niveau max')));
  const xb = J.el('div', 'xpbar'); const xi = J.el('i'); xi.style.width = (nxt ? (xp - JB_LEVELS[li][0]) / (nxt[0] - JB_LEVELS[li][0]) * 100 : 100) + '%'; xb.appendChild(xi); lt.appendChild(xb);
  lvl.appendChild(lt); head.appendChild(lvl);
  const right = J.el('div');
  const h = J.el('h2', null, 'Route vers ' + G.code + ' · ' + G.nom); h.style.fontSize = '24px'; right.appendChild(h);
  const seg = J.el('div', 'seg'); seg.style.marginTop = '8px'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Objectif');
  for (const o of g.data) { const b = J.el('button', null, o.code + ' · ' + J.dm(o.date)); b.type = 'button'; b.setAttribute('aria-pressed', String(o.code === G.code)); b.addEventListener('click', () => { window.jbGoal = o.code; dash.draw('game'); }); seg.appendChild(b); }
  right.appendChild(seg); head.appendChild(right);
  el.appendChild(head);

  // La carte : route en lacets
  const map = J.el('div', 'map'); el.appendChild(map);
  const W = Math.max(map.clientWidth || el.clientWidth || 320, 320);
  const rows = W < 560 ? 6 : W < 860 ? 5 : 4;
  const gap = W < 560 ? 104 : 118, r = gap / 2, mx = r + 22, top = 70, H = top + (rows - 1) * gap + 60;
  let d = `M ${mx} ${top}`;
  for (let i = 0; i < rows; i++) {
    const y = top + i * gap, toRight = i % 2 === 0;
    const xEnd = toRight ? W - mx : mx;
    d += ` L ${xEnd} ${y}`;
    if (i < rows - 1) d += ` A ${r} ${r} 0 0 ${toRight ? 1 : 0} ${xEnd} ${y + gap}`;
  }
  const svg = d3.select(map).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Route de la saison jusqu’à ' + G.nom + ', avec les courses et les étapes sur le chemin');
  // Courbes de niveau (décor de carte)
  const topo = svg.append('g').style('opacity', 0.5);
  [[0.18, 0.3], [0.72, 0.62], [0.45, 0.95]].forEach(([cx, cy], k) => { for (let j = 1; j <= 5; j++) topo.append('ellipse').attr('cx', cx * W).attr('cy', cy * H).attr('rx', j * (W < 560 ? 26 : 46) + k * 8).attr('ry', j * 20 + k * 4).style('fill', 'none').style('stroke', 'var(--line)').style('stroke-width', 1); });
  svg.append('path').attr('d', d).style('fill', 'none').style('stroke', 'var(--line)').style('stroke-width', 26).style('stroke-linecap', 'round');
  const road = svg.append('path').attr('d', d).style('fill', 'none').style('stroke', 'color-mix(in srgb, var(--ink) 78%, var(--paper))').style('stroke-width', 18).style('stroke-linecap', 'round');
  const len = road.node().getTotalLength();
  const posReal = Math.min(1, G.reel / G.total), posPlan = Math.min(1, G.plan_auj / G.total);
  svg.append('path').attr('d', d).style('fill', 'none').style('stroke', 'var(--jaune)').style('stroke-width', 18).style('stroke-linecap', 'round').style('stroke-dasharray', `${posReal * len} ${len}`);
  svg.append('path').attr('d', d).style('fill', 'none').style('stroke', '#fff').style('stroke-width', 1.6).style('stroke-dasharray', '7 9').style('opacity', 0.75);
  const at = (p) => road.node().getPointAtLength(Math.max(0, Math.min(1, p)) * len);

  const tip = J.el('div', 'tip'); tip.hidden = true; map.appendChild(tip);
  const show = (ev, lines) => { tip.replaceChildren(J.el('b', null, lines[0])); for (const l of lines.slice(1)) tip.appendChild(J.el('div', null, l)); const box = map.getBoundingClientRect(); tip.hidden = false; tip.style.left = Math.min(Math.max(0, ev.clientX - box.left - 90), map.clientWidth - 200) + 'px'; tip.style.top = Math.max(0, ev.clientY - box.top - 90) + 'px'; };

  // Départ et arrivée
  const p0 = at(0), p1 = at(1);
  svg.append('text').attr('class', 'node-l').attr('x', p0.x).attr('y', p0.y - 22).attr('text-anchor', 'start').text('Reprise · 26/10');
  const fin = svg.append('g').attr('transform', `translate(${p1.x - 6},${p1.y - 44})`);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) fin.append('rect').attr('x', 6 + i * 6).attr('y', j * 6).attr('width', 6).attr('height', 6).style('fill', (i + j) % 2 ? 'var(--ink)' : 'var(--card)').style('stroke', 'var(--ink)').style('stroke-width', 0.5);
  fin.append('line').attr('x1', 6).attr('x2', 6).attr('y1', 0).attr('y2', 44).style('stroke', 'var(--ink)').style('stroke-width', 2);
  svg.append('text').attr('class', 'node-l').attr('x', p1.x + (rows % 2 ? -22 : 22)).attr('y', W < 560 ? p1.y + 34 : p1.y - 30).attr('text-anchor', rows % 2 ? 'end' : 'start').style('font-size', '15px').text(G.code + ' · ' + G.nom + ' · ' + J.dm(G.date));

  // Étapes
  const nodes = JSON.parse(G.nodes || '[]');
  const COL = { a: 'var(--jaune)', b: 'var(--vert)', c: 'var(--pois)', choc: 'var(--pois)', mineure: 'var(--card)', test: 'var(--card)' };
  let lastLab = -1e9, flip = false;
  for (const n of nodes) {
    const p = at(n.pos), passed = n.pos <= posReal;
    const g2 = svg.append('g').style('cursor', 'default');
    const big = n.kind === 'a' || n.kind === 'b' || n.kind === 'c' || n.kind === 'choc';
    if (n.kind === 'test') g2.append('rect').attr('x', p.x - 4.5).attr('y', p.y - 4.5).attr('width', 9).attr('height', 9).attr('transform', `rotate(45 ${p.x} ${p.y})`).style('fill', 'var(--card)').style('stroke', 'var(--ink)').style('stroke-width', 1.5);
    else g2.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', big ? (n.kind === 'a' ? 11 : 8.5) : 5).style('fill', COL[n.kind]).style('stroke', n.kind === 'choc' ? 'var(--pois)' : 'var(--ink)').style('stroke-width', n.kind === 'choc' ? 3 : 1.6);
    if (n.kind === 'choc') g2.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', 3).style('fill', 'var(--card)');
    if (big) g2.append('text').attr('x', p.x).attr('y', p.y + 4).attr('text-anchor', 'middle').style('font-size', n.kind === 'a' ? '11px' : '9px').style('font-weight', 700).style('fill', n.kind === 'a' ? '#3D3000' : '#fff').text(n.kind === 'choc' ? '' : n.code);
    if (passed) g2.style('opacity', 0.55);
    const dist = n.pos * len;
    if (big && dist - lastLab > (W < 560 ? 70 : 92) && len - dist > (W < 560 ? 240 : 260)) {
      flip = !flip; lastLab = dist;
      const short = n.nom.replace(/^Week-end choc ([0-9]+).*$/, 'Choc $1').replace(/ \(prépa .*\)$/, '').replace(/^Championnats du monde UCI /, '');
      const t1 = g2.append('text').attr('class', 'node-l').attr('y', flip ? p.y - 20 : p.y + 30).attr('text-anchor', 'middle').text(short.length > 24 ? short.slice(0, 23) + '…' : short);
      const half = t1.node().getComputedTextLength() / 2 + 14, lx = Math.max(half, Math.min(W - half, p.x));
      t1.attr('x', lx);
      g2.append('text').attr('class', 'node-d').attr('x', lx).attr('y', flip ? p.y - 34 : p.y + 43).attr('text-anchor', 'middle').text(J.dm(n.date));
    }
    const label = { a: 'Objectif ' + n.code, b: 'Objectif B', c: 'Objectif C', choc: 'Week-end choc', mineure: 'Course', test: 'Test' }[n.kind];
    g2.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', 15).style('fill', 'transparent')
      .on('pointerenter pointerdown', (ev) => show(ev, [n.nom, label + ' · ' + J.day(n.date) + ' · ' + J.jx(n.date), passed ? 'Étape passée' : 'Encore ' + J.num(Math.max(0, n.pos * G.total - G.reel)) + ' TSS pour l’atteindre']))
      .on('pointerleave', () => { tip.hidden = true; });
  }

  // Le fantôme (le plan) et le cycliste (le réel)
  const pg = at(posPlan), pr = at(posReal);
  svg.append('g').attr('transform', `translate(${pg.x - 15},${pg.y - 30})`).style('opacity', 0.35).html(window.jbRiderSVG('var(--muted)'));
  svg.append('text').attr('x', pg.x).attr('y', pg.y - 34).attr('text-anchor', 'middle').style('font-size', '11px').style('fill', 'var(--muted)').text('le plan');
  const me = svg.append('g').attr('transform', `translate(${pr.x - 15},${pr.y - 32})`);
  me.append('ellipse').attr('cx', 15).attr('cy', 30).attr('rx', 14).attr('ry', 3).style('fill', 'rgba(0,0,0,.25)');
  me.html(me.html() + window.jbRiderSVG());
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !el.dataset.anim) {
    el.dataset.anim = '1';
    me.attr('transform', `translate(${p0.x - 15},${p0.y - 32})`).transition().duration(1800).ease(d3.easeCubicOut)
      .attrTween('transform', () => (k) => { const q = at(posReal * k); return `translate(${q.x - 15},${q.y - 32})`; });
  }

  // Le bilan sous la carte
  const foot = J.el('div', 'map-foot');
  const item = (big, txt) => { const s = J.el('span'); s.append(J.el('b', null, big), document.createTextNode(' ' + txt)); foot.appendChild(s); };
  item(Math.round(posReal * 100) + ' %', 'de la route faite (' + J.num(G.reel) + ' sur ' + J.num(G.total) + ' TSS)');
  const delta = G.reel - G.plan_auj;
  item((delta >= 0 ? '+' : '−') + J.num(Math.abs(delta)), 'TSS ' + (delta >= 0 ? 'd’avance' : 'de retard') + ' sur le plan');
  const next = nodes.find((n) => n.pos > posReal && n.kind !== 'test' && n.kind !== 'mineure');
  if (next) item(J.jx(next.date), 'avant ' + next.nom.replace(/ \(prépa .*\)$/, ''));
  item(J.jx(G.date), 'avant ' + G.code);
  el.appendChild(foot);
});

/* Médailles : un anneau à crans, un cran par palier */
const jbMedal = (n, won, done) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('class', 'medal'); s.setAttribute('aria-hidden', 'true');
  const R = 27, C = 32; let h = `<path d="M22 50 L18 63 L26 59 L32 63 L32 52 Z M42 50 L46 63 L38 59 L32 63 L32 52 Z" fill="${done ? 'var(--jaune)' : 'var(--route)'}" opacity=".85"/>`;
  h += `<circle cx="${C}" cy="${C - 4}" r="${R - 5}" fill="${done ? 'var(--jaune)' : 'var(--card)'}" stroke="var(--ink)" stroke-width="1.5"/>`;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * 2 * Math.PI / n + 0.07, a1 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n - 0.07;
    const p = (a, rr) => [C + rr * Math.cos(a), C - 4 + rr * Math.sin(a)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R);
    h += `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${i < won ? (done ? 'var(--jaune)' : 'var(--route)') : 'var(--line)'}" stroke-width="4.5" stroke-linecap="round"/>`;
  }
  h += `<text x="${C}" y="${C + 4}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="20" fill="${done ? '#3D3000' : 'var(--ink)'}">${won}</text>`;
  s.innerHTML = h; return s;
};

dash.draw('medals', (el) => {
  const d = dash.data('medailles');
  if (J.wait(el, d, 'Chargement des médailles…')) return;
  el.replaceChildren();
  const list = d.data.slice().sort((a, b) => (b.valeur != null) - (a.valeur != null));
  for (const q of list) {
    const pal = String(q.paliers).split(';').map(Number);
    const ev = q.label === 'everest';
    const fmt = (v) => (ev ? J.num(v / 8848, 0) + '× Everest' : J.num(v, q.dec || 0));
    const done = q.prochain == null && q.valeur != null;
    const card = J.el('article', 'medal-card' + (q.valeur == null || !q.atteints ? ' locked' : ''));
    card.appendChild(jbMedal(pal.length, q.atteints, done));
    const b = J.el('div');
    b.appendChild(J.el('div', 'medal-t', q.titre));
    b.appendChild(J.el('div', 'medal-v', q.valeur == null ? '—' : J.num(q.valeur, q.dec || 0) + ' ' + q.unite));
    const tiers = J.el('div', 'tiers');
    pal.forEach((p, i) => tiers.appendChild(J.el('span', i < q.atteints ? 'won' : i === q.atteints && q.valeur != null ? 'next' : '', fmt(p))));
    b.appendChild(tiers);
    const nxt = q.prochain != null && q.valeur != null ? 'Prochain cran : ' + fmt(q.prochain) + (ev ? '' : ' ' + q.unite) + ' (encore ' + J.num(Math.max(0, q.prochain - q.valeur), q.dec || 0) + ' ' + q.unite + ')' : done ? 'Médaille complète !' : '';
    const note = [q.note, nxt].filter(Boolean).join(' · ');
    if (note) b.appendChild(J.el('div', 'medal-n', note));
    card.appendChild(b);
    el.appendChild(card);
  }
});
