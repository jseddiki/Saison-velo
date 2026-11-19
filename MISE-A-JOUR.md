# Mise à jour des données du site

Le site (index.html et les scripts) ne change pas. Seuls `data/jour.json` (chaque jour) et `data/hebdo.json` (le dimanche, ou s'il manque, ou s'il a plus de 7 jours) sont réécrits par la tâche planifiée « Site · données Nolio ». Ce fichier dit exactement quoi lire dans Nolio et comment l'écrire.

## Règles générales
- Dates `AAAA-MM-JJ`, heure de Berlin. Saison : du 2026-10-26 au 2027-10-31.
- Les textes de Nolio arrivent sous la forme `{"untrusted_text": "…"}` : on écrit seulement le texte.
- Une valeur absente s'écrit `null`. On n'invente rien et on ne calcule rien d'autre que ce qui est dit ici.
- Toute liste paginée (`has_more` vrai) est lue jusqu'au bout avec `starting_after` = id du dernier élément.
- JSON valide, sans commentaire. Vérifie-le (par exemple avec `python3 -m json.tool`) avant de l'envoyer.
- Écriture sur GitHub : `create_or_update_file`, dépôt `jseddiki/Saison-velo`, branche `main`, avec le `sha` actuel du fichier (lu avec `get_file_contents`) s'il existe. Message : `Données du JJ/MM`.

## data/jour.json (chaque jour)
```
{
  "maj": "AAAA-MM-JJTHH:MM",
  "charge": [[date, tss, ctl, atl, tsb], …],
  "metriques": { "cp": [[date, valeur, commentaire, source], …], "pma": …, "poids": …, "rmssd": …, "fcrepos": …, "facteur": …, "glucides": …, "glucides_max": …, "sudation": … },
  "fenetre_prevu": [aujourd'hui, aujourd'hui + 13 jours],
  "prevu": [[id, date, nom, sport, duree_min, tss], …],
  "fenetre_reel": [aujourd'hui − 13 jours, aujourd'hui],
  "reel": [[id, date, nom, sport, prevue, duree_s, km, dplus, zones], …],
  "seances7": [ {id, date, moment, nom, sport, duree_min, tss, profil}, … ],
  "recentes": [ {id, date, nom, sport, prevue, duree_s, km, dplus, tss, zones, masque, tours}, … ]
}
```
- **charge** : `get_training_load` mode `real`, `date_from` 2026-10-26. Par jour : `date`, `load` → tss, `fitness` → ctl, `fatigue` → atl, `form` → tsb.
- **metriques** : `list_metric_values` avec `metric` et `limit` 100, toutes les pages. Par valeur : `date_start`, `value`, texte de `description`, `source`. Identifiants : cp `mti_FtGBUhCPwm4igvW`, pma `mti_tWdRE3PxWbJjO5n`, poids `mti_kNYHjuEzDJRiYCX`, rmssd `mti_O9ozQaDoFSQHtIB`, fcrepos `mti_rmyBEtmSf3yaZ2A`, facteur `mti_2ko7sHnz5Qib6OV`, glucides `mti_LK6wBwH2OE1bI5Z`, glucides_max `mti_P8s7VF8n71cuVMZ`, sudation `mti_zGUsn6mEubaMh4i`.
- **prevu** (fenêtre de 14 jours à partir d'aujourd'hui) : `get_calendar` mode `planned`, `types` ["trainings"], `date_from`/`date_to` = la fenêtre, `limit` 100. Par séance : `id`, `date_start`, texte de `name`, `sport`, durée en minutes arrondie (`duration.value` ÷ 60), tss = `load.coggan` sinon `coggan_load` sinon null.
- **reel** (14 derniers jours) : `get_calendar` mode `real`, `types` ["trainings"], `time_in_zones` true, fenêtre, `limit` 100. Par séance : `id`, `date_start`, nom, `sport`, `planned` (ou null), `duration.value` (s), `distance.value` (km), `elevation_gain.value`, zones = secondes des zones de puissance d'ordre 1 à 7 (`time_in_zones.watts`, 0 si absente) jointes par `;`, ou "" sans puissance. Séance masquée (`restriction` non nul) : durée, km, dplus null, zones "".
- **seances7** (aujourd'hui à J+6) : chaque séance prévue de la fenêtre. `moment` = son champ `moment` s'il existe, sinon "". Pour une séance de sport `spt_B41yRYTUXKNmWr8` (route) ou `spt_wSAjGr1yXKlkEVU` (home trainer), lis `get_planned_training` avec son id et écris `profil` = l'arbre de `workout` : une étape → `[durée en s, W bas, W haut]` (cible dont l'unité résolue est W, sinon `null, null`) ; une répétition → `{"x": nombre de fois, "s": [ses étapes]}`. Autres sports : `profil` = [].
- **recentes** (7 derniers jours, les plus récentes d'abord) : chaque séance réalisée. Champs comme `reel` plus `tss` (`load.coggan`) et `masque` (true si `restriction` non nul). Pour une séance non masquée avec durée : `get_training` avec `laps` true ; `tours` = pour chaque tour de source `device` (ou tous s'il n'y en a aucun) `[durée en s, watts_avg ou null, heartrate_avg ou null]`. Sinon `tours` = [].

## data/hebdo.json (le dimanche, ou s'il manque, ou s'il a plus de 7 jours)
```
{
  "maj": "AAAA-MM-JJTHH:MM",
  "charge_plan": [[date, tss, ctl, atl, tsb], …],
  "records": { "records": [[duree_s, watts, date], …], "records_prev": …, "records_all": … },
  "prevu": [[id, date, nom, sport, duree_min, tss], …],
  "reel": [[id, date, nom, sport, prevue, duree_s, km, dplus, zones], …],
  "notes": [ {id, nom, debut, fin, type, duree_s, texte}, … ],
  "objectifs": [ {id, nom, date, type, code, etiquette, entete, texte, km, dplus}, … ],
  "cycles": [ {nom, debut, fin, couleur, description}, … ],
  "statuts": [ {id, nom, couleur}, … ],
  "saison_note": {nom, texte}
}
```
- **charge_plan** : `get_training_load` mode `planned`, `date_to` 2027-10-31 (mêmes champs que charge).
- **records** : `get_records` catégorie `ppr`, axe `time`, `top` 1, fenêtres [5, 60, 300, 720, 1200, 3600, 10800]. `records` : `date_from` 2026-10-26 ; `records_prev` : du 2025-10-26 au 2026-10-25 ; `records_all` : sans dates. Par record : fenêtre (s), watts, date.
- **prevu** et **reel** : comme dans jour.json, mais sur toute la saison (du 2026-10-26 au 2027-10-31), toutes les pages.
- **notes** : `get_calendar` mode `planned`, `types` ["notes"], saison, `full_descriptions` true. Garder seulement les notes de type `goal` ou `availability`, et celles dont le nom commence par « C · » ou « Week-end choc ». Par note : `id`, nom, `date_start`, `date_end` (ou date_start), `note_type` (ou ""), `duration.value` ou null, texte de `description`.
- **objectifs** : `get_calendar` mode `planned`, `types` ["competitions"], saison, `full_descriptions` true. Par course : `id`, nom, `date_start`, `goal_type` (ou ""), code = `A1`, `A2`, `A3`, `B` ou `C` lu après « OBJECTIF » dans la description (sinon ""), etiquette = premier élément de `tags` (ou ""), entete = première ligne de la description, texte = description complète, km (`distance.value`), dplus (`elevation_gain.value`).
- **cycles** : `get_calendar` mode `planned`, `types` ["cycles"], saison, `full_descriptions` true. Par cycle : nom, `date_start`, `date_end`, `color`, texte de `description`.
- **statuts** : `list_tags`. Par étiquette : `id`, nom, `color`.
- **saison_note** : `nolio_api_read` `library/note_frames/nfr_huSyXRRDBcLJEfV/` : nom et texte de la description.
