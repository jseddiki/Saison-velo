/* Page « Entraînement » : séances des 14 prochains jours (profil, .fit, agenda), séances faites */
const jbMoment = { morning: 'le matin', noon: 'le midi', afternoon: 'l’après-midi', evening: 'le soir' };
const jbBike = (s) => s === 'spt_B41yRYTUXKNmWr8' || s === 'spt_wSAjGr1yXKlkEVU';
const jbZoneOf = (w, cp, pma) => {
  if (w == null || !cp) return -1;
  if (w < 0.55 * cp) return 0; if (w < 0.75 * cp) return 1; if (w < 0.9 * cp) return 2; if (w < 1.05 * cp) return 3;
  if (!pma || w < 1.2 * pma) return 4; if (w < 1.5 * pma) return 5; return 6;
};
/* Arbre de la séance : [durée s, W bas, W haut] ou { x: répétitions, s: [...] } */
const jbFlat = (tree, out) => { out = out || []; for (const n of tree || []) { if (Array.isArray(n)) out.push(n); else for (let i = 0; i < (n.x || 1); i++) jbFlat(n.s, out); } return out; };
const jbPct = (w, cp) => (w == null || !cp ? null : Math.round(w / cp * 100));
const jbMid = (b) => (b[1] == null ? null : b[2] != null && b[2] > b[1] * 1.8 ? b[1] * 1.15 : (b[1] + (b[2] ?? b[1])) / 2);

const jbStepText = (b, cp, pma) => {
  const lo = jbPct(b[1], cp), hi = jbPct(b[2], cp);
  const z = jbZoneOf(jbMid(b), cp, pma);
  const dur = b[0] >= 60 ? J.dur(b[0] / 60) : b[0] + ' s';
  if (lo == null) return dur + ' · libre';
  const w0 = Math.round(b[1]), w1 = b[2] != null ? Math.round(b[2]) : null;
  return dur + ' · Z' + (z + 1) + ' · ' + (w1 != null && w1 !== w0 ? w0 + '-' + w1 : w0) + ' W';
};
const jbSteps = (tree, cp, pma) => {
  const ul = J.el('ul', 'steps');
  for (const n of tree || []) {
    if (Array.isArray(n)) ul.appendChild(J.el('li', null, jbStepText(n, cp, pma)));
    else ul.appendChild(J.el('li', null, n.x + ' × ( ' + (n.s || []).filter(Array.isArray).map((b) => jbStepText(b, cp, pma)).join(' / ') + ' )'));
  }
  return ul;
};

const jbProfile = (box, blocks, cp, pma) => {
  if (!blocks.length) return;
  const wrap = J.el('div', 'chart'); wrap.style.minHeight = '110px'; wrap.style.marginTop = '10px'; box.appendChild(wrap);
  const W = Math.max(wrap.clientWidth || box.clientWidth || 300, 260), H = 110, m = { t: 6, r: 4, b: 16, l: 4 };
  const tot = blocks.reduce((a, b) => a + b[0], 0);
  const ymax = Math.max(cp ? cp * 1.25 : 0, ...blocks.map((b) => jbMid(b) || 0)) || 300;
  const x = d3.scaleLinear().domain([0, tot]).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, ymax]).range([H - m.b, m.t]);
  const svg = d3.select(wrap).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Profil d’intensité de la séance prévue');
  let t = 0; const segs = blocks.map((b) => { const s = { t0: t, d: b[0], w: jbMid(b), b }; t += b[0]; return s; });
  if (cp) svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(cp)).attr('y2', y(cp)).style('stroke', 'var(--muted)').style('stroke-dasharray', '3 3');
  svg.selectAll('rect').data(segs).join('rect').attr('x', (s) => x(s.t0)).attr('width', (s) => Math.max(0.8, x(s.t0 + s.d) - x(s.t0))).attr('y', (s) => y(s.w || ymax * 0.15)).attr('height', (s) => y(0) - y(s.w || ymax * 0.15)).style('fill', (s) => { const z = jbZoneOf(s.w, cp, pma); return z < 0 ? 'var(--soft)' : J.zc[z]; });
  const ticks = []; for (let k = 0; k <= tot; k += tot > 7200 ? 1800 : 900) ticks.push(k);
  svg.selectAll('text').data(ticks).join('text').attr('x', (k) => x(k)).attr('y', H - 3).attr('text-anchor', (k, i) => (i === 0 ? 'start' : 'middle')).text((k) => (k === 0 ? '0' : k % 3600 === 0 ? k / 3600 + ' h' : J.dur(k / 60)));
  const tip = J.el('div', 'tip'); tip.hidden = true; wrap.appendChild(tip);
  svg.on('pointermove pointerdown', (ev) => {
    const r = wrap.getBoundingClientRect(); const tt = x.invert((ev.clientX - r.left) * W / wrap.clientWidth);
    const s = segs.find((q) => tt >= q.t0 && tt < q.t0 + q.d); if (!s) return;
    tip.replaceChildren(J.el('b', null, J.dur(s.t0 / 60) + ' → ' + J.dur((s.t0 + s.d) / 60)), J.el('div', null, jbStepText(s.b, cp, pma)));
    tip.hidden = false; tip.style.left = Math.min(Math.max(0, ev.clientX - r.left - 70), wrap.clientWidth - 150) + 'px'; tip.style.top = '0px';
  }).on('pointerleave', () => { tip.hidden = true; });
};

/* Fichier .fit d'entraînement structuré, cibles en % de FTP : chaque Garmin les applique à la FTP de son propriétaire */
const jbFit = (name, tree, cp) => {
  const bytes = [];
  const u8 = (v) => bytes.push(v & 255);
  const u16 = (v) => { u8(v); u8(v >> 8); };
  const u32 = (v) => { u16(v & 65535); u16(Math.floor(v / 65536) & 65535); };
  const str = (s, n) => { for (let i = 0; i < n; i++) u8(i < s.length && i < n - 1 ? s.charCodeAt(i) : 0); };
  const def = (local, glob, fields) => { u8(64 | local); u8(0); u8(0); u16(glob); u8(fields.length); for (const f of fields) { u8(f[0]); u8(f[1]); u8(f[2]); } };
  let ascii = ''; for (const c of String(name || 'Seance').normalize('NFD')) { const k = c.charCodeAt(0); if (k >= 32 && k < 127) ascii += c; else if (k < 768 || k > 879) ascii += ' '; }
  ascii = ascii.replace(/[ ]+/g, ' ').trim();
  const steps = [];
  const walk = (nodes, inRep) => {
    for (const n of nodes || []) {
      if (Array.isArray(n)) steps.push({ d: n[0], lo: jbPct(n[1], cp), hi: jbPct(n[2], cp), rep: inRep });
      else { const start = steps.length; walk(n.s, true); steps.push({ repeat: true, from: start, times: n.x || 1 }); }
    }
  };
  walk(tree, false);
  def(0, 0, [[0, 1, 0], [1, 2, 132], [2, 2, 132], [3, 4, 140], [4, 4, 134]]);
  u8(0); u8(5); u16(255); u16(0); u32(1); u32(Math.floor(Date.now() / 1000) - 631065600);
  def(1, 26, [[4, 1, 0], [6, 2, 132], [8, 32, 7]]);
  u8(1); u8(2); u16(steps.length); str(ascii, 32);
  def(2, 27, [[254, 2, 132], [1, 1, 0], [2, 4, 134], [3, 1, 0], [4, 4, 134], [5, 4, 134], [6, 4, 134], [7, 1, 0]]);
  steps.forEach((s, i) => {
    u8(2); u16(i);
    if (s.repeat) { u8(6); u32(s.from); u8(255); u32(s.times); u32(4294967295); u32(4294967295); u8(255); return; }
    const lo = s.lo, hi = s.hi != null ? s.hi : lo != null ? lo + 5 : null;
    let inten = 0;
    if (lo != null && lo < 60 && s.rep) inten = 1;
    if (i === 0 && !s.rep && (lo == null || lo < 76)) inten = 2;
    if (i === steps.length - 1 && !s.rep && (lo == null || lo < 76)) inten = 3;
    u8(0); u32(Math.round(s.d * 1000));
    if (lo == null) { u8(2); u32(0); u32(0); u32(0); } else { u8(4); u32(0); u32(Math.max(1, lo)); u32(Math.max(lo + 1, hi)); }
    u8(inten);
  });
  const tbl = [0, 52225, 55297, 5120, 61441, 15360, 10240, 58369, 40961, 27648, 30720, 46081, 20480, 39937, 34817, 17408];
  const crc = (arr) => { let c = 0; for (const b of arr) { let t = tbl[c & 15]; c = (c >> 4) & 4095; c = c ^ t ^ tbl[b & 15]; t = tbl[c & 15]; c = (c >> 4) & 4095; c = c ^ t ^ tbl[(b >> 4) & 15]; } return c; };
  const head = [14, 32, 132, 8, bytes.length & 255, (bytes.length >> 8) & 255, (bytes.length >> 16) & 255, 0, 46, 70, 73, 84];
  const hc = crc(head); head.push(hc & 255, hc >> 8);
  const all = head.concat(bytes); const fc = crc(all); all.push(fc & 255, fc >> 8);
  let bin = ''; for (const b of all) bin += String.fromCharCode(b);
  return 'data:application/octet-stream;base64,' + btoa(bin);
};


const jbHour = { morning: '08:00', noon: '12:00', afternoon: '14:00', evening: '18:00' };

dash.draw('next14', (el) => {
  const pv = dash.data('prevu'), s7 = dash.data('seances7'), rs = dash.data('resume');
  if (J.wait(el, pv, 'Chargement des séances prévues…')) return;
  el.replaceChildren();
  const cp = rs.status === 'ok' && rs.data[0] ? rs.data[0].cp : null, pma = rs.status === 'ok' && rs.data[0] ? rs.data[0].pma : null;
  const det = {}; if (s7.status === 'ok') for (const s of s7.data) det[s.id] = s;
  const end = J.add(J.today, 13);
  const list = pv.data.filter((p) => p.date >= J.today && p.date <= end);
  if (!list.length) { el.appendChild(J.el('div', 'sub', 'Aucune séance prévue dans les 14 prochains jours.')); return; }
  const amis = (dash.data('amis').data || [{}])[0] || {};
  for (const p of list) {
    const r = Object.assign({}, p, det[p.id] || {});
    const later = !det[p.id];
    const card = J.el('article', 'sess' + (later ? ' later' : ''));
    const dd = J.el('div', 'sess-day');
    dd.append(J.el('div', 'd', J.wd(r.date, true)), J.el('b', null, String(Number(r.date.slice(8, 10)))), J.el('div', 'm', J.mshort(r.date) + (jbMoment[r.moment] ? ' · ' + jbMoment[r.moment].replace(/^l[ea’] ?/, '') : '')));
    card.appendChild(dd);
    const body = J.el('div');
    card.appendChild(body); el.appendChild(card);
    body.appendChild(J.el('div', 'sess-name', r.nom || '—'));
    const facts = J.el('div', 'facts');
    const fact = (v, l) => { const s = J.el('span'); s.append(J.el('b', null, v), document.createTextNode(l)); facts.appendChild(s); };
    fact(J.sport(r.sport), '');
    fact(J.dur(r.duree_min), '');
    if (r.tss != null) fact(String(Math.round(r.tss)), 'TSS');
    fact(J.jx(r.date), '');
    const mt = J.meteo && J.meteo(r.date); if (mt) fact(mt, '');
    body.appendChild(facts);
    const f = J.friends(amis[r.id]); if (f) { f.style.marginTop = '6px'; body.appendChild(f); }
    let tree = [];
    if (jbBike(r.sport) && r.profil) { try { tree = JSON.parse(r.profil || '[]'); } catch (e) { tree = []; } }
    const blocks = jbFlat(tree);
    if (blocks.length) { jbProfile(body, blocks, cp, pma); body.appendChild(jbSteps(tree, cp, pma)); }
    else if (jbBike(r.sport) && later) body.appendChild(J.el('div', 'sub', 'Profil détaillé disponible 7 jours avant la séance.'));
    const acts = J.el('div', 'actions');
    if (blocks.length && cp) {
      const a = J.btn('Télécharger pour Garmin (.fit)', 'dl');
      a.setAttribute('href', jbFit(r.nom, tree, cp));
      a.setAttribute('download', r.date + ' ' + String(r.nom || 'seance').replace(/[^A-Za-z0-9 _-]+/g, ' ').replace(/[ ]+/g, ' ').trim().slice(0, 40) + '.fit');
      acts.appendChild(a);
    }
    const cal = J.btn('Ajouter à mon agenda', 'cal');
    J.ics(cal, { uid: r.id, debut: r.date, titre: r.nom + ' (avec ' + window.CONFIG.prenom + ')', heure: jbHour[r.moment], minutes: r.duree_min, texte: J.sport(r.sport) + ' · ' + J.dur(r.duree_min) + (r.tss != null ? ' · ' + Math.round(r.tss) + ' TSS' : '') });
    acts.appendChild(cal);
    body.appendChild(acts);
  }
});

dash.draw('past7', (el) => {
  const d = dash.data('recentes'), pv = dash.data('prevu');
  if (J.wait(el, d, 'Chargement des séances faites…')) return;
  el.replaceChildren();
  if (!d.data.length) { el.appendChild(J.el('div', 'sub', 'Aucune séance ces 7 derniers jours.')); return; }
  const plan = {}; if (pv.status === 'ok') for (const p of pv.data) plan[p.id] = p;
  for (const r of d.data) {
    const card = J.el('article', 'card');
    card.appendChild(J.el('div', 'sub', J.wd(r.date, true) + ' ' + J.dm(r.date) + ' · ' + J.sport(r.sport)));
    const n = J.el('div', 'sess-name', r.nom || '—'); n.style.fontSize = '16px'; card.appendChild(n);
    const tp = r.prevue && plan[r.prevue] && plan[r.prevue].tss != null ? Math.round(plan[r.prevue].tss) : null;
    if (r.masque) { card.appendChild(J.el('div', 'sub', 'Données masquées (import Strava).')); el.appendChild(card); continue; }
    card.appendChild(J.metrics([
      ['Durée', J.dur(r.duree_min)], ['Distance', r.km != null ? J.num(r.km, 1) + ' km' : '—'], ['Vitesse', r.vitesse != null ? J.num(r.vitesse, 1) + ' km/h' : '—'],
      ['W moyen', r.w_moy != null ? r.w_moy + ' W' : '—'], ['FC moyenne', r.fc_moy != null ? r.fc_moy + ' bpm' : '—'], ['TSS prévu → fait', (tp != null ? tp : '—') + ' → ' + (r.tss_reel != null ? r.tss_reel : '—')]
    ]));
    if (r.zones) J.zbar(card, String(r.zones).split(';').map(Number), true);
    el.appendChild(card);
  }
});
