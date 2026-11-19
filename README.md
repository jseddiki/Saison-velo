# Saison vélo 2026-2027

Le site de la saison de Johan : la saison d'un coup d'œil, les courses (avec « Je viens » et l'ajout à l'agenda), les séances à partager (profil et fichier .fit), la forme, et le jeu (la route vers l'objectif A et les médailles).
Les données viennent de Nolio et sont mises à jour chaque nuit (voir MISE-A-JOUR.md).

## Les amis inscrits (data/amis.json)
Quand un ami dit qu'il vient, ajoute son prénom sous l'identifiant de la course (`pcmp_…`) ou de la séance (`ptrn_…`). Les identifiants sont dans `data/hebdo.json` et `data/jour.json`.
```
{ "pcmp_uTz9q42L2ObBtjJ": ["Paul", "Marie"] }
```

## Le numéro WhatsApp
Dans `base.js`, `window.CONFIG.whatsapp` : ton numéro au format international sans « + ». Vide, le bouton « Je viens » ouvre WhatsApp et l'ami choisit à qui envoyer le message.

## Les fichiers
- `index.html`, `style.css` : la page et son style
- `dash.js` : chargement des données ; `calcs.js` et `calcs-jeu.js` : calculs ; `base.js` : outils communs
- `saison.js`, `courses.js`, `rouler.js`, `forme.js`, `jeu.js` : une page chacun
