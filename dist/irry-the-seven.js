(() => {
// Irry The Seven: Home Assistant dashboard and view strategies, Rapid and slot cards.
// One file, no dependencies. Finds the Irry device by manufacturer and its entities by their
// fixed English names (fallback: the entity_id suffix), so area or device renames do not break it.
//   Dashboard:  strategy: { type: custom:irry-the-seven }
//   Views:      strategy: { type: custom:irry-status | custom:irry-irrigation | custom:irry-weather }
//   Options:    device: <device_id or name> (several Irry devices), language: it/en/de/fr/es/pt
// Texts: the device UI translations (src/ui/i18n) plus a few of their own, inlined by ha/build.py.

const IRRY_VERSION = '0.1.0';
const I18N = {"en":{"active":"Active","allok":"All good","applied":"Slot {slot} written to {count, plural, one {# zone} other {# zones}}","apply":"Apply to slot {slot}","aux_def":"Aux","ch_time_bad":"Time not valid","close_all":"Close all","days":"Days","days_u":"days","dm_even":"Even","dm_every":"Every N","dm_odd":"Odd","dm_week":"Weekdays","dur":"Duration","dur_zone":"Duration per zone","e_generic":"Error: {err}","e_limit":"Program refused: more than 3 zones open at once","e_limit_at":"Program refused: {count} zones open at once (max 3) · {when} {from}–{to} · {zones}","es_g_wind":"Wind","every_n":"Every","from":"Starting","fwn_av":"Version {ver} available","m_batt":"Sensor array battery","m_batt_low":"low","m_f":"Reference lawn factor","m_psl":"Sea-level pressure","m_rh":"Humidity","m_rs":"Solar radiation","m_sh":"Sheltered","m_t":"Temperature","m_wx":"Wind exempt","min":"min","next":"Next start","now_run":"Watering","offline":"Device unreachable","ovl":"Overlap","pause":"Pause programs","paused":"Programs paused","pick_day":"Pick at least one day.","pick_zone":"Include at least one zone.","r":"Quick","rain":"Rain","rain_v":"{rain} mm · threshold {thr} mm","rainskip":"Starts skipped for rain","rainskip_sh":"Zones sheltered from rain run anyway.","save":"Save","saved":"Saved","seq_hdr":"Zones in sequence","slot":"Slot","st":"Status","start":"Start","turn_off_slot":"Turn off slot {slot}","up":"Move up","vp":"Valve power","w_dir":"Direction","wind_h":"Wind","wind_ign":"Ignore wind","wind_over_nx":"Wind over threshold: the next scheduled starts wait for it to drop.","wp":"Wind pause","ww":"Waiting for the wind to drop","wx":"Weather","wx_7":"7 days","wx_g":"Charts","wx_s":"Sensors","x_close_q":"Close all zone valves?","x_diag":"Diagnostics","x_end":"ends","x_feed_stale":"Weather station not updating","x_feed_unpaired":"Weather station not paired","x_irrigation":"Irrigation","x_log":"Events","x_no_dev":"No Irry device found in Home Assistant.","x_no_svc":"Irry actions not found: update the device firmware, then reload the ESPHome integration","x_saving":"Saving…","x_station":"Station","x_wd_collecting":"Collecting weather data","x_wd_fallback":"Weather data partial: fallback values in use","x_wd_missing":"Weather data missing","x_wifi_fb":"Connected to the fallback Wi-Fi network","z_man":"Opened manually","z_wind":"Wind pause · resumes {time}","zones":"Zones"},"it":{"active":"Attivo","allok":"Tutto ok","applied":"Slot {slot} scritto su {count, plural, one {# zona} other {# zone}}","apply":"Applica allo slot {slot}","aux_def":"Aux","ch_time_bad":"Ora non valida","close_all":"Chiudi tutte","days":"Giorni","days_u":"giorni","dm_even":"Pari","dm_every":"Ogni N","dm_odd":"Dispari","dm_week":"Settimana","dur":"Durata","dur_zone":"Durata per zona","e_generic":"Errore: {err}","e_limit":"Programma rifiutato: più di 3 zone aperte insieme","e_limit_at":"Programma rifiutato: {count} zone aperte insieme (massimo 3) · {when} {from}–{to} · {zones}","es_g_wind":"Vento","every_n":"Ogni","from":"A partire da","fwn_av":"Disponibile la versione {ver}","m_batt":"Batteria array di sensori","m_batt_low":"scarica","m_f":"Fattore del prato di riferimento","m_psl":"Pressione al livello del mare","m_rh":"Umidità","m_rs":"Radiazione solare","m_sh":"Riparata","m_t":"Temperatura","m_wx":"Esclusa dal vento","min":"min","next":"Prossimo avvio","now_run":"In irrigazione","offline":"Dispositivo non raggiungibile","ovl":"Sovrapposizione","pause":"Sospendi programmi","paused":"Programmi sospesi","pick_day":"Scegli almeno un giorno.","pick_zone":"Includi almeno una zona.","r":"Rapido","rain":"Pioggia","rain_v":"{rain} mm · soglia {thr} mm","rainskip":"Avvii saltati per pioggia","rainskip_sh":"Le zone riparate dalla pioggia partono comunque.","save":"Salva","saved":"Salvato","seq_hdr":"Zone in sequenza","slot":"Slot","st":"Stato","start":"Inizio","turn_off_slot":"Spegni lo slot {slot}","up":"Sposta su","vp":"Alimentazione valvole","w_dir":"Direzione","wind_h":"Vento","wind_ign":"Ignora vento","wind_over_nx":"Vento oltre soglia: i prossimi avvii programmati aspettano che cali.","wp":"Pausa vento","ww":"In attesa che il vento cali","wx":"Meteo","wx_7":"7 giorni","wx_g":"Grafici","wx_s":"Sensori","x_close_q":"Chiudere tutte le valvole?","x_diag":"Diagnostica","x_end":"termina","x_feed_stale":"La stazione meteo non si aggiorna","x_feed_unpaired":"Stazione meteo non abbinata","x_irrigation":"Irrigazione","x_log":"Eventi","x_no_dev":"Nessun dispositivo Irry trovato in Home Assistant.","x_no_svc":"Azioni Irry non trovate: aggiorna il firmware del dispositivo, poi ricarica l'integrazione ESPHome","x_saving":"Salvataggio…","x_station":"Stazione","x_wd_collecting":"Raccolta dei dati meteo in corso","x_wd_fallback":"Dati meteo parziali: in uso i valori di ripiego","x_wd_missing":"Dati meteo mancanti","x_wifi_fb":"Collegato alla rete Wi-Fi di riserva","z_man":"Aperta manualmente","z_wind":"Pausa vento · riprende {time}","zones":"Zone"},"de":{"active":"Aktiv","allok":"Alles in Ordnung","applied":"Slot {slot} auf {count, plural, one {# Zone} other {# Zonen}} geschrieben","apply":"Auf Slot {slot} anwenden","aux_def":"Aux","ch_time_bad":"Uhrzeit ungültig","close_all":"Alle schließen","days":"Tage","days_u":"Tage","dm_even":"Gerade","dm_every":"Alle N","dm_odd":"Ungerade","dm_week":"Wochentage","dur":"Dauer","dur_zone":"Dauer pro Zone","e_generic":"Fehler: {err}","e_limit":"Programm abgelehnt: mehr als 3 Zonen gleichzeitig offen","e_limit_at":"Programm abgelehnt: {count} Zonen gleichzeitig offen (maximal 3) · {when} {from}–{to} · {zones}","es_g_wind":"Wind","every_n":"Alle","from":"Ab","fwn_av":"Version {ver} verfügbar","m_batt":"Batterie Sensorarray","m_batt_low":"schwach","m_f":"Faktor des Referenzrasens","m_psl":"Luftdruck auf Meereshöhe","m_rh":"Luftfeuchte","m_rs":"Sonnenstrahlung","m_sh":"Überdacht","m_t":"Temperatur","m_wx":"Windfrei","min":"Min.","next":"Nächster Start","now_run":"Bewässerung läuft","offline":"Gerät nicht erreichbar","ovl":"Überschneidung","pause":"Programme pausieren","paused":"Programme pausiert","pick_day":"Mindestens einen Tag wählen.","pick_zone":"Mindestens eine Zone einbeziehen.","r":"Schnell","rain":"Regen","rain_v":"{rain} mm · Schwelle {thr} mm","rainskip":"Starts wegen Regen übersprungen","rainskip_sh":"Vor Regen geschützte Zonen starten trotzdem.","save":"Speichern","saved":"Gespeichert","seq_hdr":"Zonen in Reihenfolge","slot":"Slot","st":"Status","start":"Start","turn_off_slot":"Slot {slot} ausschalten","up":"Nach oben","vp":"Ventilversorgung","w_dir":"Richtung","wind_h":"Wind","wind_ign":"Wind ignorieren","wind_over_nx":"Wind über der Schwelle: die nächsten geplanten Starts warten, bis er nachlässt.","wp":"Windpause","ww":"Warten, bis der Wind nachlässt","wx":"Wetter","wx_7":"7 Tage","wx_g":"Diagramme","wx_s":"Sensoren","x_close_q":"Alle Zonenventile schließen?","x_diag":"Diagnose","x_end":"endet","x_feed_stale":"Wetterstation aktualisiert nicht","x_feed_unpaired":"Wetterstation nicht gekoppelt","x_irrigation":"Bewässerung","x_log":"Ereignisse","x_no_dev":"Kein Irry-Gerät in Home Assistant gefunden.","x_no_svc":"Irry-Aktionen nicht gefunden: Gerätefirmware aktualisieren, dann die ESPHome-Integration neu laden","x_saving":"Speichern…","x_station":"Station","x_wd_collecting":"Wetterdaten werden gesammelt","x_wd_fallback":"Wetterdaten unvollständig: Ersatzwerte in Gebrauch","x_wd_missing":"Wetterdaten fehlen","x_wifi_fb":"Mit dem Ersatz-WLAN verbunden","z_man":"Manuell geöffnet","z_wind":"Windpause · weiter um {time}","zones":"Zonen"},"fr":{"active":"Actif","allok":"Tout va bien","applied":"Créneau {slot} écrit sur {count, plural, one {# zone} other {# zones}}","apply":"Appliquer au créneau {slot}","aux_def":"Aux","ch_time_bad":"Heure non valide","close_all":"Tout fermer","days":"Jours","days_u":"jours","dm_even":"Pairs","dm_every":"Tous les N","dm_odd":"Impairs","dm_week":"Semaine","dur":"Durée","dur_zone":"Durée par zone","e_generic":"Erreur : {err}","e_limit":"Programme refusé : plus de 3 zones ouvertes en même temps","e_limit_at":"Programme refusé : {count} zones ouvertes en même temps (max 3) · {when} {from}–{to} · {zones}","es_g_wind":"Vent","every_n":"Tous les","from":"À partir du","fwn_av":"Version {ver} disponible","m_batt":"Batterie du réseau de capteurs","m_batt_low":"faible","m_f":"Facteur de la pelouse de référence","m_psl":"Pression au niveau de la mer","m_rh":"Humidité","m_rs":"Rayonnement solaire","m_sh":"Abritée","m_t":"Température","m_wx":"Exclue du vent","min":"min","next":"Prochain départ","now_run":"Arrosage","offline":"Appareil injoignable","ovl":"Chevauchement","pause":"Suspendre les programmes","paused":"Programmes suspendus","pick_day":"Choisissez au moins un jour.","pick_zone":"Incluez au moins une zone.","r":"Rapide","rain":"Pluie","rain_v":"{rain} mm · seuil {thr} mm","rainskip":"Départs sautés pour pluie","rainskip_sh":"Les zones abritées de la pluie démarrent quand même.","save":"Enregistrer","saved":"Enregistré","seq_hdr":"Zones en séquence","slot":"Créneau","st":"État","start":"Départ","turn_off_slot":"Désactiver le créneau {slot}","up":"Monter","vp":"Alimentation des vannes","w_dir":"Direction","wind_h":"Vent","wind_ign":"Ignorer le vent","wind_over_nx":"Vent au-dessus du seuil : les prochains départs programmés attendent qu'il faiblisse.","wp":"Pause vent","ww":"En attente que le vent faiblisse","wx":"Météo","wx_7":"7 jours","wx_g":"Graphiques","wx_s":"Capteurs","x_close_q":"Fermer toutes les vannes ?","x_diag":"Diagnostic","x_end":"fin","x_feed_stale":"La station météo ne se met pas à jour","x_feed_unpaired":"Station météo non associée","x_irrigation":"Arrosage","x_log":"Événements","x_no_dev":"Aucun appareil Irry trouvé dans Home Assistant.","x_no_svc":"Actions Irry introuvables : mettez à jour le firmware de l'appareil, puis rechargez l'intégration ESPHome","x_saving":"Enregistrement…","x_station":"Station","x_wd_collecting":"Collecte des données météo en cours","x_wd_fallback":"Données météo partielles : valeurs de secours utilisées","x_wd_missing":"Données météo manquantes","x_wifi_fb":"Connecté au Wi-Fi de secours","z_man":"Ouverte manuellement","z_wind":"Pause vent · reprise à {time}","zones":"Zones"},"es":{"active":"Activo","allok":"Todo en orden","applied":"Franja {slot} escrita en {count, plural, one {# zona} other {# zonas}}","apply":"Aplicar a la franja {slot}","aux_def":"Aux","ch_time_bad":"Hora no válida","close_all":"Cerrar todas","days":"Días","days_u":"días","dm_even":"Pares","dm_every":"Cada N","dm_odd":"Impares","dm_week":"Semana","dur":"Duración","dur_zone":"Duración por zona","e_generic":"Error: {err}","e_limit":"Programa rechazado: más de 3 zonas abiertas a la vez","e_limit_at":"Programa rechazado: {count} zonas abiertas a la vez (máx. 3) · {when} {from}–{to} · {zones}","es_g_wind":"Viento","every_n":"Cada","from":"A partir del","fwn_av":"Versión {ver} disponible","m_batt":"Batería del conjunto de sensores","m_batt_low":"baja","m_f":"Factor del césped de referencia","m_psl":"Presión a nivel del mar","m_rh":"Humedad","m_rs":"Radiación solar","m_sh":"Resguardada","m_t":"Temperatura","m_wx":"Excluida del viento","min":"min","next":"Próximo inicio","now_run":"Regando","offline":"Dispositivo inaccesible","ovl":"Solapamiento","pause":"Pausar programas","paused":"Programas en pausa","pick_day":"Elige al menos un día.","pick_zone":"Incluye al menos una zona.","r":"Rápido","rain":"Lluvia","rain_v":"{rain} mm · umbral {thr} mm","rainskip":"Inicios omitidos por lluvia","rainskip_sh":"Las zonas resguardadas de la lluvia arrancan igualmente.","save":"Guardar","saved":"Guardado","seq_hdr":"Zonas en secuencia","slot":"Franja","st":"Estado","start":"Inicio","turn_off_slot":"Desactivar la franja {slot}","up":"Subir","vp":"Alimentación de válvulas","w_dir":"Dirección","wind_h":"Viento","wind_ign":"Ignorar viento","wind_over_nx":"Viento sobre el umbral: los próximos inicios programados esperan a que baje.","wp":"Pausa por viento","ww":"Esperando a que baje el viento","wx":"Meteo","wx_7":"7 días","wx_g":"Gráficos","wx_s":"Sensores","x_close_q":"¿Cerrar todas las válvulas?","x_diag":"Diagnóstico","x_end":"termina","x_feed_stale":"La estación meteorológica no se actualiza","x_feed_unpaired":"Estación meteorológica no emparejada","x_irrigation":"Riego","x_log":"Eventos","x_no_dev":"No se ha encontrado ningún dispositivo Irry en Home Assistant.","x_no_svc":"Acciones de Irry no encontradas: actualiza el firmware del dispositivo y recarga la integración ESPHome","x_saving":"Guardando…","x_station":"Estación","x_wd_collecting":"Recogiendo datos meteorológicos","x_wd_fallback":"Datos meteorológicos parciales: se usan valores de reserva","x_wd_missing":"Faltan datos meteorológicos","x_wifi_fb":"Conectado a la Wi-Fi de reserva","z_man":"Abierta manualmente","z_wind":"Pausa por viento · se reanuda {time}","zones":"Zonas"},"pt":{"active":"Ativo","allok":"Tudo em ordem","applied":"Turno {slot} escrito em {count, plural, one {# zona} other {# zonas}}","apply":"Aplicar ao turno {slot}","aux_def":"Aux","ch_time_bad":"Hora inválida","close_all":"Fechar todas","days":"Dias","days_u":"dias","dm_even":"Pares","dm_every":"A cada N","dm_odd":"Ímpares","dm_week":"Semana","dur":"Duração","dur_zone":"Duração por zona","e_generic":"Erro: {err}","e_limit":"Programa recusado: mais de 3 zonas abertas ao mesmo tempo","e_limit_at":"Programa recusado: {count} zonas abertas ao mesmo tempo (máx. 3) · {when} {from}–{to} · {zones}","es_g_wind":"Vento","every_n":"A cada","from":"A partir de","fwn_av":"Versão {ver} disponível","m_batt":"Bateria do conjunto de sensores","m_batt_low":"fraca","m_f":"Fator do relvado de referência","m_psl":"Pressão ao nível do mar","m_rh":"Humidade","m_rs":"Radiação solar","m_sh":"Abrigada","m_t":"Temperatura","m_wx":"Excluída do vento","min":"min","next":"Próximo início","now_run":"A regar","offline":"Dispositivo inacessível","ovl":"Sobreposição","pause":"Pausar programas","paused":"Programas em pausa","pick_day":"Escolha pelo menos um dia.","pick_zone":"Inclua pelo menos uma zona.","r":"Rápido","rain":"Chuva","rain_v":"{rain} mm · limiar {thr} mm","rainskip":"Inícios saltados por chuva","rainskip_sh":"As zonas abrigadas da chuva arrancam na mesma.","save":"Guardar","saved":"Guardado","seq_hdr":"Zonas em sequência","slot":"Turno","st":"Estado","start":"Início","turn_off_slot":"Desativar o turno {slot}","up":"Subir","vp":"Alimentação das válvulas","w_dir":"Direção","wind_h":"Vento","wind_ign":"Ignorar vento","wind_over_nx":"Vento acima do limiar: os próximos inícios programados esperam que baixe.","wp":"Pausa por vento","ww":"À espera que o vento baixe","wx":"Meteo","wx_7":"7 dias","wx_g":"Gráficos","wx_s":"Sensores","x_close_q":"Fechar todas as válvulas?","x_diag":"Diagnóstico","x_end":"termina","x_feed_stale":"A estação meteorológica não atualiza","x_feed_unpaired":"Estação meteorológica não emparelhada","x_irrigation":"Rega","x_log":"Eventos","x_no_dev":"Nenhum dispositivo Irry encontrado no Home Assistant.","x_no_svc":"Ações Irry não encontradas: atualize o firmware do dispositivo e recarregue a integração ESPHome","x_saving":"A guardar…","x_station":"Estação","x_wd_collecting":"A recolher dados meteorológicos","x_wd_fallback":"Dados meteorológicos parciais: valores de recurso em uso","x_wd_missing":"Dados meteorológicos em falta","x_wifi_fb":"Ligado ao Wi-Fi de reserva","z_man":"Aberta manualmente","z_wind":"Pausa por vento · retoma às {time}","zones":"Zonas"}};

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MODES = ['week', 'even', 'odd', 'every'];  // order of the "Days Mode" select options
const BAD = ['unknown', 'unavailable', ''];

function lang(hass, cfg) {
  const l = ((cfg && cfg.language) || (hass.locale && hass.locale.language) || hass.language || 'en').slice(0, 2);
  return I18N[l] ? l : 'en';
}
function tr(l) {
  const L = I18N[l] || I18N.en;
  const pr = new Intl.PluralRules(l);
  // Same message format as the device UI: {name} and {count, plural, one {# zone} other {# zones}}.
  return (k, p = {}) => String(L[k] ?? I18N.en[k] ?? k)
    .replace(/\{(\w+), plural,((?:[^{}]|\{[^{}]*\})*)\}/g, (m, n, body) => {
      const f = {};
      body.replace(/(\w+)\s*\{([^{}]*)\}/g, (x, c, s) => { f[c] = s; });
      return (f[pr.select(+p[n])] ?? f.other ?? '').replace(/#/g, p[n]);
    })
    .replace(/\{(\w+)\}/g, (m, n) => (n in p ? p[n] : m));
}
// HA slugify of an entity name: "Wi-Fi Signal" -> wi_fi_signal, "Zone 1 S1 1-Mon" -> zone_1_s1_1_mon.
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The Irry device(s): manufacturer from ESPHome project.name "Irry.<model>".
function irryDevices(hass) {
  return Object.values(hass.devices || {}).filter((d) => d.manufacturer === 'Irry');
}
function pickDevice(hass, want) {
  const ds = irryDevices(hass);
  if (!want) return ds[0] || null;
  return ds.find((d) => d.id === want || d.name === want || d.name_by_user === want) || null;
}

// Model of one device: entity lookup E(key), zones, labels, action names.
function irryModel(hass, want) {
  const dev = pickDevice(hass, want);
  if (!dev) return null;
  const ents = Object.values(hass.entities || {}).filter((e) => e.device_id === dev.id);
  const byName = {};
  for (const e of ents) if (e.name) byName[slug(e.name)] ??= e.entity_id;
  const cache = {};
  // Entity renamed in HA: the entity_id keeps the original suffix; the shortest match wins
  // ("irrigation_factor" also ends "zone_1_irrigation_factor").
  const E = (k) => {
    if (k in cache) return cache[k];
    let id = byName[k];
    if (!id) {
      const c = ents.map((e) => e.entity_id).filter((i) => i.split('.')[1] === k || i.endsWith('_' + k))
        .sort((a, b) => a.length - b.length);
      id = c.length && (c.length === 1 || c[0].length < c[1].length) ? c[0] : null;
    }
    return (cache[k] = id || null);
  };
  const zones = [];
  for (let n = 1; n <= 8; n++) if (E(`zone_${n}_manual`)) zones.push(n);
  const st = (k) => { const id = E(k), s = id && hass.states[id]; return s ? s.state : undefined; };
  const label = (n) => { const v = st(`zone_${n}_label`); return v && !BAD.includes(v) ? v : `Zone ${n}`; };
  const mac = ((dev.connections || []).find((c) => c[0] === 'mac') || [])[1];
  const m6 = mac ? mac.replace(/:/g, '').slice(-6).toLowerCase() : '';
  const action = (act) => {
    const all = Object.keys((hass.services && hass.services.esphome) || {}).filter((s) => s.endsWith('_' + act));
    const mine = m6 ? all.filter((s) => s.includes(m6)) : [];
    return mine[0] || (all.length === 1 ? all[0] : null);
  };
  return { dev, E, st, zones, label, action };
}

// ---------------------------------------------------------------- views
const tile = (entity, x = {}) => ({ type: 'tile', entity, ...x });
const toggle = { action: 'toggle' };
const shown = (entity) => [{ condition: 'state', entity, state_not: BAD }];
const heading = (text, icon) => ({ type: 'heading', heading: text, ...(icon ? { icon } : {}) });
const section = (cards) => ({ type: 'grid', cards: cards.filter(Boolean) });
const noDevice = (t) => ({
  type: 'sections', max_columns: 2,
  sections: [section([{ type: 'markdown', content: `<ha-alert alert-type="warning">${t('x_no_dev')}</ha-alert>` }])],
});

// Status banner: one markdown card with Jinja, rendered live by HA (the strategy itself only
// regenerates on registry changes).
function banner(m, t) {
  const q = (k) => `'${m.E(k)}'`;
  const has = (...k) => k.every((x) => m.E(x));
  const L = [];
  const add = (cond, type, text) => L.push(`{% if ${cond} %}{% set ns.n = ns.n + 1 %}<ha-alert alert-type="${type}">${text}</ha-alert>{% endif %}`);
  if (has('zone_active')) {
    add(`is_state(${q('zone_active')}, 'unavailable')`, 'error', esc(t('offline')));
    add(`states(${q('zone_active')}) not in ['-', 'unknown', 'unavailable', '']`, 'info', `${esc(t('now_run'))}: {{ states(${q('zone_active')}) }}`);
  }
  if (has('programs_paused')) add(`is_state(${q('programs_paused')}, 'on')`, 'warning', esc(t('paused')));
  if (has('rain_skip_active')) {
    const v = has('rain_last_24h', 'rain_skip_threshold')
      ? ` · ${esc(t('rain_v', { rain: `{{ states(${q('rain_last_24h')}) }}`, thr: `{{ states(${q('rain_skip_threshold')}) }}` }))}` : '';
    add(`is_state(${q('rain_skip_active')}, 'on')`, 'warning', `${esc(t('rainskip'))}${v}. ${esc(t('rainskip_sh'))}`);
  }
  if (has('wind_pause')) {
    add(`is_state(${q('wind_pause')}, 'waiting')`, 'warning', esc(t('ww')));
    const r = has('wind_resume')
      ? `{% if states(${q('wind_resume')}) not in ['unknown', 'unavailable', ''] %} · ${esc(t('z_wind', { time: `{{ as_timestamp(states(${q('wind_resume')})) | timestamp_custom('%H:%M') }}` }))}{% endif %}` : '';
    add(`is_state(${q('wind_pause')}, 'paused')`, 'warning', `${esc(t('wp'))}${r}`);
    if (has('wind_over_threshold'))
      add(`is_state(${q('wind_over_threshold')}, 'on') and is_state(${q('wind_pause')}, 'off')`, 'info', esc(t('wind_over_nx')));
  }
  if (has('time_valid')) add(`is_state(${q('time_valid')}, 'off')`, 'error', esc(t('ch_time_bad')));
  if (has('weather_data')) {
    add(`is_state(${q('weather_data')}, 'missing')`, 'warning', esc(t('x_wd_missing')));
    add(`is_state(${q('weather_data')}, 'fallback')`, 'info', esc(t('x_wd_fallback')));
    add(`is_state(${q('weather_data')}, 'collecting')`, 'info', esc(t('x_wd_collecting')));
  }
  if (has('weather_feed')) {
    add(`is_state(${q('weather_feed')}, 'unpaired')`, 'warning', esc(t('x_feed_unpaired')));
    add(`is_state(${q('weather_feed')}, 'stale')`, 'warning', esc(t('x_feed_stale')));
  }
  if (has('weather_battery')) add(`is_state(${q('weather_battery')}, 'on')`, 'warning', `${esc(t('m_batt'))}: ${esc(t('m_batt_low'))}`);
  if (has('irrigation_overlap_warning'))
    add(`states(${q('irrigation_overlap_warning')}) not in ['unknown', 'unavailable', '']`, 'info', `${esc(t('ovl'))}: {{ states(${q('irrigation_overlap_warning')}) }}`);
  if (has('firmware_update_status'))
    add(`' available' in states(${q('firmware_update_status')})`, 'info',
      esc(t('fwn_av', { ver: `{{ states(${q('firmware_update_status')}).split(' ')[0] }}` })));
  if (has('wi_fi_fallback_active')) add(`is_state(${q('wi_fi_fallback_active')}, 'on')`, 'info', esc(t('x_wifi_fb')));
  return {
    type: 'markdown', text_only: true, grid_options: { columns: 'full' },
    content: `{% set ns = namespace(n=0) %}${L.join('')}{% if ns.n == 0 %}<ha-alert alert-type="success">${esc(t('allok'))}</ha-alert>{% endif %}`,
  };
}

function statusView(m, t) {
  const E = m.E, has = (k) => !!E(k);
  const auxName = m.st('aux_label');
  const zt = m.zones.flatMap((n) => [
    tile(E(`zone_${n}_manual`), { name: m.label(n), icon: 'mdi:sprinkler-variant', tap_action: toggle }),
    has(`zone_${n}_end`) && tile(E(`zone_${n}_end`), { name: `${m.label(n)} · ${t('x_end')}`, visibility: shown(E(`zone_${n}_end`)) }),
  ]);
  const ids = (ks) => ks.map(E).filter(Boolean);
  return {
    type: 'sections', max_columns: 4,
    sections: [
      section([banner(m, t)]),
      section([
        heading(t('st'), 'mdi:sprinkler-variant'),
        has('zone_active') && tile(E('zone_active')),
        has('valve_power') && tile(E('valve_power'), { name: t('vp') }),
        has('next_irrigation') && tile(E('next_irrigation'), { name: t('next') }),
        has('wind_resume') && tile(E('wind_resume'), { visibility: shown(E('wind_resume')) }),
        has('close_all_zone_valves') && tile(E('close_all_zone_valves'), {
          name: t('close_all'), icon: 'mdi:water-off', color: 'red',
          tap_action: { action: 'perform-action', perform_action: 'button.press', target: { entity_id: E('close_all_zone_valves') }, confirmation: { text: t('x_close_q') } },
          visibility: has('zone_active') ? [{ condition: 'state', entity: E('zone_active'), state_not: ['-', ...BAD] }] : undefined,
        }),
        has('programs_paused') && tile(E('programs_paused'), { name: t('pause'), tap_action: toggle }),
        has('ignore_wind') && has('wind_pause') && tile(E('ignore_wind'), {
          name: t('wind_ign'), tap_action: { action: 'perform-action', perform_action: 'button.press', target: { entity_id: E('ignore_wind') } },
          visibility: [{ condition: 'state', entity: E('wind_pause'), state_not: ['off', ...BAD] }],
        }),
        has('aux') && tile(E('aux'), { name: auxName && !BAD.includes(auxName) ? auxName : t('aux_def'), tap_action: toggle }),
      ]),
      section([heading(t('zones'), 'mdi:map-marker-radius'), ...zt]),
      section([
        heading(`${t('rain')} · ${t('wind_h')}`, 'mdi:weather-pouring'),
        ...ids(['rain_last_24h', 'rain_skip_threshold', 'rain_skip_active', 'wind_mean_10_min', 'wind_mean_threshold',
          'weather_wind_gust', 'wind_gust_threshold', 'wind_over_threshold', 'irrigation_factor', 'irrigation_et0_yesterday',
          'irrigation_method']).map((id) => tile(id)),
      ]),
      section([
        heading(t('x_log'), 'mdi:history'),
        { type: 'logbook', hours_to_show: 48, grid_options: { columns: 'full', rows: 6 },
          target: { entity_id: ids(['last_event', 'zone_active', 'wind_pause', 'programs_paused', 'firmware_update_status']) } },
      ]),
      section([
        heading(t('x_diag'), 'mdi:information-outline'),
        { type: 'entities', state_color: true, grid_options: { columns: 'full' },
          entities: ids(['firmware_update_status', 'firmware_source', 'firmware_update_mode', 'time_source', 'time_valid',
            'wi_fi_network', 'wi_fi_signal', 'wi_fi_fallback_active', 'ip_address', 'uptime', 'weather_feed',
            'weather_last_update', 'irrigation_overlap_warning', 'last_event']) },
      ]),
    ],
  };
}

function irrigationView(m, t) {
  const E = m.E, has = (k) => !!E(k), dev = m.dev.id;
  const zone = (n) => section([
    heading(m.label(n), 'mdi:sprinkler-variant'),
    tile(E(`zone_${n}_manual`), { name: t('z_man'), tap_action: toggle }),
    has(`zone_${n}_end`) && tile(E(`zone_${n}_end`), { name: t('x_end'), visibility: shown(E(`zone_${n}_end`)) }),
    has(`zone_${n}_irrigation_factor`) && tile(E(`zone_${n}_irrigation_factor`), { name: t('m_f') }),
    has(`zone_${n}_plant_type`) && tile(E(`zone_${n}_plant_type`), { features: [{ type: 'select-options' }], grid_options: { columns: 12 } }),
    has(`zone_${n}_rain_sheltered`) && tile(E(`zone_${n}_rain_sheltered`), { name: t('m_sh'), tap_action: toggle }),
    has(`zone_${n}_wind_exempt`) && tile(E(`zone_${n}_wind_exempt`), { name: t('m_wx'), tap_action: toggle }),
    { type: 'custom:irry-slot-card', device: dev, zone: n, grid_options: { columns: 'full' } },
  ]);
  return {
    type: 'sections', max_columns: 4,
    sections: [
      section([
        heading(t('r'), 'mdi:flash'),
        has('irrigation_overlap_warning') && tile(E('irrigation_overlap_warning'), {
          name: t('ovl'), icon: 'mdi:vector-intersection', color: 'amber', grid_options: { columns: 'full' },
          visibility: shown(E('irrigation_overlap_warning')),
        }),
        { type: 'custom:irry-rapid-card', device: dev, grid_options: { columns: 'full' } },
      ]),
      ...m.zones.map(zone),
    ],
  };
}

function weatherView(m, t, opt = {}) {
  const E = m.E, has = (k) => !!E(k);
  const ids = (ks) => ks.map(E).filter(Boolean);
  const mini = customElements.get('mini-graph-card') && opt.mini_graph !== false;
  const graph = (title, ks, hours = 24) => {
    const e = ids(ks);
    if (!e.length) return null;
    return mini
      ? { type: 'custom:mini-graph-card', name: title, hours_to_show: hours, points_per_hour: 6, entities: e, grid_options: { columns: 12 } }
      : { type: 'history-graph', title, hours_to_show: hours, entities: e, grid_options: { columns: 12 } };
  };
  const rose = has('weather_wind_direction') && customElements.get('windrose-card') && opt.windrose !== false && {
    type: 'custom:windrose-card', title: t('w_dir'), data_period: { hours_to_show: 24 }, refresh_interval: 300,
    windspeed_bar_location: 'bottom', grid_options: { columns: 12 },
    wind_direction_entity: { entity: E('weather_wind_direction') },
    windspeed_entities: ids(['weather_wind_speed', 'weather_wind_gust']).map((entity, i) => ({ entity, name: t(i ? 'w_gust' : 'w_spd') })),
  };
  return {
    type: 'sections', max_columns: 4,
    sections: [
      section([
        heading(t('wx_s'), 'mdi:weather-partly-cloudy'),
        ...ids(['weather_temperature', 'weather_humidity', 'weather_pressure', 'weather_pressure_sea_level',
          'weather_solar_radiation', 'weather_uv_index', 'weather_wind_speed', 'wind_mean_10_min', 'weather_wind_gust',
          'weather_wind_direction', 'weather_rain_today', 'weather_rain_rate', 'weather_rain_event', 'rain_last_24h',
          'weather_indoor_temperature', 'weather_indoor_humidity']).map((id) => tile(id)),
      ]),
      section([
        heading(t('es_g_wind'), 'mdi:weather-windy'),
        rose,
        graph(t('es_g_wind'), ['weather_wind_speed', 'wind_mean_10_min', 'weather_wind_gust']),
      ]),
      section([
        heading(t('wx_g'), 'mdi:chart-line'),
        graph(t('m_t'), ['weather_temperature', 'weather_indoor_temperature']),
        graph(t('m_rh'), ['weather_humidity', 'weather_indoor_humidity']),
        graph(t('m_psl'), ['weather_pressure_sea_level']),
        graph(t('m_rs'), ['weather_solar_radiation', 'weather_uv_index']),
      ]),
      section([
        heading(t('rain'), 'mdi:weather-pouring'),
        graph(t('rain'), ['weather_rain_rate', 'rain_last_24h']),
        has('weather_rain_today') && { type: 'statistics-graph', title: t('wx_7'), entities: [E('weather_rain_today')],
          stat_types: ['change'], period: 'day', days_to_show: 7, chart_type: 'bar', grid_options: { columns: 12 } },
      ]),
      section([
        heading(t('x_station'), 'mdi:access-point-network'),
        ...ids(['weather_feed', 'weather_last_update', 'weather_battery', 'weather_data']).map((id) => tile(id)),
      ]),
    ],
  };
}

class IrryViewStrategy {
  static view(kind, config, hass) {
    const t = tr(lang(hass, config)), m = irryModel(hass, config && config.device);
    if (!m) return noDevice(t);
    return kind === 'status' ? statusView(m, t) : kind === 'irrigation' ? irrigationView(m, t) : weatherView(m, t, config || {});
  }
}
class IrryStatusStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('status', c, h); } }
class IrryIrrigationStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('irrigation', c, h); } }
class IrryWeatherStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('weather', c, h); } }
class IrryDashboardStrategy extends HTMLElement {
  static async generate(config, hass) {
    const t = tr(lang(hass, config)), m = irryModel(hass, config && config.device);
    if (!m) return { title: 'Irry', views: [{ title: 'Irry', path: 'irry', ...noDevice(t) }] };
    const views = [
      { title: t('st'), path: 'status', icon: 'mdi:sprinkler-variant', ...statusView(m, t) },
      { title: t('x_irrigation'), path: 'irrigation', icon: 'mdi:calendar-clock', ...irrigationView(m, t) },
    ];
    if (m.E('weather_temperature') || m.E('weather_wind_speed'))
      views.push({ title: t('wx'), path: 'weather', icon: 'mdi:weather-partly-cloudy', ...weatherView(m, t, config || {}) });
    return { title: m.dev.name_by_user || m.dev.name || 'Irry', views };
  }
}

// ---------------------------------------------------------------- cards
const CSS = `
  .wrap{padding:0 16px 16px} .row{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:8px 0}
  .slot{border-top:1px solid var(--divider-color);padding-top:8px;margin-top:8px}
  .slot:first-child{border-top:0;margin-top:0}
  label{font-size:14px;color:var(--secondary-text-color);display:flex;gap:6px;align-items:center}
  input,select{font:inherit;color:var(--primary-text-color);background:var(--card-background-color,#fff);
    border:1px solid var(--divider-color);border-radius:6px;padding:4px 6px}
  input[type=number]{width:4.5em} .b{font-weight:500;color:var(--primary-text-color)}
  .day{border:1px solid var(--divider-color);border-radius:14px;padding:3px 9px;cursor:pointer;user-select:none;font-size:13px}
  .day.on{background:var(--primary-color);color:var(--text-primary-color,#fff);border-color:var(--primary-color)}
  button{font:inherit;border:0;border-radius:6px;padding:6px 14px;cursor:pointer;background:var(--primary-color);color:var(--text-primary-color,#fff)}
  button.s{background:none;color:var(--primary-color);padding:2px 6px} button:disabled{opacity:.5;cursor:default}
  .msg{font-size:14px;min-height:1.2em} .err{color:var(--error-color)} .ok{color:var(--success-color,#43a047)}
  .z{display:flex;gap:6px;align-items:center;margin:2px 0}`;

// Slot values from the entities of zone n, slot s.
function slotFrom(m, hass, n, s) {
  const p = `zone_${n}_s${s}_`, st = (k) => m.st(p + k);
  const dmId = m.E(p + 'days_mode'), dmS = dmId && hass.states[dmId];
  const dmi = dmS && dmS.attributes.options ? dmS.attributes.options.indexOf(dmS.state) : 0;
  const num = (k, d) => { const v = parseFloat(st(k)); return isNaN(v) ? d : Math.round(v); };
  const from = st('every_n_from');
  const start = st('start');
  return {
    start: /^\d\d:\d\d/.test(start) ? start.slice(0, 5) : '06:00', duration: num('duration', 0), enabled: st('enable') === 'on',
    mode: MODES[dmi] || 'week', days: DAYS.filter((d, i) => st(`${i + 1}_${d}`) === 'on'),
    every_n: num('every_n_days', 2), from: from && !BAD.includes(from) ? from : '',
  };
}
function dayNames(l) {
  const f = new Intl.DateTimeFormat(l, { weekday: 'short' });
  return DAYS.map((d, i) => f.format(new Date(2026, 10, 2 + i)));  // 2026-11-02 is a Monday
}
// Firmware error text ("limit mon 2026-11-02 06:00-06:10 1,2,3,4", or a code) in the user language.
function errText(m, t, l, e) {
  const msg = String((e && (e.message || e.error)) || e);
  const g = msg.match(/limit (\w{3})(?: (\d{4})-(\d\d)-(\d\d))? (\d\d:\d\d)-(\d\d:\d\d) ([\d,]+)/);
  if (!g) return msg === 'limit' ? t('e_limit') : t('e_generic', { err: msg });
  const when = g[2] ? new Intl.DateTimeFormat(l, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(+g[2], g[3] - 1, +g[4]))
    : dayNames(l)[DAYS.indexOf(g[1])];
  const zs = g[7].split(',');
  return t('e_limit_at', { count: zs.length, when, from: g[5], to: g[6], zones: zs.map((z) => m.label(+z)).join(', ') });
}

class IrryBaseCard extends HTMLElement {
  setConfig(c) { this._c = c || {}; this._dirty = false; this._sig = ''; }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 'full' }; }
  set hass(h) {
    this._h = h;
    this._m = irryModel(h, this._c.device);
    this._l = lang(h, this._c);
    this._t = tr(this._l);
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (this._dirty || this._busy) return;  // keep what the user is editing
    const sig = this.signature();
    if (sig === this._sig) return;
    this._sig = sig;
    this.load();
    this.paint();
  }
  // Common fields of a slot (start, duration, mode, days / every N + from) as HTML.
  fields(v, key) {
    const t = this._t, dn = dayNames(this._l);
    const md = MODES.map((x) => `<option value="${x}"${v.mode === x ? ' selected' : ''}>${esc(t('dm_' + x))}</option>`).join('');
    const days = v.mode !== 'week' ? '' : `<div class="row">${DAYS.map((d, i) =>
      `<span class="day${v.days.includes(d) ? ' on' : ''}" data-k="${key}" data-day="${d}">${esc(dn[i])}</span>`).join('')}</div>`;
    const every = v.mode !== 'every' ? '' : `<div class="row">
      <label>${esc(t('every_n'))} <input type="number" min="2" max="31" data-k="${key}" data-f="every_n" value="${v.every_n}"> ${esc(t('days_u'))}</label>
      <label>${esc(t('from'))} <input type="date" data-k="${key}" data-f="from" value="${esc(v.from)}"></label></div>`;
    return `<div class="row">
      <label>${esc(t('start'))} <input type="time" data-k="${key}" data-f="start" value="${esc(v.start)}"></label>
      <label>${esc(this._durLbl || t('dur'))} <input type="number" min="0" max="180" data-k="${key}" data-f="duration" value="${v.duration}"> ${esc(t('min'))}</label>
      <label>${esc(t('days'))} <select data-k="${key}" data-f="mode">${md}</select></label></div>${days}${every}`;
  }
  // Wires the inputs of fields(): writes into this.val(key), repaints on mode / day changes.
  wire() {
    const r = this.shadowRoot;
    r.querySelectorAll('[data-f]').forEach((el) => {
      const ev = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        const v = this.val(el.dataset.k), f = el.dataset.f;
        v[f] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? parseInt(el.value || '0', 10) : el.value;
        this._dirty = true;
        this.msg(el.dataset.k, '');
        if (f === 'mode') this.paint();
      });
    });
    r.querySelectorAll('.day').forEach((el) => el.addEventListener('click', () => {
      const v = this.val(el.dataset.k), d = el.dataset.day;
      v.days = v.days.includes(d) ? v.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || v.days.includes(x));
      this._dirty = true;
      this.paint();
    }));
  }
  msg(key, text, cls = '') {
    this._msgs = { ...(this._msgs || {}), [key]: { text, cls } };
    const el = this.shadowRoot.querySelector(`.msg[data-k="${key}"]`);
    if (el) { el.textContent = text; el.className = `msg ${cls}`; }
  }
  msgHtml(key) { const x = (this._msgs || {})[key] || {}; return `<div class="msg ${x.cls || ''}" data-k="${key}">${esc(x.text || '')}</div>`; }
  async call(act, data, key, okText) {
    const name = this._m && this._m.action(act);
    if (!name) { this.msg(key, this._t('x_no_svc'), 'err'); return false; }
    this._busy = true;
    this.msg(key, this._t('x_saving'));
    try {
      await this._h.callService('esphome', name, data, undefined, false);
      this._dirty = false;
      this._sig = '';
      this.msg(key, okText, 'ok');
      return true;
    } catch (e) {
      this.msg(key, errText(this._m, this._t, this._l, e), 'err');
      return false;
    } finally {
      this._busy = false;
    }
  }
}

// Three slots of one zone, written with esphome.<node>_set_slot (atomic, 3-zone rule checked by the firmware).
class IrrySlotCard extends IrryBaseCard {
  signature() {
    const m = this._m, n = this._c.zone;
    if (!m) return 'none';
    return JSON.stringify([m.label(n), [1, 2, 3].map((s) => slotFrom(m, this._h, n, s))]);
  }
  load() { this._v = this._m ? [1, 2, 3].map((s) => slotFrom(this._m, this._h, this._c.zone, s)) : []; }
  val(k) { return this._v[+k]; }
  paint() {
    const t = this._t, r = this.shadowRoot;
    if (!this._m) { r.innerHTML = `<ha-card><div class="wrap">${esc(t('x_no_dev'))}</div></ha-card>`; return; }
    const sl = this._v.map((v, i) => `<div class="slot">
      <div class="row"><span class="b">${esc(t('slot'))} ${i + 1}</span>
        <label><input type="checkbox" data-k="${i}" data-f="enabled"${v.enabled ? ' checked' : ''}> ${esc(t('active'))}</label>
        <span style="flex:1"></span><button data-save="${i}">${esc(t('save'))}</button></div>
      ${this.fields(v, i)}${this.msgHtml(i)}</div>`).join('');
    r.innerHTML = `<style>${CSS}</style><ha-card header="${esc(this._m.label(this._c.zone))} · ${esc(t('slot'))}"><div class="wrap">${sl}</div></ha-card>`;
    this.wire();
    r.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => this.save(+b.dataset.save)));
  }
  save(i) {
    const v = this._v[i], t = this._t;
    if (v.mode === 'week' && v.enabled && !v.days.length) { this.msg(i, t('pick_day'), 'err'); return; }
    this.call('set_slot', {
      zone: this._c.zone, slot: i + 1, start: v.start, duration: v.duration, enabled: v.enabled, mode: v.mode,
      days: v.mode === 'week' ? v.days.join(',') : '', every_n: v.mode === 'every' ? v.every_n : 0,
      from: v.mode === 'every' ? v.from : '',
    }, i, t('saved'));
  }
}

// Rapid: one slot, same start and duration, zones one after another (esphome.<node>_rapid).
class IrryRapidCard extends IrryBaseCard {
  setConfig(c) { super.setConfig(c); this._slot = 1; }
  signature() {
    const m = this._m;
    return m ? JSON.stringify([this._slot, m.zones.map((n) => [m.label(n), slotFrom(m, this._h, n, this._slot)])]) : 'none';
  }
  // From the slot as it is now: the enabled zones by start time, first one's start / duration / days.
  load() {
    const m = this._m;
    if (!m) return;
    const zs = m.zones.map((n) => ({ n, v: slotFrom(m, this._h, n, this._slot) }));
    const on = zs.filter((z) => z.v.enabled && z.v.duration > 0).sort((a, b) => a.v.start.localeCompare(b.v.start));
    const f = (on[0] || zs[0]).v;
    this._v = { start: f.start, duration: on.length ? f.duration : 10, mode: f.mode, days: f.days.length ? f.days : DAYS.slice(),
      every_n: f.every_n, from: f.from };
    this._durLbl = this._t('dur_zone');
    this._order = [...on.map((z) => z.n), ...zs.filter((z) => !on.includes(z)).map((z) => z.n)];
    this._inc = new Set(on.length ? on.map((z) => z.n) : m.zones);
    this._off = new Set();
  }
  val() { return this._v; }
  paint() {
    const t = this._t, r = this.shadowRoot, m = this._m;
    if (!m) { r.innerHTML = `<ha-card><div class="wrap">${esc(t('x_no_dev'))}</div></ha-card>`; return; }
    const so = [1, 2, 3].map((s) => `<option value="${s}"${s === this._slot ? ' selected' : ''}>${esc(t('slot'))} ${s}</option>`).join('');
    const zl = this._order.map((n, i) => `<div class="z">
      <label><input type="checkbox" data-zone="${n}"${this._inc.has(n) ? ' checked' : ''}> ${esc(m.label(n))}</label>
      <button class="s" data-up="${i}"${i ? '' : ' disabled'} title="${esc(t('up'))}">▲</button></div>`).join('');
    const off = [1, 2, 3].filter((s) => s !== this._slot).map((s) =>
      `<label><input type="checkbox" data-off="${s}"${this._off.has(s) ? ' checked' : ''}> ${esc(t('turn_off_slot', { slot: s }))}</label>`).join('');
    r.innerHTML = `<style>${CSS}</style><ha-card header="${esc(t('r'))}"><div class="wrap">
      <div class="row"><select data-slot>${so}</select></div>
      ${this.fields(this._v, 'r')}
      <div class="row"><span class="b">${esc(t('seq_hdr'))}</span></div>${zl}
      <div class="row">${off}</div>
      <div class="row"><button data-go>${esc(t('apply', { slot: this._slot }))}</button></div>${this.msgHtml('r')}</div></ha-card>`;
    this.wire();
    r.querySelector('[data-slot]').addEventListener('change', (e) => { this._slot = +e.target.value; this._dirty = false; this._sig = ''; this.hass = this._h; });
    r.querySelectorAll('[data-zone]').forEach((el) => el.addEventListener('change', () => {
      el.checked ? this._inc.add(+el.dataset.zone) : this._inc.delete(+el.dataset.zone);
      this._dirty = true;
    }));
    r.querySelectorAll('[data-up]').forEach((el) => el.addEventListener('click', () => {
      const i = +el.dataset.up, o = this._order;
      [o[i - 1], o[i]] = [o[i], o[i - 1]];
      this._dirty = true;
      this.paint();
    }));
    r.querySelectorAll('[data-off]').forEach((el) => el.addEventListener('change', () => {
      el.checked ? this._off.add(+el.dataset.off) : this._off.delete(+el.dataset.off);
      this._dirty = true;
    }));
    r.querySelector('[data-go]').addEventListener('click', () => this.go());
  }
  go() {
    const v = this._v, t = this._t, zs = this._order.filter((n) => this._inc.has(n));
    if (!zs.length) { this.msg('r', t('pick_zone'), 'err'); return; }
    if (v.mode === 'week' && !v.days.length) { this.msg('r', t('pick_day'), 'err'); return; }
    this.call('rapid', {
      slot: this._slot, start: v.start, duration: v.duration, mode: v.mode, days: v.mode === 'week' ? v.days.join(',') : '',
      every_n: v.mode === 'every' ? v.every_n : 0, from: v.mode === 'every' ? v.from : '', zones: zs.join(','),
      off_slots: [...this._off].sort().join(','),
    }, 'r', t('applied', { slot: this._slot, count: zs.length }));
  }
}

const def = (n, c) => customElements.get(n) || customElements.define(n, c);
def('ll-strategy-dashboard-irry-the-seven', IrryDashboardStrategy);
def('ll-strategy-view-irry-status', IrryStatusStrategy);
def('ll-strategy-view-irry-irrigation', IrryIrrigationStrategy);
def('ll-strategy-view-irry-weather', IrryWeatherStrategy);
def('irry-slot-card', IrrySlotCard);
def('irry-rapid-card', IrryRapidCard);
window.customCards = window.customCards || [];
window.customCards.push(
  { type: 'irry-rapid-card', name: 'Irry Rapid', description: 'Same start and duration, zones one after another' },
  { type: 'irry-slot-card', name: 'Irry zone slots', description: 'The three slots of one zone (zone: N)' },
);
console.info(`%c IRRY THE SEVEN %c ${IRRY_VERSION} `, 'background:#2e7d32;color:#fff', '');
if (typeof module !== 'undefined') module.exports = { irryModel, statusView, irrigationView, weatherView, tr, slug, errText, I18N };
})();
