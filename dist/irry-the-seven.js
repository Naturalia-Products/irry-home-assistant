(() => {
// Irry The Seven: Home Assistant dashboard and view strategies, and the cards they use.
// One file, no dependencies. Finds the Irry device by manufacturer and its entities by their
// fixed English names (fallback: the entity_id suffix), so area or device renames do not break it.
//   Dashboard:  strategy: { type: custom:irry-the-seven }
//   Views:      strategy: { type: custom:irry-status | custom:irry-irrigation | custom:irry-day | custom:irry-weather |
//                                 custom:irry-settings }
//   Options:    device: <device_id or name> (several Irry devices), language: it/en/de/fr/es/pt,
//               windrose: false, mini_graph: false (HACS cards are used only when installed)
// Texts: the device UI translations (src/ui/i18n) plus a few of their own, inlined by ha/build.py
// (every literal key passed to t() or K()). Names and states are always the device's own words: ESPHome
// entities carry no translation_key, so HA would show the English firmware names and states.
// Units: the device "Units" select (Auto = from the time zone), as in the device UI; HA sensor values
// are converted from whatever unit HA shows them in. Graphs keep the HA unit.

const IRRY_VERSION = '0.3.0';
const I18N = {"en":{"active":"Active","all":"All","allok":"All good","applied":"Slot {slot} written to {count, plural, one {# zone} other {# zones}}","apply":"Apply to slot {slot}","aux_def":"Aux","aux_m":"Aux mode","aux_m_last":"At startup: last state","aux_m_off":"At startup: always OFF","aux_m_on":"At startup: always ON","aux_m_sync":"Synced with zones","aux_name":"Aux name","aux_tof":"Off delay (0–600 s)","aux_ton":"On delay (0–120 s)","buz":"Alarm sound","buz_from":"Quiet from","buz_h":"While an alarm is active (for example time not valid) the beeper sounds 3 short beeps every 30 s; it also beeps when a valve opens or closes. Silence, or a short press of the BOOT button, stops it until the alarm clears. Quiet hours do not apply while the time is not valid.","buz_off":"Off","buz_on":"On","buz_q":"Quiet hours","buz_to":"To","cfg":"Configuration","ch_time_bad":"Time not valid","close_all":"Close all","day_list":"Day list","days":"Days","days_u":"days","dm_even":"Even","dm_every":"Every N","dm_odd":"Odd","dm_week":"Weekdays","dur":"Duration","dur_zone":"Duration per zone","e_generic":"Error: {err}","e_limit":"Program refused: more than 3 zones open at once","e_limit_at":"Program refused: {count} zones open at once (max 3) · {when} {from}–{to} · {zones}","es_bgt":"Black globe temperature","es_calc":"calculated","es_cap":"Capacitor","es_co2":"CO₂","es_co2d":"CO₂, 24 h average","es_co2i":"CO₂ console","es_co2id":"CO₂ console, 24 h average","es_cons":"Console","es_depth":"Water level","es_dp":"Dew point","es_g_air":"Air quality","es_g_bat":"Batteries","es_g_ch":"Extra channels","es_g_in":"Indoor (gateway)","es_g_oth":"Other sensors","es_g_out":"Outdoor","es_g_rain":"Rain","es_g_soil":"Soil and leaves","es_g_unk":"Other fields","es_g_wind":"Wind","es_in_h":"Measured by the gateway's own sensor, indoors: shown for information only, never used for the weather adjustment.","es_leak":"Water leak","es_leak_n":"dry","es_leak_y":"leak!","es_ltd":"Lightning distance","es_ltn":"Lightning strikes","es_ltt":"Last lightning","es_lux":"Illuminance","es_lw":"Leaf wetness","es_no":"no","es_pm":"Particulate","es_pm25":"PM2.5","es_pm25d":"PM2.5, 24 h average","es_pmd":"Particulate, 24 h average","es_r1":"Last hour","es_rd":"Today","es_re":"Event","es_rm":"This month","es_rnow":"Raining now","es_rr":"Rain rate","es_rt":"Total","es_rw":"This week","es_ry":"This year","es_sec":"Soil conductivity","es_sm":"Soil moisture","es_st":"Soil temperature","es_tf":"Feels like","es_uv":"UV index","es_vpd":"Vapour pressure deficit","es_wbgt":"WBGT","es_wc":"Wind chill","es_wd10":"Direction, 10 min average","es_wg":"Gust","es_wgx":"Max gust today","es_ws10":"Speed, 10 min average","es_yes":"yes","every_n":"Every","find":"Find device","find_b":"Find","find_ok":"LED and beeper on for 10 s","from":"Starting","fw":"Firmware","fw_err":"Update failed: {err}","fwm_auto":"Automatic","fwm_ntf":"Notify only","fwm_off":"Off","fwn":"Update from the internet","fwn_av":"Version {ver} available","fwn_avm":"Version {ver} available (install by hand only)","fwn_check":"Check for updates","fwn_chk":"Checking…","fwn_go":"Install {ver}","fwn_inst":"Installing…","fwn_last":"Last check","fwn_notes":"Release notes","fwn_off":"Internet update is off: no check is made.","fwn_ok":"Up to date","fwn_rej_rb":"Version {ver} available, discarded after a failed update","fwn_ver":"Firmware update being verified: wait about a minute.","g":"Day","h":"h","h_man":"by hand (web app, HA)","h_met":"weather","h_o10":"skipped: zones full","h_o11":"closed: wind","h_o12":"skipped: wind","h_o2":"stopped by hand","h_o3":"closed: rain","h_o4":"Close all","h_o5":"manual limit","h_o6":"firmware update","h_o7":"cut: restart or power loss","h_o8":"skipped: rain","h_o9":"skipped: paused","h_part":"Partial history: the day was full, its first records were overwritten.","h_res":"resumed","h_web":"web app","in_prog":"running","ip":"IP address","loading":"Loading…","m_alt":"Altitude","m_batt":"Sensor array battery","m_batt_low":"low","m_batt_ok":"ok","m_cal":"Calibrate","m_data":"Data","m_eco":"Ecowitt","m_eco_none":"Not paired","m_eco_rx":"Last upload","m_et0y":"ET0 yesterday","m_etr":"Reference ET0 (100 %)","m_etr_h":"Daily evapotranspiration at which the programmed durations are right: {ref} is a typical summer day. Calibrate sets it from the last days, so that today's durations stay as programmed.","m_f":"Reference lawn factor","m_fao":"Full","m_ha":"Home Assistant","m_harg":"Simple","m_hist":"Last days","m_lat":"Latitude","m_lon":"Longitude","m_meth":"Duration adjustment","m_none":"None","m_o_d":"default","m_o_h":"Home Assistant","m_o_m":"manual","m_o_p":"station pressure","m_o_t":"time zone","m_off":"Off","m_pa":"Absolute pressure","m_pfx":"Weather station prefix (Home Assistant)","m_pr":"Relative pressure","m_psl":"Sea-level pressure","m_pt_beds":"Beds, shrubs, hedges","m_pt_cool":"Cool-season lawn","m_pt_dry":"Mediterranean, low water","m_pt_none":"Not adapted","m_pt_tree":"Trees, orchard","m_pt_veg":"Vegetable garden","m_pt_warm":"Warm-season lawn","m_q_missing":"not enough data: durations unchanged","m_r24":"Rain last 24 h","m_res":"Today","m_rh":"Humidity","m_rs":"Solar radiation","m_sh":"Sheltered from rain","m_t":"Temperature","m_wx":"Sheltered from wind","min":"min","mmax":"Max manual watering","next":"Next start","now_run":"Watering","ntp":"NTP servers","offline":"Device unreachable","ok":"OK","ovl":"Overlap","ovl_ban":"{count} zones open at once {from}–{to}: {zones}","pause":"Pause programs","paused":"Programs paused","pick_date":"Choose a day","pick_day":"Pick at least one day.","pick_zone":"Include at least one zone.","r":"Quick","rain":"Rain","rain_attr":"Attribute (optional)","rain_ent":"Last-24h rain entity (entity_id)","rain_skip":"Rain skip","rain_thr":"Threshold","rainskip":"Starts skipped for rain","rainskip_nx":"Next start, sheltered zone: {zone}, {when}.","rainskip_sh":"Zones sheltered from rain run anyway.","restart_b":"Restart","rtc":"RTC clock","rtc_abs":"not detected","rtc_bad":"present, time lost (battery?)","rtc_ok":"present, time valid","s":"System","saved":"Saved","seq_hdr":"Zones in sequence","signal":"Signal","silence":"Silence alarm","slot":"Slot","st":"Status","start":"Start","tail":"dashed = carried over from the previous day","time":"Date and time","today":"today","turn_off_slot":"Turn off slot {slot}","tz":"Time zone","un_i":"Imperial","un_m":"Metric","units":"Units","up":"Move up","uptime":"Up for","vp":"Valve power","w_dir":"Direction","w_gust":"Gust","w_spd":"Speed","w_thr_g":"Gust threshold","w_thr_u":"Mean threshold (10 min)","wd_e":"E","wd_n":"N","wd_ne":"NE","wd_nw":"NW","wd_s":"S","wd_se":"SE","wd_sw":"SW","wd_w":"W","wfb_chip":"Fallback Wi-Fi","wifi":"Wi-Fi","wind_h":"Wind","wind_ign":"Ignore wind","wind_over_nx":"Wind over threshold: the next scheduled starts wait for it to drop.","wp":"Wind pause","wp_res":"Expected resume {time} (in {dur}), after 10 min under the thresholds","wp_skip":"If the wind stays up, the rest of the cycle is skipped at {time}, when the window ends","wp_win":"window until {time}","wp_zs":"Paused: {list}","ws_now":"Phone time","ww":"Waiting for the wind to drop","ww_zs":"Waiting: {list}","wx":"Weather","wx_7":"7 days","wx_c":"Coefficients","wx_c_off":"Duration adjustment is off: no coefficients are computed. Turn it on in System → Installation, Weather card.","wx_g":"Charts","wx_s":"Sensors","x_30d":"30 days","x_close_q":"Close all zone valves?","x_device":"Device","x_diag":"Diagnostics","x_end":"ends","x_feed_stale":"Weather station not updating","x_feed_unpaired":"Weather station not paired","x_fwm":"Firmware updates","x_fwsrc":"Update source","x_irrigation":"Irrigation","x_last_ev":"Last event","x_log":"Events","x_no":"No","x_no_dev":"No Irry device found in Home Assistant.","x_no_svc":"Irry actions not found: update the device firmware, then reload the ESPHome integration","x_position":"Position in use","x_pressure":"Pressure","x_pt":"Crop","x_rain_day":"rain {rain} {u}","x_restart_q":"Restart the device?","x_saving":"Saving…","x_station":"Station","x_sun":"Sun","x_tsrc":"Time source","x_tvalid":"Time valid","x_un_auto":"Automatic (time zone)","x_unav":"Unavailable","x_wd_collecting":"Collecting weather data","x_wd_ene":"ENE","x_wd_ese":"ESE","x_wd_fallback":"Weather data partial: fallback values in use","x_wd_missing":"Weather data missing","x_wd_nne":"NNE","x_wd_nnw":"NNW","x_wd_sse":"SSE","x_wd_ssw":"SSW","x_wd_wnw":"WNW","x_wd_wsw":"WSW","x_wdata":"Weather data","x_wifi_fb":"Connected to the fallback Wi-Fi network","x_wifi_pri":"Primary","x_wind_over":"Wind over threshold","x_wind_res":"Resume after wind","x_wsrc":"Weather source","x_yes":"Yes","x_zf":"Zone factor","x_zname":"Zone name","z_man":"Opened manually","z_off":"No program","zones":"Zones"},"it":{"active":"Attivo","all":"Tutti","allok":"Tutto ok","applied":"Slot {slot} scritto su {count, plural, one {# zona} other {# zone}}","apply":"Applica allo slot {slot}","aux_def":"Aux","aux_m":"Modalità Aux","aux_m_last":"All’avvio: ultimo stato","aux_m_off":"All’avvio: sempre OFF","aux_m_on":"All’avvio: sempre ON","aux_m_sync":"Sincronizzato con le zone","aux_name":"Nome Aux","aux_tof":"Ritardo spegnimento (0–600 s)","aux_ton":"Ritardo accensione (0–120 s)","buz":"Segnalazione acustica allarmi","buz_from":"Silenzio dalle","buz_h":"Con un allarme attivo (per esempio ora non valida) il cicalino suona 3 bip brevi ogni 30 s; suona anche quando una valvola si apre o si chiude. Tacita, o una pressione breve del pulsante BOOT, lo ferma finché l'allarme non sparisce. Con l'ora non valida la fascia di silenzio non si applica.","buz_off":"Spento","buz_on":"Acceso","buz_q":"Fascia di silenzio","buz_to":"Alle","cfg":"Configurazione","ch_time_bad":"Ora non valida","close_all":"Chiudi tutte","day_list":"Elenco del giorno","days":"Giorni","days_u":"giorni","dm_even":"Pari","dm_every":"Ogni N","dm_odd":"Dispari","dm_week":"Settimana","dur":"Durata","dur_zone":"Durata per zona","e_generic":"Errore: {err}","e_limit":"Programma rifiutato: più di 3 zone aperte insieme","e_limit_at":"Programma rifiutato: {count} zone aperte insieme (massimo 3) · {when} {from}–{to} · {zones}","es_bgt":"Temperatura di globo","es_calc":"calcolato","es_cap":"Condensatore","es_co2":"CO₂","es_co2d":"CO₂ media 24 h","es_co2i":"CO₂ console","es_co2id":"CO₂ console media 24 h","es_cons":"Console","es_depth":"Livello acqua","es_dp":"Punto di rugiada","es_g_air":"Qualità dell’aria","es_g_bat":"Batterie","es_g_ch":"Canali extra","es_g_in":"Interno (gateway)","es_g_oth":"Altri sensori","es_g_out":"Esterno","es_g_rain":"Pioggia","es_g_soil":"Suolo e foglie","es_g_unk":"Altri campi","es_g_wind":"Vento","es_in_h":"Misurati dal sensore del gateway, in casa: solo informativi, mai usati per la regolazione meteo.","es_leak":"Perdita d’acqua","es_leak_n":"asciutto","es_leak_y":"perdita!","es_ltd":"Distanza fulmine","es_ltn":"Fulmini rilevati","es_ltt":"Ultimo fulmine","es_lux":"Illuminamento","es_lw":"Bagnatura fogliare","es_no":"no","es_pm":"Particolato","es_pm25":"PM2.5","es_pm25d":"PM2.5 media 24 h","es_pmd":"Particolato media 24 h","es_r1":"Ultima ora","es_rd":"Oggi","es_re":"Evento","es_rm":"Mese","es_rnow":"Piove adesso","es_rr":"Intensità","es_rt":"Totale","es_rw":"Settimana","es_ry":"Anno","es_sec":"Conducibilità del suolo","es_sm":"Umidità del suolo","es_st":"Temperatura del suolo","es_tf":"Temperatura percepita","es_uv":"Indice UV","es_vpd":"Deficit di pressione di vapore","es_wbgt":"WBGT","es_wc":"Wind chill","es_wd10":"Direzione media 10 min","es_wg":"Raffica","es_wgx":"Raffica massima di oggi","es_ws10":"Velocità media 10 min","es_yes":"sì","every_n":"Ogni","find":"Trova dispositivo","find_b":"Trova","find_ok":"LED e cicalino attivi per 10 s","from":"A partire da","fw":"Firmware","fw_err":"Aggiornamento non riuscito: {err}","fwm_auto":"Automatico","fwm_ntf":"Solo avviso","fwm_off":"Spento","fwn":"Aggiornamento da internet","fwn_av":"Disponibile la versione {ver}","fwn_avm":"Disponibile la versione {ver} (solo installazione manuale)","fwn_check":"Verifica aggiornamenti","fwn_chk":"Verifica in corso…","fwn_go":"Installa {ver}","fwn_inst":"Installazione in corso…","fwn_last":"Ultima verifica","fwn_notes":"Note di rilascio","fwn_off":"Aggiornamento da internet spento: nessun controllo.","fwn_ok":"Aggiornato","fwn_rej_rb":"Disponibile la versione {ver}, scartata dopo un aggiornamento fallito","fwn_ver":"Aggiornamento in verifica: attendi circa un minuto.","g":"Giornata","h":"h","h_man":"a mano (web app, HA)","h_met":"meteo","h_o10":"saltata: zone piene","h_o11":"chiusa: vento","h_o12":"saltata: vento","h_o2":"fermata a mano","h_o3":"chiusa: pioggia","h_o4":"Chiudi tutto","h_o5":"limite manuale","h_o6":"aggiornamento firmware","h_o7":"interrotta: riavvio o blackout","h_o8":"saltata: pioggia","h_o9":"saltata: in pausa","h_part":"Storico parziale: il giorno era pieno, le prime registrazioni sono state sovrascritte.","h_res":"ripresa","h_web":"web app","in_prog":"in corso","ip":"Indirizzo IP","loading":"Caricamento…","m_alt":"Altitudine","m_batt":"Batteria array di sensori","m_batt_low":"scarica","m_batt_ok":"ok","m_cal":"Calibra","m_data":"Dati","m_eco":"Ecowitt","m_eco_none":"Non abbinato","m_eco_rx":"Ultimo invio","m_et0y":"ET0 di ieri","m_etr":"ET0 di riferimento (100 %)","m_etr_h":"Evapotraspirazione giornaliera per cui le durate programmate sono giuste: {ref} è una tipica giornata estiva. Calibra la ricava dagli ultimi giorni, così le durate di oggi restano quelle programmate.","m_f":"Fattore del prato di riferimento","m_fao":"Completo","m_ha":"Home Assistant","m_harg":"Semplice","m_hist":"Ultimi giorni","m_lat":"Latitudine","m_lon":"Longitudine","m_meth":"Adattamento delle durate","m_none":"Nessuna","m_o_d":"predefinita","m_o_h":"Home Assistant","m_o_m":"manuale","m_o_p":"pressione della stazione","m_o_t":"fuso orario","m_off":"Spento","m_pa":"Pressione assoluta","m_pfx":"Prefisso della stazione meteo (Home Assistant)","m_pr":"Pressione relativa","m_psl":"Pressione al livello del mare","m_pt_beds":"Aiuole, fiori, arbusti, siepi","m_pt_cool":"Prato microterme","m_pt_dry":"Mediterranee, basso consumo","m_pt_none":"Non adattare","m_pt_tree":"Alberi e frutteto","m_pt_veg":"Orto","m_pt_warm":"Prato macroterme","m_q_missing":"dati insufficienti: durate invariate","m_r24":"Pioggia ultime 24 h","m_res":"Oggi","m_rh":"Umidità","m_rs":"Radiazione solare","m_sh":"Riparata dalla pioggia","m_t":"Temperatura","m_wx":"Riparata dal vento","min":"min","mmax":"Tempo massimo irrigazione manuale","next":"Prossimo avvio","now_run":"In irrigazione","ntp":"Server NTP","offline":"Dispositivo non raggiungibile","ok":"OK","ovl":"Sovrapposizione","ovl_ban":"{count} zone aperte insieme {from}–{to}: {zones}","pause":"Sospendi programmi","paused":"Programmi sospesi","pick_date":"Scegli un giorno","pick_day":"Scegli almeno un giorno.","pick_zone":"Includi almeno una zona.","r":"Rapido","rain":"Pioggia","rain_attr":"Attributo (opzionale)","rain_ent":"Entità pioggia ultime 24 h (entity_id)","rain_skip":"Salto pioggia","rain_thr":"Soglia","rainskip":"Avvii saltati per pioggia","rainskip_nx":"Prossimo avvio, zona riparata: {zone}, {when}.","rainskip_sh":"Le zone riparate dalla pioggia partono comunque.","restart_b":"Riavvia","rtc":"Orologio RTC","rtc_abs":"non rilevato","rtc_bad":"presente, ora persa (batteria?)","rtc_ok":"presente, ora valida","s":"Sistema","saved":"Salvato","seq_hdr":"Zone in sequenza","signal":"Segnale","silence":"Tacita allarme","slot":"Slot","st":"Stato","start":"Inizio","tail":"tratteggio = coda dal giorno prima","time":"Data e ora","today":"oggi","turn_off_slot":"Spegni lo slot {slot}","tz":"Fuso orario","un_i":"Imperiali","un_m":"Metriche","units":"Unità di misura","up":"Sposta su","uptime":"Acceso da","vp":"Alimentazione valvole","w_dir":"Direzione","w_gust":"Raffica","w_spd":"Velocità","w_thr_g":"Soglia raffica","w_thr_u":"Soglia media (10 min)","wd_e":"Levante","wd_n":"Tramontana","wd_ne":"Grecale","wd_nw":"Maestrale","wd_s":"Ostro","wd_se":"Scirocco","wd_sw":"Libeccio","wd_w":"Ponente","wfb_chip":"Wi-Fi di riserva","wifi":"Wi-Fi","wind_h":"Vento","wind_ign":"Ignora vento","wind_over_nx":"Vento oltre soglia: i prossimi avvii programmati aspettano che cali.","wp":"Pausa vento","wp_res":"Ripresa prevista alle {time} (fra {dur}), dopo 10 min sotto soglia","wp_skip":"Se il vento resta alto, alle {time} la finestra finisce e il resto del ciclo salta","wp_win":"finestra fino alle {time}","wp_zs":"In pausa: {list}","ws_now":"Ora del telefono","ww":"In attesa che il vento cali","ww_zs":"In attesa: {list}","wx":"Meteo","wx_7":"7 giorni","wx_c":"Coefficienti","wx_c_off":"Adattamento delle durate spento: nessun coefficiente calcolato. Si attiva in Sistema → Impianto, card Meteo.","wx_g":"Grafici","wx_s":"Sensori","x_30d":"30 giorni","x_close_q":"Chiudere tutte le valvole?","x_device":"Dispositivo","x_diag":"Diagnostica","x_end":"termina","x_feed_stale":"La stazione meteo non si aggiorna","x_feed_unpaired":"Stazione meteo non abbinata","x_fwm":"Aggiornamenti firmware","x_fwsrc":"Origine degli aggiornamenti","x_irrigation":"Irrigazione","x_last_ev":"Ultimo evento","x_log":"Eventi","x_no":"No","x_no_dev":"Nessun dispositivo Irry trovato in Home Assistant.","x_no_svc":"Azioni Irry non trovate: aggiorna il firmware del dispositivo, poi ricarica l'integrazione ESPHome","x_position":"Posizione in uso","x_pressure":"Pressione","x_pt":"Coltura","x_rain_day":"pioggia {rain} {u}","x_restart_q":"Riavviare il dispositivo?","x_saving":"Salvataggio…","x_station":"Stazione","x_sun":"Sole","x_tsrc":"Origine dell'ora","x_tvalid":"Ora valida","x_un_auto":"Automatiche (fuso orario)","x_unav":"Non disponibile","x_wd_collecting":"Raccolta dei dati meteo in corso","x_wd_ene":"Greco-Levante","x_wd_ese":"Levante-Scirocco","x_wd_fallback":"Dati meteo parziali: in uso i valori di ripiego","x_wd_missing":"Dati meteo mancanti","x_wd_nne":"Tramontana-Greco","x_wd_nnw":"Maestrale-Tramontana","x_wd_sse":"Scirocco-Ostro","x_wd_ssw":"Ostro-Libeccio","x_wd_wnw":"Ponente-Maestrale","x_wd_wsw":"Libeccio-Ponente","x_wdata":"Dati meteo","x_wifi_fb":"Collegato alla rete Wi-Fi di riserva","x_wifi_pri":"Principale","x_wind_over":"Vento oltre soglia","x_wind_res":"Ripresa dopo il vento","x_wsrc":"Sorgente meteo","x_yes":"Sì","x_zf":"Fattore della zona","x_zname":"Nome della zona","z_man":"Aperta manualmente","z_off":"Nessun programma","zones":"Zone"},"de":{"active":"Aktiv","all":"Alle","allok":"Alles in Ordnung","applied":"Slot {slot} auf {count, plural, one {# Zone} other {# Zonen}} geschrieben","apply":"Auf Slot {slot} anwenden","aux_def":"Aux","aux_m":"Aux-Modus","aux_m_last":"Beim Start: letzter Zustand","aux_m_off":"Beim Start: immer AUS","aux_m_on":"Beim Start: immer EIN","aux_m_sync":"Mit den Zonen synchronisiert","aux_name":"Aux-Name","aux_tof":"Ausschaltverzögerung (0–600 s)","aux_ton":"Einschaltverzögerung (0–120 s)","buz":"Akustischer Alarm","buz_from":"Ruhe ab","buz_h":"Bei einem aktiven Alarm (z. B. Uhrzeit ungültig) gibt der Summer alle 30 s 3 kurze Töne aus; er piept auch, wenn ein Ventil öffnet oder schließt. Stummschalten oder ein kurzer Druck auf die BOOT-Taste stoppt ihn, bis der Alarm endet. Bei ungültiger Uhrzeit gilt die Ruhezeit nicht.","buz_off":"Aus","buz_on":"Ein","buz_q":"Ruhezeit","buz_to":"Bis","cfg":"Konfiguration","ch_time_bad":"Uhrzeit ungültig","close_all":"Alle schließen","day_list":"Tagesliste","days":"Tage","days_u":"Tage","dm_even":"Gerade","dm_every":"Alle N","dm_odd":"Ungerade","dm_week":"Wochentage","dur":"Dauer","dur_zone":"Dauer pro Zone","e_generic":"Fehler: {err}","e_limit":"Programm abgelehnt: mehr als 3 Zonen gleichzeitig offen","e_limit_at":"Programm abgelehnt: {count} Zonen gleichzeitig offen (maximal 3) · {when} {from}–{to} · {zones}","es_bgt":"Globetemperatur","es_calc":"berechnet","es_cap":"Kondensator","es_co2":"CO₂","es_co2d":"CO₂, Mittel 24 h","es_co2i":"CO₂ Konsole","es_co2id":"CO₂ Konsole, Mittel 24 h","es_cons":"Konsole","es_depth":"Wasserstand","es_dp":"Taupunkt","es_g_air":"Luftqualität","es_g_bat":"Batterien","es_g_ch":"Zusätzliche Kanäle","es_g_in":"Innen (Gateway)","es_g_oth":"Weitere Sensoren","es_g_out":"Außen","es_g_rain":"Regen","es_g_soil":"Boden und Blätter","es_g_unk":"Weitere Felder","es_g_wind":"Wind","es_in_h":"Vom eigenen Sensor des Gateways im Haus gemessen: nur zur Information, nie für die Wetteranpassung verwendet.","es_leak":"Wasserleck","es_leak_n":"trocken","es_leak_y":"Leck!","es_ltd":"Blitzentfernung","es_ltn":"Blitze erkannt","es_ltt":"Letzter Blitz","es_lux":"Beleuchtungsstärke","es_lw":"Blattnässe","es_no":"nein","es_pm":"Feinstaub","es_pm25":"PM2.5","es_pm25d":"PM2.5, Mittel 24 h","es_pmd":"Feinstaub, Mittel 24 h","es_r1":"Letzte Stunde","es_rd":"Heute","es_re":"Ereignis","es_rm":"Dieser Monat","es_rnow":"Regnet gerade","es_rr":"Regenrate","es_rt":"Gesamt","es_rw":"Diese Woche","es_ry":"Dieses Jahr","es_sec":"Bodenleitfähigkeit","es_sm":"Bodenfeuchte","es_st":"Bodentemperatur","es_tf":"Gefühlte Temperatur","es_uv":"UV-Index","es_vpd":"Dampfdruckdefizit","es_wbgt":"WBGT","es_wc":"Windchill","es_wd10":"Richtung, Mittel 10 min","es_wg":"Böe","es_wgx":"Stärkste Böe heute","es_ws10":"Geschwindigkeit, Mittel 10 min","es_yes":"ja","every_n":"Alle","find":"Gerät finden","find_b":"Finden","find_ok":"LED und Summer 10 s aktiv","from":"Ab","fw":"Firmware","fw_err":"Update fehlgeschlagen: {err}","fwm_auto":"Automatisch","fwm_ntf":"Nur melden","fwm_off":"Aus","fwn":"Aktualisierung aus dem Internet","fwn_av":"Version {ver} verfügbar","fwn_avm":"Version {ver} verfügbar (nur manuelle Installation)","fwn_check":"Nach Aktualisierungen suchen","fwn_chk":"Prüfung läuft…","fwn_go":"{ver} installieren","fwn_inst":"Installation läuft…","fwn_last":"Letzte Prüfung","fwn_notes":"Versionshinweise","fwn_off":"Internet-Aktualisierung ist aus: keine Prüfung.","fwn_ok":"Aktuell","fwn_rej_rb":"Version {ver} verfügbar, nach einer fehlgeschlagenen Aktualisierung verworfen","fwn_ver":"Firmware-Aktualisierung wird geprüft: etwa eine Minute warten.","g":"Tag","h":"Std.","h_man":"von Hand (Web-App, HA)","h_met":"Wetter","h_o10":"übersprungen: Zonen voll","h_o11":"geschlossen: Wind","h_o12":"übersprungen: Wind","h_o2":"von Hand gestoppt","h_o3":"geschlossen: Regen","h_o4":"Alle schließen","h_o5":"manuelles Limit","h_o6":"Firmware-Update","h_o7":"unterbrochen: Neustart oder Stromausfall","h_o8":"übersprungen: Regen","h_o9":"übersprungen: pausiert","h_part":"Unvollständiger Verlauf: Der Tag war voll, die ersten Einträge wurden überschrieben.","h_res":"fortgesetzt","h_web":"Web-App","in_prog":"läuft","ip":"IP-Adresse","loading":"Wird geladen…","m_alt":"Höhe","m_batt":"Batterie Sensorarray","m_batt_low":"schwach","m_batt_ok":"ok","m_cal":"Kalibrieren","m_data":"Daten","m_eco":"Ecowitt","m_eco_none":"Nicht gekoppelt","m_eco_rx":"Letzter Upload","m_et0y":"ET0 gestern","m_etr":"Referenz-ET0 (100 %)","m_etr_h":"Tägliche Verdunstung, bei der die programmierten Laufzeiten stimmen: {ref} ist ein typischer Sommertag. Kalibrieren setzt sie aus den letzten Tagen, damit die heutigen Laufzeiten wie programmiert bleiben.","m_f":"Faktor des Referenzrasens","m_fao":"Vollständig","m_ha":"Home Assistant","m_harg":"Einfach","m_hist":"Letzte Tage","m_lat":"Breitengrad","m_lon":"Längengrad","m_meth":"Anpassung der Laufzeiten","m_none":"Keine","m_o_d":"Standard","m_o_h":"Home Assistant","m_o_m":"manuell","m_o_p":"Luftdruck der Station","m_o_t":"Zeitzone","m_off":"Aus","m_pa":"Absoluter Luftdruck","m_pfx":"Präfix der Wetterstation (Home Assistant)","m_pr":"Relativer Luftdruck","m_psl":"Luftdruck auf Meereshöhe","m_pt_beds":"Beete, Blumen, Sträucher, Hecken","m_pt_cool":"Rasen (kühle Klimate)","m_pt_dry":"Mediterran, wenig Wasser","m_pt_none":"Nicht anpassen","m_pt_tree":"Bäume, Obstgarten","m_pt_veg":"Gemüsegarten","m_pt_warm":"Rasen (warme Klimate)","m_q_missing":"zu wenig Daten: Laufzeiten unverändert","m_r24":"Regen letzte 24 h","m_res":"Heute","m_rh":"Luftfeuchte","m_rs":"Sonnenstrahlung","m_sh":"Vor Regen geschützt","m_t":"Temperatur","m_wx":"Vor Wind geschützt","min":"Min.","mmax":"Max. manuelle Bewässerung","next":"Nächster Start","now_run":"Bewässerung läuft","ntp":"NTP-Server","offline":"Gerät nicht erreichbar","ok":"OK","ovl":"Überschneidung","ovl_ban":"{count} Zonen gleichzeitig offen {from}–{to}: {zones}","pause":"Programme pausieren","paused":"Programme pausiert","pick_date":"Tag wählen","pick_day":"Mindestens einen Tag wählen.","pick_zone":"Mindestens eine Zone einbeziehen.","r":"Schnell","rain":"Regen","rain_attr":"Attribut (optional)","rain_ent":"Regen-Entität letzte 24 h (entity_id)","rain_skip":"Regenaussetzung","rain_thr":"Schwelle","rainskip":"Starts wegen Regen übersprungen","rainskip_nx":"Nächster Start, überdachte Zone: {zone}, {when}.","rainskip_sh":"Vor Regen geschützte Zonen starten trotzdem.","restart_b":"Neu starten","rtc":"RTC-Uhr","rtc_abs":"nicht erkannt","rtc_bad":"vorhanden, Uhrzeit verloren (Batterie?)","rtc_ok":"vorhanden, Zeit gültig","s":"System","saved":"Gespeichert","seq_hdr":"Zonen in Reihenfolge","signal":"Signal","silence":"Alarm stummschalten","slot":"Slot","st":"Status","start":"Start","tail":"gestrichelt = Rest vom Vortag","time":"Datum und Uhrzeit","today":"heute","turn_off_slot":"Slot {slot} ausschalten","tz":"Zeitzone","un_i":"Imperial","un_m":"Metrisch","units":"Maßeinheiten","up":"Nach oben","uptime":"Läuft seit","vp":"Ventilversorgung","w_dir":"Richtung","w_gust":"Böe","w_spd":"Geschwindigkeit","w_thr_g":"Schwelle Böe","w_thr_u":"Schwelle Mittel (10 min)","wd_e":"O","wd_n":"N","wd_ne":"NO","wd_nw":"NW","wd_s":"S","wd_se":"SO","wd_sw":"SW","wd_w":"W","wfb_chip":"Reserve-WLAN","wifi":"WLAN","wind_h":"Wind","wind_ign":"Wind ignorieren","wind_over_nx":"Wind über der Schwelle: die nächsten geplanten Starts warten, bis er nachlässt.","wp":"Windpause","wp_res":"Fortsetzung voraussichtlich {time} (in {dur}), nach 10 min unter den Schwellen","wp_skip":"Bleibt der Wind stark, entfällt der Rest des Zyklus um {time}, wenn das Fenster endet","wp_win":"Fenster bis {time}","wp_zs":"Pausiert: {list}","ws_now":"Uhrzeit des Telefons","ww":"Warten, bis der Wind nachlässt","ww_zs":"Wartend: {list}","wx":"Wetter","wx_7":"7 Tage","wx_c":"Koeffizienten","wx_c_off":"Dauer-Anpassung aus: es werden keine Koeffizienten berechnet. Einschalten unter System → Anlage, Karte Wetter.","wx_g":"Diagramme","wx_s":"Sensoren","x_30d":"30 Tage","x_close_q":"Alle Zonenventile schließen?","x_device":"Gerät","x_diag":"Diagnose","x_end":"endet","x_feed_stale":"Wetterstation aktualisiert nicht","x_feed_unpaired":"Wetterstation nicht gekoppelt","x_fwm":"Firmware-Updates","x_fwsrc":"Update-Quelle","x_irrigation":"Bewässerung","x_last_ev":"Letztes Ereignis","x_log":"Ereignisse","x_no":"Nein","x_no_dev":"Kein Irry-Gerät in Home Assistant gefunden.","x_no_svc":"Irry-Aktionen nicht gefunden: Gerätefirmware aktualisieren, dann die ESPHome-Integration neu laden","x_position":"Verwendete Position","x_pressure":"Luftdruck","x_pt":"Bepflanzung","x_rain_day":"Regen {rain} {u}","x_restart_q":"Gerät neu starten?","x_saving":"Speichern…","x_station":"Station","x_sun":"Sonne","x_tsrc":"Zeitquelle","x_tvalid":"Uhrzeit gültig","x_un_auto":"Automatisch (Zeitzone)","x_unav":"Nicht verfügbar","x_wd_collecting":"Wetterdaten werden gesammelt","x_wd_ene":"ONO","x_wd_ese":"OSO","x_wd_fallback":"Wetterdaten unvollständig: Ersatzwerte in Gebrauch","x_wd_missing":"Wetterdaten fehlen","x_wd_nne":"NNO","x_wd_nnw":"NNW","x_wd_sse":"SSO","x_wd_ssw":"SSW","x_wd_wnw":"WNW","x_wd_wsw":"WSW","x_wdata":"Wetterdaten","x_wifi_fb":"Mit dem Ersatz-WLAN verbunden","x_wifi_pri":"Primär","x_wind_over":"Wind über Schwelle","x_wind_res":"Fortsetzung nach Wind","x_wsrc":"Wetterquelle","x_yes":"Ja","x_zf":"Zonenfaktor","x_zname":"Zonenname","z_man":"Manuell geöffnet","z_off":"Kein Programm","zones":"Zonen"},"fr":{"active":"Actif","all":"Toutes","allok":"Tout va bien","applied":"Créneau {slot} écrit sur {count, plural, one {# zone} other {# zones}}","apply":"Appliquer au créneau {slot}","aux_def":"Aux","aux_m":"Mode Aux","aux_m_last":"Au démarrage : dernier état","aux_m_off":"Au démarrage : toujours OFF","aux_m_on":"Au démarrage : toujours ON","aux_m_sync":"Synchronisé avec les zones","aux_name":"Nom Aux","aux_tof":"Délai d’arrêt (0–600 s)","aux_ton":"Délai de marche (0–120 s)","buz":"Alarme sonore","buz_from":"Silence de","buz_h":"Tant qu'une alarme est active (par exemple heure non valide), le buzzer émet 3 bips courts toutes les 30 s ; il bipe aussi à l'ouverture ou à la fermeture d'une vanne. Couper l'alarme, ou un appui court sur le bouton BOOT, l'arrête jusqu'à la fin de l'alarme. La plage de silence ne s'applique pas si l'heure n'est pas valide.","buz_off":"Désactivée","buz_on":"Activée","buz_q":"Plage de silence","buz_to":"À","cfg":"Configuration","ch_time_bad":"Heure non valide","close_all":"Tout fermer","day_list":"Liste du jour","days":"Jours","days_u":"jours","dm_even":"Pairs","dm_every":"Tous les N","dm_odd":"Impairs","dm_week":"Semaine","dur":"Durée","dur_zone":"Durée par zone","e_generic":"Erreur : {err}","e_limit":"Programme refusé : plus de 3 zones ouvertes en même temps","e_limit_at":"Programme refusé : {count} zones ouvertes en même temps (max 3) · {when} {from}–{to} · {zones}","es_bgt":"Température de globe noir","es_calc":"calculé","es_cap":"Condensateur","es_co2":"CO₂","es_co2d":"CO₂ moyenne 24 h","es_co2i":"CO₂ console","es_co2id":"CO₂ console moyenne 24 h","es_cons":"Console","es_depth":"Niveau d’eau","es_dp":"Point de rosée","es_g_air":"Qualité de l’air","es_g_bat":"Batteries","es_g_ch":"Canaux supplémentaires","es_g_in":"Intérieur (passerelle)","es_g_oth":"Autres capteurs","es_g_out":"Extérieur","es_g_rain":"Pluie","es_g_soil":"Sol et feuilles","es_g_unk":"Autres champs","es_g_wind":"Vent","es_in_h":"Mesurées par le capteur de la passerelle, à l'intérieur : à titre indicatif, jamais utilisées pour l'ajustement météo.","es_leak":"Fuite d’eau","es_leak_n":"sec","es_leak_y":"fuite !","es_ltd":"Distance de la foudre","es_ltn":"Éclairs détectés","es_ltt":"Dernier éclair","es_lux":"Éclairement","es_lw":"Humectation foliaire","es_no":"non","es_pm":"Particules","es_pm25":"PM2.5","es_pm25d":"PM2.5 moyenne 24 h","es_pmd":"Particules moyenne 24 h","es_r1":"Dernière heure","es_rd":"Aujourd’hui","es_re":"Épisode","es_rm":"Mois","es_rnow":"Il pleut","es_rr":"Intensité","es_rt":"Total","es_rw":"Semaine","es_ry":"Année","es_sec":"Conductivité du sol","es_sm":"Humidité du sol","es_st":"Température du sol","es_tf":"Ressenti","es_uv":"Indice UV","es_vpd":"Déficit de pression de vapeur","es_wbgt":"WBGT","es_wc":"Refroidissement éolien","es_wd10":"Direction moyenne 10 min","es_wg":"Rafale","es_wgx":"Rafale max du jour","es_ws10":"Vitesse moyenne 10 min","es_yes":"oui","every_n":"Tous les","find":"Localiser l'appareil","find_b":"Localiser","find_ok":"LED et buzzer actifs pendant 10 s","from":"À partir du","fw":"Firmware","fw_err":"Échec de la mise à jour : {err}","fwm_auto":"Automatique","fwm_ntf":"Avertir seulement","fwm_off":"Désactivée","fwn":"Mise à jour depuis internet","fwn_av":"Version {ver} disponible","fwn_avm":"Version {ver} disponible (installation manuelle uniquement)","fwn_check":"Rechercher des mises à jour","fwn_chk":"Vérification…","fwn_go":"Installer {ver}","fwn_inst":"Installation…","fwn_last":"Dernière vérification","fwn_notes":"Notes de version","fwn_off":"Mise à jour depuis internet désactivée : aucune vérification.","fwn_ok":"À jour","fwn_rej_rb":"Version {ver} disponible, écartée après une mise à jour échouée","fwn_ver":"Mise à jour en cours de vérification : patientez environ une minute.","g":"Jour","h":"h","h_man":"à la main (appli web, HA)","h_met":"météo","h_o10":"ignorée : zones pleines","h_o11":"fermée : vent","h_o12":"sautée : vent","h_o2":"arrêtée à la main","h_o3":"fermée : pluie","h_o4":"Tout fermer","h_o5":"limite manuelle","h_o6":"mise à jour firmware","h_o7":"interrompue : redémarrage ou coupure","h_o8":"ignorée : pluie","h_o9":"ignorée : en pause","h_part":"Historique partiel : la journée était pleine, les premiers enregistrements ont été écrasés.","h_res":"reprise","h_web":"appli web","in_prog":"en cours","ip":"Adresse IP","loading":"Chargement…","m_alt":"Altitude","m_batt":"Batterie du réseau de capteurs","m_batt_low":"faible","m_batt_ok":"ok","m_cal":"Calibrer","m_data":"Données","m_eco":"Ecowitt","m_eco_none":"Non associée","m_eco_rx":"Dernier envoi","m_et0y":"ET0 d’hier","m_etr":"ET0 de référence (100 %)","m_etr_h":"Évapotranspiration journalière pour laquelle les durées programmées sont justes : {ref} est une journée d’été typique. Calibrer la déduit des derniers jours, pour que les durées d’aujourd’hui restent celles programmées.","m_f":"Facteur de la pelouse de référence","m_fao":"Complète","m_ha":"Home Assistant","m_harg":"Simple","m_hist":"Derniers jours","m_lat":"Latitude","m_lon":"Longitude","m_meth":"Adaptation des durées","m_none":"Aucune","m_o_d":"par défaut","m_o_h":"Home Assistant","m_o_m":"manuelle","m_o_p":"pression de la station","m_o_t":"fuseau horaire","m_off":"Désactivée","m_pa":"Pression absolue","m_pfx":"Préfixe de la station météo (Home Assistant)","m_pr":"Pression relative","m_psl":"Pression au niveau de la mer","m_pt_beds":"Massifs, fleurs, arbustes, haies","m_pt_cool":"Gazon de climat tempéré","m_pt_dry":"Méditerranéennes, faible besoin","m_pt_none":"Non adaptée","m_pt_tree":"Arbres, verger","m_pt_veg":"Potager","m_pt_warm":"Gazon de climat chaud","m_q_missing":"données insuffisantes : durées inchangées","m_r24":"Pluie dernières 24 h","m_res":"Aujourd’hui","m_rh":"Humidité","m_rs":"Rayonnement solaire","m_sh":"Abritée de la pluie","m_t":"Température","m_wx":"Abritée du vent","min":"min","mmax":"Arrosage manuel max","next":"Prochain départ","now_run":"Arrosage","ntp":"Serveurs NTP","offline":"Appareil injoignable","ok":"OK","ovl":"Chevauchement","ovl_ban":"{count} zones ouvertes en même temps {from}–{to} : {zones}","pause":"Suspendre les programmes","paused":"Programmes suspendus","pick_date":"Choisir un jour","pick_day":"Choisissez au moins un jour.","pick_zone":"Incluez au moins une zone.","r":"Rapide","rain":"Pluie","rain_attr":"Attribut (facultatif)","rain_ent":"Entité pluie des dernières 24 h (entity_id)","rain_skip":"Saut pour pluie","rain_thr":"Seuil","rainskip":"Départs sautés pour pluie","rainskip_nx":"Prochain départ, zone abritée : {zone}, {when}.","rainskip_sh":"Les zones abritées de la pluie démarrent quand même.","restart_b":"Redémarrer","rtc":"Horloge RTC","rtc_abs":"non détectée","rtc_bad":"présente, heure perdue (pile ?)","rtc_ok":"présente, heure valide","s":"Système","saved":"Enregistré","seq_hdr":"Zones en séquence","signal":"Signal","silence":"Couper l'alarme","slot":"Créneau","st":"État","start":"Départ","tail":"pointillés = reporté de la veille","time":"Date et heure","today":"aujourd’hui","turn_off_slot":"Désactiver le créneau {slot}","tz":"Fuseau horaire","un_i":"Impériales","un_m":"Métriques","units":"Unités","up":"Monter","uptime":"En marche depuis","vp":"Alimentation des vannes","w_dir":"Direction","w_gust":"Rafale","w_spd":"Vitesse","w_thr_g":"Seuil rafale","w_thr_u":"Seuil moyenne (10 min)","wd_e":"E","wd_n":"N","wd_ne":"NE","wd_nw":"NO","wd_s":"S","wd_se":"SE","wd_sw":"SO","wd_w":"O","wfb_chip":"Wi-Fi de secours","wifi":"Wi-Fi","wind_h":"Vent","wind_ign":"Ignorer le vent","wind_over_nx":"Vent au-dessus du seuil : les prochains départs programmés attendent qu'il faiblisse.","wp":"Pause vent","wp_res":"Reprise prévue à {time} (dans {dur}), après 10 min sous les seuils","wp_skip":"Si le vent reste fort, le reste du cycle est sauté à {time}, à la fin de la fenêtre","wp_win":"fenêtre jusqu'à {time}","wp_zs":"En pause : {list}","ws_now":"Heure du téléphone","ww":"En attente que le vent faiblisse","ww_zs":"En attente : {list}","wx":"Météo","wx_7":"7 jours","wx_c":"Coefficients","wx_c_off":"Adaptation des durées désactivée : aucun coefficient calculé. Activez-la dans Système → Installation, carte Météo.","wx_g":"Graphiques","wx_s":"Capteurs","x_30d":"30 jours","x_close_q":"Fermer toutes les vannes ?","x_device":"Appareil","x_diag":"Diagnostic","x_end":"fin","x_feed_stale":"La station météo ne se met pas à jour","x_feed_unpaired":"Station météo non associée","x_fwm":"Mises à jour du firmware","x_fwsrc":"Source des mises à jour","x_irrigation":"Arrosage","x_last_ev":"Dernier événement","x_log":"Événements","x_no":"Non","x_no_dev":"Aucun appareil Irry trouvé dans Home Assistant.","x_no_svc":"Actions Irry introuvables : mettez à jour le firmware de l'appareil, puis rechargez l'intégration ESPHome","x_position":"Position utilisée","x_pressure":"Pression","x_pt":"Culture","x_rain_day":"pluie {rain} {u}","x_restart_q":"Redémarrer l'appareil ?","x_saving":"Enregistrement…","x_station":"Station","x_sun":"Soleil","x_tsrc":"Source de l'heure","x_tvalid":"Heure valide","x_un_auto":"Automatiques (fuseau horaire)","x_unav":"Indisponible","x_wd_collecting":"Collecte des données météo en cours","x_wd_ene":"ENE","x_wd_ese":"ESE","x_wd_fallback":"Données météo partielles : valeurs de secours utilisées","x_wd_missing":"Données météo manquantes","x_wd_nne":"NNE","x_wd_nnw":"NNO","x_wd_sse":"SSE","x_wd_ssw":"SSO","x_wd_wnw":"ONO","x_wd_wsw":"OSO","x_wdata":"Données météo","x_wifi_fb":"Connecté au Wi-Fi de secours","x_wifi_pri":"Principal","x_wind_over":"Vent au-dessus du seuil","x_wind_res":"Reprise après le vent","x_wsrc":"Source météo","x_yes":"Oui","x_zf":"Facteur de la zone","x_zname":"Nom de la zone","z_man":"Ouverte manuellement","z_off":"Aucun programme","zones":"Zones"},"es":{"active":"Activo","all":"Todas","allok":"Todo en orden","applied":"Franja {slot} escrita en {count, plural, one {# zona} other {# zonas}}","apply":"Aplicar a la franja {slot}","aux_def":"Aux","aux_m":"Modo Aux","aux_m_last":"Al arrancar: último estado","aux_m_off":"Al arrancar: siempre OFF","aux_m_on":"Al arrancar: siempre ON","aux_m_sync":"Sincronizado con las zonas","aux_name":"Nombre Aux","aux_tof":"Retardo de apagado (0–600 s)","aux_ton":"Retardo de encendido (0–120 s)","buz":"Alarma sonora","buz_from":"Silencio desde","buz_h":"Con una alarma activa (por ejemplo hora no válida) el zumbador emite 3 pitidos cortos cada 30 s; también pita cuando una válvula se abre o se cierra. Silenciar, o una pulsación corta del botón BOOT, lo detiene hasta que la alarma desaparece. Con la hora no válida la franja de silencio no se aplica.","buz_off":"Apagada","buz_on":"Encendida","buz_q":"Franja de silencio","buz_to":"Hasta","cfg":"Configuración","ch_time_bad":"Hora no válida","close_all":"Cerrar todas","day_list":"Lista del día","days":"Días","days_u":"días","dm_even":"Pares","dm_every":"Cada N","dm_odd":"Impares","dm_week":"Semana","dur":"Duración","dur_zone":"Duración por zona","e_generic":"Error: {err}","e_limit":"Programa rechazado: más de 3 zonas abiertas a la vez","e_limit_at":"Programa rechazado: {count} zonas abiertas a la vez (máx. 3) · {when} {from}–{to} · {zones}","es_bgt":"Temperatura de globo","es_calc":"calculado","es_cap":"Condensador","es_co2":"CO₂","es_co2d":"CO₂ media 24 h","es_co2i":"CO₂ consola","es_co2id":"CO₂ consola media 24 h","es_cons":"Consola","es_depth":"Nivel de agua","es_dp":"Punto de rocío","es_g_air":"Calidad del aire","es_g_bat":"Baterías","es_g_ch":"Canales adicionales","es_g_in":"Interior (pasarela)","es_g_oth":"Otros sensores","es_g_out":"Exterior","es_g_rain":"Lluvia","es_g_soil":"Suelo y hojas","es_g_unk":"Otros campos","es_g_wind":"Viento","es_in_h":"Medidos por el sensor propio de la pasarela, en interior: solo informativos, nunca usados para el ajuste meteorológico.","es_leak":"Fuga de agua","es_leak_n":"seco","es_leak_y":"¡fuga!","es_ltd":"Distancia del rayo","es_ltn":"Rayos detectados","es_ltt":"Último rayo","es_lux":"Iluminancia","es_lw":"Humedad foliar","es_no":"no","es_pm":"Partículas","es_pm25":"PM2.5","es_pm25d":"PM2.5 media 24 h","es_pmd":"Partículas media 24 h","es_r1":"Última hora","es_rd":"Hoy","es_re":"Evento","es_rm":"Mes","es_rnow":"Llueve ahora","es_rr":"Intensidad","es_rt":"Total","es_rw":"Semana","es_ry":"Año","es_sec":"Conductividad del suelo","es_sm":"Humedad del suelo","es_st":"Temperatura del suelo","es_tf":"Sensación térmica","es_uv":"Índice UV","es_vpd":"Déficit de presión de vapor","es_wbgt":"WBGT","es_wc":"Sensación por viento","es_wd10":"Dirección media 10 min","es_wg":"Ráfaga","es_wgx":"Ráfaga máxima de hoy","es_ws10":"Velocidad media 10 min","es_yes":"sí","every_n":"Cada","find":"Localizar dispositivo","find_b":"Localizar","find_ok":"LED y zumbador activos durante 10 s","from":"A partir del","fw":"Firmware","fw_err":"Error en la actualización: {err}","fwm_auto":"Automático","fwm_ntf":"Solo aviso","fwm_off":"Apagado","fwn":"Actualización desde internet","fwn_av":"Versión {ver} disponible","fwn_avm":"Versión {ver} disponible (solo instalación manual)","fwn_check":"Buscar actualizaciones","fwn_chk":"Comprobando…","fwn_go":"Instalar {ver}","fwn_inst":"Instalando…","fwn_last":"Última comprobación","fwn_notes":"Notas de la versión","fwn_off":"Actualización desde internet apagada: no se comprueba nada.","fwn_ok":"Actualizado","fwn_rej_rb":"Versión {ver} disponible, descartada tras una actualización fallida","fwn_ver":"Actualización en verificación: espera alrededor de un minuto.","g":"Día","h":"h","h_man":"a mano (app web, HA)","h_met":"meteo","h_o10":"omitida: zonas llenas","h_o11":"cerrada: viento","h_o12":"saltada: viento","h_o2":"detenida a mano","h_o3":"cerrada: lluvia","h_o4":"Cerrar todo","h_o5":"límite manual","h_o6":"actualización de firmware","h_o7":"interrumpida: reinicio o corte","h_o8":"omitida: lluvia","h_o9":"omitida: en pausa","h_part":"Historial parcial: el día estaba lleno, se sobrescribieron los primeros registros.","h_res":"reanudada","h_web":"app web","in_prog":"en curso","ip":"Dirección IP","loading":"Cargando…","m_alt":"Altitud","m_batt":"Batería del conjunto de sensores","m_batt_low":"baja","m_batt_ok":"ok","m_cal":"Calibrar","m_data":"Datos","m_eco":"Ecowitt","m_eco_none":"No vinculada","m_eco_rx":"Último envío","m_et0y":"ET0 de ayer","m_etr":"ET0 de referencia (100 %)","m_etr_h":"Evapotranspiración diaria con la que las duraciones programadas son correctas: {ref} es un día típico de verano. Calibrar la obtiene de los últimos días, para que las duraciones de hoy sigan siendo las programadas.","m_f":"Factor del césped de referencia","m_fao":"Completa","m_ha":"Home Assistant","m_harg":"Sencilla","m_hist":"Últimos días","m_lat":"Latitud","m_lon":"Longitud","m_meth":"Adaptación de las duraciones","m_none":"Ninguna","m_o_d":"predeterminada","m_o_h":"Home Assistant","m_o_m":"manual","m_o_p":"presión de la estación","m_o_t":"zona horaria","m_off":"Desactivada","m_pa":"Presión absoluta","m_pfx":"Prefijo de la estación meteorológica (Home Assistant)","m_pr":"Presión relativa","m_psl":"Presión a nivel del mar","m_pt_beds":"Parterres, flores, arbustos, setos","m_pt_cool":"Césped de clima templado","m_pt_dry":"Mediterráneas, bajo consumo","m_pt_none":"No adaptar","m_pt_tree":"Árboles, frutales","m_pt_veg":"Huerto","m_pt_warm":"Césped de clima cálido","m_q_missing":"datos insuficientes: duraciones sin cambios","m_r24":"Lluvia últimas 24 h","m_res":"Hoy","m_rh":"Humedad","m_rs":"Radiación solar","m_sh":"Resguardada de la lluvia","m_t":"Temperatura","m_wx":"Resguardada del viento","min":"min","mmax":"Riego manual máximo","next":"Próximo inicio","now_run":"Regando","ntp":"Servidores NTP","offline":"Dispositivo inaccesible","ok":"OK","ovl":"Solapamiento","ovl_ban":"{count} zonas abiertas a la vez {from}–{to}: {zones}","pause":"Pausar programas","paused":"Programas en pausa","pick_date":"Elegir un día","pick_day":"Elige al menos un día.","pick_zone":"Incluye al menos una zona.","r":"Rápido","rain":"Lluvia","rain_attr":"Atributo (opcional)","rain_ent":"Entidad de lluvia de las últimas 24 h (entity_id)","rain_skip":"Omisión por lluvia","rain_thr":"Umbral","rainskip":"Inicios omitidos por lluvia","rainskip_nx":"Próximo inicio, zona resguardada: {zone}, {when}.","rainskip_sh":"Las zonas resguardadas de la lluvia arrancan igualmente.","restart_b":"Reiniciar","rtc":"Reloj RTC","rtc_abs":"no detectado","rtc_bad":"presente, hora perdida (¿pila?)","rtc_ok":"presente, hora válida","s":"Sistema","saved":"Guardado","seq_hdr":"Zonas en secuencia","signal":"Señal","silence":"Silenciar alarma","slot":"Franja","st":"Estado","start":"Inicio","tail":"discontinuo = arrastrado del día anterior","time":"Fecha y hora","today":"hoy","turn_off_slot":"Desactivar la franja {slot}","tz":"Zona horaria","un_i":"Imperiales","un_m":"Métricas","units":"Unidades","up":"Subir","uptime":"Encendido desde hace","vp":"Alimentación de válvulas","w_dir":"Dirección","w_gust":"Ráfaga","w_spd":"Velocidad","w_thr_g":"Umbral ráfaga","w_thr_u":"Umbral media (10 min)","wd_e":"E","wd_n":"N","wd_ne":"NE","wd_nw":"NO","wd_s":"S","wd_se":"SE","wd_sw":"SO","wd_w":"O","wfb_chip":"Wi-Fi de respaldo","wifi":"Wi-Fi","wind_h":"Viento","wind_ign":"Ignorar viento","wind_over_nx":"Viento sobre el umbral: los próximos inicios programados esperan a que baje.","wp":"Pausa por viento","wp_res":"Reanudación prevista a las {time} (en {dur}), tras 10 min bajo los umbrales","wp_skip":"Si el viento sigue fuerte, el resto del ciclo se salta a las {time}, al terminar la ventana","wp_win":"ventana hasta las {time}","wp_zs":"En pausa: {list}","ws_now":"Hora del teléfono","ww":"Esperando a que baje el viento","ww_zs":"En espera: {list}","wx":"Meteo","wx_7":"7 días","wx_c":"Coeficientes","wx_c_off":"Adaptación de duraciones apagada: no se calcula ningún coeficiente. Se activa en Sistema → Instalación, tarjeta Meteo.","wx_g":"Gráficos","wx_s":"Sensores","x_30d":"30 días","x_close_q":"¿Cerrar todas las válvulas?","x_device":"Dispositivo","x_diag":"Diagnóstico","x_end":"termina","x_feed_stale":"La estación meteorológica no se actualiza","x_feed_unpaired":"Estación meteorológica no emparejada","x_fwm":"Actualizaciones de firmware","x_fwsrc":"Origen de las actualizaciones","x_irrigation":"Riego","x_last_ev":"Último evento","x_log":"Eventos","x_no":"No","x_no_dev":"No se ha encontrado ningún dispositivo Irry en Home Assistant.","x_no_svc":"Acciones de Irry no encontradas: actualiza el firmware del dispositivo y recarga la integración ESPHome","x_position":"Posición en uso","x_pressure":"Presión","x_pt":"Cultivo","x_rain_day":"lluvia {rain} {u}","x_restart_q":"¿Reiniciar el dispositivo?","x_saving":"Guardando…","x_station":"Estación","x_sun":"Sol","x_tsrc":"Origen de la hora","x_tvalid":"Hora válida","x_un_auto":"Automáticas (zona horaria)","x_unav":"No disponible","x_wd_collecting":"Recogiendo datos meteorológicos","x_wd_ene":"ENE","x_wd_ese":"ESE","x_wd_fallback":"Datos meteorológicos parciales: se usan valores de reserva","x_wd_missing":"Faltan datos meteorológicos","x_wd_nne":"NNE","x_wd_nnw":"NNO","x_wd_sse":"SSE","x_wd_ssw":"SSO","x_wd_wnw":"ONO","x_wd_wsw":"OSO","x_wdata":"Datos meteorológicos","x_wifi_fb":"Conectado a la Wi-Fi de reserva","x_wifi_pri":"Principal","x_wind_over":"Viento sobre el umbral","x_wind_res":"Reanudación tras el viento","x_wsrc":"Fuente meteorológica","x_yes":"Sí","x_zf":"Factor de la zona","x_zname":"Nombre de la zona","z_man":"Abierta manualmente","z_off":"Sin programa","zones":"Zonas"},"pt":{"active":"Ativo","all":"Todas","allok":"Tudo em ordem","applied":"Turno {slot} escrito em {count, plural, one {# zona} other {# zonas}}","apply":"Aplicar ao turno {slot}","aux_def":"Aux","aux_m":"Modo Aux","aux_m_last":"No arranque: último estado","aux_m_off":"No arranque: sempre OFF","aux_m_on":"No arranque: sempre ON","aux_m_sync":"Sincronizado com as zonas","aux_name":"Nome Aux","aux_tof":"Atraso ao desligar (0–600 s)","aux_ton":"Atraso ao ligar (0–120 s)","buz":"Alarme sonoro","buz_from":"Silêncio das","buz_h":"Com um alarme ativo (por exemplo hora inválida) o besouro emite 3 bipes curtos a cada 30 s; também apita quando uma válvula abre ou fecha. Silenciar, ou um toque curto no botão BOOT, para-o até o alarme desaparecer. Com a hora inválida o período de silêncio não se aplica.","buz_off":"Desligado","buz_on":"Ligado","buz_q":"Período de silêncio","buz_to":"Às","cfg":"Configuração","ch_time_bad":"Hora inválida","close_all":"Fechar todas","day_list":"Lista do dia","days":"Dias","days_u":"dias","dm_even":"Pares","dm_every":"A cada N","dm_odd":"Ímpares","dm_week":"Semana","dur":"Duração","dur_zone":"Duração por zona","e_generic":"Erro: {err}","e_limit":"Programa recusado: mais de 3 zonas abertas ao mesmo tempo","e_limit_at":"Programa recusado: {count} zonas abertas ao mesmo tempo (máx. 3) · {when} {from}–{to} · {zones}","es_bgt":"Temperatura de globo","es_calc":"calculado","es_cap":"Condensador","es_co2":"CO₂","es_co2d":"CO₂ média 24 h","es_co2i":"CO₂ consola","es_co2id":"CO₂ consola média 24 h","es_cons":"Consola","es_depth":"Nível de água","es_dp":"Ponto de orvalho","es_g_air":"Qualidade do ar","es_g_bat":"Baterias","es_g_ch":"Canais extra","es_g_in":"Interior (gateway)","es_g_oth":"Outros sensores","es_g_out":"Exterior","es_g_rain":"Chuva","es_g_soil":"Solo e folhas","es_g_unk":"Outros campos","es_g_wind":"Vento","es_in_h":"Medidos pelo sensor do próprio gateway, no interior: apenas informativos, nunca usados no ajuste meteorológico.","es_leak":"Fuga de água","es_leak_n":"seco","es_leak_y":"fuga!","es_ltd":"Distância do raio","es_ltn":"Raios detetados","es_ltt":"Último raio","es_lux":"Iluminância","es_lw":"Molhamento foliar","es_no":"não","es_pm":"Partículas","es_pm25":"PM2.5","es_pm25d":"PM2.5 média 24 h","es_pmd":"Partículas média 24 h","es_r1":"Última hora","es_rd":"Hoje","es_re":"Evento","es_rm":"Mês","es_rnow":"A chover agora","es_rr":"Intensidade","es_rt":"Total","es_rw":"Semana","es_ry":"Ano","es_sec":"Condutividade do solo","es_sm":"Humidade do solo","es_st":"Temperatura do solo","es_tf":"Sensação térmica","es_uv":"Índice UV","es_vpd":"Défice de pressão de vapor","es_wbgt":"WBGT","es_wc":"Wind chill","es_wd10":"Direção média 10 min","es_wg":"Rajada","es_wgx":"Rajada máxima de hoje","es_ws10":"Velocidade média 10 min","es_yes":"sim","every_n":"A cada","find":"Localizar dispositivo","find_b":"Localizar","find_ok":"LED e besouro ativos durante 10 s","from":"A partir de","fw":"Firmware","fw_err":"Falha na atualização: {err}","fwm_auto":"Automática","fwm_ntf":"Só avisar","fwm_off":"Desligada","fwn":"Atualização pela internet","fwn_av":"Versão {ver} disponível","fwn_avm":"Versão {ver} disponível (só instalação manual)","fwn_check":"Procurar atualizações","fwn_chk":"A verificar…","fwn_go":"Instalar {ver}","fwn_inst":"A instalar…","fwn_last":"Última verificação","fwn_notes":"Notas da versão","fwn_off":"Atualização pela internet desligada: nenhuma verificação.","fwn_ok":"Atualizado","fwn_rej_rb":"Versão {ver} disponível, descartada após uma atualização falhada","fwn_ver":"Atualização em verificação: aguarde cerca de um minuto.","g":"Dia","h":"h","h_man":"à mão (app web, HA)","h_met":"meteo","h_o10":"ignorada: zonas cheias","h_o11":"fechada: vento","h_o12":"saltada: vento","h_o2":"parada à mão","h_o3":"fechada: chuva","h_o4":"Fechar tudo","h_o5":"limite manual","h_o6":"atualização de firmware","h_o7":"interrompida: reinício ou falta de energia","h_o8":"ignorada: chuva","h_o9":"ignorada: em pausa","h_part":"Histórico parcial: o dia estava cheio, os primeiros registos foram substituídos.","h_res":"retomada","h_web":"app web","in_prog":"em curso","ip":"Endereço IP","loading":"A carregar…","m_alt":"Altitude","m_batt":"Bateria do conjunto de sensores","m_batt_low":"fraca","m_batt_ok":"ok","m_cal":"Calibrar","m_data":"Dados","m_eco":"Ecowitt","m_eco_none":"Não emparelhado","m_eco_rx":"Último envio","m_et0y":"ET0 de ontem","m_etr":"ET0 de referência (100 %)","m_etr_h":"Evapotranspiração diária para a qual as durações programadas estão certas: {ref} é um dia típico de verão. Calibrar obtém-na dos últimos dias, para que as durações de hoje continuem as programadas.","m_f":"Fator do relvado de referência","m_fao":"Completa","m_ha":"Home Assistant","m_harg":"Simples","m_hist":"Últimos dias","m_lat":"Latitude","m_lon":"Longitude","m_meth":"Adaptação das durações","m_none":"Nenhuma","m_o_d":"predefinida","m_o_h":"Home Assistant","m_o_m":"manual","m_o_p":"pressão da estação","m_o_t":"fuso horário","m_off":"Desligada","m_pa":"Pressão absoluta","m_pfx":"Prefixo da estação meteorológica (Home Assistant)","m_pr":"Pressão relativa","m_psl":"Pressão ao nível do mar","m_pt_beds":"Canteiros, flores, arbustos, sebes","m_pt_cool":"Relvado de clima temperado","m_pt_dry":"Mediterrânicas, baixo consumo","m_pt_none":"Não adaptar","m_pt_tree":"Árvores, pomar","m_pt_veg":"Horta","m_pt_warm":"Relvado de clima quente","m_q_missing":"dados insuficientes: durações inalteradas","m_r24":"Chuva últimas 24 h","m_res":"Hoje","m_rh":"Humidade","m_rs":"Radiação solar","m_sh":"Abrigada da chuva","m_t":"Temperatura","m_wx":"Abrigada do vento","min":"min","mmax":"Rega manual máxima","next":"Próximo início","now_run":"A regar","ntp":"Servidores NTP","offline":"Dispositivo inacessível","ok":"OK","ovl":"Sobreposição","ovl_ban":"{count} zonas abertas ao mesmo tempo {from}–{to}: {zones}","pause":"Pausar programas","paused":"Programas em pausa","pick_date":"Escolher um dia","pick_day":"Escolha pelo menos um dia.","pick_zone":"Inclua pelo menos uma zona.","r":"Rápido","rain":"Chuva","rain_attr":"Atributo (opcional)","rain_ent":"Entidade de chuva das últimas 24 h (entity_id)","rain_skip":"Salto por chuva","rain_thr":"Limiar","rainskip":"Inícios saltados por chuva","rainskip_nx":"Próximo início, zona abrigada: {zone}, {when}.","rainskip_sh":"As zonas abrigadas da chuva arrancam na mesma.","restart_b":"Reiniciar","rtc":"Relógio RTC","rtc_abs":"não detetado","rtc_bad":"presente, hora perdida (pilha?)","rtc_ok":"presente, hora válida","s":"Sistema","saved":"Guardado","seq_hdr":"Zonas em sequência","signal":"Sinal","silence":"Silenciar alarme","slot":"Turno","st":"Estado","start":"Início","tail":"tracejado = transitado do dia anterior","time":"Data e hora","today":"hoje","turn_off_slot":"Desativar o turno {slot}","tz":"Fuso horário","un_i":"Imperiais","un_m":"Métricas","units":"Unidades","up":"Subir","uptime":"Ligado há","vp":"Alimentação das válvulas","w_dir":"Direção","w_gust":"Rajada","w_spd":"Velocidade","w_thr_g":"Limiar rajada","w_thr_u":"Limiar média (10 min)","wd_e":"E","wd_n":"N","wd_ne":"NE","wd_nw":"NO","wd_s":"S","wd_se":"SE","wd_sw":"SO","wd_w":"O","wfb_chip":"Wi-Fi de reserva","wifi":"Wi-Fi","wind_h":"Vento","wind_ign":"Ignorar vento","wind_over_nx":"Vento acima do limiar: os próximos inícios programados esperam que baixe.","wp":"Pausa por vento","wp_res":"Retoma prevista às {time} (daqui a {dur}), após 10 min abaixo dos limiares","wp_skip":"Se o vento continuar forte, o resto do ciclo é saltado às {time}, no fim da janela","wp_win":"janela até às {time}","wp_zs":"Em pausa: {list}","ws_now":"Hora do telemóvel","ww":"À espera que o vento baixe","ww_zs":"Em espera: {list}","wx":"Meteo","wx_7":"7 dias","wx_c":"Coeficientes","wx_c_off":"Adaptação das durações desligada: nenhum coeficiente calculado. Ativa-se em Sistema → Instalação, cartão Meteo.","wx_g":"Gráficos","wx_s":"Sensores","x_30d":"30 dias","x_close_q":"Fechar todas as válvulas?","x_device":"Dispositivo","x_diag":"Diagnóstico","x_end":"termina","x_feed_stale":"A estação meteorológica não atualiza","x_feed_unpaired":"Estação meteorológica não emparelhada","x_fwm":"Atualizações de firmware","x_fwsrc":"Origem das atualizações","x_irrigation":"Rega","x_last_ev":"Último evento","x_log":"Eventos","x_no":"Não","x_no_dev":"Nenhum dispositivo Irry encontrado no Home Assistant.","x_no_svc":"Ações Irry não encontradas: atualize o firmware do dispositivo e recarregue a integração ESPHome","x_position":"Posição em uso","x_pressure":"Pressão","x_pt":"Cultura","x_rain_day":"chuva {rain} {u}","x_restart_q":"Reiniciar o dispositivo?","x_saving":"A guardar…","x_station":"Estação","x_sun":"Sol","x_tsrc":"Origem da hora","x_tvalid":"Hora válida","x_un_auto":"Automáticas (fuso horário)","x_unav":"Indisponível","x_wd_collecting":"A recolher dados meteorológicos","x_wd_ene":"ENE","x_wd_ese":"ESE","x_wd_fallback":"Dados meteorológicos parciais: valores de recurso em uso","x_wd_missing":"Dados meteorológicos em falta","x_wd_nne":"NNE","x_wd_nnw":"NNO","x_wd_sse":"SSE","x_wd_ssw":"SSO","x_wd_wnw":"ONO","x_wd_wsw":"OSO","x_wdata":"Dados meteorológicos","x_wifi_fb":"Ligado ao Wi-Fi de reserva","x_wifi_pri":"Principal","x_wind_over":"Vento acima do limite","x_wind_res":"Retoma após o vento","x_wsrc":"Fonte meteorológica","x_yes":"Sim","x_zf":"Fator da zona","x_zname":"Nome da zona","z_man":"Aberta manualmente","z_off":"Sem programa","zones":"Zonas"}};

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MODES = ['week', 'even', 'odd', 'every'];  // order of the "Days Mode" select options
const BAD = ['unknown', 'unavailable', ''];
const K = (k) => k;  // marks a text key for build.py where t() is called later
// Select options (English, stable for automations and backups) -> text keys.
const OPT = {
  plant: { 'Cool-season lawn': K('m_pt_cool'), 'Warm-season lawn': K('m_pt_warm'), 'Beds, shrubs, hedges': K('m_pt_beds'),
    'Vegetable garden': K('m_pt_veg'), 'Trees, orchard': K('m_pt_tree'), 'Mediterranean, low water': K('m_pt_dry'),
    'Not adapted': K('m_pt_none') },
  aux: { On: K('aux_m_on'), Off: K('aux_m_off'), Last: K('aux_m_last'), Sync: K('aux_m_sync') },
  fwm: { Off: K('fwm_off'), Notify: K('fwm_ntf'), Auto: K('fwm_auto') },
  units: { Auto: K('x_un_auto'), Metric: K('un_m'), Imperial: K('un_i') },
  buz: { Off: K('buz_off'), On: K('buz_on'), 'Quiet Hours': K('buz_q') },
};
// Text sensor states -> text keys.
const STATE = {
  method: { none: K('m_off'), hargreaves: K('m_harg'), fao56: K('m_fao') },
  wdata: { off: K('m_off'), missing: K('x_wd_missing'), collecting: K('x_wd_collecting'), fallback: K('x_wd_fallback'), ok: K('ok') },
  feed: { none: K('m_none'), unpaired: K('m_eco_none'), stale: K('x_feed_stale'), ok: K('ok') },
  wpause: { off: K('m_none'), waiting: K('ww'), paused: K('wp') },
  tsrc: { NTP: K('ntp'), RTC: K('rtc'), PHONE: K('ws_now') },
  wifi: { primary: K('x_wifi_pri'), fallback: K('wfb_chip'), none: K('m_none') },
  rtc: { absent: K('rtc_abs'), valid: K('rtc_ok'), invalid: K('rtc_bad') },
  pos: { manual: K('m_o_m'), home_assistant: K('m_o_h'), time_zone: K('m_o_t'), pressure: K('m_o_p'), default: K('m_o_d') },
};
const WD = [K('wd_n'), K('x_wd_nne'), K('wd_ne'), K('x_wd_ene'), K('wd_e'), K('x_wd_ese'), K('wd_se'), K('x_wd_sse'),
  K('wd_s'), K('x_wd_ssw'), K('wd_sw'), K('x_wd_wsw'), K('wd_w'), K('x_wd_wnw'), K('wd_nw'), K('x_wd_nnw')];
const WD_KEYS = ['n', 'nne', 'ne', 'ene', 'e', 'ese', 'se', 'sse', 's', 'ssw', 'sw', 'wsw', 'w', 'wnw', 'nw', 'nnw'];

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

// Entity index of one device, rebuilt only when the registry changes (every card asks on every state change).
const IDX = new WeakMap();
function index(hass, dev) {
  const reg = hass.entities || IDX;
  let per = IDX.get(reg);
  if (!per) IDX.set(reg, (per = {}));
  if (per[dev.id]) return per[dev.id];
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
  return (per[dev.id] = { E });
}

// Imperial where the US customary system is in daily use (same rule as the device UI).
const IMPZ = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Juneau|Sitka|Nome|Yakutat|Metlakatla|Adak|Boise|Detroit|Menominee|Indiana\/|Kentucky\/|North_Dakota\/)|Pacific\/Honolulu|US\/|Africa\/Monrovia|Asia\/(Yangon|Rangoon))/;

// Model of one device: entity lookup E(key), states, zones, labels, units, action names.
function irryModel(hass, want) {
  const dev = pickDevice(hass, want);
  if (!dev) return null;
  const { E } = index(hass, dev);
  const zones = [];
  for (let n = 1; n <= 8; n++) if (E(`zone_${n}_manual`)) zones.push(n);
  const so = (k) => { const id = E(k); return id ? hass.states[id] : undefined; };
  const st = (k) => { const s = so(k); return s ? s.state : undefined; };
  const label = (n) => { const v = st(`zone_${n}_label`); return v && !BAD.includes(v) ? v : `Zone ${n}`; };
  const un = st('units');
  const imp = un === 'Imperial' || (un !== 'Metric' && IMPZ.test((hass.config && hass.config.time_zone) || ''));
  const mac = ((dev.connections || []).find((c) => c[0] === 'mac') || [])[1];
  const m6 = mac ? mac.replace(/:/g, '').slice(-6).toLowerCase() : '';
  const action = (act) => {
    const all = Object.keys((hass.services && hass.services.esphome) || {}).filter((s) => s.endsWith('_' + act));
    const mine = m6 ? all.filter((s) => s.includes(m6)) : [];
    return mine[0] || (all.length === 1 ? all[0] : null);
  };
  return { dev, E, so, st, zones, label, imp, action };
}

// ---------------------------------------------------------------- values in the device words and units
// HA unit -> [quantity, to base (°C, m/s, hPa, mm, mm/h), from base]
const id1 = (v) => v;
const UNIT = {
  '°C': ['t', id1, id1], '°F': ['t', (v) => (v - 32) / 1.8, (v) => v * 1.8 + 32], K: ['t', (v) => v - 273.15, (v) => v + 273.15],
  'm/s': ['w', id1, id1], 'km/h': ['w', (v) => v / 3.6, (v) => v * 3.6], mph: ['w', (v) => v / 2.236936, (v) => v * 2.236936],
  kn: ['w', (v) => v / 1.943844, (v) => v * 1.943844], 'ft/s': ['w', (v) => v * 0.3048, (v) => v / 0.3048],
  hPa: ['p', id1, id1], mbar: ['p', id1, id1], Pa: ['p', (v) => v / 100, (v) => v * 100], kPa: ['p', (v) => v * 10, (v) => v / 10],
  inHg: ['p', (v) => v / 0.02953, (v) => v * 0.02953], mmHg: ['p', (v) => v * 1.333224, (v) => v / 1.333224],
  psi: ['p', (v) => v * 68.94757, (v) => v / 68.94757],
  mm: ['r', id1, id1], cm: ['r', (v) => v * 10, (v) => v / 10], in: ['r', (v) => v * 25.4, (v) => v / 25.4],
  'mm/h': ['rr', id1, id1], 'in/h': ['rr', (v) => v * 25.4, (v) => v / 25.4],
  m: ['h', id1, id1], ft: ['h', (v) => v * 0.3048, (v) => v / 0.3048],
  km: ['k', id1, id1], mi: ['k', (v) => v * 1.609344, (v) => v / 1.609344],
};
// Device units per quantity: [metric, imperial] = [unit, decimals]
const DEV = {
  t: [['°C', 1], ['°F', 1]], w: [['km/h', 1], ['mph', 1]], p: [['hPa', 1], ['inHg', 2]],
  r: [['mm', 1], ['in', 2]], rr: [['mm/h', 1], ['in/h', 2]], h: [['m', 0], ['ft', 0]], k: [['km', 0], ['mi', 0]],
};
const nf = (v, d, l) => new Intl.NumberFormat(l, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
// Value in the device unit: [value, unit, decimals], or null when the unit is not one of ours.
function devValue(v, unit, imp) {
  const x = UNIT[unit];
  if (!x || isNaN(v)) return null;
  const [u, d] = DEV[x[0]][imp ? 1 : 0];
  return [UNIT[u][2](x[1](v)), u, d];
}
// Device-unit value back to the entity unit (number entities keep the firmware unit).
function toUnit(v, from, to) { return UNIT[to][2](UNIT[from][1](v)); }

function fmtTime(iso, c) {
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  const tz = c.h.config && c.h.config.time_zone;
  const z = tz ? { timeZone: tz } : {};
  const o = { hour: '2-digit', minute: '2-digit', ...z };
  const day = (x) => new Intl.DateTimeFormat('en-CA', z).format(x);
  if (day(d) !== day(new Date())) Object.assign(o, { weekday: 'short', day: 'numeric', month: 'short' });
  return new Intl.DateTimeFormat(c.l, o).format(d);
}
function dayNames(l, w = 'short') {
  const f = new Intl.DateTimeFormat(l, { weekday: w });
  return DAYS.map((d, i) => f.format(new Date(2026, 10, 2 + i)));  // 2026-11-02 is a Monday
}
const dateText = (l, y, mo, d) => new Intl.DateTimeFormat(l, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(+y, mo - 1, +d));
// Same helpers as the device UI: minutes -> HH:MM, a duration in minutes, an age in seconds.
const hm = (x) => { x = ((x % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const fmin = (t, x) => (x < 60 ? `${x} ${t('min')}` : `${Math.floor(x / 60)} ${t('h')}${x % 60 ? ` ${x % 60} ${t('min')}` : ''}`);
const ago = (s) => (s == null ? '-' : s < 90 ? `${s} s` : s < 5400 ? `${Math.round(s / 60)} min` : s < 172800 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} d`);

// ---------------------------------------------------------------- device days (as the device UI and it7::runs_on)
// Day number = days since 1970-01-01 (local date written as UTC); weekday index (Mon = 0) = (dn + 3) % 7.
const dnOf = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const isoOf = (dn) => new Date(dn * 864e5).toISOString().slice(0, 10);
const domOf = (dn) => new Date(dn * 864e5).getUTCDate();
// Days mode: 0 weekdays (mask m), 1 even, 2 odd (the 31st skipped), 3 every n days from day a.
const runs = (s, dn) => (s.dm === 1 ? domOf(dn) % 2 === 0 : s.dm === 2 ? domOf(dn) % 2 === 1 && domOf(dn) !== 31
  : s.dm === 3 ? dn >= s.a && (dn - s.a) % s.n === 0 : !!s.m[(dn + 3) % 7]);
// Slots of every zone in the device shape: [{ n, s: [{ t, d, e, m[7], dm, n, a }] }].
function devSlots(m) {
  return m.zones.map((z) => ({ z, s: [1, 2, 3].map((k) => {
    const v = slotFrom(m, z, k), [hh, mm] = v.start.split(':');
    return { t: +hh * 60 + +mm, d: v.duration, e: v.enabled ? 1 : 0, m: DAYS.map((d) => (v.days.includes(d) ? 1 : 0)),
      dm: Math.max(0, MODES.indexOf(v.mode)), n: Math.max(1, v.every_n), a: v.from ? dnOf(v.from) : 0 };
  }) }));
}
// Today in the HA time zone (the device uses its own clock, set to the same zone): { dn, m (minute of the day) }.
function devToday(h, now = new Date()) {
  const o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  let f;
  try { f = new Intl.DateTimeFormat('en-CA', { ...o, timeZone: h.config && h.config.time_zone }); } catch (e) { f = new Intl.DateTimeFormat('en-CA', o); }
  const p = {};
  f.formatToParts(now).forEach((x) => { p[x.type] = x.value; });
  return { dn: Date.UTC(+p.year, +p.month - 1, +p.day) / 864e5, m: (+p.hour % 24) * 60 + +p.minute };
}
const MAXO = 3;  // zones open at once, as it7::MAX_OPEN
// Windows of day dn with two or more zones open: { a, b, zs } (minutes a..b, zone indexes); the tail after midnight
// counts on the next day; two slots of the same zone do not count.
function ovDay(Z, dn) {
  const a = new Uint8Array(1440), w = [];
  Z.forEach((zn, z) => zn.s.forEach((s) => {
    if (!s.e || !s.d) return;
    if (runs(s, dn)) for (let x = s.t; x < Math.min(s.t + s.d, 1440); x++) a[x] |= 1 << z;
    if (s.t + s.d > 1440 && runs(s, dn - 1)) for (let x = 0; x < s.t + s.d - 1440; x++) a[x] |= 1 << z;
  }));
  for (let x = 0; x < 1440;) {
    const b0 = a[x];
    if (!(b0 & (b0 - 1))) { x++; continue; }
    let y = x;
    while (y < 1440 && a[y] === b0) y++;
    w.push({ a: x, b: y, zs: [0, 1, 2, 3, 4, 5, 6, 7].filter((z) => (b0 >> z) & 1) });
    x = y;
  }
  return w;
}
// History rows [start min, seconds, zone 1-n, src (1-3 slot, 4 web app, 0 HA), out, flags]: out 0 open, 1 program end,
// 2-7 and 11 (wind) how it was closed, 8-10 and 12 (wind) skipped start; flags bit 0 resumed, bit 1 weather.
const hsk = (o) => o >= 8 && o !== 11;
// History outcome texts by out (2-12); 0 = open, 1 = program end have none.
const HOUT = [, , K('h_o2'), K('h_o3'), K('h_o4'), K('h_o5'), K('h_o6'), K('h_o7'), K('h_o8'), K('h_o9'), K('h_o10'), K('h_o11'), K('h_o12')];
// Day model, as the device Day tab: g = days from today, td = devToday(), hr / hy = history rows of the day and of
// the day before (null: not loaded or in the future). Bars { a, b, c (1-3 slot, 0 by hand), tl (tail), past },
// list items { a, b, zi, k (slot index) | h (history row), tl }, overlap windows, nm = minute of now (-1 future, 1440 past).
function dayModel(Z, g, td, hr, hy) {
  const dn = td.dn + g, nm = g < 0 ? 1440 : g ? -1 : td.m, real = !!hr, list = [];
  const col = (x) => (x[3] >= 1 && x[3] <= 3 ? x[3] : 0);
  const open = (z, k) => [...(hr || []), ...(hy || [])].some((x) => x[2] === z && x[3] === k + 1 && !x[4]);
  const rows = Z.map((zn, zi) => {
    const bars = [];
    const bar = (a, b, c, tl) => {  // past part hatched
      const x = Math.max(a, Math.min(b, nm));
      if (x > a) bars.push({ a, b: x, c, tl, past: 1 });
      if (b > x) bars.push({ a: x, b, c, tl, past: 0 });
    };
    if (real) {
      hr.forEach((x) => {
        if (x[2] !== zn.z) return;
        if (hsk(x[4])) { list.push({ a: x[0], b: x[0], zi, h: x }); return; }
        const e = Math.min(x[0] + x[1] / 60, 1440);
        bar(x[0], e, col(x), 0);
        list.push({ a: x[0], b: e, zi, h: x });
      });
      (hy || []).forEach((x) => {
        const e = x[0] + x[1] / 60 - 1440;
        if (x[2] !== zn.z || hsk(x[4]) || e <= 0) return;
        bar(0, e, col(x), 1);
        list.push({ a: 0, b: e, zi, h: x, tl: 1 });
      });
    }
    // Up to today the history replaces the program; today the program goes on after now.
    if (!real || !g) zn.s.forEach((s, k) => {
      if (!s.e || !s.d) return;
      const add = (a, b, tl) => {
        if (real && a <= nm) { if (b > nm && open(zn.z, k)) bar(nm, b, k + 1, tl); return; }  // started: in the history
        bar(a, b, k + 1, tl);
        list.push({ a, b, zi, k, tl });
      };
      if (runs(s, dn)) add(s.t, Math.min(s.t + s.d, 1440), 0);
      if (runs(s, dn - 1) && s.t + s.d > 1440) add(0, s.t + s.d - 1440, 1);
    });
    return { zi, z: zn.z, bars };
  });
  list.sort((x, y) => x.a - y.a || x.zi - y.zi);
  return { dn, nm, real, rows, list, ov: g < 0 ? [] : ovDay(Z, dn), none: g < 0 && !real };
}

// ---------------------------------------------------------------- the firmware "get" action
// esphome.<node>_get { what: hist | mhist | ecoraw | notes, arg } answers { j: <the JSON the device UI gets> },
// j already an object. Through HA the reply is { context, response: { j } }: read as (r.response || r).j,
// to be checked on a real HA.
function getCall(m, what, arg = 0) {
  const service = m && m.action('get');
  return service ? { type: 'call_service', domain: 'esphome', service, service_data: { what, arg }, return_response: true } : null;
}
async function irryGet(h, m, what, arg) {
  const q = getCall(m, what, arg);
  if (!q) throw new Error('no_svc');
  const r = await h.callWS(q);
  const x = (r && (r.response || r)) || {};
  return x.j;
}
// Firmware error text ("limit mon 2026-11-02 06:00-06:10 1,2,3,4", or a code) in the user language.
function errText(m, t, l, e) {
  const msg = String((e && (e.message || e.error)) || e);
  const g = msg.match(/limit (\w{3})(?: (\d{4})-(\d\d)-(\d\d))? (\d\d:\d\d)-(\d\d:\d\d) ([\d,]+)/);
  if (!g) return msg === 'limit' ? t('e_limit') : t('e_generic', { err: msg });
  const when = g[2] ? dateText(l, g[2], g[3], g[4]) : dayNames(l)[DAYS.indexOf(g[1])];
  const zs = g[7].split(',');
  return t('e_limit_at', { count: zs.length, when, from: g[5], to: g[6], zones: zs.map((z) => m.label(+z)).join(', ') });
}
// Overlap Warning "2 zones tue 2026-11-03 06:11-06:20 1,2" -> "mar 3 nov · <the device UI banner text>".
function ovlText(m, t, l, s) {
  const g = String(s).match(/^(\d+) zones (\w{3})(?: (\d{4})-(\d\d)-(\d\d))? (\d\d:\d\d)-(\d\d:\d\d) ([\d,]+)/);
  if (!g) return s;
  const when = g[3] ? dateText(l, g[3], g[4], g[5]) : dayNames(l)[DAYS.indexOf(g[2])];
  return `${when} · ${t('ovl_ban', { count: +g[1], from: g[6], to: g[7], zones: g[8].split(',').map((z) => m.label(+z)).join(', ') })}`;
}
// Last Event: the firmware writes the zone events in the device language, the HA action results in English.
function eventText(m, t, l, s) {
  let g = s.match(/^Rapid S(\d)(?:: (\d+) zones| refused: (.*))$/);
  if (g) return g[3] != null ? `${t('r')} · ${t('slot')} ${g[1]}: ${errText(m, t, l, g[3])}` : t('applied', { slot: +g[1], count: +g[2] });
  g = s.match(/^Set slot Z(\d) S(\d)(?: refused: (.*))?$/);
  if (g) return `${m.label(+g[1])} · ${t('slot')} ${g[2]}: ${g[3] != null ? errText(m, t, l, g[3]) : t('saved')}`;
  g = s.match(/^(.*) S(\d) [A-Z][A-Za-z ]+ refused: (.*)$/);
  if (g) return `${g[1]} · ${t('slot')} ${g[2]}: ${errText(m, t, l, g[3])}`;
  return s;
}
// Firmware Update Status in words.
function fwText(t, s) {
  let g = s.match(/^(\S+) available( \(manual\))?$/);
  if (g) return t(g[2] ? K('fwn_avm') : K('fwn_av'), { ver: g[1] });
  if ((g = s.match(/^(\S+) rejected$/))) return t('fwn_rej_rb', { ver: g[1] });
  if ((g = s.match(/^error: (.*)$/))) return t('fw_err', { err: g[1] });
  return { 'up to date': t('fwn_ok'), checking: t('fwn_chk'), installing: t('fwn_inst'), verifying: t('fwn_ver'), off: t('fwn_off') }[s] ?? s;
}
// Text of one state for the row/format kind f; c = { h, m, t, l }.
function fmtState(f, s, c, row = {}) {
  const { t, m } = c, v = s.state;
  if (v === 'unavailable') return t('x_unav');
  const map = (o) => (o[v] ? t(o[v]) : v);
  switch (f) {
    case 'plant': case 'aux': case 'fwm': case 'units': return map(OPT[f]);
    case 'method': case 'wdata': case 'feed': case 'wpause': case 'tsrc': case 'wifi': case 'rtc': case 'pos': return map(STATE[f]);
    case 'buz': return map(OPT.buz);
    case 'leak': return BAD.includes(v) ? '-' : t(v === 'on' ? K('es_leak_y') : K('es_leak_n'));
    case 'posv': {  // position value and where it comes from (row.ref: Position Source or Altitude Source)
      if (BAD.includes(v)) return '-';
      const x = devValue(parseFloat(v), s.attributes.unit_of_measurement, m.imp);
      const src = row.ref && c.h.states[row.ref];
      const val = x ? `${nf(x[0], x[2], c.l)} ${x[1]}` : `${nf(parseFloat(v), 4, c.l)}°`;
      return src && !BAD.includes(src.state) ? `${val} · ${fmtState('pos', src, c)}` : val;
    }
    case 'yes': return t(v === 'on' ? K('x_yes') : K('x_no'));
    case 'batt': return t(v === 'on' ? K('m_batt_low') : K('m_batt_ok'));
    case 'zact': return BAD.includes(v) || v === '-' ? t('m_none') : v;
    case 'ts': return BAD.includes(v) ? '-' : fmtTime(v, c);
    case 'next': {
      const p = row.ref && c.h.states[row.ref];
      if (p && p.state === 'on') return t('paused');
      return BAD.includes(v) ? t('z_off') : fmtTime(v, c);
    }
    case 'ovl': return BAD.includes(v) ? t('m_none') : ovlText(m, t, c.l, v);
    case 'event': return BAD.includes(v) ? '-' : eventText(m, t, c.l, v);
    case 'fw': return BAD.includes(v) ? '-' : fwText(t, v);
    case 'wsrc': {  // no entity of its own: Ecowitt when paired or pairable, else HA when a source is set
      if (v && v !== 'none' && !BAD.includes(v)) return t('m_eco');
      const ha = (row.refs || []).some((r) => { const x = c.h.states[r]; return x && !BAD.includes(x.state); });
      return t(ha ? K('m_ha') : K('m_none'));
    }
    case 'dir': {
      const d = parseFloat(v);
      return isNaN(d) ? '-' : `${t(WD[Math.round(d / 22.5) % 16])} · ${Math.round(d)}°`;
    }
    default: {
      if (BAD.includes(v)) return '-';
      const u = s.attributes.unit_of_measurement, x = devValue(parseFloat(v), u, m.imp);
      if (x) return `${nf(x[0], x[2], c.l)} ${x[1]}`;
      if (c.h.formatEntityState) return c.h.formatEntityState(s);
      return u ? `${v} ${u}` : v;
    }
  }
}

// ---------------------------------------------------------------- views
const tile = (entity, x = {}) => ({ type: 'tile', entity, ...x });
const toggle = { action: 'toggle' };
const shown = (entity) => [{ condition: 'state', entity, state_not: BAD }];
const heading = (text, icon) => ({ type: 'heading', heading: text, ...(icon ? { icon } : {}) });
const section = (cards, x = {}) => ({ type: 'grid', cards: cards.filter(Boolean), ...x });
const noDevice = (t) => ({
  type: 'sections', max_columns: 2,
  sections: [section([{ type: 'markdown', content: `<ha-alert alert-type="warning">${t('x_no_dev')}</ha-alert>` }])],
});
const press = (entity, x = {}) => ({ action: 'perform-action', perform_action: 'button.press', target: { entity_id: entity }, ...x });
// Rows card: name in the device words, value translated and in the device units (edit: writable control).
// Rows of entities the device does not have are dropped, and so is a heading with no row after it.
// { note } is a text line; only: { k, state } shows the row while that entity has that state (no state: while it exists).
function rows(m, list, x = {}) {
  const r = list.filter((e) => e && (!e.only || m.E(e.only.k)) && (e.head || e.note || m.E(e.k))).map((e) => {
    const o = e.head || e.note ? { ...e } : { ...e, entity: m.E(e.k) };
    if (o.only) o.only = o.only.state === undefined ? undefined : { entity: m.E(e.only.k), state: e.only.state };
    delete o.k;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return o;
  });
  const out = r.filter((e, i) => !e.head || (r[i + 1] && !r[i + 1].head));
  return out.some((e) => !e.head && !e.note) ? { type: 'custom:irry-rows-card', device: m.dev.id, rows: out, grid_options: { columns: 'full' }, ...x } : null;
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
      section([{ type: 'custom:irry-banner-card', device: m.dev.id, grid_options: { columns: 'full' } }], { column_span: 4 }),
      section([
        heading(t('st'), 'mdi:sprinkler-variant'),
        rows(m, [
          { k: 'zone_active', name: t('now_run'), fmt: 'zact' },
          { k: 'next_irrigation', name: t('next'), fmt: 'next', ref: E('programs_paused') || undefined },
          { k: 'wind_resume', name: t('x_wind_res'), fmt: 'ts', hide_empty: true },
        ]),
        has('valve_power') && tile(E('valve_power'), { name: t('vp') }),
        has('programs_paused') && tile(E('programs_paused'), { name: t('pause'), tap_action: toggle }),
        has('close_all_zone_valves') && tile(E('close_all_zone_valves'), {
          name: t('close_all'), icon: 'mdi:water-off', color: 'red',
          tap_action: press(E('close_all_zone_valves'), { confirmation: { text: t('x_close_q') } }),
          ...(has('zone_active') ? { visibility: [{ condition: 'state', entity: E('zone_active'), state_not: ['-', ...BAD] }] } : {}),
        }),
        has('ignore_wind') && has('wind_pause') && tile(E('ignore_wind'), {
          name: t('wind_ign'), icon: 'mdi:weather-windy', tap_action: press(E('ignore_wind')),
          visibility: [{ condition: 'state', entity: E('wind_pause'), state_not: ['off', ...BAD] }],
        }),
        has('aux') && tile(E('aux'), { name: auxName && !BAD.includes(auxName) ? auxName : t('aux_def'), tap_action: toggle }),
        has('find_device') && tile(E('find_device'), { name: t('find'), icon: 'mdi:map-marker-radius-outline', tap_action: press(E('find_device')) }),
        // Waveshare only (x8 has no beeper); no entity tells whether an alarm sounds, so it is always shown.
        has('silence_alarm') && tile(E('silence_alarm'), { name: t('silence'), icon: 'mdi:volume-off', tap_action: press(E('silence_alarm')) }),
      ]),
      section([heading(t('zones'), 'mdi:map-marker-radius'), ...zt]),
      section([
        heading(t('x_log'), 'mdi:history'),
        rows(m, [{ k: 'last_event', name: t('x_last_ev'), fmt: 'event' }]),
        { type: 'logbook', hours_to_show: 48, grid_options: { columns: 'full', rows: 6 },
          target: { entity_id: ids(['last_event', 'zone_active', 'wind_pause', 'programs_paused', 'firmware_update_status']) } },
      ]),
      section([
        heading(t('rain'), 'mdi:weather-pouring'),
        rows(m, [
          { k: 'rain_last_24h', name: t('m_r24') },
          { k: 'rain_skip_threshold', name: t('rain_thr') },
          { k: 'rain_skip_active', name: t('rain_skip'), fmt: 'yes' },
        ]),
      ]),
      section([
        heading(t('wind_h'), 'mdi:weather-windy'),
        rows(m, [
          { k: 'wind_mean_10_min', name: t('es_ws10') },
          { k: 'wind_mean_threshold', name: t('w_thr_u') },
          { k: 'weather_wind_gust', name: t('w_gust') },
          { k: 'wind_gust_threshold', name: t('w_thr_g') },
          { k: 'wind_over_threshold', name: t('x_wind_over'), fmt: 'yes' },
          { k: 'wind_pause', name: t('wp'), fmt: 'wpause' },
        ]),
      ]),
      section([
        heading(t('m_meth'), 'mdi:sprout'),
        rows(m, [
          { k: 'irrigation_method', name: t('m_meth'), fmt: 'method' },
          { k: 'weather_data', name: t('x_wdata'), fmt: 'wdata' },
          { k: 'irrigation_factor', name: t('m_f') },
          { k: 'irrigation_et0_yesterday', name: t('m_et0y') },
        ]),
      ]),
      section([
        heading(t('x_diag'), 'mdi:information-outline'),
        rows(m, [
          { head: t('fw') },
          { k: 'firmware_update_status', name: t('fwn'), fmt: 'fw' },
          { k: 'firmware_update_mode', name: t('x_fwm'), fmt: 'fwm' },
          { k: 'firmware_source', name: t('x_fwsrc') },
          { head: t('time') },
          { k: 'time_source', name: t('x_tsrc'), fmt: 'tsrc' },
          { k: 'time_valid', name: t('x_tvalid'), fmt: 'yes' },
          { head: t('wifi') },
          { k: 'wi_fi_network', name: t('wifi'), fmt: 'wifi' },
          { k: 'wi_fi_signal', name: t('signal') },
          { k: 'ip_address', name: t('ip') },
          { k: 'uptime', name: t('uptime') },
          { head: t('x_station') },
          { k: 'weather_feed', name: t('x_station'), fmt: 'feed' },
          { k: 'weather_last_update', name: t('m_eco_rx'), fmt: 'ts' },
        ]),
      ]),
    ],
  };
}

function irrigationView(m, t) {
  const E = m.E, has = (k) => !!E(k), dev = m.dev.id;
  const zone = (n) => section([
    heading(m.label(n), 'mdi:sprinkler-variant'),
    tile(E(`zone_${n}_manual`), { name: t('z_man'), icon: 'mdi:sprinkler-variant', tap_action: toggle }),
    has(`zone_${n}_end`) && tile(E(`zone_${n}_end`), { name: t('x_end'), visibility: shown(E(`zone_${n}_end`)) }),
    rows(m, [{ k: `zone_${n}_irrigation_factor`, name: t('x_zf') }]),
    { type: 'custom:irry-slot-card', device: dev, zone: n, grid_options: { columns: 'full' } },
  ]);
  return {
    type: 'sections', max_columns: 4,
    sections: [
      section([
        heading(t('r'), 'mdi:flash'),
        rows(m, [{ k: 'irrigation_overlap_warning', name: t('ovl'), fmt: 'ovl', hide_empty: true }]),
        { type: 'custom:irry-rapid-card', device: dev, grid_options: { columns: 'full' } },
      ]),
      ...m.zones.map(zone),
    ],
  };
}

// Day: the device Day tab (timeline and day list), plan from the slot entities, history from get hist.
function dayView(m, t) {
  return {
    type: 'sections', max_columns: 4,
    sections: [section([{ type: 'custom:irry-day-card', device: m.dev.id, grid_options: { columns: 'full' } }], { column_span: 4 })],
  };
}

function weatherView(m, t, opt = {}) {
  const E = m.E, has = (k) => !!E(k);
  const ce = typeof customElements !== 'undefined' ? customElements : { get: () => null };
  const ents = (ks) => ks.filter(([k]) => E(k)).map(([k, name]) => ({ entity: E(k), name }));
  const mini = !!ce.get('mini-graph-card') && opt.mini_graph !== false;
  const graph = (title, ks) => {
    const e = ents(ks);
    if (!e.length) return null;
    return mini
      ? { type: 'custom:mini-graph-card', name: title, hours_to_show: 24, points_per_hour: 6, line_width: 2, entities: e,
        show: { legend: e.length > 1, average: true, extrema: true, labels: false, fill: false, points: false }, grid_options: { columns: 12 } }
      : { type: 'history-graph', title, hours_to_show: 24, entities: e, grid_options: { columns: 12 } };
  };
  const labels = {};
  WD_KEYS.forEach((k, i) => { labels[k] = t(WD[i]); });
  const rose = has('weather_wind_direction') && has('weather_wind_speed') && !!ce.get('windrose-card') && opt.windrose !== false && {
    type: 'custom:windrose-card', title: t('w_dir'), refresh_interval: 300, windspeed_bar_location: 'bottom',
    rose_config: { center_calm_percentage: true },
    direction_labels: { custom_labels: labels, show_cardinal_directions: true, show_intercardinal_directions: true,
      show_secondary_intercardinal_directions: true },
    wind_direction_entity: { entity: E('weather_wind_direction'), use_statistics: false },
    windspeed_entities: [{ entity: E('weather_wind_speed'), name: t('w_spd'), speed_unit: 'auto', use_statistics: false,
      output_speed_unit: m.imp ? 'mph' : 'kph' }],
    buttons_config: { location: 'bottom', buttons: [
      { type: 'period_selector', button_text: t('es_rd'), preset_period: 'today', active: true },
      { type: 'period_selector', button_text: t('wx_7'), preset_period: 'last_7_days' },
      { type: 'period_selector', button_text: t('x_30d'), preset_period: 'last_30_days' },
    ] },
    current_direction: { show_arrow: true },
    grid_options: { columns: 12 },
  };
  return {
    type: 'sections', max_columns: 4,
    sections: [
      section([
        heading(t('es_g_wind'), 'mdi:weather-windy'),
        rose,
        ...(mini
          ? [graph(t('w_spd'), [['weather_wind_speed', t('w_spd')]]), graph(t('w_gust'), [['weather_wind_gust', t('w_gust')]])]
          : [graph(t('es_g_wind'), [['weather_wind_speed', t('w_spd')], ['wind_mean_10_min', t('es_ws10')], ['weather_wind_gust', t('w_gust')]])]),
      ]),
      section([
        heading(t('wx_s'), 'mdi:format-list-bulleted'),
        rows(m, [
          { head: t('es_g_out') },
          { k: 'weather_temperature', name: t('m_t') },
          { k: 'weather_humidity', name: t('m_rh') },
          { head: t('x_pressure') },
          { k: 'weather_pressure', name: t('m_pa') },
          { k: 'weather_pressure_sea_level', name: t('m_psl') },
          { head: t('rain') },
          { k: 'weather_rain_today', name: t('es_rd') },
          { k: 'weather_rain_rate', name: t('es_rr') },
          { k: 'weather_rain_event', name: t('es_re') },
          { k: 'rain_last_24h', name: t('m_r24') },
          { head: t('wind_h') },
          { k: 'weather_wind_speed', name: t('w_spd') },
          { k: 'wind_mean_10_min', name: t('es_ws10') },
          { k: 'weather_wind_gust', name: t('w_gust') },
          { k: 'weather_wind_direction', name: t('w_dir'), fmt: 'dir' },
          { head: t('x_sun') },
          { k: 'weather_solar_radiation', name: t('m_rs') },
          { k: 'weather_uv_index', name: t('es_uv') },
          { head: t('es_g_in') },
          { k: 'weather_indoor_temperature', name: t('m_t') },
          { k: 'weather_indoor_humidity', name: t('m_rh') },
          { head: t('es_g_soil') },
          ...[1, 2, 3, 4].map((n) => ({ k: `weather_soil_moisture_${n}`, name: `${t('es_sm')} CH${n}`, hide_empty: true })),
          { head: t('es_g_air') },
          { k: 'weather_pm2_5', name: `${t('es_pm25')} CH1`, hide_empty: true },
          { head: t('es_g_oth') },
          { k: 'weather_water_leak', name: t('es_leak'), fmt: 'leak', hide_empty: true },
          { k: 'weather_lightning_distance', name: t('es_ltd'), hide_empty: true },
          { k: 'weather_lightning_count', name: t('es_ltn'), hide_empty: true },
          { head: t('x_station') },
          { k: 'weather_feed', name: t('x_station'), fmt: 'feed' },
          { k: 'weather_last_update', name: t('m_eco_rx'), fmt: 'ts' },
          { k: 'weather_battery', name: t('m_batt'), fmt: 'batt' },
        ]),
      ]),
      section([
        heading(t('wx_g'), 'mdi:chart-line'),
        graph(t('m_t'), [['weather_temperature', t('es_g_out')], ['weather_indoor_temperature', t('es_g_in')]]),
        graph(t('m_rh'), [['weather_humidity', t('es_g_out')], ['weather_indoor_humidity', t('es_g_in')]]),
        graph(t('m_psl'), [['weather_pressure_sea_level', t('m_psl')]]),
        graph(t('m_rs'), [['weather_solar_radiation', t('m_rs')]]),
      ]),
      section([
        heading(t('wx_c'), 'mdi:sprout'),
        { type: 'custom:irry-coef-card', device: m.dev.id, grid_options: { columns: 'full' } },
      ]),
      section([
        heading(t('m_eco'), 'mdi:access-point'),
        { type: 'custom:irry-eco-card', device: m.dev.id, grid_options: { columns: 'full' } },
      ]),
      section([
        heading(t('rain'), 'mdi:weather-pouring'),
        graph(t('rain'), [['weather_rain_rate', t('es_rr')], ['rain_last_24h', t('m_r24')]]),
        has('weather_rain_today') && { type: 'statistics-graph', title: t('wx_7'), entities: [{ entity: E('weather_rain_today'), name: t('es_rd') }],
          stat_types: ['change'], period: 'day', days_to_show: 7, chart_type: 'bar', grid_options: { columns: 12 } },
      ]),
    ],
  };
}

function settingsView(m, t) {
  const E = m.E;
  const zone = (n) => section([
    heading(m.label(n), 'mdi:sprinkler-variant'),
    rows(m, [
      { k: `zone_${n}_label`, name: t('x_zname'), edit: true },
      { k: `zone_${n}_plant_type`, name: t('x_pt'), fmt: 'plant', edit: true },
      { k: `zone_${n}_sheltered_from_rain`, name: t('m_sh'), edit: true },
      { k: `zone_${n}_sheltered_from_wind`, name: t('m_wx'), edit: true },
    ]),
  ]);
  return {
    type: 'sections', max_columns: 4,
    sections: [
      ...m.zones.map(zone),
      section([
        heading(t('rain'), 'mdi:weather-pouring'),
        rows(m, [
          { k: 'rain_skip_threshold', name: t('rain_thr'), edit: true },
          { k: 'rain_entity', name: t('rain_ent'), edit: true },
          { k: 'rain_attribute', name: t('rain_attr'), edit: true },
        ]),
      ]),
      section([
        heading(t('wind_h'), 'mdi:weather-windy'),
        rows(m, [
          { k: 'wind_mean_threshold', name: t('w_thr_u'), edit: true },
          { k: 'wind_gust_threshold', name: t('w_thr_g'), edit: true },
        ]),
      ]),
      section([
        heading(t('wx'), 'mdi:weather-partly-cloudy'),
        rows(m, [
          { k: 'weather_feed', name: t('x_wsrc'), fmt: 'wsrc', refs: [E('weather_prefix'), E('rain_entity')].filter(Boolean) },
          { k: 'irrigation_method', name: t('m_meth'), fmt: 'method' },
          { k: 'weather_prefix', name: t('m_pfx'), edit: true },
        ]),
        E('irrigation_reference_et0') && { type: 'custom:irry-cal-card', device: m.dev.id, grid_options: { columns: 'full' } },
        rows(m, [
          { head: t('x_position') },
          { k: 'latitude', name: t('m_lat'), fmt: 'posv', ref: E('position_source') || undefined },
          { k: 'longitude', name: t('m_lon'), fmt: 'posv', ref: E('position_source') || undefined },
          { k: 'altitude', name: t('m_alt'), fmt: 'posv', ref: E('altitude_source') || undefined },
        ]),
      ]),
      E('alarm_sound') && section([
        heading(t('buz'), 'mdi:volume-high'),
        rows(m, [
          { k: 'alarm_sound', name: t('buz'), fmt: 'buz', edit: true },
          { k: 'quiet_from', name: t('buz_from'), edit: true, only: { k: 'alarm_sound', state: 'Quiet Hours' } },
          { k: 'quiet_to', name: t('buz_to'), edit: true, only: { k: 'alarm_sound', state: 'Quiet Hours' } },
          { note: t('buz_h') },
          { k: 'silence_alarm', name: t('silence'), edit: true },
        ]),
      ]),
      section([
        heading(t('aux_def'), 'mdi:power-socket-eu'),
        rows(m, [
          { k: 'aux_label', name: t('aux_name'), edit: true },
          { k: 'aux_mode', name: t('aux_m'), fmt: 'aux', edit: true },
          { k: 'aux_on_delay', name: t('aux_ton'), edit: true },
          { k: 'aux_off_delay', name: t('aux_tof'), edit: true },
        ]),
      ]),
      section([
        heading(t('s'), 'mdi:cog'),
        rows(m, [
          { k: 'units', name: t('units'), fmt: 'units', edit: true },
          { k: 'manual_max_duration', name: t('mmax'), edit: true },
          { head: t('fw') },
          { k: 'firmware_update_status', name: t('fwn'), fmt: 'fw' },
          { k: 'firmware_update_mode', name: t('x_fwm'), fmt: 'fwm', edit: true },
          { k: 'firmware_check', name: t('fwn_check'), edit: true },
          { k: 'firmware_install', name: t('fwn_go'), fmt: 'fwgo', ref: E('firmware_update_status') || undefined, edit: true },
          { k: 'firmware_last_check', name: t('fwn_last'), fmt: 'ts' },
        ]),
        m.action('get') && { type: 'custom:irry-notes-card', device: m.dev.id, grid_options: { columns: 'full' } },
        rows(m, [
          { head: t('time') },
          { k: 'time_zone', name: t('tz') },
          { k: 'rtc', name: t('rtc'), fmt: 'rtc' },
          { head: t('x_device') },
          { k: 'find_device', name: t('find_b'), edit: true },
          { note: t('find_ok'), only: { k: 'find_device' } },
          { k: 'restart', name: t('restart_b'), confirm: t('x_restart_q'), edit: true },
        ]),
      ]),
    ].filter(Boolean),  // the alarm section exists only on ws
  };
}

const VIEWS = { status: statusView, irrigation: irrigationView, day: dayView, weather: weatherView, settings: settingsView };
class IrryViewStrategy {
  static view(kind, config, hass) {
    const t = tr(lang(hass, config)), m = irryModel(hass, config && config.device);
    if (!m) return noDevice(t);
    return VIEWS[kind](m, t, config || {});
  }
}
class IrryStatusStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('status', c, h); } }
class IrryIrrigationStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('irrigation', c, h); } }
class IrryDayStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('day', c, h); } }
class IrryWeatherStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('weather', c, h); } }
class IrrySettingsStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('settings', c, h); } }
class IrryDashboardStrategy extends HTMLElement {
  static async generate(config, hass) {
    const t = tr(lang(hass, config)), m = irryModel(hass, config && config.device);
    if (!m) return { title: 'Irry', views: [{ title: 'Irry', path: 'irry', ...noDevice(t) }] };
    const views = [
      { title: t('st'), path: 'status', icon: 'mdi:sprinkler-variant', ...statusView(m, t) },
      { title: t('x_irrigation'), path: 'irrigation', icon: 'mdi:calendar-clock', ...irrigationView(m, t) },
      { title: t('g'), path: 'day', icon: 'mdi:calendar-today', ...dayView(m, t) },
    ];
    if (m.E('weather_temperature') || m.E('weather_wind_speed'))
      views.push({ title: t('wx'), path: 'weather', icon: 'mdi:weather-partly-cloudy', ...weatherView(m, t, config || {}) });
    views.push({ title: t('cfg'), path: 'settings', icon: 'mdi:cog', ...settingsView(m, t) });
    return { title: m.dev.name_by_user || m.dev.name || 'Irry', views };
  }
}

// ---------------------------------------------------------------- cards
const CSS = `
  .wrap{padding:0 16px 16px} .row{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:8px 0}
  .slot{border-top:1px solid var(--divider-color);padding-top:10px;margin-top:10px}
  .slot:first-child{border-top:0;margin-top:0}
  .slot.off .body{opacity:.5}
  .sh{display:flex;align-items:center;gap:8px} .sh .b{flex:1}
  label{font-size:14px;color:var(--secondary-text-color);display:flex;gap:6px;align-items:center}
  input,select{font:inherit;color:var(--primary-text-color);background:var(--card-background-color,#fff);
    border:1px solid var(--divider-color);border-radius:6px;padding:4px 6px}
  input[type=number]{width:5em} .b{font-weight:500;color:var(--primary-text-color)}
  .days{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
  button.day{width:34px;height:34px;border-radius:50%;padding:0;font-weight:500;background:rgba(127,127,127,.18);color:var(--primary-text-color)}
  button.day.on{background:var(--blue-color,#2196f3);color:#fff}
  button.day.all{width:auto;border-radius:17px;padding:0 12px}
  button{font:inherit;border:0;border-radius:6px;padding:6px 14px;cursor:pointer;background:var(--primary-color);color:var(--text-primary-color,#fff)}
  button.s{background:none;color:var(--primary-color);padding:2px 6px} button:disabled{opacity:.5;cursor:default}
  .step{display:inline-flex;align-items:center;gap:6px}
  .step button{width:30px;height:30px;padding:0;border-radius:50%;background:rgba(127,127,127,.18);color:var(--primary-text-color)}
  .step span{min-width:3.2em;text-align:center;color:var(--primary-text-color)}
  .tg{appearance:none;-webkit-appearance:none;width:36px;height:20px;border-radius:10px;border:0;padding:0;margin:0;
    background:rgba(127,127,127,.45);position:relative;cursor:pointer;flex:none}
  .tg::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
  .tg:checked{background:var(--blue-color,#2196f3)} .tg:checked::after{left:18px}
  .msg{font-size:14px;min-height:1.2em} .err{color:var(--error-color)} .ok{color:var(--success-color,#43a047)}
  .z{display:flex;gap:6px;align-items:center;margin:2px 0}
  .rows{padding:4px 16px 8px} .r{display:flex;align-items:center;gap:12px;min-height:40px}
  .r + .r{border-top:1px solid var(--divider-color)}
  .r .n{flex:1;color:var(--primary-text-color)} .r .v{color:var(--secondary-text-color);text-align:right}
  .r.tap{cursor:pointer} .r input[type=text]{width:12em} .r select{max-width:16em}
  .h{font-size:12px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:var(--secondary-text-color);margin:14px 0 2px}
  .h:first-child{margin-top:6px}
  .note{font-size:13px;color:var(--secondary-text-color);margin:6px 0;line-height:1.4}
  ha-alert{display:block;margin:4px 0}`;

class IrryCard extends HTMLElement {
  setConfig(c) { this._c = c || {}; this._sig = ''; }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 'full' }; }
  set hass(h) {
    this._h = h;
    this._m = irryModel(h, this._c.device);
    this._l = lang(h, this._c);
    this._t = tr(this._l);
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (this.busy()) return;  // keep what the user is editing
    const sig = this.signature();
    if (sig === this._sig) return;
    this._sig = sig;
    this.load();
    this.paint();
  }
  busy() { const a = this.shadowRoot.activeElement; return !!(a && /^(INPUT|SELECT)$/.test(a.tagName) && a.type !== 'checkbox'); }
  load() {}
  ctx() { return { h: this._h, m: this._m, t: this._t, l: this._l }; }
  noDev() { this.shadowRoot.innerHTML = `<ha-card><div class="wrap">${esc(this._t('x_no_dev'))}</div></ha-card>`; }
  more(entityId) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true })); }
}

// Status alerts in the user language (a card, so it follows the states: a strategy only regenerates on registry changes).
const BANNER_KEYS = ['zone_active', 'programs_paused', 'rain_skip_active', 'rain_last_24h', 'rain_skip_threshold', 'wind_pause',
  'wind_resume', 'wind_over_threshold', 'time_valid', 'weather_data', 'weather_feed', 'weather_battery',
  'irrigation_overlap_warning', 'firmware_update_status', 'wi_fi_network', 'wi_fi_fallback_active', 'units',
  'wind_paused_zones', 'wind_waiting_zones', 'wind_skip_at', 'next_sheltered_start', 'next_sheltered_zone'];
function alerts(m, c) {
  const t = c.t, st = m.st, A = [], add = (type, text) => A.push([type, text]);
  const f = (k) => { const s = m.so(k); return s ? fmtState('', s, c) : ''; };
  if (st('zone_active') === 'unavailable') return [['error', t('offline')]];
  const za = st('zone_active');
  if (za && za !== '-' && !BAD.includes(za)) add('info', `${t('now_run')}: ${za}`);
  if (st('programs_paused') === 'on') add('warning', t('paused'));
  const ok = (k) => { const v = st(k); return v && !BAD.includes(v) ? v : ''; };
  if (st('rain_skip_active') === 'on') {
    // As the device: the next start of a zone sheltered from rain, else the note when one is sheltered.
    const ns = ok('next_sheltered_start'), nz = +ok('next_sheltered_zone');
    const sh = m.zones.some((n) => st(`zone_${n}_sheltered_from_rain`) === 'on');
    const x = ns && nz ? t('rainskip_nx', { zone: m.label(nz), when: fmtTime(ns, c) }) : sh ? t('rainskip_sh') : '';
    add('warning', `${t('rainskip')}: ${f('rain_last_24h')} ≥ ${f('rain_skip_threshold')}.${x ? ' ' + x : ''}`);
  }
  const wp = st('wind_pause');
  const zl = (k) => ok(k).split(',').filter(Boolean).map((z) => m.label(+z)).join(', ');
  if (wp === 'waiting') {
    const w = zl('wind_waiting_zones');
    add('warning', w ? `${t('ww')} · ${t('ww_zs', { list: w })}` : t('ww'));
  }
  if (wp === 'paused') {
    // Device wording: expected resume and window end, or the skip when the resume falls after the window.
    const rs = ok('wind_resume'), sk = ok('wind_skip_at'), now = Date.now(), A = [t('wp')];
    const r = rs ? Math.max(0, Math.ceil((new Date(rs) - now) / 60000)) : null;
    const e = sk ? Math.max(0, Math.floor((new Date(sk) - now) / 60000)) : null;
    if (r != null && e != null && r > e) A.push(t('wp_skip', { time: fmtTime(sk, c) }));
    else if (r != null) A.push(t('wp_res', { time: fmtTime(rs, c), dur: fmin(t, r) }) + (e != null ? ` · ${t('wp_win', { time: fmtTime(sk, c) })}` : ''));
    const p = zl('wind_paused_zones'), w = zl('wind_waiting_zones');
    if (p) A.push(t('wp_zs', { list: p }));
    if (w) A.push(t('ww_zs', { list: w }));
    add('warning', A.join(' · '));
  }
  if (st('wind_over_threshold') === 'on' && wp === 'off') add('info', t('wind_over_nx'));
  if (st('time_valid') === 'off') add('error', t('ch_time_bad'));
  const wd = st('weather_data');
  if (wd === 'missing') add('warning', t('x_wd_missing'));
  if (wd === 'fallback') add('info', t('x_wd_fallback'));
  const fd = st('weather_feed');
  if (fd === 'unpaired') add('warning', t('x_feed_unpaired'));
  if (fd === 'stale') add('warning', t('x_feed_stale'));
  if (st('weather_battery') === 'on') add('warning', `${t('m_batt')}: ${t('m_batt_low')}`);
  const ov = st('irrigation_overlap_warning');
  if (ov && !BAD.includes(ov)) add('info', `${t('ovl')}: ${ovlText(m, t, c.l, ov)}`);
  const fw = st('firmware_update_status') || '';
  if (/ available/.test(fw)) add('info', fwText(t, fw));
  if (st('wi_fi_fallback_active') === 'on' || st('wi_fi_network') === 'fallback') add('info', t('x_wifi_fb'));
  return A.length ? A : [['success', t('allok')]];
}
class IrryBannerCard extends IrryCard {
  connectedCallback() { this._tick = setInterval(() => { if (this._h) this.hass = this._h; }, 60e3); }
  disconnectedCallback() { clearInterval(this._tick); }
  signature() {
    const m = this._m;
    if (!m) return 'none';
    // The wind pause minutes count down: the minute is part of the signature while paused.
    return JSON.stringify([this._l, m.imp, m.zones.map(m.label), m.zones.map((n) => m.st(`zone_${n}_sheltered_from_rain`)),
      m.st('wind_pause') === 'paused' ? Math.floor(Date.now() / 60000) : 0,
      BANNER_KEYS.map((k) => { const s = m.so(k); return s && [s.state, s.attributes.unit_of_measurement]; })]);
  }
  paint() {
    if (!this._m) return this.noDev();
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${alerts(this._m, this.ctx())
      .map(([type, text]) => `<ha-alert alert-type="${type}">${esc(text)}</ha-alert>`).join('')}`;
  }
}

// Rows: { entity, name, fmt, edit, hide_empty, ref, refs, confirm } or { head }.
// Read-only rows open the HA more-info dialog; edit rows write with the entity's own service.
class IrryRowsCard extends IrryCard {
  getCardSize() { return 1 + ((this._c && this._c.rows) || []).length; }
  signature() {
    if (!this._m) return 'none';
    const h = this._h, ids = [];
    for (const r of this._c.rows || []) ids.push(r.entity, r.ref, r.only && r.only.entity, ...(r.refs || []));
    return JSON.stringify([this._l, this._m.imp, this._m.zones.map(this._m.label),
      ids.map((i) => { const s = i && h.states[i]; return s && [s.state, s.attributes.unit_of_measurement]; })]);
  }
  paint() {
    const r = this.shadowRoot, c = this.ctx(), t = this._t, h = this._h;
    if (!this._m) return this.noDev();
    const avail = (row) => ((h.states[row.ref] || {}).state || '').match(/^(\S+) available/);
    const list = (this._c.rows || []).map((row, i) => ({ row, i, s: row.entity && h.states[row.entity] }))
      .filter(({ row }) => !row.only || (h.states[row.only.entity] || {}).state === row.only.state)
      .filter(({ row, s }) => row.head || row.note || (s && !(row.hide_empty && (BAD.includes(s.state) || s.state === '-'))))
      .filter(({ row }) => row.fmt !== 'fwgo' || avail(row));
    const html = [];
    list.forEach(({ row, i, s }, j) => {
      if (row.head) {
        if (list[j + 1] && !list[j + 1].row.head) html.push(`<div class="h">${esc(row.head)}</div>`);
        return;
      }
      if (row.note) { html.push(`<div class="note">${esc(row.note)}</div>`); return; }
      const dom = row.entity.split('.')[0];
      const name = row.fmt === 'fwgo' ? t('fwn_go', { ver: avail(row)[1] }) : row.name;
      const ctl = row.edit ? this.control(dom, row, s, i, name) : null;
      html.push(ctl
        ? `<div class="r"><span class="n">${dom === 'button' ? '' : esc(name)}</span>${ctl}</div>`
        : `<div class="r tap" data-more="${esc(row.entity)}"><span class="n">${esc(name)}</span><span class="v">${esc(fmtState(row.fmt, s, c, row))}</span></div>`);
    });
    r.innerHTML = `<style>${CSS}</style><ha-card>${this._c.title ? `<h1 class="card-header">${esc(this._c.title)}</h1>` : ''}<div class="rows">${html.join('')}</div></ha-card>`;
    r.querySelectorAll('[data-more]').forEach((el) => el.addEventListener('click', () => this.more(el.dataset.more)));
    r.querySelectorAll('[data-i]').forEach((el) => {
      const row = this._c.rows[+el.dataset.i];
      el.addEventListener(el.tagName === 'BUTTON' ? 'click' : 'change', () => this.write(row, el));
    });
  }
  // Writable control for the row, or null (read-only domain).
  control(dom, row, s, i, name) {
    const a = s.attributes, t = this._t, dis = s.state === 'unavailable' ? ' disabled' : '';
    if (dom === 'switch' || dom === 'input_boolean')
      return `<input class="tg" type="checkbox" data-i="${i}"${s.state === 'on' ? ' checked' : ''}${dis}>`;
    if (dom === 'select') {
      const tx = (x) => (OPT[row.fmt] && OPT[row.fmt][x] ? t(OPT[row.fmt][x]) : x);
      const o = (a.options || []).map((x) => `<option value="${esc(x)}"${x === s.state ? ' selected' : ''}>${esc(tx(x))}</option>`);
      return `<select data-i="${i}"${dis}>${o.join('')}</select>`;
    }
    if (dom === 'text') return `<input type="text" data-i="${i}" maxlength="${a.max || 255}" value="${esc(BAD.includes(s.state) ? '' : s.state)}"${dis}>`;
    if (dom === 'number') {
      const v = parseFloat(s.state), u = a.unit_of_measurement, x = devValue(v, u, this._m.imp);
      const show = x ? String(+x[0].toFixed(x[2])) : isNaN(v) ? '' : String(v);
      return `<label><input type="number" step="any" data-i="${i}" value="${esc(show)}"${dis}> ${esc(x ? x[1] : u || '')}</label>`;
    }
    if (dom === 'button') return `<button data-i="${i}"${dis}>${esc(name)}</button>`;
    if (dom === 'time') return `<input type="time" data-i="${i}" value="${esc(/^\d\d:\d\d/.test(s.state) ? s.state.slice(0, 5) : '')}"${dis}>`;
    return null;
  }
  async write(row, el) {
    const h = this._h, s = h.states[row.entity], dom = row.entity.split('.')[0], target = { entity_id: row.entity };
    try {
      if (dom === 'switch' || dom === 'input_boolean') await h.callService(dom, el.checked ? 'turn_on' : 'turn_off', {}, target);
      else if (dom === 'select') await h.callService('select', 'select_option', { option: el.value }, target);
      else if (dom === 'text') await h.callService('text', 'set_value', { value: el.value }, target);
      else if (dom === 'time') { if (el.value) await h.callService('time', 'set_value', { time: `${el.value.slice(0, 5)}:00` }, target); }
      else if (dom === 'button') {
        if (row.confirm && !window.confirm(row.confirm)) return;
        await h.callService('button', 'press', {}, target);
      } else if (dom === 'number') {
        // Shown in the device unit, written in the entity's own unit, on its step and within its range.
        const a = s.attributes, u = a.unit_of_measurement, x = devValue(parseFloat(s.state), u, this._m.imp);
        let v = parseFloat(String(el.value).replace(',', '.'));
        if (isNaN(v)) throw new Error('number');
        if (x) v = toUnit(v, x[1], u);
        const step = a.step || 1;
        v = Math.min(a.max ?? v, Math.max(a.min ?? v, Math.round(v / step) * step));
        await h.callService('number', 'set_value', { value: +v.toFixed(6) }, target);
      }
    } catch (e) {
      // Refused or invalid: show the device value again.
    }
    el.blur();
    this._sig = '';
    this.hass = h;
  }
}

// Slot values from the entities of zone n, slot s.
function slotFrom(m, n, s) {
  const p = `zone_${n}_s${s}_`, st = (k) => m.st(p + k);
  const dmS = m.so(p + 'days_mode');
  const dmi = dmS && dmS.attributes.options ? dmS.attributes.options.indexOf(dmS.state) : 0;
  const num = (k, d) => { const v = parseFloat(st(k)); return isNaN(v) ? d : Math.round(v); };
  const from = st('every_n_from'), start = st('start');
  return {
    start: /^\d\d:\d\d/.test(start || '') ? start.slice(0, 5) : '06:00', duration: num('duration', 0), enabled: st('enable') === 'on',
    mode: MODES[dmi] || 'week', days: DAYS.filter((d, i) => st(`${i + 1}_${d}`) === 'on'),
    every_n: num('every_n_days', 2), from: from && !BAD.includes(from) ? from : '',
  };
}

// Common parts of the slot and Rapid cards: fields of one slot, wiring, messages, the esphome actions.
class IrryEditCard extends IrryCard {
  setConfig(c) { super.setConfig(c); this._pend = new Set(); this._tm = {}; this._hold = 0; this._msgs = {}; }
  busy() {
    if (super.busy() || this._busy || this._pend.size) return true;
    if (Date.now() < this._hold) {  // the entities of one write arrive one by one: repaint once they are all in
      clearTimeout(this._ht);
      this._ht = setTimeout(() => { this.hass = this._h; }, this._hold - Date.now() + 50);
      return true;
    }
    return false;
  }
  // Start, duration, days mode, then the week days or every N days from a date.
  fields(v, key) {
    const t = this._t, dn = dayNames(this._l, 'narrow'), full = dayNames(this._l, 'long');
    const md = MODES.map((x) => `<option value="${x}"${v.mode === x ? ' selected' : ''}>${esc(t('dm_' + x))}</option>`).join('');
    const step = (f, val, unit) => `<span class="step"><button data-k="${key}" data-f="${f}" data-d="-1">−</button>`
      + `<span>${val} ${esc(unit)}</span><button data-k="${key}" data-f="${f}" data-d="1">+</button></span>`;
    const days = v.mode !== 'week' ? '' : `<div class="days">${DAYS.map((d, i) =>
      `<button class="day${v.days.includes(d) ? ' on' : ''}" data-k="${key}" data-day="${d}" title="${esc(full[i])}">${esc(dn[i])}</button>`).join('')}`
      + `<button class="day all${v.days.length === 7 ? ' on' : ''}" data-k="${key}" data-day="all">${esc(t('all'))}</button></div>`;
    const every = v.mode !== 'every' ? '' : `<div class="row">
      <label>${esc(t('every_n'))} ${step('every_n', v.every_n, t('days_u'))}</label>
      <label>${esc(t('from'))} <input type="date" data-k="${key}" data-f="from" value="${esc(v.from)}"></label></div>`;
    return `<div class="row">
      <label>${esc(t('start'))} <input type="time" data-k="${key}" data-f="start" value="${esc(v.start)}"></label>
      <label>${esc(this._durLbl || t('dur'))} ${step('duration', v.duration, 'min')}</label></div>
      <div class="row"><label>${esc(t('days'))} <select data-k="${key}" data-f="mode">${md}</select></label></div>${days}${every}`;
  }
  // Wires the controls of fields(): writes into this.val(key), then this.changed(key, repaint).
  wire() {
    const r = this.shadowRoot;
    const LIM = { duration: [0, 180], every_n: [2, 31] };
    r.querySelectorAll('input[data-f], select[data-f]').forEach((el) => {
      el.addEventListener('change', () => {
        const v = this.val(el.dataset.k), f = el.dataset.f;
        v[f] = el.type === 'checkbox' ? el.checked : el.value;
        this.changed(el.dataset.k, f === 'mode' || f === 'enabled');
      });
    });
    r.querySelectorAll('button[data-d]').forEach((el) => el.addEventListener('click', () => {
      const v = this.val(el.dataset.k), f = el.dataset.f, [lo, hi] = LIM[f];
      v[f] = Math.min(hi, Math.max(lo, (+v[f] || 0) + +el.dataset.d));
      this.changed(el.dataset.k, true);
    }));
    r.querySelectorAll('button.day').forEach((el) => el.addEventListener('click', () => {
      const v = this.val(el.dataset.k), d = el.dataset.day;
      if (d === 'all') v.days = v.days.length === 7 ? [] : DAYS.slice();
      else v.days = DAYS.filter((x) => (x === d) !== v.days.includes(x));
      this.changed(el.dataset.k, true);
    }));
  }
  changed(key, repaint) { if (repaint) this.paint(); }
  msg(key, text, cls = '') {
    this._msgs[key] = { text, cls };
    const el = this.shadowRoot.querySelector(`.msg[data-k="${key}"]`);
    if (el) { el.textContent = text; el.className = `msg ${cls}`; }
  }
  msgHtml(key) { const x = this._msgs[key] || {}; return `<div class="msg ${x.cls || ''}" data-k="${key}">${esc(x.text || '')}</div>`; }
  async call(act, data, key, okText) {
    const name = this._m && this._m.action(act);
    if (!name) { this.msg(key, this._t('x_no_svc'), 'err'); return false; }
    this._busy = true;
    this.msg(key, this._t('x_saving'));
    try {
      await this._h.callService('esphome', name, data);
      this.msg(key, okText, 'ok');
      setTimeout(() => { if ((this._msgs[key] || {}).text === okText) this.msg(key, ''); }, 3000);
      return true;
    } catch (e) {
      this.msg(key, errText(this._m, this._t, this._l, e), 'err');
      return false;
    } finally {
      this._busy = false;
      this._sig = '';
      this._hold = Date.now() + 1500;
      this.busy();
    }
  }
}

// The three slots of one zone, each saved as soon as it changes with esphome.<node>_set_slot
// (atomic, the 3-zone rule checked by the firmware; refused -> the card shows the device values again).
class IrrySlotCard extends IrryEditCard {
  signature() {
    const m = this._m, n = this._c.zone;
    if (!m) return 'none';
    return JSON.stringify([this._l, m.label(n), [1, 2, 3].map((s) => slotFrom(m, n, s))]);
  }
  load() { this._v = this._m ? [1, 2, 3].map((s) => slotFrom(this._m, this._c.zone, s)) : []; }
  val(k) { return this._v[+k]; }
  paint() {
    const t = this._t, r = this.shadowRoot;
    if (!this._m) return this.noDev();
    const sl = this._v.map((v, i) => `<div class="slot${v.enabled ? '' : ' off'}">
      <div class="sh"><span class="b">${esc(t('slot'))} ${i + 1} · ${esc(v.start)} · ${v.duration} min</span>
        <input class="tg" type="checkbox" data-k="${i}" data-f="enabled" title="${esc(t('active'))}"${v.enabled ? ' checked' : ''}></div>
      <div class="body">${this.fields(v, i)}</div>${this.msgHtml(i)}</div>`).join('');
    r.innerHTML = `<style>${CSS}</style><ha-card><div class="wrap" style="padding-top:16px">${sl}</div></ha-card>`;
    this.wire();
  }
  // Clicks and edits close together make one write.
  changed(i, repaint) {
    super.changed(i, repaint);
    this._pend.add(i);
    clearTimeout(this._tm[i]);
    this._tm[i] = setTimeout(() => { this._pend.delete(i); this.save(+i); }, 800);
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
class IrryRapidCard extends IrryEditCard {
  setConfig(c) { super.setConfig(c); this._slot = 1; this._edit = false; }
  busy() { return this._edit || super.busy(); }
  signature() {
    const m = this._m;
    return m ? JSON.stringify([this._l, this._slot, m.zones.map((n) => [m.label(n), slotFrom(m, n, this._slot)])]) : 'none';
  }
  // From the slot as it is now: the enabled zones by start time, the first one's start / duration / days.
  load() {
    const m = this._m;
    if (!m) return;
    const zs = m.zones.map((n) => ({ n, v: slotFrom(m, n, this._slot) }));
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
  changed(key, repaint) { this._edit = true; super.changed(key, repaint); }
  paint() {
    const t = this._t, r = this.shadowRoot, m = this._m;
    if (!m) return this.noDev();
    const so = [1, 2, 3].map((s) => `<option value="${s}"${s === this._slot ? ' selected' : ''}>${esc(t('slot'))} ${s}</option>`).join('');
    const zl = this._order.map((n, i) => `<div class="z">
      <label><input type="checkbox" data-zone="${n}"${this._inc.has(n) ? ' checked' : ''}> ${esc(m.label(n))}</label>
      <button class="s" data-up="${i}"${i ? '' : ' disabled'} title="${esc(t('up'))}">▲</button></div>`).join('');
    const off = [1, 2, 3].filter((s) => s !== this._slot).map((s) =>
      `<label><input type="checkbox" data-off="${s}"${this._off.has(s) ? ' checked' : ''}> ${esc(t('turn_off_slot', { slot: s }))}</label>`).join('');
    r.innerHTML = `<style>${CSS}</style><ha-card><div class="wrap" style="padding-top:16px">
      <div class="row"><select data-slot>${so}</select></div>
      ${this.fields(this._v, 'r')}
      <div class="row"><span class="b">${esc(t('seq_hdr'))}</span></div>${zl}
      <div class="row">${off}</div>
      <div class="row"><button data-go>${esc(t('apply', { slot: this._slot }))}</button></div>${this.msgHtml('r')}</div></ha-card>`;
    this.wire();
    r.querySelector('[data-slot]').addEventListener('change', (e) => { this._slot = +e.target.value; this._edit = false; this._sig = ''; this.hass = this._h; });
    r.querySelectorAll('[data-zone]').forEach((el) => el.addEventListener('change', () => {
      if (el.checked) this._inc.add(+el.dataset.zone); else this._inc.delete(+el.dataset.zone);
      this._edit = true;
    }));
    r.querySelectorAll('[data-up]').forEach((el) => el.addEventListener('click', () => {
      const i = +el.dataset.up, o = this._order;
      [o[i - 1], o[i]] = [o[i], o[i - 1]];
      this._edit = true;
      this.paint();
    }));
    r.querySelectorAll('[data-off]').forEach((el) => el.addEventListener('change', () => {
      if (el.checked) this._off.add(+el.dataset.off); else this._off.delete(+el.dataset.off);
      this._edit = true;
    }));
    r.querySelector('[data-go]').addEventListener('click', () => this.go());
  }
  async go() {
    const v = this._v, t = this._t, zs = this._order.filter((n) => this._inc.has(n));
    if (!zs.length) { this.msg('r', t('pick_zone'), 'err'); return; }
    if (v.mode === 'week' && !v.days.length) { this.msg('r', t('pick_day'), 'err'); return; }
    const ok = await this.call('rapid', {
      slot: this._slot, start: v.start, duration: v.duration, mode: v.mode, days: v.mode === 'week' ? v.days.join(',') : '',
      every_n: v.mode === 'every' ? v.every_n : 0, from: v.mode === 'every' ? v.from : '', zones: zs.join(','),
      off_slots: [...this._off].sort().join(','),
    }, 'r', t('applied', { slot: this._slot, count: zs.length }));
    if (ok) this._edit = false;
  }
}

// ---------------------------------------------------------------- cards that read the "get" action
// Cache per card: { j, at, busy }; a reply repaints the card. Errors keep the last reply.
class IrryGetCard extends IrryCard {
  setConfig(c) { super.setConfig(c); this._d = {}; this._ver = 0; }
  connectedCallback() { this._tick = setInterval(() => { if (this._h) this.hass = this._h; }, 60e3); }
  disconnectedCallback() { clearInterval(this._tick); }
  // Reply of get what/arg, fetched when older than maxAge ms (Infinity: once); undefined while loading.
  got(what, arg, maxAge) {
    const key = `${what}/${arg}`, c = this._d[key];
    if (!this._m || !this._m.action('get')) return undefined;
    if (c && (c.busy || Date.now() - c.at < maxAge)) return c.j;
    this._d[key] = { j: c && c.j, at: c ? c.at : 0, busy: 1 };
    irryGet(this._h, this._m, what, arg)
      .then((j) => { this._d[key] = { j, at: Date.now() }; })
      .catch(() => { this._d[key] = { j: c && c.j, at: Date.now() }; })
      .finally(() => { this._ver++; this._sig = ''; if (this._h) this.hass = this._h; });
    return this._d[key].j;
  }
  dark() { return !!(this._h && this._h.themes && this._h.themes.darkMode); }
}
// Value in the device unit from a base unit (t °C, p hPa, s m/s, r mm), as uf() of the device UI.
const BASE = { t: '°C', p: 'hPa', s: 'm/s', r: 'mm' };
function uf(c, k, v) {
  if (v == null || isNaN(v)) return '-';
  const x = devValue(v, BASE[k], c.m.imp);
  return `${nf(x[0], x[2], c.l)} ${x[1]}`;
}

const DAYCSS = `
  :host{--c1:#0b8f84;--c2:#e08a2e;--c3:#7b6fd6} .dark{--c1:#2ec4b3;--c2:#f0a54a;--c3:#9d93f0}
  .gnav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-weight:500}
  .gnav .fl{flex:1;min-width:8em} .gdp{position:relative;cursor:pointer;color:var(--primary-text-color)}
  .gdp span{text-decoration:underline dotted;text-underline-offset:3px} .gdp span::first-letter{text-transform:uppercase}
  .gdp input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:0;padding:0}
  button.ib{width:34px;height:34px;padding:0;border-radius:50%;background:rgba(127,127,127,.18);color:var(--primary-text-color)}
  .wk{display:flex;gap:4px;margin:10px 0} .wk button{flex:1;padding:4px 0;background:rgba(127,127,127,.12);color:var(--primary-text-color);
    display:flex;flex-direction:column;align-items:center;line-height:1.2} .wk button small{font-size:11px;opacity:.75}
  .wk button.on{background:var(--primary-color);color:var(--text-primary-color,#fff)} .wk button.td{font-weight:700}
  .tlax{display:flex;justify-content:space-between;margin:12px 0 6px 100px;font-size:11.5px;color:var(--secondary-text-color)}
  .tlr{display:flex;align-items:center;gap:8px;margin:7px 0}
  .tlr .n{width:92px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none;color:var(--secondary-text-color)}
  .tlt{flex:1;position:relative;height:26px;border-radius:8px;overflow:hidden;
    background:rgba(127,127,127,.12) repeating-linear-gradient(to right,transparent 0 calc(25% - 1px),var(--divider-color) calc(25% - 1px) 25%)}
  .bar{position:absolute;top:4px;bottom:4px;border-radius:5px;min-width:3px}
  .nowl{position:absolute;top:0;bottom:0;width:2px;background:var(--error-color);border-radius:2px}
  .lg{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:12px;font-size:12px;color:var(--secondary-text-color)}
  .lg span{display:flex;gap:6px;align-items:center} .lg i{width:10px;height:10px;border-radius:3px;display:inline-block}
  .ct{font-weight:500;margin:16px 0 6px;color:var(--primary-text-color)}
  .dli{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:10px 0;border-top:1px solid var(--divider-color);font-size:14px}
  .dli:first-of-type{border-top:0} .dli .sd{width:10px;height:10px;border-radius:3px;flex:none}
  .dli .tm2{font-weight:600;width:96px;flex:none} .dli .nm{flex:1;min-width:6em}
  .dli.past{color:var(--secondary-text-color)} .dli.past .tm2{font-weight:500}
  .dli.now .tm2,.dli.now .nm{color:var(--primary-color)}
  .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:99px;font-size:12px;font-weight:600;
    background:rgba(127,127,127,.15);color:var(--secondary-text-color);white-space:nowrap}
  .badge.wa{background:rgba(255,152,0,.15);color:var(--warning-color,#ff9800)} .badge.er{background:rgba(219,68,55,.15);color:var(--error-color)}
  .badge.ac{background:rgba(3,169,244,.15);color:var(--primary-color)}`;
const hatch = (c) => `background:repeating-linear-gradient(135deg,${c} 0 2px,transparent 2px 5px)`;
const dcol = (c) => (c ? `var(--c${c})` : 'var(--secondary-text-color)');

// Day: the device Day tab. Plan from the slot entities, history from get hist (today and yesterday every minute).
class IrryDayCard extends IrryGetCard {
  setConfig(c) { super.setConfig(c); this._g = 0; this._ho = null; }
  hist(dn, td) {
    const j = this.got('hist', dn, dn < td.dn - 1 ? Infinity : 60e3);
    if (j && j.o != null) this._ho = j.o;
    return j && Array.isArray(j.r) ? j : null;
  }
  signature() {
    const m = this._m;
    if (!m) return 'none';
    const td = devToday(this._h);
    return JSON.stringify([this._l, this._g, td, this._ver, this.dark(), m.zones.map(m.label), devSlots(m), !!m.action('get')]);
  }
  paint() {
    const m = this._m, t = this._t, l = this._l, r = this.shadowRoot;
    if (!m) return this.noDev();
    const g = this._g, td = devToday(this._h), Z = devSlots(m), svc = !!m.action('get');
    const jr = g <= 0 ? this.hist(td.dn + g, td) : null, jy = g <= 0 ? this.hist(td.dn + g - 1, td) : null;
    const D = dayModel(Z, g, td, jr && jr.r, jy && jy.r), dn = D.dn, nm = D.nm, HO = this._ho, zn = m.zones.map(m.label);
    const one = (b) => (b.b > b.a ? `<i class="bar" style="left:${b.a / 14.4}%;width:${Math.max((b.b - b.a) / 14.4, 1)}%;`
      + `${b.tl ? `border:1.5px dashed ${dcol(b.c)};` : ''}${b.past ? hatch(dcol(b.c)) : b.tl ? '' : `background:${dcol(b.c)}`}"></i>` : '');
    const tl = D.rows.map((x) => `<div class="tlr"><span class="n">${esc(zn[x.zi])}</span><div class="tlt">${x.bars.map(one).join('')}`
      + `${nm < 0 || nm >= 1440 ? '' : `<i class="nowl" style="left:${nm / 14.4}%"></i>`}</div></div>`).join('');
    const hsrc = (x) => (x[3] >= 1 && x[3] <= 3 ? `S${x[3]}` : x[3] === 4 ? t('h_web') : 'HA');
    const li = (x) => {
      const h = x.h;
      if (!h) {
        const past = nm >= x.b, now = nm >= x.a && nm < x.b;
        return `<div class="dli${past ? ' past' : ''}${now ? ' now' : ''}"><i class="sd" style="background:${dcol(x.k + 1)}"></i>`
          + `<span class="tm2">${hm(x.a)}–${hm(x.b)}</span><span class="nm">${esc(zn[x.zi])}</span>`
          + `${now ? `<span class="badge ac">${esc(t('in_prog'))}</span>` : ''}<span class="badge">S${x.k + 1}</span></div>`;
      }
      const sk = hsk(h[4]), now = !h[4], c = dcol(h[3] >= 1 && h[3] <= 3 ? h[3] : 0);
      const o = h[4] > 1 ? `<span class="badge${sk || h[4] === 3 || h[4] === 5 || h[4] === 11 ? ' wa' : h[4] === 7 ? ' er' : ''}">${esc(t(HOUT[h[4]] || `h_o${h[4]}`))}</span>` : '';
      return `<div class="dli${now ? ' now' : ' past'}"><i class="sd" style="${sk ? `border:1.5px solid ${c}` : `background:${c}`}"></i>`
        + `<span class="tm2">${hm(x.a)}${sk ? '' : '–' + hm(Math.round(x.b))}</span><span class="nm">${esc(zn[x.zi])}</span>`
        + `${now ? `<span class="badge ac">${esc(t('in_prog'))}</span>` : o}${h[5] & 1 ? `<span class="badge">${esc(t('h_res'))}</span>` : ''}`
        + `${h[5] & 2 ? `<span class="badge">${esc(t('h_met'))}</span>` : ''}<span class="badge">${esc(hsrc(h))}</span></div>`;
    };
    const nb = (v, txt, k) => `<button class="ib" data-gw="${v}"${v < 0 && !(g > 0 || (HO >= 0 && HO != null && dn > HO)) ? ' disabled' : ''}`
      + ` title="${esc(t(k))}" aria-label="${esc(t(k))}">${txt}</button>`;
    const gw = g - (((g % 7) + 7) % 7), nar = dayNames(l, 'narrow');
    const wk = [0, 1, 2, 3, 4, 5, 6].map((o) => { const d = td.dn + gw + o;
      return `<button data-g="${gw + o}" class="${gw + o === g ? 'on' : ''}${gw + o ? '' : ' td'}">${esc(nar[(d + 3) % 7])}<small>${domOf(d)}</small></button>`; }).join('');
    const date = new Intl.DateTimeFormat(l, { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dn * 864e5);
    const ov = D.ov.map((w) => `<ha-alert alert-type="${w.zs.length > MAXO ? 'error' : 'warning'}">${esc(t('ovl_ban',
      { count: w.zs.length, from: hm(w.a), to: hm(w.b), zones: w.zs.map((z) => zn[z]).join(', ') }))}</ha-alert>`).join('');
    const lg = `${[1, 2, 3].map((k) => `<span><i style="background:var(--c${k})"></i>S${k}</span>`).join('')}`
      + `${D.real ? `<span><i style="background:var(--secondary-text-color)"></i>${esc(t('h_man'))}</span>` : ''}<span>${esc(t('tail'))}</span>`
      + `${nm < 0 ? '' : `<span><i style="${hatch('var(--secondary-text-color)')}"></i>${esc(t(D.real ? 'h_real' : 'past'))}</span>`}`;
    const notes = `${!svc ? `<div class="note">${esc(t('x_no_svc'))}</div>` : ''}${D.real && jr.x ? `<div class="note">${esc(t('h_part'))}</div>` : ''}`;
    r.innerHTML = `<style>${CSS}${DAYCSS}</style><ha-card><div class="wrap${this.dark() ? ' dark' : ''}" style="padding-top:16px">
      <div class="gnav">${nb(-7, '«', 'prev_week')}${nb(-1, '‹', 'prev_day')}
        <label class="fl gdp"><span>${esc(date)}</span><input type="date" data-date value="${isoOf(dn)}"${HO >= 0 && HO != null ? ` min="${isoOf(Math.min(HO, td.dn))}"` : ''} aria-label="${esc(t('pick_date'))}"></label>
        ${g ? `<button data-gw="${-g}">${esc(t('today').replace(/^./, (x) => x.toUpperCase()))}</button>` : ''}${nb(1, '›', 'next_day')}${nb(7, '»', 'next_week')}</div>
      <div class="wk">${wk}</div>${ov}
      <div class="tlax"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>${tl}<div class="lg">${lg}</div>
      <div class="ct">${esc(t('day_list'))}</div>${notes}
      ${D.list.length ? D.list.map(li).join('') : `<div class="note">${esc(t(D.none ? 'h_none' : 'no_irr'))}</div>`}</div></ha-card>`;
    const go = (v) => { this._g = v; this._sig = ''; this.hass = this._h; };
    r.querySelectorAll('[data-gw]').forEach((el) => el.addEventListener('click', () => go(g + +el.dataset.gw)));
    r.querySelectorAll('[data-g]').forEach((el) => el.addEventListener('click', () => go(+el.dataset.g)));
    r.querySelector('[data-date]').addEventListener('change', (e) => { if (e.target.value) { e.target.blur(); go(dnOf(e.target.value) - td.dn); } });
  }
}

// All fields of the last Ecowitt upload (get ecoraw), grouped as the device Weather → Sensors tab.
// [pattern, group, label key, kind, piezo]; the first match wins, a later field with the same label and channel is a duplicate.
const EG = [K('es_g_out'), K('es_g_wind'), K('es_g_rain'), K('es_g_ch'), K('es_g_soil'), K('es_g_air'), K('es_g_oth'), K('es_g_bat'), K('es_g_in'), K('es_g_unk')];
const EGU = EG.length - 1;
const EK = [[/^(PASSKEY|stationtype|model|freq|dateutc|runtime|interval|heap|fields|soilad\d+|soil_ec(_hum)?_ad\d+)$/],
  [/^temp[fc]$/, 0, K('m_t')], [/^tempfeels[fc]$/, 0, K('es_tf')], [/^dewpoint[fc]$/, 0, K('es_dp')], [/^windchill[fc]$/, 0, K('es_wc')],
  [/^bgtc?$/, 0, K('es_bgt')], [/^wbgtc?$/, 0, K('es_wbgt')],
  [/^humidity$/, 0, K('m_rh'), '%'], [/^baromabs(in|hpa)$/, 0, K('m_pa')], [/^baromrel(in|hpa)$/, 0, K('m_pr'), 'psl'],
  [/^solarradiation$/, 0, K('m_rs'), 'W'], [/^solarradiation_lux$/, 0, K('es_lux'), 'lx'], [/^uv$/, 0, K('es_uv'), 'n'], [/^vpd$/, 0, K('es_vpd'), 'vpd'],
  [/^winddir$/, 1, K('w_dir'), 'deg'], [/^winddir_avg10m$/, 1, K('es_wd10'), 'deg'], [/^windspeed(mph|kmh)$/, 1, K('w_spd')],
  [/^windspd(mph|kmh)_avg10m$/, 1, K('es_ws10')], [/^windgust(mph|kmh)$/, 1, K('es_wg')], [/^maxdailygust(kmh)?$/, 1, K('es_wgx')],
  [/^rainrate(in|mm)$/, 2, K('es_rr')], [/^eventrain(in|mm)$/, 2, K('es_re')], [/^hourlyrain(in|mm)$/, 2, K('es_r1')], [/^dailyrain(in|mm)$/, 2, K('es_rd')],
  [/^weeklyrain(in|mm)$/, 2, K('es_rw')], [/^monthlyrain(in|mm)$/, 2, K('es_rm')], [/^yearlyrain(in|mm)$/, 2, K('es_ry')],
  [/^totalrain(in|mm)$/, 2, K('es_rt')], [/^last24hrain(in|mm)$/, 2, K('m_r24')],
  [/^rrain_piezo(mm)?$/, 2, K('es_rr'), 0, 1], [/^erain_piezo(mm)?$/, 2, K('es_re'), 0, 1], [/^hrain_piezo(mm)?$/, 2, K('es_r1'), 0, 1],
  [/^drain_piezo(mm)?$/, 2, K('es_rd'), 0, 1], [/^wrain_piezo(mm)?$/, 2, K('es_rw'), 0, 1], [/^mrain_piezo(mm)?$/, 2, K('es_rm'), 0, 1],
  [/^yrain_piezo(mm)?$/, 2, K('es_ry'), 0, 1], [/^last24hrain_piezo(mm)?$/, 2, K('m_r24'), 0, 1], [/^srain_piezo$/, 2, K('es_rnow'), 'rain'],
  [/^tempin[fc]$/, 8, K('m_t')], [/^humidityin$/, 8, K('m_rh'), '%'], [/^dewpointin[fc]$/, 8, K('es_dp')],
  [/^temp(\d)[fc]$/, 3, K('m_t')], [/^humidity(\d)$/, 3, K('m_rh'), '%'], [/^dewpoint(\d)[fc]$/, 3, K('es_dp')],
  [/^(?:soilmoisture|soil_ec_hum)(\d+)$/, 4, K('es_sm'), '%'], [/^soil_ec(\d+)$/, 4, K('es_sec'), 'n'], [/^(?:soil_ec_temp|tf_ch)(\d+)c?$/, 4, K('es_st')],
  [/^leafwetness_ch(\d)$/, 4, K('es_lw'), '%'],
  [/^pm25_ch(\d)$/, 5, K('es_pm25'), 'pm'], [/^pm25_avg_24h_ch(\d)$/, 5, K('es_pm25d'), 'pm'], [/^pm(1|4|25|10)_co2$/, 5, K('es_pm'), 'pm'],
  [/^pm(1|4|25|10)_24h_co2$/, 5, K('es_pmd'), 'pm'], [/^co2$/, 5, K('es_co2'), 'ppm'], [/^co2_24h$/, 5, K('es_co2d'), 'ppm'],
  [/^co2in$/, 5, K('es_co2i'), 'ppm'], [/^co2in_24h$/, 5, K('es_co2id'), 'ppm'], [/^humi_co2$/, 5, K('m_rh'), '%'], [/^tf_co2c?$/, 5, K('m_t')],
  [/^lightning$/, 6, K('es_ltd'), 'km'], [/^lightning_mi$/, 6, K('es_ltd'), 'mi'], [/^lightning_num$/, 6, K('es_ltn'), 'n'],
  [/^lightning_time$/, 6, K('es_ltt'), 'ts'], [/^leak_ch(\d)$/, 6, K('es_leak'), 'leak'], [/^depth_ch(\d)$/, 6, K('es_depth'), 'dmm'],
  [/^(wh65|wh25|wh26)batt$|^batt(\d)$/, 7, '', 'bin'], [/^(wh57|co2_)batt$|^(?:pm25|leak)batt(\d)$/, 7, '', 'lvl'],
  [/^(ws90|ws85)cap_volt$/, 7, K('es_cap'), 'V'], [/batt\d*$/, 7, '', 'V']];
// Battery label from the field name (soilbatt1 -> soil moisture CH1); wh65batt is the outdoor array (also a WS69).
function ebName(t, k) {
  let g = k.match(/^(soil|soil_ec|tf|leaf|pm25|leak|lds)_?batt(\d+)$/);
  if (g) return `${{ soil: t('es_sm'), soil_ec: t('es_sec'), tf: t('es_st'), leaf: t('es_lw'), pm25: 'PM2.5', leak: t('es_leak'), lds: t('es_depth') }[g[1]]} CH${g[2]}`;
  if ((g = k.match(/^batt(\d)$/))) return `${t('m_t')} CH${g[1]}`;
  if ((g = k.match(/^(ws9|ws8)\dcap_volt$/))) return `${k.slice(0, 4).toUpperCase()} · ${t('es_cap')}`;
  return k === 'wh65batt' ? t('m_batt') : k === 'console_batt' ? t('es_cons') : k.replace(/_?batt$/, '').toUpperCase();
}
// Value from the raw string: the unit follows the field name (…f/…in/…mph = imperial), then the Metric/Imperial choice.
function eVal(c, k, v, kind) {
  const x = +v, t = c.t, n = (y, d) => nf(y, d, c.l), imp = c.m.imp;
  if (v === '' || isNaN(x)) return String(v);
  switch (kind) {
    case '%': return `${n(x, 0)} %`;
    case 'W': return `${n(x, 0)} W/m²`;
    case 'lx': return `${n(x, 0)} lx`;
    case 'n': return n(x, x % 1 ? 1 : 0);
    case 'deg': return `${n(x, 0)}° ${t(WD[(Math.round(x / 45) % 8) * 2])}`;  // 8 directions, as the device
    case 'pm': return `${n(x, 1)} µg/m³`;
    case 'ppm': return `${n(x, 0)} ppm`;
    case 'V': return `${n(x, 2)} V`;
    case 'lvl': return `${n(Math.min(5, x) * 20, 0)} %`;
    case 'bin': return t(x ? K('m_batt_low') : K('m_batt_ok'));
    case 'rain': return t(x ? K('es_yes') : K('es_no'));
    case 'leak': return t(x ? K('es_leak_y') : K('es_leak_n'));
    case 'ts': return ago(Math.max(0, Math.floor(Date.now() / 1000 - x)));
    case 'vpd': return imp ? `${n(x, 3)} inHg` : `${n(x * 3.38639, 2)} kPa`;
    case 'km': case 'mi': { const km = kind === 'mi' ? x * 1.609344 : x; return imp ? `${n(km / 1.609344, 0)} mi` : `${n(km, 0)} km`; }
    case 'dmm': return uf(c, 'r', x);
    default:
  }
  if (/^(temp|tempin|tempfeels|dewpoint|dewpointin|windchill|tf_co2|soil_ec_temp|tf_ch)\d*[fc]?$|^w?bgtc?$/.test(k)) return uf(c, 't', /c$/.test(k) ? x : (x - 32) / 1.8);
  if (/hpa$/.test(k)) return uf(c, 'p', x);
  if (/^barom/.test(k)) return uf(c, 'p', x * 33.8639);
  if (/(mph|^maxdailygust)$/.test(k) || /mph_avg10m$/.test(k)) return uf(c, 's', x / 2.236936);
  if (/kmh/.test(k)) return uf(c, 's', x / 3.6);
  const mm = /mm$/.test(k) ? x : x * 25.4;
  return /^r(ainrate|rain)/.test(k) ? `${uf(c, 'r', mm)}/h` : uf(c, 'r', mm);
}
// Values the gateway does not send, computed as aioecowitt / meteocalc do: [label key, value, kind].
function eDer(f) {
  const n = (k) => (f[k] == null || f[k] === '' || isNaN(+f[k]) ? null : +f[k]), H = n('humidity'), o = [];
  let T = n('tempf'), V = n('windspeedmph');
  if (T == null && n('tempc') != null) T = n('tempc') * 1.8 + 32;
  if (V == null && n('windspeedkmh') != null) V = n('windspeedkmh') / 1.60934;
  if (T != null && H >= 1 && H <= 100) {
    const c = Math.round(((T - 32) / 1.8) * 10) / 10, k = c > 0 ? [17.368, 238.88] : [17.966, 247.15], a = Math.log(H / 100) + (k[0] * c) / (k[1] + c);
    o.push([K('es_dp'), (k[1] * a) / (k[0] - a), 't']);
  }
  // NWS wind chill: defined only at or below 50 °F with wind above 3 mph
  const wc = T != null && V != null && T <= 50 && V > 3 ? 35.74 + 0.6215 * T - 35.75 * V ** 0.16 + 0.4275 * T * V ** 0.16 : null;
  if (T != null && H != null && V != null) {
    let fl = T;
    if (wc != null) fl = wc;
    else if (T >= 80) {  // Steadman, then Rothfusz from 80 °F
      fl = 0.5 * (T + 61 + (T - 68) * 1.2 + H * 0.094);
      if (fl >= 80) fl = -42.379 + 2.04901523 * T + 10.14333127 * H - 0.22475541 * T * H - 6.83783e-3 * T * T - 5.481717e-2 * H * H
        + 1.22874e-3 * T * T * H + 8.5282e-4 * T * H * H - 1.99e-6 * T * T * H * H;
    }
    o.push([K('es_tf'), (fl - 32) / 1.8, 't']);
  }
  if (wc != null) o.push([K('es_wc'), (wc - 32) / 1.8, 't']);
  // Lux: the gateway reports W/m² = lx / 126.7, so this restores the native reading
  if (n('solarradiation') != null) o.push([K('es_lux'), n('solarradiation') * 126.7, 'lx']);
  return o;
}
// Groups [[label, value], ...] of an ecoraw field map; psl = sea-level pressure text from the device (or null).
function ecoGroups(c, f, psl) {
  const t = c.t, g = EG.map(() => []), seen = {};
  for (const k of Object.keys(f)) {
    const r = EK.find((e) => e[0].test(k));
    if (r && r[1] == null) continue;
    if (!r) { g[EGU].push([k, String(f[k])]); continue; }
    const ch = (k.match(r[0]) || [])[1], cc = r[1] === 3 || r[1] === 4 || /^(pm25_|leak_|depth_)/.test(k) ? ch : '';
    const id = `${r[2]}|${r[4] || ''}|${cc || ''}|${r[1] === 5 && !cc ? ch : ''}`;
    if (r[2] && seen[id]) continue;
    seen[id] = 1;
    const lbl = r[1] === 7 ? ebName(t, k) : t(r[2]) + (r[4] ? ' · piezo' : '') + (cc ? ` CH${cc}` : '')
      + (r[1] === 5 && /^pm\d/.test(k) && !cc ? ` ${{ 1: 'PM1', 4: 'PM4', 25: 'PM2.5', 10: 'PM10' }[ch]}` : '');
    // Relative pressure: the firmware's sea-level value instead of the gateway's own baromrel, while there is one.
    const ps = r[3] === 'psl' && psl;
    g[r[1]].push([ps ? t('m_psl') : lbl, ps ? psl : eVal(c, k, f[k], r[3])]);
  }
  for (const [k, v, u] of eDer(f)) if (!seen[`${k}|||`]) g[0].push([`${t(k)} · ${t('es_calc')}`, u === 'lx' ? eVal(c, k, v, 'lx') : uf(c, 't', v)]);
  return g.map((x, i) => ({ head: t(EG[i]), note: i === 8 ? t('es_in_h') : '', rows: x })).filter((x) => x.rows.length);
}
class IrryEcoCard extends IrryGetCard {
  signature() {
    const m = this._m;
    if (!m) return 'none';
    const p = m.so('weather_pressure_sea_level');
    return JSON.stringify([this._l, m.imp, this._ver, p && [p.state, p.attributes.unit_of_measurement], Math.floor(Date.now() / 60000)]);
  }
  paint() {
    const m = this._m, t = this._t, c = this.ctx(), r = this.shadowRoot;
    if (!m) return this.noDev();
    let b;
    if (!m.action('get')) b = `<div class="note">${esc(t('x_no_svc'))}</div>`;
    else {
      const j = this.got('ecoraw', 0, 60e3);
      if (j === undefined) b = `<div class="note">${esc(t('loading'))}</div>`;
      else if (!j || !j.f) b = `<div class="note">${esc(t('m_eco_none'))}</div>`;
      else {
        const ps = m.so('weather_pressure_sea_level'), psl = ps && !BAD.includes(ps.state) ? fmtState('', ps, c) : null;
        const kv = (k, v) => `<div class="r"><span class="n">${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
        b = ecoGroups(c, j.f, psl).map((x) => `<div class="h">${esc(x.head)}</div>${x.note ? `<div class="note">${esc(x.note)}</div>` : ''}`
          + x.rows.map(([k, v]) => kv(k, v)).join('')).join('') + (j.age != null ? `<div class="h"></div>${kv(t('m_eco_rx'), ago(j.age))}` : '');
      }
    }
    r.innerHTML = `<style>${CSS}</style><ha-card><div class="rows">${b}</div></ha-card>`;
  }
}

// Coefficients: today's factors (entities, as the device Weather → Coefficients) and the rain of the last days (get mhist 1).
class IrryCoefCard extends IrryGetCard {
  signature() {
    const m = this._m;
    if (!m) return 'none';
    const ks = ['irrigation_method', 'weather_data', 'irrigation_factor', 'irrigation_et0_yesterday', 'units',
      ...m.zones.flatMap((n) => [`zone_${n}_irrigation_factor`, `zone_${n}_plant_type`, `zone_${n}_sheltered_from_rain`, `zone_${n}_sheltered_from_wind`])];
    return JSON.stringify([this._l, m.imp, this._ver, m.zones.map(m.label), ks.map((k) => { const s = m.so(k); return s && [s.state, s.attributes.unit_of_measurement]; })]);
  }
  paint() {
    const m = this._m, t = this._t, c = this.ctx(), r = this.shadowRoot, l = this._l;
    if (!m) return this.noDev();
    const kv = (k, v) => `<div class="r"><span class="n">${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
    const pc = (k) => { const v = parseFloat(m.st(k)); return isNaN(v) ? '-' : `${nf(v, 0, l)} %`; };
    const meth = m.st('irrigation_method');
    let b;
    if (!meth || meth === 'none' || BAD.includes(meth)) b = `<div class="note">${esc(t('wx_c_off'))}</div>`;
    else {
      b = `<div class="h">${esc(t('m_res'))}</div>${kv(t('m_f'), pc('irrigation_factor'))}`;
      b += m.zones.map((n) => kv(m.label(n), m.st(`zone_${n}_plant_type`) === 'Not adapted' ? t('m_pt_none')
        : pc(`zone_${n}_irrigation_factor`) + (m.st(`zone_${n}_sheltered_from_rain`) === 'on' ? ` · ${t('m_sh')}` : '')
        + (m.st(`zone_${n}_sheltered_from_wind`) === 'on' ? ` · ${t('m_wx')}` : ''))).join('');
      const wd = m.so('weather_data'), e0 = m.so('irrigation_et0_yesterday');
      if (wd) b += kv(t('m_data'), wd.state === 'missing' ? t('m_q_missing') : fmtState('wdata', wd, c));
      if (e0) b += kv(t('m_et0y'), fmtState('', e0, c));
      // Closed days of the 7-day rain series (the last one is today, still being sampled); no ET0 per day here.
      const j = m.action('get') ? this.got('mhist', 1, 600e3) : null;
      if (j && Array.isArray(j.rn) && j.rs === 86400 && j.rn.length > 1) {
        const dl = new Intl.DateTimeFormat(l, { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
        const u = devValue(0, 'mm', m.imp);
        b += `<div class="h">${esc(t('m_hist'))}</div>` + j.rn.slice(0, -1).map((x, i) => [i, x]).reverse()
          .map(([i, x]) => { const v = devValue(x, 'mm', m.imp); return kv(dl.format((j.r0 + i * j.rs) * 1000), t('x_rain_day', { rain: nf(v[0], v[2], l), u: u[1] })); }).join('');
      }
    }
    r.innerHTML = `<style>${CSS}</style><ha-card><div class="rows">${b}</div></ha-card>`;
  }
}

// Reference ET0 and Calibrate (Settings → Weather). The Calibrate button reports no result to HA: success is read from
// the Reference ET0 changing within a few seconds; no change and no ET0 yesterday = the firmware "nodata" refusal.
class IrryCalCard extends IrryCard {
  signature() {
    const m = this._m;
    if (!m) return 'none';
    const s = m.so('irrigation_reference_et0');
    return JSON.stringify([this._l, m.imp, s && [s.state, s.attributes.unit_of_measurement], this._msg]);
  }
  paint() {
    const m = this._m, t = this._t, r = this.shadowRoot, c = this.ctx();
    if (!m) return this.noDev();
    const s = m.so('irrigation_reference_et0');
    if (!s) { r.innerHTML = ''; return; }
    const x = devValue(parseFloat(s.state), s.attributes.unit_of_measurement, m.imp);
    const msg = this._msg || {};
    r.innerHTML = `<style>${CSS}</style><ha-card><div class="rows">
      <div class="r"><span class="n">${esc(t('m_etr'))}</span><label><input type="number" step="${m.imp ? 0.01 : 0.1}" data-etr
        value="${x ? +x[0].toFixed(x[2]) : ''}"${s.state === 'unavailable' ? ' disabled' : ''}> ${esc(x ? x[1] : '')}</label>
        ${m.E('irrigation_calibrate') ? `<button data-cal>${esc(t('m_cal'))}</button>` : ''}</div>
      <div class="msg ${msg.cls || ''}">${esc(msg.text || '')}</div>
      <div class="note">${esc(t('m_etr_h', { ref: uf(c, 'r', 5) }))}</div></div></ha-card>`;
    const inp = r.querySelector('[data-etr]');
    inp.addEventListener('change', () => this.setEtr(inp));
    const cb = r.querySelector('[data-cal]');
    if (cb) cb.addEventListener('click', () => this.cal());
  }
  say(text, cls) { this._msg = { text, cls }; this._sig = ''; this.hass = this._h; }
  async setEtr(el) {
    const h = this._h, id = this._m.E('irrigation_reference_et0'), s = h.states[id], u = s.attributes.unit_of_measurement;
    let v = parseFloat(String(el.value).replace(',', '.'));
    el.blur();
    if (isNaN(v)) return this.say('', '');
    const x = devValue(parseFloat(s.state), u, this._m.imp);
    if (x) v = toUnit(v, x[1], u);
    const a = s.attributes, step = a.step || 0.1;
    v = Math.min(a.max ?? v, Math.max(a.min ?? v, Math.round(v / step) * step));
    try { await h.callService('number', 'set_value', { value: +v.toFixed(3) }, { entity_id: id }); this.say(this._t('saved'), 'ok'); } catch (e) { this.say(errText(this._m, this._t, this._l, e), 'err'); }
  }
  async cal() {
    const h = this._h, m = this._m, t = this._t, before = m.st('irrigation_reference_et0');
    try { await h.callService('button', 'press', {}, { entity_id: m.E('irrigation_calibrate') }); } catch (e) { return this.say(errText(m, t, this._l, e), 'err'); }
    this.say(t('x_saving'), '');
    await new Promise((res) => setTimeout(res, 3000));
    const m2 = irryModel(this._h, this._c.device), e0 = m2.st('irrigation_et0_yesterday');
    const ok = m2.st('irrigation_reference_et0') !== before || !(e0 == null || BAD.includes(e0));
    this.say(t(ok ? 'saved' : 'e_nodata'), ok ? 'ok' : 'err');
  }
}

// Release notes of the offered version (get notes: { run, v, url, t }); hidden when no version is offered.
class IrryNotesCard extends IrryGetCard {
  signature() { const m = this._m; return m ? JSON.stringify([this._l, this._ver, m.st('firmware_update_status')]) : 'none'; }
  paint() {
    const m = this._m, t = this._t, r = this.shadowRoot;
    if (!m) return this.noDev();
    // Fetched again when the update status changes (a new check, a new version).
    const j = this.got('notes', 0, this._st === m.st('firmware_update_status') ? 3600e3 : 0);
    this._st = m.st('firmware_update_status');
    const ok = j && j.v && /^https:\/\//.test(j.url || '');
    this.style.display = ok ? '' : 'none';
    r.innerHTML = ok ? `<style>${CSS}</style><ha-card><div class="rows"><div class="r"><span class="n">${esc(t('fwn_av', { ver: j.v }))}</span>`
      + `<a class="v" href="${esc(j.url)}" target="_blank" rel="noopener">${esc(t('fwn_notes'))}</a></div></div></ha-card>` : '';
  }
}

const def = (n, c) => customElements.get(n) || customElements.define(n, c);
def('ll-strategy-dashboard-irry-the-seven', IrryDashboardStrategy);
def('ll-strategy-view-irry-status', IrryStatusStrategy);
def('ll-strategy-view-irry-irrigation', IrryIrrigationStrategy);
def('ll-strategy-view-irry-day', IrryDayStrategy);
def('ll-strategy-view-irry-weather', IrryWeatherStrategy);
def('ll-strategy-view-irry-settings', IrrySettingsStrategy);
def('irry-banner-card', IrryBannerCard);
def('irry-rows-card', IrryRowsCard);
def('irry-slot-card', IrrySlotCard);
def('irry-rapid-card', IrryRapidCard);
def('irry-day-card', IrryDayCard);
def('irry-eco-card', IrryEcoCard);
def('irry-coef-card', IrryCoefCard);
def('irry-cal-card', IrryCalCard);
def('irry-notes-card', IrryNotesCard);
window.customCards = window.customCards || [];
window.customCards.push(
  { type: 'irry-rapid-card', name: 'Irry Rapid', description: 'Same start and duration, zones one after another' },
  { type: 'irry-slot-card', name: 'Irry zone slots', description: 'The three slots of one zone (zone: N), saved on change' },
  { type: 'irry-banner-card', name: 'Irry status', description: 'Alerts of the Irry device in the user language' },
  { type: 'irry-rows-card', name: 'Irry rows', description: 'Irry entities with translated names, states and device units' },
  { type: 'irry-day-card', name: 'Irry day', description: 'Planned and past irrigation of one day, as the device Day tab' },
  { type: 'irry-eco-card', name: 'Irry Ecowitt', description: 'Every field of the last Ecowitt upload' },
  { type: 'irry-coef-card', name: 'Irry coefficients', description: 'Today\'s irrigation factors and the rain of the last days' },
  { type: 'irry-cal-card', name: 'Irry calibration', description: 'Reference ET0 and Calibrate' },
  { type: 'irry-notes-card', name: 'Irry release notes', description: 'Link to the notes of the offered firmware' },
);
console.info(`%c IRRY THE SEVEN %c ${IRRY_VERSION} `, 'background:#2e7d32;color:#fff', '');
if (typeof module !== 'undefined') {
  module.exports = { irryModel, statusView, irrigationView, weatherView, settingsView, alerts, tr, slug, errText, ovlText,
    eventText, fwText, fmtState, devValue, toUnit, I18N, dayView, dayModel, devSlots, devToday, runs, ovDay, getCall, irryGet, hm, dnOf,
    ecoGroups, IrryDayCard, IrryEcoCard, IrryCoefCard, IrryCalCard, IrryNotesCard };
}
})();
