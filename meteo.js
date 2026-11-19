/* Météo d'Augsburg sur 14 jours, lue dans le navigateur chez Open-Meteo (gratuit, sans clé) */
(() => {
  const M = {};
  const css = document.createElement('style'); css.textContent = '.wx { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }'; document.head.appendChild(css);
  const ICON = (c) => (c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '🌨️' : c <= 82 ? '🌧️' : c <= 86 ? '🌨️' : '⛈️');
  J.meteo = (date) => {
    const w = M[date]; if (!w) return null;
    const parts = [ICON(w.code) + ' ' + Math.round(w.tmax) + '° / ' + Math.round(w.tmin) + '°'];
    if (w.pluie != null && w.pluie >= 20) parts.push('pluie ' + w.pluie + ' %');
    if (w.vent != null && w.vent >= 25) parts.push('vent ' + Math.round(w.vent) + ' km/h');
    return parts.join(' · ');
  };
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=48.37&longitude=10.90&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Europe%2FBerlin&forecast_days=14';
  fetch(url).then((r) => (r.ok ? r.json() : null)).then((j) => {
    const d = j && j.daily; if (!d || !d.time) return;
    d.time.forEach((t, i) => { M[t] = { code: d.weather_code[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i], pluie: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null, vent: d.wind_speed_10m_max ? d.wind_speed_10m_max[i] : null }; });
    dash.draw('days14'); dash.draw('next14');
  }).catch(() => {});
})();
