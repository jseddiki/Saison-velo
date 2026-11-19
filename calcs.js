/* Calculs à partir des données Nolio */
dash.calc('macros', {
  title: 'Macrocycles',
  description: 'Macrocycles lus dans la note « Saison 2026-2027 » : numéro, nom, dates et contenu. Une date sans année prend l’année qui suit la date précédente.',
  inputs: ['saison_note'],
  fn: (saison_note) => {
    const tx = String((saison_note[0] && saison_note[0].texte) || '');
    const i = tx.indexOf('MACROCYCLES'); if (i < 0) return [];
    const j = tx.indexOf('MÉSOCYCLES', i);
    const seg = tx.slice(i, j > 0 ? j : undefined).split(String.fromCharCode(10)).slice(1);
    let last = '2026-10-01';
    const iso = (s) => { const p = s.split('/'); let y = p[2] ? Number(p[2]) : Number(last.slice(0, 4)); let d = y + '-' + p[1] + '-' + p[0]; if (!p[2] && d < last) d = (y + 1) + '-' + p[1] + '-' + p[0]; last = d; return d; };
    const rows = [];
    for (const l of seg) {
      const m = l.match(/^([0-9]+) · (.+?) · ([0-9]{2}[/][0-9]{2}(?:[/][0-9]{4})?) → ([0-9]{2}[/][0-9]{2}(?:[/][0-9]{4})?)(.*)$/);
      if (!m) continue;
      let debut, fin;
      if (m[3].length < 10 && m[4].length === 10) { fin = m[4].split('/').reverse().join('-'); const p = m[3].split('/'); debut = fin.slice(0, 4) + '-' + p[1] + '-' + p[0]; if (debut > fin) debut = (Number(fin.slice(0, 4)) - 1) + '-' + p[1] + '-' + p[0]; last = fin; }
      else { debut = iso(m[3]); fin = iso(m[4]); }
      rows.push({ num: Number(m[1]), nom: m[2], debut, fin, contenu: m[5].replace(/^[ ]*·[ ]*/, '').trim() });
    }
    return rows;
  }
});

dash.calc('semaines', {
  title: 'Charge par semaine',
  description: 'Par semaine du lundi au dimanche : TSS prévu, réalisé, cible du mésocycle, mésocycle, objectifs, week-ends chocs et vacances.',
  inputs: ['prevu', 'charge', 'cycles', 'objectifs', 'notes'],
  fn: (prevu, charge, cycles, objectifs, notes) => {
    const mon = (s) => { const d = new Date(String(s).slice(0, 10) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); };
    const add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const rows = [], idx = {};
    for (let w = '2026-10-26'; w <= '2027-10-31'; w = add(w, 7)) { const r = { lundi: w, prevu: 0, realise: 0, cible: null, cycle: '', couleur: '', objectif: '', vacances: '' }; rows.push(r); idx[w] = r; }
    for (const r of prevu) if (r.tss != null) { const w = idx[mon(r.date)]; if (w) w.prevu += Number(r.tss); }
    for (const r of charge) if (r.tss != null) { const w = idx[mon(r.date)]; if (w) w.realise += Number(r.tss); }
    for (const c of cycles) {
      if (!c.debut) continue;
      for (const w of rows) if (w.lundi >= mon(c.debut) && w.lundi <= (c.fin || c.debut)) { w.cycle = c.nom; w.couleur = /^#[0-9a-f]{6}$/i.test(c.couleur || '') ? c.couleur : ''; }
      const txt = String(c.description || '').replace(new RegExp('[' + String.fromCharCode(160, 8239) + ']', 'g'), ' ');
      const i = txt.indexOf('Charge par semaine'); if (i < 0) continue;
      let seg = txt.slice(i); const j = seg.indexOf('Progression'); if (j > 0) seg = seg.slice(0, j);
      const re = /([0-9]{2})[/]([0-9]{2})[ ]*:[ ]*≈?[ ]*([0-9]{1,3}(?: [0-9]{3})*)/g; let m;
      const y0 = Number(c.debut.slice(0, 4)), m0 = Number(c.debut.slice(5, 7));
      while ((m = re.exec(seg))) { const y = Number(m[2]) < m0 ? y0 + 1 : y0; const w = idx[mon(y + '-' + m[2] + '-' + m[1])]; if (w) w.cible = Number(m[3].replace(/ /g, '')); }
    }
    for (const o of objectifs) if (o.type === 'a' || o.type === 'b') { const w = idx[mon(o.date)]; if (w) w.objectif = (w.objectif ? w.objectif + ' · ' : '') + o.type.toUpperCase() + ' ' + o.nom; }
    for (const n of notes) {
      const w = idx[mon(n.debut)]; if (!w) continue;
      if (n.type === 'goal' || /^C · /.test(n.nom || '')) w.objectif = (w.objectif ? w.objectif + ' · ' : '') + 'C ' + String(n.nom).replace(/^C · /, '');
      else if (/^Week-end choc/i.test(n.nom || '')) w.objectif = (w.objectif ? w.objectif + ' · ' : '') + 'W ' + n.nom;
      if (n.type === 'availability' && !n.duree_s) for (let d = n.debut; d <= (n.fin || n.debut); d = add(d, 1)) { const x = idx[mon(d)]; if (x && !x.vacances.includes(n.nom)) x.vacances = (x.vacances ? x.vacances + ' · ' : '') + n.nom; }
    }
    for (const r of rows) { r.prevu = Math.round(r.prevu); r.realise = Math.round(r.realise); }
    return rows;
  }
});

dash.calc('resume', {
  title: 'Résumé du jour',
  description: 'Forme, fatigue et fraîcheur du jour, dernières CP et PMA, jours restants avant A1, A2 et A3.',
  inputs: ['charge', 'cp', 'pma', 'objectifs'],
  fn: (charge, cp, pma, objectifs) => {
    const today = window.J.today;
    const last = (a) => a.filter((r) => r.valeur != null).sort((x, y) => (x.date < y.date ? 1 : -1))[0] || {};
    const day = charge.filter((r) => r.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || {};
    const c = last(cp), p = last(pma);
    const out = { ctl: day.ctl != null ? Math.round(day.ctl) : null, atl: day.atl != null ? Math.round(day.atl) : null, tsb: day.tsb != null ? Math.round(day.tsb) : null, cp: c.valeur != null ? c.valeur : null, cp_date: c.date || null, pma: p.valeur != null ? p.valeur : null, pma_date: p.date || null };
    for (const k of ['A1', 'A2', 'A3']) {
      const o = objectifs.find((x) => x.code === k);
      out[k.toLowerCase() + '_nom'] = o ? o.nom : null;
      out[k.toLowerCase() + '_j'] = o ? Math.round((Date.parse(o.date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000) : null;
    }
    return [out];
  }
});

dash.calc('zones_meso', {
  title: 'Intensités du mésocycle',
  description: 'Temps passé dans chaque zone de puissance (Z1 à Z7), séances faites depuis le début du mésocycle en cours.',
  inputs: ['reel', 'cycles'],
  fn: (reel, cycles) => {
    const today = window.J.today;
    const c = cycles.find((x) => x.debut <= today && (x.fin || x.debut) >= today);
    if (!c) return [];
    const tot = [0, 0, 0, 0, 0, 0, 0]; let n = 0;
    for (const r of reel) {
      if (r.date < c.debut || r.date > (c.fin || c.debut) || !r.zones) continue;
      const s = String(r.zones).split(';').map(Number); if (s.length !== 7) continue;
      n++; s.forEach((v, i) => { tot[i] += v || 0; });
    }
    const all = tot.reduce((a, b) => a + b, 0);
    return tot.map((v, i) => ({ zone: 'Z' + (i + 1), heures: Math.round(v / 360) / 10, pct: all ? Math.round(v / all * 1000) / 10 : 0, seances: n, meso: c.nom }));
  }
});

dash.calc('quetes', {
  title: 'Quêtes et badges',
  description: 'Valeur de chaque quête face à ses paliers : PMA, CP, glucides validés, tests de sudation, renfo, km et D+ de la saison.',
  inputs: ['cp', 'pma', 'glucides_max', 'sudation', 'reel'],
  fn: (cp, pma, glucides_max, sudation, reel) => {
    const last = (a) => a.filter((r) => r.valeur != null).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    const c = last(cp), p = last(pma), g = last(glucides_max);
    const sud = sudation.filter((r) => r.valeur != null).sort((x, y) => (x.date < y.date ? 1 : -1));
    const season = reel.filter((r) => r.date >= '2026-10-26' && r.date <= '2027-10-31');
    const bike = season.filter((r) => r.sport === 'spt_B41yRYTUXKNmWr8' || r.sport === 'spt_wSAjGr1yXKlkEVU');
    const km = Math.round(bike.reduce((a, r) => a + (Number(r.km) || 0), 0));
    const dplus = Math.round(bike.reduce((a, r) => a + (Number(r.dplus) || 0), 0));
    const renfo = season.filter((r) => r.sport === 'spt_vxmhSsLPpMbXD21').length;
    const EV = 8848;
    const Q = [
      { id: 'pma', titre: 'PMA', unite: 'W', paliers: [300, 310, 320, 330, 340, 350], valeur: p ? Number(p.valeur) : null, note: '' },
      { id: 'cp', titre: 'Puissance critique (CP)', unite: 'W', paliers: [250, 260, 270, 280, 290, 300], valeur: c ? Number(c.valeur) : null, note: '' },
      { id: 'glucides', titre: 'Glucides validés par heure', unite: 'g/h', paliers: [60, 70, 75, 80, 90, 100], valeur: g ? Number(g.valeur) : null, note: g ? '' : 'Pas encore de valeur : l’analyse du soir la remplit après chaque sortie.' },
      { id: 'sudation', titre: 'Tests de sudation', unite: 'tests', paliers: [1, 2, 3], valeur: sud.length || null, note: sud.length ? 'Dernier test : ' + Number(sud[0].valeur).toLocaleString('fr-FR') + ' L/h' : 'Pas encore de test : home trainer, dehors au froid, dehors au chaud.' },
      { id: 'renfo', titre: 'Séances de muscu de la saison', unite: 'séances', paliers: [10, 25, 50, 75, 100], valeur: renfo, note: '' },
      { id: 'km', titre: 'Kilomètres à vélo de la saison', unite: 'km', paliers: [2500, 5000, 7500, 10000, 12500, 15000], valeur: km, note: '' },
      { id: 'dplus', titre: 'Dénivelé de la saison', unite: 'm', paliers: [1, 2, 4, 6, 8, 10, 12].map((k) => k * EV), valeur: dplus, note: (dplus / EV).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' fois l’Everest (8 848 m)', label: 'everest' }
    ];
    return Q.map((q) => {
      const won = q.valeur == null ? 0 : q.paliers.filter((x) => q.valeur >= x).length;
      return { id: q.id, titre: q.titre, unite: q.unite, valeur: q.valeur, paliers: q.paliers.join(';'), atteints: won, prochain: won < q.paliers.length ? q.paliers[won] : null, note: q.note, label: q.label || '' };
    });
  }
});

dash.calc('mesos', {
  title: 'Qualités des mésocycles',
  description: 'Pour chaque mésocycle de la note « Saison 2026-2027 » : rôle, type de charge et qualités travaillées.',
  inputs: ['saison_note'],
  fn: (saison_note) => {
    const tx = String((saison_note[0] && saison_note[0].texte) || '');
    const i = tx.indexOf('MÉSOCYCLES'); if (i < 0) return [];
    const j = tx.indexOf('WEEK-ENDS CHOCS', i);
    const rows = [];
    for (const l of tx.slice(i, j > 0 ? j : undefined).split(String.fromCharCode(10)).slice(1)) {
      const m = l.match(/^([0-9]+) · (.+?) · (.+?) · (.+)$/);
      if (m) rows.push({ num: Number(m[1]), role: m[2], charge: m[3], qualites: m[4] });
    }
    return rows;
  }
});

dash.calc('calendrier', {
  title: 'Calendrier de la saison',
  description: 'Macrocycles, mésocycles, courses (rôle et statut), objectifs C, week-ends chocs, challenges et vacances, avec leur texte.',
  inputs: ['macros', 'mesos', 'cycles', 'objectifs', 'notes', 'statuts'],
  fn: (macros, mesos, cycles, objectifs, notes, statuts) => {
    const tag = {}; for (const s of statuts) tag[s.id] = s;
    const NL = String.fromCharCode(10);
    const mesoText = (c) => {
      const mm = String(c.nom || '').match(/Méso ([0-9]+)/); const q = mm ? mesos.find((x) => x.num === Number(mm[1])) : null;
      const out = [];
      if (q) out.push('Qualités travaillées : ' + q.qualites, 'Type de charge : ' + q.charge, '');
      let d = String(c.description || '').replace(new RegExp('[' + String.fromCharCode(160, 8239) + ']', 'g'), ' ');
      const ci = d.indexOf('Charge par semaine');
      if (ci >= 0) {
        let end = d.indexOf(NL, ci); if (end < 0) end = d.length;
        const line = d.slice(ci, end);
        const parts = line.replace(/^Charge par semaine[ ]*:[ ]*/, '').split(' · ');
        d = d.slice(0, ci) + 'Charge par semaine :' + NL + parts.map((p) => '- semaine du ' + p.replace(/^([0-9]{2}[/][0-9]{2})[ ]*:[ ]*/, '$1 : ').replace(/^([0-9]{2}[/][0-9]{2} : ≈?[ ]*[0-9]+(?: [0-9]{3})*)/, '$1 TSS')).join(NL) + d.slice(end);
      }
      out.push(d);
      return out.join(NL);
    };
    const rows = [];
    for (const m of macros) rows.push({ id: 'macro' + m.num, debut: m.debut, fin: m.fin, titre: 'Macro ' + m.num + ' · ' + m.nom, cat: 'Macrocycle', labels: 'macro', statut: '', couleur: '', texte: String(m.contenu || '').split(' · ').join(NL) });
    for (const c of cycles) rows.push({ id: 'meso' + c.debut, debut: c.debut, fin: c.fin || c.debut, titre: c.nom, cat: 'Mésocycle', labels: 'meso', statut: '', couleur: /^#[0-9a-f]{6}$/i.test(c.couleur || '') ? c.couleur : '', texte: mesoText(c) });
    for (const o of objectifs) {
      const h = String(o.entete || '').toUpperCase();
      const s = tag[o.etiquette];
      const labs = ['course', 'objectif'];
      let cat = 'Course';
      if (o.type === 'a') cat = o.code || 'A';
      else if (o.type === 'b') cat = 'B';
      else if (h.startsWith('CHALLENGE')) { cat = 'Challenge'; labs.push('challenge'); }
      else if (h.includes('OBJECTIF C')) cat = 'C';
      else if (/^C (CANDIDATE|POSSIBLE|PARTIELLE)/.test(h)) cat = 'C possible';
      if (s) { labs.push(s.nom); if (s.nom === 'Sélection requise') labs.push('En attente'); }
      rows.push({ id: o.id, debut: o.date, fin: o.date, titre: o.nom, cat, labels: labs.join(';'), statut: s ? s.nom : '', couleur: s && /^#[0-9a-f]{6}$/i.test(s.couleur || '') ? s.couleur : '', texte: o.texte });
    }
    for (const n of notes) {
      let cat = null, lab = null;
      if (n.type === 'goal' || /^C · /.test(n.nom || '')) { cat = 'C · challenge'; lab = 'challenge;objectif'; }
      else if (/^Week-end choc/i.test(n.nom || '')) { cat = 'Week-end choc'; lab = 'choc'; }
      else if (n.type === 'availability' && !n.duree_s) { cat = 'Vacances'; lab = 'vacances'; }
      if (cat) rows.push({ id: n.id, debut: n.debut, fin: n.fin || n.debut, titre: String(n.nom).replace(/^C · /, ''), cat, labels: lab, statut: '', couleur: '', texte: n.texte });
    }
    const rank = { Macrocycle: 0, Mésocycle: 1 };
    return rows.sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : (rank[a.cat] ?? 2) - (rank[b.cat] ?? 2)));
  }
});

dash.calc('wkg', {
  title: 'CP en W/kg',
  description: 'Chaque valeur de CP divisée par le poids le plus proche dans le temps.',
  inputs: ['cp', 'poids'],
  fn: (cp, poids) => {
    const pw = poids.filter((r) => r.valeur != null);
    return cp.filter((r) => r.valeur != null).map((r) => {
      const near = pw.reduce((b, q) => (!b || Math.abs(Date.parse(q.date) - Date.parse(r.date)) < Math.abs(Date.parse(b.date) - Date.parse(r.date)) ? q : b), null);
      return { date: r.date, cp: r.valeur, poids: near ? near.valeur : null, wkg: near ? Math.round(r.valeur / near.valeur * 100) / 100 : null };
    }).filter((r) => r.wkg != null);
  }
});

dash.calc('vfc', {
  title: 'VFC du matin',
  description: 'RMSSD et FC repos mesurées avec l’app Nolio (source nolio_hrv), par jour.',
  inputs: ['rmssd', 'fcrepos'],
  fn: (rmssd, fcrepos) => {
    const by = {};
    for (const r of rmssd) if (r.source === 'nolio_hrv' && r.valeur != null) (by[r.date] = by[r.date] || { date: r.date }).rmssd = r.valeur;
    for (const r of fcrepos) if (r.source === 'nolio_hrv' && r.valeur != null) (by[r.date] = by[r.date] || { date: r.date }).fcrepos = r.valeur;
    return Object.values(by).map((r) => ({ date: r.date, rmssd: r.rmssd ?? null, fcrepos: r.fcrepos ?? null })).sort((a, b) => (a.date < b.date ? -1 : 1));
  }
});

dash.calc('profil', {
  title: 'Profil de puissance',
  description: 'Meilleure puissance par durée : cette saison, la saison précédente et tout temps, avec la date du record.',
  inputs: ['records', 'records_prev', 'records_all'],
  fn: (records, records_prev, records_all) => {
    const ds = [5, 60, 300, 720, 1200, 3600, 10800];
    const get = (a, d) => a.find((x) => Number(x.duree_s) === d) || {};
    return ds.map((d) => { const s = get(records, d), p = get(records_prev, d), t = get(records_all, d); return { duree_s: d, saison: s.watts ?? null, saison_date: s.date || '', precedente: p.watts ?? null, precedente_date: p.date || '', tout: t.watts ?? null, tout_date: t.date || '' }; });
  }
});
