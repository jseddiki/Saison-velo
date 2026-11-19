/* Calculs ajoutés : volume, totaux de la saison, route du jeu, médailles */
dash.calc('volume', {
  title: 'Volume par semaine',
  description: 'Heures, km et D+ réalisés par semaine (vélo pour km et D+), à partir des séances faites.',
  inputs: ['reel'],
  fn: (reel) => {
    const by = {};
    for (const r of reel) {
      const w = J.mon(r.date); const o = (by[w] = by[w] || { lundi: w, heures: 0, km: 0, dplus: 0, seances: 0 });
      o.seances++; o.heures += (Number(r.duree_s) || 0) / 3600;
      if (J.bike(r.sport)) { o.km += Number(r.km) || 0; o.dplus += Number(r.dplus) || 0; }
    }
    return Object.values(by).sort((a, b) => (a.lundi < b.lundi ? -1 : 1));
  }
});

dash.calc('totaux', {
  title: 'La saison en chiffres',
  description: 'Totaux depuis le début de la saison : km et D+ à vélo, heures, séances, sortie la plus longue, TSS cumulé.',
  inputs: ['reel', 'charge'],
  fn: (reel, charge) => {
    const season = reel.filter((r) => r.date >= J.S0 && r.date <= J.today);
    const bike = season.filter((r) => J.bike(r.sport));
    const longest = bike.reduce((b, r) => ((Number(r.duree_s) || 0) > ((b && Number(b.duree_s)) || 0) ? r : b), null);
    const farthest = bike.reduce((b, r) => ((Number(r.km) || 0) > ((b && Number(b.km)) || 0) ? r : b), null);
    return [{
      km: Math.round(bike.reduce((a, r) => a + (Number(r.km) || 0), 0)),
      dplus: Math.round(bike.reduce((a, r) => a + (Number(r.dplus) || 0), 0)),
      heures: Math.round(season.reduce((a, r) => a + (Number(r.duree_s) || 0), 0) / 360) / 10,
      heures_velo: Math.round(bike.reduce((a, r) => a + (Number(r.duree_s) || 0), 0) / 360) / 10,
      seances: season.length, sorties: bike.length,
      renfo: season.filter((r) => r.sport === 'spt_vxmhSsLPpMbXD21').length,
      tss: Math.round(charge.filter((r) => r.date >= J.S0 && r.date <= J.today).reduce((a, r) => a + (Number(r.tss) || 0), 0)),
      long_h: longest ? Math.round(Number(longest.duree_s) / 360) / 10 : null, long_nom: longest ? longest.nom : '', long_date: longest ? longest.date : '',
      loin_km: farthest ? Math.round(Number(farthest.km)) : null, loin_nom: farthest ? farthest.nom : '', loin_date: farthest ? farthest.date : ''
    }];
  }
});

dash.calc('jeu', {
  title: 'La route vers l’objectif',
  description: 'Pour chaque objectif A : charge cumulée prévue par le plan (cible du mésocycle, sinon prévu) de la reprise jusqu’à la course, charge réalisée cumulée, et position des étapes (courses, C, week-ends chocs, tests) sur la route.',
  inputs: ['semaines', 'objectifs', 'notes', 'prevu', 'charge', 'statuts'],
  fn: (semaines, objectifs, notes, prevu, charge, statuts) => {
    const tag = {}; for (const s of statuts) tag[s.id] = s.nom;
    const plan = {}; for (const w of semaines) plan[w.lundi] = w.cible != null ? w.cible : w.prevu;
    const cum = (date) => { let t = 0; for (const w of semaines) { if (w.lundi > date) break; const end = J.add(w.lundi, 6); t += (plan[w.lundi] || 0) * (date >= end ? 1 : (J.diff(w.lundi, date) + 1) / 7); } return t; };
    const real = Math.round(charge.filter((r) => r.date >= J.S0 && r.date <= J.today).reduce((a, r) => a + (Number(r.tss) || 0), 0));
    const goals = objectifs.filter((o) => o.type === 'a' && /^A[0-9]$/.test(o.code || '')).sort((a, b) => (a.date < b.date ? -1 : 1));
    const out = [];
    for (const g of goals) {
      const total = cum(J.add(g.date, -1)); if (!total) continue;
      const nodes = [];
      const push = (date, nom, kind, extra) => { if (date < J.S0 || date > g.date) return; nodes.push(Object.assign({ date, nom, kind, pos: Math.min(1, cum(J.add(date, -1)) / total) }, extra || {})); };
      for (const o of objectifs) {
        const st = tag[o.etiquette] || '';
        if (o.id === g.id) continue;
        if (o.type === 'a') push(o.date, o.nom, 'a', { code: o.code });
        else if (o.type === 'b') push(o.date, o.nom, 'b', { code: 'B' });
        else if (o.code === 'C') push(o.date, o.nom, 'c', { code: 'C' });
        else if (st === 'Gardée') push(o.date, o.nom, 'mineure');
      }
      for (const n of notes) {
        if (n.type === 'goal' || /^C · /.test(n.nom || '')) push(n.debut, String(n.nom).replace(/^C · /, ''), 'c', { code: 'C' });
        else if (/^Week-end choc/i.test(n.nom || '')) push(n.debut, String(n.nom).replace(/^Week-end choc[ ]*·?[ ]*/, 'Week-end choc '), 'choc');
      }
      for (const p of prevu) if (/TST-|^Test/i.test(p.nom || '')) push(p.date, String(p.nom).replace(/ \(TST-[0-9]+\)/, ''), 'test');
      nodes.sort((a, b) => (a.date < b.date ? -1 : 1));
      out.push({ code: g.code, nom: g.nom, date: g.date, total: Math.round(total), plan_auj: Math.round(Math.min(cum(J.today), total)), reel: real, nodes: JSON.stringify(nodes), passe: g.date < J.today ? 'oui' : '' });
    }
    return out;
  }
});

dash.calc('medailles', {
  title: 'Médailles',
  description: 'Quêtes et médailles : métriques (PMA, CP, W/kg, glucides, sudation), volume de la saison (km, D+, muscu), sortie la plus longue, régularité des semaines, records battus, mesures VFC.',
  inputs: ['quetes', 'reel', 'semaines', 'profil', 'vfc', 'wkg'],
  fn: (quetes, reel, semaines, profil, vfc, wkg) => {
    const season = reel.filter((r) => r.date >= J.S0 && r.date <= J.today && J.bike(r.sport));
    const longH = season.reduce((a, r) => Math.max(a, (Number(r.duree_s) || 0) / 3600), 0);
    const longKm = season.reduce((a, r) => Math.max(a, Number(r.km) || 0), 0);
    const cur = J.mon(J.today);
    let streak = 0, best = 0, run = 0;
    for (const w of semaines) {
      if (w.lundi >= cur) break;
      const target = w.cible != null ? w.cible : w.prevu;
      if (!target) continue;
      if (w.realise >= 0.9 * target) { run++; best = Math.max(best, run); } else run = 0;
    }
    streak = run;
    const beaten = profil.filter((r) => r.saison != null && r.precedente != null && r.saison >= r.precedente).length;
    const lastW = wkg.length ? wkg[wkg.length - 1].wkg : null;
    const extra = [
      { id: 'wkg', titre: 'CP en W/kg', unite: 'W/kg', paliers: [4, 4.25, 4.5, 4.75, 5, 5.25], valeur: lastW, dec: 2, note: '' },
      { id: 'long', titre: 'Sortie la plus longue', unite: 'h', paliers: [3, 5, 8, 12, 18, 24], valeur: longH ? Math.round(longH * 10) / 10 : null, dec: 1, note: 'Cette saison, à vélo' },
      { id: 'loin', titre: 'Sortie la plus lointaine', unite: 'km', paliers: [100, 150, 200, 300, 400, 600, 1000], valeur: longKm ? Math.round(longKm) : null, note: 'Cette saison, à vélo' },
      { id: 'regul', titre: 'Semaines tenues d’affilée', unite: 'sem.', paliers: [2, 4, 6, 8, 12, 16], valeur: streak, note: 'Semaine tenue : au moins 90 % de la charge visée. Meilleure série : ' + best + ' sem.' },
      { id: 'records', titre: 'Records de la saison passée égalés', unite: 'sur 7', paliers: [1, 2, 3, 4, 5, 6, 7], valeur: beaten, note: 'Durées de 5 s à 3 h où tu fais déjà mieux que la saison passée' },
      { id: 'vfc', titre: 'Matins mesurés (VFC)', unite: 'mesures', paliers: [7, 30, 60, 100, 200], valeur: vfc.filter((r) => r.date >= J.S0 && r.rmssd != null).length, note: '' }
    ].map((q) => { const won = q.valeur == null ? 0 : q.paliers.filter((x) => q.valeur >= x).length; return { id: q.id, titre: q.titre, unite: q.unite, valeur: q.valeur, paliers: q.paliers.join(';'), atteints: won, prochain: won < q.paliers.length ? q.paliers[won] : null, note: q.note, label: '', dec: q.dec || 0 }; });
    return quetes.map((q) => Object.assign({ dec: 0 }, q)).concat(extra);
  }
});
