/* Page « Courses » : calendrier de la saison, pour les amis (je viens, agenda) et pour Johan (textes complets) */
window.jbLabs = new Set(['objectif']);
window.jbStat = new Set();
window.jbMois = '';
window.jbPasse = false;
const jbCalSync = () => {
  for (const o of document.querySelectorAll('.lab')) o.setAttribute('aria-pressed', String(o.dataset.lab === 'tout' ? window.jbLabs.size === 0 : window.jbLabs.has(o.dataset.lab)));
  for (const o of document.querySelectorAll('.stat')) o.setAttribute('aria-pressed', String(o.dataset.stat === 'tous' ? window.jbStat.size === 0 : window.jbStat.has(o.dataset.stat)));
  for (const s of document.querySelectorAll('.stats')) s.hidden = !window.jbLabs.has('objectif');
  for (const o of document.querySelectorAll('.passe')) o.setAttribute('aria-pressed', String(window.jbPasse));
};
for (const b of document.querySelectorAll('.lab')) {
  b.addEventListener('click', () => {
    const l = b.dataset.lab;
    if (l === 'tout') window.jbLabs.clear(); else if (window.jbLabs.has(l)) window.jbLabs.delete(l); else window.jbLabs.add(l);
    if (!window.jbLabs.has('objectif')) window.jbStat.clear();
    jbCalSync(); dash.draw('cal');
  });
}
for (const b of document.querySelectorAll('.stat')) {
  b.addEventListener('click', () => {
    const s = b.dataset.stat;
    if (s === 'tous') window.jbStat.clear(); else if (window.jbStat.has(s)) window.jbStat.delete(s); else window.jbStat.add(s);
    jbCalSync(); dash.draw('cal');
  });
}
for (const b of document.querySelectorAll('.passe')) b.addEventListener('click', () => { window.jbPasse = !window.jbPasse; jbCalSync(); dash.draw('cal'); });
for (const s of document.querySelectorAll('.mois')) s.addEventListener('change', () => { window.jbMois = s.value; dash.draw('cal'); });
jbCalSync();

const jbRole = (cat) => (/^A[0-9]?$/.test(cat) ? 'a' : cat === 'B' ? 'b' : cat === 'C' || /^C (possible|·)/.test(cat) ? 'c' : '');
const jbAmis = () => { const a = dash.data('amis'); return a.status === 'ok' && a.data[0] ? a.data[0] : {}; };

const jbRaceActions = (r, km, dp) => {
  const box = J.el('div', 'actions');
  const when = J.wd(r.debut, true) + ' ' + J.dm(r.debut) + (r.fin && r.fin !== r.debut ? ' au ' + J.dm(r.fin) : '');
  const join = J.btn('Je viens', 'hand', 'go');
  J.joinLink(join, 'Salut ' + window.CONFIG.prenom + ' ! Je viens avec toi à « ' + r.titre + ' » (' + when + ').');
  const cal = J.btn('Ajouter à mon agenda', 'cal');
  J.ics(cal, { uid: r.id, debut: r.debut, fin: r.fin, titre: r.titre, texte: [km ? km + ' km' : '', dp ? dp + ' m D+' : '', 'Avec ' + window.CONFIG.prenom, location.href.split('#')[0] + '#courses'].filter(Boolean).join(' · ') });
  box.append(join, cal);
  return box;
};

/* Les prochaines courses retenues, en grand */
dash.draw('nextraces', (el) => {
  const d = dash.data('calendrier'), ob = dash.data('objectifs');
  if (J.wait(el, d)) return;
  el.replaceChildren();
  const byId = {}; if (ob.status === 'ok') for (const o of ob.data) byId[o.id] = o;
  const amis = jbAmis();
  const next = d.data.filter((r) => String(r.labels).includes('course') && r.debut >= J.today && r.statut !== 'Refusée' && (r.statut === 'Gardée' || /^(a|b)$/.test(jbRole(r.cat)))).slice(0, 3);
  for (const r of next) {
    const o = byId[r.id] || {};
    const c = J.el('article', 'card');
    const top = J.el('div', 'ev-meta'); top.style.marginTop = '0';
    const role = jbRole(r.cat);
    top.append(J.el('span', 'tag' + (role ? ' ' + role : ''), r.cat), J.el('span', null, J.jx(r.debut)));
    c.appendChild(top);
    const h = J.el('h3', null, r.titre); h.style.marginTop = '8px'; c.appendChild(h);
    c.appendChild(J.el('div', 'sub', J.wd(r.debut, true) + ' ' + J.dm(r.debut) + (o.km ? ' · ' + J.num(o.km) + ' km' : '') + (o.dplus ? ' · ' + J.num(o.dplus) + ' m D+' : '')));
    const f = J.friends(amis[r.id]); if (f) { f.style.marginTop = '8px'; c.appendChild(f); }
    c.appendChild(jbRaceActions(r, o.km, o.dplus));
    el.appendChild(c);
  }
});

dash.draw('cal', (el) => {
  const d = dash.data('calendrier'), ob = dash.data('objectifs');
  if (J.wait(el, d)) return;
  el.replaceChildren();
  const byId = {}; if (ob.status === 'ok') for (const o of ob.data) byId[o.id] = o;
  const amis = jbAmis();
  const mois = window.jbMois, labs = window.jbLabs, stat = window.jbStat;
  let past = 0;
  const rows = d.data.filter((r) => {
    if (mois && !(r.debut.slice(0, 7) <= mois && (r.fin || r.debut).slice(0, 7) >= mois)) return false;
    const l = String(r.labels).split(';');
    if (labs.size && ![...labs].some((x) => l.includes(x))) return false;
    if (stat.size && l.includes('course') && ![...stat].some((x) => l.includes(x))) return false;
    if (!window.jbPasse && (r.fin || r.debut) < J.today) { past++; return false; }
    return true;
  });
  el.appendChild(J.el('div', 'sub', window.jbPasse ? 'Le passé est affiché (grisé).' : past ? past + ' élément' + (past > 1 ? 's' : '') + ' déjà passé' + (past > 1 ? 's' : '') + ' masqué' + (past > 1 ? 's' : '') + '.' : ''));
  if (!rows.length) { el.appendChild(J.el('div', 'sub', 'Rien dans cette sélection. Choisis un autre filtre ou un autre mois.')); return; }
  let month = '';
  for (const r of rows) {
    const mth = r.debut.slice(0, 7);
    if (mth !== month) { month = mth; el.appendChild(J.el('div', 'month', J.mlong(mth))); }
    const l = String(r.labels).split(';');
    const isRace = l.includes('course') || r.cat === 'C · challenge';
    const role = jbRole(r.cat);
    const o = byId[r.id] || {};
    const det = J.el('details', 'ev' + (role ? ' role-' + role : '') + (!isRace ? ' small' : '') + ((r.fin || r.debut) < J.today ? ' past' : '') + (r.statut === 'Refusée' ? ' refused' : ''));
    const sum = J.el('summary');
    const dt = J.el('div', 'ev-date'); dt.append(J.el('b', null, String(Number(r.debut.slice(8, 10)))), J.el('span', null, J.wd(r.debut)));
    const mid = J.el('div');
    mid.appendChild(J.el('div', 'ev-title', r.titre));
    const meta = J.el('div', 'ev-meta');
    const cat = J.el('span', 'tag' + (role ? ' ' + role : r.cat === 'Week-end choc' ? ' choc' : r.cat === 'Vacances' ? ' vac' : ''), r.cat);
    if (r.cat === 'Mésocycle' && r.couleur) { cat.style.color = r.couleur; cat.style.borderColor = r.couleur; }
    meta.appendChild(cat);
    if (r.statut) { const s = J.el('span', 'tag', r.statut); if (r.couleur && r.cat !== 'Mésocycle') { s.style.color = r.couleur; s.style.borderColor = r.couleur; } meta.appendChild(s); }
    if (r.fin && r.fin !== r.debut) meta.appendChild(J.el('span', null, 'jusqu’au ' + J.dm(r.fin)));
    if (o.km || o.dplus) meta.appendChild(J.el('span', null, [o.km ? J.num(o.km) + ' km' : '', o.dplus ? J.num(o.dplus) + ' m D+' : ''].filter(Boolean).join(' · ')));
    const f = J.friends(amis[r.id]); if (f) meta.appendChild(f);
    mid.appendChild(meta);
    sum.append(dt, mid);
    if (isRace) sum.appendChild(J.el('div', 'ev-right', (r.fin || r.debut) < J.today ? '' : J.jx(r.debut)));
    det.appendChild(sum);
    const body = J.el('div', 'ev-body');
    if (isRace && r.statut !== 'Refusée' && (r.fin || r.debut) >= J.today) body.appendChild(jbRaceActions(r, o.km, o.dplus));
    const tx = J.el('div', 'ev-text', r.texte ? r.texte : 'Pas de description.'); tx.style.marginTop = '10px';
    body.appendChild(tx);
    det.appendChild(body);
    el.appendChild(det);
  }
});
