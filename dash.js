/* Remplace la couche « dash » de Claude : les données viennent de data/hebdo.json et data/jour.json,
   écrits chaque nuit par une tâche qui lit Nolio. */
(() => {
  const raw = {};
  let status = 'loading', message = '';
  const calcs = {}, cache = {}, draws = {};

  const obj = (cols) => (a) => { const o = {}; cols.forEach((c, i) => { o[c] = a[i] === undefined ? null : a[i]; }); return o; };
  const COLS = {
    charge: ['date', 'tss', 'ctl', 'atl', 'tsb'],
    charge_plan: ['date', 'tss', 'ctl', 'atl', 'tsb'],
    prevu: ['id', 'date', 'nom', 'sport', 'duree_min', 'tss'],
    reel: ['id', 'date', 'nom', 'sport', 'prevue', 'duree_s', 'km', 'dplus', 'zones'],
    metrique: ['date', 'valeur', 'commentaire', 'source'],
    record: ['duree_s', 'watts', 'date']
  };
  const METRIQUES = ['cp', 'pma', 'poids', 'rmssd', 'fcrepos', 'facteur', 'glucides', 'glucides_max', 'sudation'];

  const build = (h, j, a) => {
    const d = {};
    d.charge = (j.charge || []).map(obj(COLS.charge));
    d.charge_plan = (h.charge_plan || []).map(obj(COLS.charge_plan));
    for (const m of METRIQUES) d[m] = ((j.metriques || {})[m] || []).map(obj(COLS.metrique));
    for (const r of ['records', 'records_prev', 'records_all']) d[r] = ((h.records || {})[r] || []).map(obj(COLS.record));
    // Prévu et réalisé : la copie de la semaine, remplacée par celle du jour sur sa fenêtre
    const merge = (base, recent, from, to) => base.filter((r) => r.date < from || r.date > to).concat(recent).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const pv = (h.prevu || []).map(obj(COLS.prevu)), pvj = (j.prevu || []).map(obj(COLS.prevu));
    const rl = (h.reel || []).map(obj(COLS.reel)), rlj = (j.reel || []).map(obj(COLS.reel));
    d.prevu = j.fenetre_prevu ? merge(pv, pvj, j.fenetre_prevu[0], j.fenetre_prevu[1]) : pv;
    d.reel = j.fenetre_reel ? merge(rl, rlj, j.fenetre_reel[0], j.fenetre_reel[1]) : rl;
    d.notes = h.notes || [];
    d.objectifs = h.objectifs || [];
    d.cycles = h.cycles || [];
    d.statuts = h.statuts || [];
    d.saison_note = h.saison_note ? [h.saison_note] : [];
    d.amis = [a || {}];
    d.seances7 = (j.seances7 || []).map((r) => Object.assign({}, r, { profil: JSON.stringify(r.profil || []) }));
    d.recentes = (j.recentes || []).map((r) => {
      let tw = 0, sw = 0, th = 0, sh = 0;
      for (const t of r.tours || []) { if (t[1]) { tw += t[0]; sw += t[1] * t[0]; } if (t[2]) { th += t[0]; sh += t[2] * t[0]; } }
      const sec = r.duree_s, km = r.km;
      return { id: r.id, date: r.date, nom: r.nom, sport: r.sport, prevue: r.prevue || null, duree_min: sec != null ? Math.round(sec / 60) : null, km: km != null ? Math.round(km * 10) / 10 : null, dplus: r.dplus, vitesse: sec && km ? Math.round(km / (sec / 3600) * 10) / 10 : null, w_moy: tw ? Math.round(sw / tw) : null, fc_moy: th ? Math.round(sh / th) : null, tss_reel: r.tss != null ? Math.round(r.tss) : null, zones: r.zones || '', masque: r.masque ? 'oui' : '' };
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
    return d;
  };

  const ok = (rows) => ({ status: 'ok', data: rows, message: '', refreshing: false, truncated: false, meta: null });
  window.dash = {
    colors: ['var(--c0)', 'var(--c1)', 'var(--c2)', '#8E5BD6', '#D24C6B', '#6B7A8F'],
    loader: () => {},
    setLink: (name) => { try { history.replaceState(null, '', '#' + name); } catch (e) { /* rien */ } },
    calc: (id, def) => { calcs[id] = def; },
    data: (id) => {
      if (status !== 'ok') return { status, data: [], message };
      if (id in raw) return ok(raw[id]);
      if (calcs[id]) {
        if (!(id in cache)) {
          const ins = calcs[id].inputs.map((i) => window.dash.data(i));
          if (ins.some((x) => x.status !== 'ok')) return { status: 'loading', data: null };
          try { cache[id] = calcs[id].fn(...ins.map((x) => x.data)); } catch (e) { console.error(id, e); return { status: 'error', data: null, message: String(e) }; }
        }
        return ok(cache[id]);
      }
      return { status: 'missing', data: [] };
    },
    draw: (name, fn) => {
      if (fn) draws[name] = fn;
      const f = draws[name]; if (!f) return;
      for (const el of document.querySelectorAll('[data-draw="' + name + '"]')) {
        if (el.closest('[hidden]')) continue;
        try { f(el); } catch (e) { console.error(name, e); }
      }
    },
    drawAll: () => { for (const n of Object.keys(draws)) window.dash.draw(n); }
  };

  Promise.all(['data/hebdo.json', 'data/jour.json', 'data/amis.json'].map((u) => fetch(u + '?v=' + Date.now()).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))))
    .then(([h, j, a]) => {
      Object.assign(raw, build(h, j, a));
      status = 'ok';
      const m = document.getElementById('maj');
      const f = (s) => s.slice(8, 10) + '/' + s.slice(5, 7) + ' à ' + s.slice(11, 16);
      if (m) m.textContent = j.maj ? 'Mis à jour depuis Nolio le ' + f(j.maj) : 'Données Nolio indisponibles';
      window.dash.drawAll();
    })
    .catch((e) => { status = 'error'; message = String(e); window.dash.drawAll(); });

  // Redessine quand une page cachée s'affiche ou que la largeur change
  const mo = new MutationObserver((list) => { if (list.some((m) => !m.target.hidden)) window.dash.drawAll(); });
  const watch = () => { for (const s of document.querySelectorAll('.page')) mo.observe(s, { attributes: true, attributeFilter: ['hidden'] }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  let w = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - w) > 40) { w = window.innerWidth; window.dash.drawAll(); } });
})();
