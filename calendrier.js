/* Page Calendrier */
window.jbLabs = new Set();
window.jbStat = new Set();
window.jbMois = '';
window.jbPasse = false;
const jbCalSync = () => {
  for (const o of document.querySelectorAll('.jb-lab')) o.setAttribute('aria-pressed', String(o.dataset.lab === 'tout' ? window.jbLabs.size === 0 : window.jbLabs.has(o.dataset.lab)));
  for (const o of document.querySelectorAll('.jb-stat')) o.setAttribute('aria-pressed', String(o.dataset.stat === 'tous' ? window.jbStat.size === 0 : window.jbStat.has(o.dataset.stat)));
  for (const s of document.querySelectorAll('.jb-stats')) s.hidden = !window.jbLabs.has('objectif');
  for (const o of document.querySelectorAll('.jb-passe')) o.setAttribute('aria-pressed', String(window.jbPasse));
};
for (const b of document.querySelectorAll('.jb-lab')) {
  b.addEventListener('click', () => {
    const l = b.dataset.lab;
    if (l === 'tout') window.jbLabs.clear(); else if (window.jbLabs.has(l)) window.jbLabs.delete(l); else window.jbLabs.add(l);
    if (!window.jbLabs.has('objectif')) window.jbStat.clear();
    jbCalSync(); dash.draw('cal');
  });
}
for (const b of document.querySelectorAll('.jb-stat')) {
  b.addEventListener('click', () => {
    const s = b.dataset.stat;
    if (s === 'tous') window.jbStat.clear(); else if (window.jbStat.has(s)) window.jbStat.delete(s); else window.jbStat.add(s);
    jbCalSync(); dash.draw('cal');
  });
}
for (const b of document.querySelectorAll('.jb-passe')) b.addEventListener('click', () => { window.jbPasse = !window.jbPasse; jbCalSync(); dash.draw('cal'); });
for (const s of document.querySelectorAll('.jb-mois')) s.addEventListener('change', () => { window.jbMois = s.value; dash.draw('cal'); });
jbCalSync();

dash.draw('cal', (el) => {
  const d = dash.data('calendrier');
  if (J.wait(el, d)) return;
  el.replaceChildren();
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
  el.appendChild(J.el('div', 'jb-sub', window.jbPasse ? 'Le passé est affiché (grisé).' : past ? past + ' élément' + (past > 1 ? 's' : '') + ' déjà passé' + (past > 1 ? 's' : '') + ' masqué' + (past > 1 ? 's' : '') + '.' : 'Rien de passé dans cette sélection.'));
  if (!rows.length) { el.appendChild(J.el('div', 'jb-sub', 'Rien dans cette sélection.')); return; }
  let month = '';
  for (const r of rows) {
    const mth = r.debut.slice(0, 7);
    if (mth !== month) { month = mth; el.appendChild(J.el('div', 'jb-month', new Date(mth + '-15T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }))); }
    const det = J.el('details', 'jb-ev' + ((r.fin || r.debut) < J.today ? ' jb-past' : '') + (r.statut === 'Refusée' ? ' jb-refused' : ''));
    const sum = J.el('summary');
    sum.appendChild(J.el('span', 'jb-row-head', J.dm(r.debut) + (r.fin && r.fin !== r.debut ? ' → ' + J.dm(r.fin) : '')));
    const box = J.el('div', 'jb-ev-name');
    const cat = J.el('span', 'jb-chip jb-chip-cat', r.cat);
    if (/^A[0-9]?$|^B$/.test(r.cat)) { cat.style.background = 'var(--jb-c0)'; cat.style.color = 'var(--color-bg)'; cat.style.borderColor = 'var(--jb-c0)'; }
    if (r.cat === 'Vacances') { cat.style.color = 'var(--color-ok)'; cat.style.borderColor = 'var(--color-ok)'; }
    if (r.cat === 'Week-end choc') { cat.style.color = 'var(--color-warn)'; cat.style.borderColor = 'var(--color-warn)'; }
    if (r.cat === 'Mésocycle' && r.couleur) { cat.style.borderColor = r.couleur; cat.style.color = r.couleur; }
    box.append(cat, J.el('span', 'jb-ev-title', r.titre));
    if (r.statut) { const s = J.el('span', 'jb-chip', r.statut); if (r.couleur && r.cat !== 'Mésocycle') { s.style.color = r.couleur; s.style.borderColor = r.couleur; } box.appendChild(s); }
    sum.appendChild(box); det.appendChild(sum);
    det.appendChild(J.el('div', 'jb-ev-text', r.texte ? r.texte : 'Pas de description.'));
    el.appendChild(det);
  }
});
