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
  title: 'Le circuit de la saison',
  description: 'Circuits de la reprise jusqu’à la dernière course de la saison, ou jusqu’à un objectif A. Le cycliste avance avec le temps (jours écoulés). Sur le chemin : objectifs A, B et C, courses gardées, challenges, week-ends chocs et tests.',
  inputs: ['objectifs', 'notes', 'prevu', 'statuts'],
  fn: (objectifs, notes, prevu, statuts) => {
    const tag = {}; for (const s of statuts) tag[s.id] = s.nom;
    const all = [];
    for (const o of objectifs) {
      const st = tag[o.etiquette] || '';
      if (st === 'Refusée') continue;
      const h = String(o.entete || '').toUpperCase();
      if (o.type === 'a') all.push({ date: o.date, nom: o.nom, kind: 'a', code: o.code || 'A', statut: st, race: 1 });
      else if (o.type === 'b') all.push({ date: o.date, nom: o.nom, kind: 'b', code: 'B', statut: st, race: 1 });
      else if (o.code === 'C') all.push({ date: o.date, nom: o.nom, kind: 'c', code: 'C', statut: st, race: 1 });
      else if (h.startsWith('CHALLENGE')) all.push({ date: o.date, nom: o.nom, kind: 'challenge', code: '★', statut: st, race: 1 });
      else if (st === 'Gardée') all.push({ date: o.date, nom: o.nom, kind: 'mineure', code: '', statut: st, race: 1 });
    }
    for (const n of notes) {
      if (n.type === 'goal' || /^C · /.test(n.nom || '')) all.push({ date: n.debut, nom: String(n.nom).replace(/^C · /, ''), kind: 'c', code: 'C', race: 1 });
      else if (/^Week-end choc/i.test(n.nom || '')) all.push({ date: n.debut, nom: n.nom, kind: 'choc', code: '' });
    }
    for (const p of prevu) if (/TST-|^Test/i.test(p.nom || '')) all.push({ date: p.date, nom: String(p.nom).replace(/ \(TST-[0-9]+\)/, ''), kind: 'test', code: '' });
    const inSeason = all.filter((n) => n.date >= J.S0 && n.date <= J.S1).sort((a, b) => (a.date < b.date ? -1 : 1));
    const races = inSeason.filter((n) => n.race);
    const routes = [];
    const make = (code, nom, fin, finale) => {
      const total = J.diff(J.S0, fin); if (total <= 0) return;
      const nodes = inSeason.filter((n) => n.date <= fin && n !== finale).map((n) => Object.assign({}, n, { pos: J.diff(J.S0, n.date) / total }));
      routes.push({ code, nom, date: fin, jours: total, fait: Math.max(0, Math.min(total, J.diff(J.S0, J.today))), nodes: JSON.stringify(nodes), arrivee: finale ? finale.kind : '' });
    };
    const last = races[races.length - 1];
    if (last) make('saison', 'Dernière course · ' + last.nom, last.date, last);
    for (const g of races.filter((n) => n.kind === 'a').sort((a, b) => (a.date < b.date ? -1 : 1))) make(g.code, g.nom, g.date, g);
    return routes;
  }
});

dash.calc('duel', {
  title: 'Duel contre le plan',
  description: 'Charge réalisée cumulée depuis la reprise contre la charge visée par le plan (cible du mésocycle, sinon prévu) à la même date, et bilan semaine par semaine : gagnée à 90 % de la cible ou plus.',
  inputs: ['semaines', 'charge'],
  fn: (semaines, charge) => {
    const cur = J.mon(J.today);
    let plan = 0;
    const weeks = [];
    for (const w of semaines) {
      if (w.lundi > J.today) break;
      const target = w.cible != null ? w.cible : w.prevu;
      const part = w.lundi === cur ? (J.diff(w.lundi, J.today) + 1) / 7 : 1;
      plan += (target || 0) * part;
      weeks.push({ lundi: w.lundi, cible: target || 0, realise: w.realise, pct: target ? Math.round(w.realise / target * 100) : null, encours: w.lundi === cur ? 'oui' : '' });
    }
    const real = Math.round(charge.filter((r) => r.date >= J.S0 && r.date <= J.today).reduce((a, r) => a + (Number(r.tss) || 0), 0));
    const done = weeks.filter((w) => !w.encours && w.cible);
    return [{ reel: real, plan: Math.round(plan), gagnees: done.filter((w) => w.pct >= 90).length, jouees: done.length, semaines: JSON.stringify(weeks) }];
  }
});

dash.calc('medailles', {
  title: 'Médailles',
  description: 'Quêtes et médailles : métriques (PMA, CP, W/kg, glucides, sudation), volume de la saison (km, D+, muscu), sortie la plus longue, régularité des semaines, records battus, mesures VFC, nutrition (sorties nourries, meilleur débit).',
  inputs: ['quetes', 'reel', 'semaines', 'profil', 'vfc', 'wkg', 'glucides'],
  fn: (quetes, reel, semaines, profil, vfc, wkg, glucides) => {
    const gluc = glucides.filter((r) => r.valeur != null && r.date >= J.S0).map((r) => Number(r.valeur));
    const season = reel.filter((r) => r.date >= J.S0 && r.date <= J.today && J.bike(r.sport));
    const longH = season.reduce((a, r) => Math.max(a, (Number(r.duree_s) || 0) / 3600), 0);
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
      { id: 'nourries', titre: 'Sorties nourries à 60 g/h ou plus', unite: 'sorties', paliers: [1, 5, 10, 20, 40], valeur: gluc.length ? gluc.filter((v) => v >= 60).length : null, note: gluc.length ? '' : 'Pas encore de valeur : l’analyse du soir la remplit après chaque sortie.' },
      { id: 'debit', titre: 'Meilleur débit de glucides sur une sortie', unite: 'g/h', paliers: [60, 70, 80, 90, 100, 110], valeur: gluc.length ? Math.max(...gluc) : null, note: gluc.length ? 'Objectif de course : 90 g/h' : 'Pas encore de valeur : l’analyse du soir la remplit après chaque sortie.' },
      { id: 'regul', titre: 'Semaines tenues d’affilée', unite: 'sem.', paliers: [2, 4, 6, 8, 12, 16], valeur: streak, note: 'Semaine tenue : au moins 90 % de la charge visée. Meilleure série : ' + best + ' sem.' },
      { id: 'records', titre: 'Records de la saison passée égalés', unite: 'sur 7', paliers: [1, 2, 3, 4, 5, 6, 7], valeur: beaten, note: 'Durées de 5 s à 3 h où tu fais déjà mieux que la saison passée' },
      { id: 'vfc', titre: 'Matins mesurés (VFC)', unite: 'mesures', paliers: [7, 30, 60, 100, 200], valeur: vfc.filter((r) => r.date >= J.S0 && r.rmssd != null).length, note: '' }
    ].map((q) => { const won = q.valeur == null ? 0 : q.paliers.filter((x) => q.valeur >= x).length; return { id: q.id, titre: q.titre, unite: q.unite, valeur: q.valeur, paliers: q.paliers.join(';'), atteints: won, prochain: won < q.paliers.length ? q.paliers[won] : null, note: q.note, label: '', dec: q.dec || 0 }; });
    return quetes.map((q) => Object.assign({ dec: 0 }, q)).concat(extra);
  }
});
