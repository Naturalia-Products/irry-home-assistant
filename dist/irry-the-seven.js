(() => {
// Irry The Seven: Home Assistant dashboard and view strategies, and the cards they use.
// One file, no dependencies. Finds the Irry device by manufacturer and its entities by their
// fixed English names (fallback: the entity_id suffix), so area or device renames do not break it.
//   Dashboard:  strategy: { type: custom:irry-the-seven }
//   Views:      strategy: { type: custom:irry-status | custom:irry-irrigation | custom:irry-weather | custom:irry-settings }
//   Options:    device: <device_id or name> (several Irry devices), language: it/en/de/fr/es/pt,
//               windrose: false, mini_graph: false (HACS cards are used only when installed)
// Texts: the device UI translations (src/ui/i18n) plus a few of their own, inlined by ha/build.py
// (every literal key passed to t() or K()). Names and states are always the device's own words: ESPHome
// entities carry no translation_key, so HA would show the English firmware names and states.
// Units: the device "Units" select (Auto = from the time zone), as in the device UI; HA sensor values
// are converted from whatever unit HA shows them in. Graphs keep the HA unit.

const IRRY_VERSION = '0.2.1';
const I18N = {"en":{"active":"Active","all":"All","allok":"All good","applied":"Slot {slot} written to {count, plural, one {# zone} other {# zones}}","apply":"Apply to slot {slot}","aux_def":"Aux","aux_m":"Aux mode","aux_m_last":"At startup: last state","aux_m_off":"At startup: always OFF","aux_m_on":"At startup: always ON","aux_m_sync":"Synced with zones","aux_name":"Aux name","aux_tof":"Off delay (0–600 s)","aux_ton":"On delay (0–120 s)","cfg":"Configuration","ch_time_bad":"Time not valid","close_all":"Close all","days":"Days","days_u":"days","dm_even":"Even","dm_every":"Every N","dm_odd":"Odd","dm_week":"Weekdays","dur":"Duration","dur_zone":"Duration per zone","e_generic":"Error: {err}","e_limit":"Program refused: more than 3 zones open at once","e_limit_at":"Program refused: {count} zones open at once (max 3) · {when} {from}–{to} · {zones}","es_g_in":"Indoor (gateway)","es_g_out":"Outdoor","es_g_wind":"Wind","es_rd":"Today","es_re":"Event","es_rr":"Rain rate","es_uv":"UV index","es_ws10":"Speed, 10 min average","every_n":"Every","from":"Starting","fw":"Firmware","fw_err":"Update failed: {err}","fwm_auto":"Automatic","fwm_ntf":"Notify only","fwm_off":"Off","fwn":"Update from the internet","fwn_av":"Version {ver} available","fwn_avm":"Version {ver} available (install by hand only)","fwn_check":"Check for updates","fwn_chk":"Checking…","fwn_go":"Install {ver}","fwn_inst":"Installing…","fwn_off":"Internet update is off: no check is made.","fwn_ok":"Up to date","fwn_rej_rb":"Version {ver} available, discarded after a failed update","fwn_ver":"Firmware update being verified: wait about a minute.","ip":"IP address","m_batt":"Sensor array battery","m_batt_low":"low","m_batt_ok":"ok","m_eco":"Ecowitt","m_eco_none":"Not paired","m_eco_rx":"Last upload","m_et0y":"ET0 yesterday","m_f":"Reference lawn factor","m_fao":"Full","m_ha":"Home Assistant","m_harg":"Simple","m_meth":"Duration adjustment","m_none":"None","m_off":"Off","m_pa":"Absolute pressure","m_pfx":"Weather station prefix (Home Assistant)","m_psl":"Sea-level pressure","m_pt_beds":"Beds, shrubs, hedges","m_pt_cool":"Cool-season lawn","m_pt_dry":"Mediterranean, low water","m_pt_none":"Not adapted","m_pt_tree":"Trees, orchard","m_pt_veg":"Vegetable garden","m_pt_warm":"Warm-season lawn","m_r24":"Rain last 24 h","m_rh":"Humidity","m_rs":"Solar radiation","m_sh":"Sheltered from rain","m_t":"Temperature","m_wx":"Sheltered from wind","mmax":"Max manual watering","next":"Next start","now_run":"Watering","ntp":"NTP servers","offline":"Device unreachable","ok":"OK","ovl":"Overlap","ovl_ban":"{count} zones open at once {from}–{to}: {zones}","pause":"Pause programs","paused":"Programs paused","pick_day":"Pick at least one day.","pick_zone":"Include at least one zone.","r":"Quick","rain":"Rain","rain_attr":"Attribute (optional)","rain_ent":"Last-24h rain entity (entity_id)","rain_skip":"Rain skip","rain_thr":"Threshold","rainskip":"Starts skipped for rain","rainskip_sh":"Zones sheltered from rain run anyway.","restart_b":"Restart","rtc":"RTC clock","s":"System","saved":"Saved","seq_hdr":"Zones in sequence","signal":"Signal","slot":"Slot","st":"Status","start":"Start","time":"Date and time","turn_off_slot":"Turn off slot {slot}","un_i":"Imperial","un_m":"Metric","units":"Units","up":"Move up","uptime":"Up for","vp":"Valve power","w_dir":"Direction","w_gust":"Gust","w_spd":"Speed","w_thr_g":"Gust threshold","w_thr_u":"Mean threshold (10 min)","wd_e":"E","wd_n":"N","wd_ne":"NE","wd_nw":"NW","wd_s":"S","wd_se":"SE","wd_sw":"SW","wd_w":"W","wfb_chip":"Fallback Wi-Fi","wifi":"Wi-Fi","wind_h":"Wind","wind_ign":"Ignore wind","wind_over_nx":"Wind over threshold: the next scheduled starts wait for it to drop.","wp":"Wind pause","ws_now":"Phone time","ww":"Waiting for the wind to drop","wx":"Weather","wx_7":"7 days","wx_g":"Charts","wx_s":"Sensors","x_30d":"30 days","x_close_q":"Close all zone valves?","x_device":"Device","x_diag":"Diagnostics","x_end":"ends","x_feed_stale":"Weather station not updating","x_feed_unpaired":"Weather station not paired","x_fwm":"Firmware updates","x_fwsrc":"Update source","x_irrigation":"Irrigation","x_last_ev":"Last event","x_log":"Events","x_no":"No","x_no_dev":"No Irry device found in Home Assistant.","x_no_svc":"Irry actions not found: update the device firmware, then reload the ESPHome integration","x_pressure":"Pressure","x_pt":"Crop","x_restart_q":"Restart the device?","x_saving":"Saving…","x_station":"Station","x_sun":"Sun","x_tsrc":"Time source","x_tvalid":"Time valid","x_un_auto":"Automatic (time zone)","x_unav":"Unavailable","x_wd_collecting":"Collecting weather data","x_wd_ene":"ENE","x_wd_ese":"ESE","x_wd_fallback":"Weather data partial: fallback values in use","x_wd_missing":"Weather data missing","x_wd_nne":"NNE","x_wd_nnw":"NNW","x_wd_sse":"SSE","x_wd_ssw":"SSW","x_wd_wnw":"WNW","x_wd_wsw":"WSW","x_wdata":"Weather data","x_wifi_fb":"Connected to the fallback Wi-Fi network","x_wifi_pri":"Primary","x_wind_over":"Wind over threshold","x_wind_res":"Resume after wind","x_wsrc":"Weather source","x_yes":"Yes","x_zf":"Zone factor","x_zname":"Zone name","z_man":"Opened manually","z_off":"No program","z_wind":"Wind pause · resumes {time}","zones":"Zones"},"it":{"active":"Attivo","all":"Tutti","allok":"Tutto ok","applied":"Slot {slot} scritto su {count, plural, one {# zona} other {# zone}}","apply":"Applica allo slot {slot}","aux_def":"Aux","aux_m":"Modalità Aux","aux_m_last":"All’avvio: ultimo stato","aux_m_off":"All’avvio: sempre OFF","aux_m_on":"All’avvio: sempre ON","aux_m_sync":"Sincronizzato con le zone","aux_name":"Nome Aux","aux_tof":"Ritardo spegnimento (0–600 s)","aux_ton":"Ritardo accensione (0–120 s)","cfg":"Configurazione","ch_time_bad":"Ora non valida","close_all":"Chiudi tutte","days":"Giorni","days_u":"giorni","dm_even":"Pari","dm_every":"Ogni N","dm_odd":"Dispari","dm_week":"Settimana","dur":"Durata","dur_zone":"Durata per zona","e_generic":"Errore: {err}","e_limit":"Programma rifiutato: più di 3 zone aperte insieme","e_limit_at":"Programma rifiutato: {count} zone aperte insieme (massimo 3) · {when} {from}–{to} · {zones}","es_g_in":"Interno (gateway)","es_g_out":"Esterno","es_g_wind":"Vento","es_rd":"Oggi","es_re":"Evento","es_rr":"Intensità","es_uv":"Indice UV","es_ws10":"Velocità media 10 min","every_n":"Ogni","from":"A partire da","fw":"Firmware","fw_err":"Aggiornamento non riuscito: {err}","fwm_auto":"Automatico","fwm_ntf":"Solo avviso","fwm_off":"Spento","fwn":"Aggiornamento da internet","fwn_av":"Disponibile la versione {ver}","fwn_avm":"Disponibile la versione {ver} (solo installazione manuale)","fwn_check":"Verifica aggiornamenti","fwn_chk":"Verifica in corso…","fwn_go":"Installa {ver}","fwn_inst":"Installazione in corso…","fwn_off":"Aggiornamento da internet spento: nessun controllo.","fwn_ok":"Aggiornato","fwn_rej_rb":"Disponibile la versione {ver}, scartata dopo un aggiornamento fallito","fwn_ver":"Aggiornamento in verifica: attendi circa un minuto.","ip":"Indirizzo IP","m_batt":"Batteria array di sensori","m_batt_low":"scarica","m_batt_ok":"ok","m_eco":"Ecowitt","m_eco_none":"Non abbinato","m_eco_rx":"Ultimo invio","m_et0y":"ET0 di ieri","m_f":"Fattore del prato di riferimento","m_fao":"Completo","m_ha":"Home Assistant","m_harg":"Semplice","m_meth":"Adattamento delle durate","m_none":"Nessuna","m_off":"Spento","m_pa":"Pressione assoluta","m_pfx":"Prefisso della stazione meteo (Home Assistant)","m_psl":"Pressione al livello del mare","m_pt_beds":"Aiuole, fiori, arbusti, siepi","m_pt_cool":"Prato microterme","m_pt_dry":"Mediterranee, basso consumo","m_pt_none":"Non adattare","m_pt_tree":"Alberi e frutteto","m_pt_veg":"Orto","m_pt_warm":"Prato macroterme","m_r24":"Pioggia ultime 24 h","m_rh":"Umidità","m_rs":"Radiazione solare","m_sh":"Riparata dalla pioggia","m_t":"Temperatura","m_wx":"Riparata dal vento","mmax":"Tempo massimo irrigazione manuale","next":"Prossimo avvio","now_run":"In irrigazione","ntp":"Server NTP","offline":"Dispositivo non raggiungibile","ok":"OK","ovl":"Sovrapposizione","ovl_ban":"{count} zone aperte insieme {from}–{to}: {zones}","pause":"Sospendi programmi","paused":"Programmi sospesi","pick_day":"Scegli almeno un giorno.","pick_zone":"Includi almeno una zona.","r":"Rapido","rain":"Pioggia","rain_attr":"Attributo (opzionale)","rain_ent":"Entità pioggia ultime 24 h (entity_id)","rain_skip":"Salto pioggia","rain_thr":"Soglia","rainskip":"Avvii saltati per pioggia","rainskip_sh":"Le zone riparate dalla pioggia partono comunque.","restart_b":"Riavvia","rtc":"Orologio RTC","s":"Sistema","saved":"Salvato","seq_hdr":"Zone in sequenza","signal":"Segnale","slot":"Slot","st":"Stato","start":"Inizio","time":"Data e ora","turn_off_slot":"Spegni lo slot {slot}","un_i":"Imperiali","un_m":"Metriche","units":"Unità di misura","up":"Sposta su","uptime":"Acceso da","vp":"Alimentazione valvole","w_dir":"Direzione","w_gust":"Raffica","w_spd":"Velocità","w_thr_g":"Soglia raffica","w_thr_u":"Soglia media (10 min)","wd_e":"Levante","wd_n":"Tramontana","wd_ne":"Grecale","wd_nw":"Maestrale","wd_s":"Ostro","wd_se":"Scirocco","wd_sw":"Libeccio","wd_w":"Ponente","wfb_chip":"Wi-Fi di riserva","wifi":"Wi-Fi","wind_h":"Vento","wind_ign":"Ignora vento","wind_over_nx":"Vento oltre soglia: i prossimi avvii programmati aspettano che cali.","wp":"Pausa vento","ws_now":"Ora del telefono","ww":"In attesa che il vento cali","wx":"Meteo","wx_7":"7 giorni","wx_g":"Grafici","wx_s":"Sensori","x_30d":"30 giorni","x_close_q":"Chiudere tutte le valvole?","x_device":"Dispositivo","x_diag":"Diagnostica","x_end":"termina","x_feed_stale":"La stazione meteo non si aggiorna","x_feed_unpaired":"Stazione meteo non abbinata","x_fwm":"Aggiornamenti firmware","x_fwsrc":"Origine degli aggiornamenti","x_irrigation":"Irrigazione","x_last_ev":"Ultimo evento","x_log":"Eventi","x_no":"No","x_no_dev":"Nessun dispositivo Irry trovato in Home Assistant.","x_no_svc":"Azioni Irry non trovate: aggiorna il firmware del dispositivo, poi ricarica l'integrazione ESPHome","x_pressure":"Pressione","x_pt":"Coltura","x_restart_q":"Riavviare il dispositivo?","x_saving":"Salvataggio…","x_station":"Stazione","x_sun":"Sole","x_tsrc":"Origine dell'ora","x_tvalid":"Ora valida","x_un_auto":"Automatiche (fuso orario)","x_unav":"Non disponibile","x_wd_collecting":"Raccolta dei dati meteo in corso","x_wd_ene":"Greco-Levante","x_wd_ese":"Levante-Scirocco","x_wd_fallback":"Dati meteo parziali: in uso i valori di ripiego","x_wd_missing":"Dati meteo mancanti","x_wd_nne":"Tramontana-Greco","x_wd_nnw":"Maestrale-Tramontana","x_wd_sse":"Scirocco-Ostro","x_wd_ssw":"Ostro-Libeccio","x_wd_wnw":"Ponente-Maestrale","x_wd_wsw":"Libeccio-Ponente","x_wdata":"Dati meteo","x_wifi_fb":"Collegato alla rete Wi-Fi di riserva","x_wifi_pri":"Principale","x_wind_over":"Vento oltre soglia","x_wind_res":"Ripresa dopo il vento","x_wsrc":"Sorgente meteo","x_yes":"Sì","x_zf":"Fattore della zona","x_zname":"Nome della zona","z_man":"Aperta manualmente","z_off":"Nessun programma","z_wind":"Pausa vento · riprende {time}","zones":"Zone"},"de":{"active":"Aktiv","all":"Alle","allok":"Alles in Ordnung","applied":"Slot {slot} auf {count, plural, one {# Zone} other {# Zonen}} geschrieben","apply":"Auf Slot {slot} anwenden","aux_def":"Aux","aux_m":"Aux-Modus","aux_m_last":"Beim Start: letzter Zustand","aux_m_off":"Beim Start: immer AUS","aux_m_on":"Beim Start: immer EIN","aux_m_sync":"Mit den Zonen synchronisiert","aux_name":"Aux-Name","aux_tof":"Ausschaltverzögerung (0–600 s)","aux_ton":"Einschaltverzögerung (0–120 s)","cfg":"Konfiguration","ch_time_bad":"Uhrzeit ungültig","close_all":"Alle schließen","days":"Tage","days_u":"Tage","dm_even":"Gerade","dm_every":"Alle N","dm_odd":"Ungerade","dm_week":"Wochentage","dur":"Dauer","dur_zone":"Dauer pro Zone","e_generic":"Fehler: {err}","e_limit":"Programm abgelehnt: mehr als 3 Zonen gleichzeitig offen","e_limit_at":"Programm abgelehnt: {count} Zonen gleichzeitig offen (maximal 3) · {when} {from}–{to} · {zones}","es_g_in":"Innen (Gateway)","es_g_out":"Außen","es_g_wind":"Wind","es_rd":"Heute","es_re":"Ereignis","es_rr":"Regenrate","es_uv":"UV-Index","es_ws10":"Geschwindigkeit, Mittel 10 min","every_n":"Alle","from":"Ab","fw":"Firmware","fw_err":"Update fehlgeschlagen: {err}","fwm_auto":"Automatisch","fwm_ntf":"Nur melden","fwm_off":"Aus","fwn":"Aktualisierung aus dem Internet","fwn_av":"Version {ver} verfügbar","fwn_avm":"Version {ver} verfügbar (nur manuelle Installation)","fwn_check":"Nach Aktualisierungen suchen","fwn_chk":"Prüfung läuft…","fwn_go":"{ver} installieren","fwn_inst":"Installation läuft…","fwn_off":"Internet-Aktualisierung ist aus: keine Prüfung.","fwn_ok":"Aktuell","fwn_rej_rb":"Version {ver} verfügbar, nach einer fehlgeschlagenen Aktualisierung verworfen","fwn_ver":"Firmware-Aktualisierung wird geprüft: etwa eine Minute warten.","ip":"IP-Adresse","m_batt":"Batterie Sensorarray","m_batt_low":"schwach","m_batt_ok":"ok","m_eco":"Ecowitt","m_eco_none":"Nicht gekoppelt","m_eco_rx":"Letzter Upload","m_et0y":"ET0 gestern","m_f":"Faktor des Referenzrasens","m_fao":"Vollständig","m_ha":"Home Assistant","m_harg":"Einfach","m_meth":"Anpassung der Laufzeiten","m_none":"Keine","m_off":"Aus","m_pa":"Absoluter Luftdruck","m_pfx":"Präfix der Wetterstation (Home Assistant)","m_psl":"Luftdruck auf Meereshöhe","m_pt_beds":"Beete, Blumen, Sträucher, Hecken","m_pt_cool":"Rasen (kühle Klimate)","m_pt_dry":"Mediterran, wenig Wasser","m_pt_none":"Nicht anpassen","m_pt_tree":"Bäume, Obstgarten","m_pt_veg":"Gemüsegarten","m_pt_warm":"Rasen (warme Klimate)","m_r24":"Regen letzte 24 h","m_rh":"Luftfeuchte","m_rs":"Sonnenstrahlung","m_sh":"Vor Regen geschützt","m_t":"Temperatur","m_wx":"Vor Wind geschützt","mmax":"Max. manuelle Bewässerung","next":"Nächster Start","now_run":"Bewässerung läuft","ntp":"NTP-Server","offline":"Gerät nicht erreichbar","ok":"OK","ovl":"Überschneidung","ovl_ban":"{count} Zonen gleichzeitig offen {from}–{to}: {zones}","pause":"Programme pausieren","paused":"Programme pausiert","pick_day":"Mindestens einen Tag wählen.","pick_zone":"Mindestens eine Zone einbeziehen.","r":"Schnell","rain":"Regen","rain_attr":"Attribut (optional)","rain_ent":"Regen-Entität letzte 24 h (entity_id)","rain_skip":"Regenaussetzung","rain_thr":"Schwelle","rainskip":"Starts wegen Regen übersprungen","rainskip_sh":"Vor Regen geschützte Zonen starten trotzdem.","restart_b":"Neu starten","rtc":"RTC-Uhr","s":"System","saved":"Gespeichert","seq_hdr":"Zonen in Reihenfolge","signal":"Signal","slot":"Slot","st":"Status","start":"Start","time":"Datum und Uhrzeit","turn_off_slot":"Slot {slot} ausschalten","un_i":"Imperial","un_m":"Metrisch","units":"Maßeinheiten","up":"Nach oben","uptime":"Läuft seit","vp":"Ventilversorgung","w_dir":"Richtung","w_gust":"Böe","w_spd":"Geschwindigkeit","w_thr_g":"Schwelle Böe","w_thr_u":"Schwelle Mittel (10 min)","wd_e":"O","wd_n":"N","wd_ne":"NO","wd_nw":"NW","wd_s":"S","wd_se":"SO","wd_sw":"SW","wd_w":"W","wfb_chip":"Reserve-WLAN","wifi":"WLAN","wind_h":"Wind","wind_ign":"Wind ignorieren","wind_over_nx":"Wind über der Schwelle: die nächsten geplanten Starts warten, bis er nachlässt.","wp":"Windpause","ws_now":"Uhrzeit des Telefons","ww":"Warten, bis der Wind nachlässt","wx":"Wetter","wx_7":"7 Tage","wx_g":"Diagramme","wx_s":"Sensoren","x_30d":"30 Tage","x_close_q":"Alle Zonenventile schließen?","x_device":"Gerät","x_diag":"Diagnose","x_end":"endet","x_feed_stale":"Wetterstation aktualisiert nicht","x_feed_unpaired":"Wetterstation nicht gekoppelt","x_fwm":"Firmware-Updates","x_fwsrc":"Update-Quelle","x_irrigation":"Bewässerung","x_last_ev":"Letztes Ereignis","x_log":"Ereignisse","x_no":"Nein","x_no_dev":"Kein Irry-Gerät in Home Assistant gefunden.","x_no_svc":"Irry-Aktionen nicht gefunden: Gerätefirmware aktualisieren, dann die ESPHome-Integration neu laden","x_pressure":"Luftdruck","x_pt":"Bepflanzung","x_restart_q":"Gerät neu starten?","x_saving":"Speichern…","x_station":"Station","x_sun":"Sonne","x_tsrc":"Zeitquelle","x_tvalid":"Uhrzeit gültig","x_un_auto":"Automatisch (Zeitzone)","x_unav":"Nicht verfügbar","x_wd_collecting":"Wetterdaten werden gesammelt","x_wd_ene":"ONO","x_wd_ese":"OSO","x_wd_fallback":"Wetterdaten unvollständig: Ersatzwerte in Gebrauch","x_wd_missing":"Wetterdaten fehlen","x_wd_nne":"NNO","x_wd_nnw":"NNW","x_wd_sse":"SSO","x_wd_ssw":"SSW","x_wd_wnw":"WNW","x_wd_wsw":"WSW","x_wdata":"Wetterdaten","x_wifi_fb":"Mit dem Ersatz-WLAN verbunden","x_wifi_pri":"Primär","x_wind_over":"Wind über Schwelle","x_wind_res":"Fortsetzung nach Wind","x_wsrc":"Wetterquelle","x_yes":"Ja","x_zf":"Zonenfaktor","x_zname":"Zonenname","z_man":"Manuell geöffnet","z_off":"Kein Programm","z_wind":"Windpause · weiter um {time}","zones":"Zonen"},"fr":{"active":"Actif","all":"Toutes","allok":"Tout va bien","applied":"Créneau {slot} écrit sur {count, plural, one {# zone} other {# zones}}","apply":"Appliquer au créneau {slot}","aux_def":"Aux","aux_m":"Mode Aux","aux_m_last":"Au démarrage : dernier état","aux_m_off":"Au démarrage : toujours OFF","aux_m_on":"Au démarrage : toujours ON","aux_m_sync":"Synchronisé avec les zones","aux_name":"Nom Aux","aux_tof":"Délai d’arrêt (0–600 s)","aux_ton":"Délai de marche (0–120 s)","cfg":"Configuration","ch_time_bad":"Heure non valide","close_all":"Tout fermer","days":"Jours","days_u":"jours","dm_even":"Pairs","dm_every":"Tous les N","dm_odd":"Impairs","dm_week":"Semaine","dur":"Durée","dur_zone":"Durée par zone","e_generic":"Erreur : {err}","e_limit":"Programme refusé : plus de 3 zones ouvertes en même temps","e_limit_at":"Programme refusé : {count} zones ouvertes en même temps (max 3) · {when} {from}–{to} · {zones}","es_g_in":"Intérieur (passerelle)","es_g_out":"Extérieur","es_g_wind":"Vent","es_rd":"Aujourd’hui","es_re":"Épisode","es_rr":"Intensité","es_uv":"Indice UV","es_ws10":"Vitesse moyenne 10 min","every_n":"Tous les","from":"À partir du","fw":"Firmware","fw_err":"Échec de la mise à jour : {err}","fwm_auto":"Automatique","fwm_ntf":"Avertir seulement","fwm_off":"Désactivée","fwn":"Mise à jour depuis internet","fwn_av":"Version {ver} disponible","fwn_avm":"Version {ver} disponible (installation manuelle uniquement)","fwn_check":"Rechercher des mises à jour","fwn_chk":"Vérification…","fwn_go":"Installer {ver}","fwn_inst":"Installation…","fwn_off":"Mise à jour depuis internet désactivée : aucune vérification.","fwn_ok":"À jour","fwn_rej_rb":"Version {ver} disponible, écartée après une mise à jour échouée","fwn_ver":"Mise à jour en cours de vérification : patientez environ une minute.","ip":"Adresse IP","m_batt":"Batterie du réseau de capteurs","m_batt_low":"faible","m_batt_ok":"ok","m_eco":"Ecowitt","m_eco_none":"Non associée","m_eco_rx":"Dernier envoi","m_et0y":"ET0 d’hier","m_f":"Facteur de la pelouse de référence","m_fao":"Complète","m_ha":"Home Assistant","m_harg":"Simple","m_meth":"Adaptation des durées","m_none":"Aucune","m_off":"Désactivée","m_pa":"Pression absolue","m_pfx":"Préfixe de la station météo (Home Assistant)","m_psl":"Pression au niveau de la mer","m_pt_beds":"Massifs, fleurs, arbustes, haies","m_pt_cool":"Gazon de climat tempéré","m_pt_dry":"Méditerranéennes, faible besoin","m_pt_none":"Non adaptée","m_pt_tree":"Arbres, verger","m_pt_veg":"Potager","m_pt_warm":"Gazon de climat chaud","m_r24":"Pluie dernières 24 h","m_rh":"Humidité","m_rs":"Rayonnement solaire","m_sh":"Abritée de la pluie","m_t":"Température","m_wx":"Abritée du vent","mmax":"Arrosage manuel max","next":"Prochain départ","now_run":"Arrosage","ntp":"Serveurs NTP","offline":"Appareil injoignable","ok":"OK","ovl":"Chevauchement","ovl_ban":"{count} zones ouvertes en même temps {from}–{to} : {zones}","pause":"Suspendre les programmes","paused":"Programmes suspendus","pick_day":"Choisissez au moins un jour.","pick_zone":"Incluez au moins une zone.","r":"Rapide","rain":"Pluie","rain_attr":"Attribut (facultatif)","rain_ent":"Entité pluie des dernières 24 h (entity_id)","rain_skip":"Saut pour pluie","rain_thr":"Seuil","rainskip":"Départs sautés pour pluie","rainskip_sh":"Les zones abritées de la pluie démarrent quand même.","restart_b":"Redémarrer","rtc":"Horloge RTC","s":"Système","saved":"Enregistré","seq_hdr":"Zones en séquence","signal":"Signal","slot":"Créneau","st":"État","start":"Départ","time":"Date et heure","turn_off_slot":"Désactiver le créneau {slot}","un_i":"Impériales","un_m":"Métriques","units":"Unités","up":"Monter","uptime":"En marche depuis","vp":"Alimentation des vannes","w_dir":"Direction","w_gust":"Rafale","w_spd":"Vitesse","w_thr_g":"Seuil rafale","w_thr_u":"Seuil moyenne (10 min)","wd_e":"E","wd_n":"N","wd_ne":"NE","wd_nw":"NO","wd_s":"S","wd_se":"SE","wd_sw":"SO","wd_w":"O","wfb_chip":"Wi-Fi de secours","wifi":"Wi-Fi","wind_h":"Vent","wind_ign":"Ignorer le vent","wind_over_nx":"Vent au-dessus du seuil : les prochains départs programmés attendent qu'il faiblisse.","wp":"Pause vent","ws_now":"Heure du téléphone","ww":"En attente que le vent faiblisse","wx":"Météo","wx_7":"7 jours","wx_g":"Graphiques","wx_s":"Capteurs","x_30d":"30 jours","x_close_q":"Fermer toutes les vannes ?","x_device":"Appareil","x_diag":"Diagnostic","x_end":"fin","x_feed_stale":"La station météo ne se met pas à jour","x_feed_unpaired":"Station météo non associée","x_fwm":"Mises à jour du firmware","x_fwsrc":"Source des mises à jour","x_irrigation":"Arrosage","x_last_ev":"Dernier événement","x_log":"Événements","x_no":"Non","x_no_dev":"Aucun appareil Irry trouvé dans Home Assistant.","x_no_svc":"Actions Irry introuvables : mettez à jour le firmware de l'appareil, puis rechargez l'intégration ESPHome","x_pressure":"Pression","x_pt":"Culture","x_restart_q":"Redémarrer l'appareil ?","x_saving":"Enregistrement…","x_station":"Station","x_sun":"Soleil","x_tsrc":"Source de l'heure","x_tvalid":"Heure valide","x_un_auto":"Automatiques (fuseau horaire)","x_unav":"Indisponible","x_wd_collecting":"Collecte des données météo en cours","x_wd_ene":"ENE","x_wd_ese":"ESE","x_wd_fallback":"Données météo partielles : valeurs de secours utilisées","x_wd_missing":"Données météo manquantes","x_wd_nne":"NNE","x_wd_nnw":"NNO","x_wd_sse":"SSE","x_wd_ssw":"SSO","x_wd_wnw":"ONO","x_wd_wsw":"OSO","x_wdata":"Données météo","x_wifi_fb":"Connecté au Wi-Fi de secours","x_wifi_pri":"Principal","x_wind_over":"Vent au-dessus du seuil","x_wind_res":"Reprise après le vent","x_wsrc":"Source météo","x_yes":"Oui","x_zf":"Facteur de la zone","x_zname":"Nom de la zone","z_man":"Ouverte manuellement","z_off":"Aucun programme","z_wind":"Pause vent · reprise à {time}","zones":"Zones"},"es":{"active":"Activo","all":"Todas","allok":"Todo en orden","applied":"Franja {slot} escrita en {count, plural, one {# zona} other {# zonas}}","apply":"Aplicar a la franja {slot}","aux_def":"Aux","aux_m":"Modo Aux","aux_m_last":"Al arrancar: último estado","aux_m_off":"Al arrancar: siempre OFF","aux_m_on":"Al arrancar: siempre ON","aux_m_sync":"Sincronizado con las zonas","aux_name":"Nombre Aux","aux_tof":"Retardo de apagado (0–600 s)","aux_ton":"Retardo de encendido (0–120 s)","cfg":"Configuración","ch_time_bad":"Hora no válida","close_all":"Cerrar todas","days":"Días","days_u":"días","dm_even":"Pares","dm_every":"Cada N","dm_odd":"Impares","dm_week":"Semana","dur":"Duración","dur_zone":"Duración por zona","e_generic":"Error: {err}","e_limit":"Programa rechazado: más de 3 zonas abiertas a la vez","e_limit_at":"Programa rechazado: {count} zonas abiertas a la vez (máx. 3) · {when} {from}–{to} · {zones}","es_g_in":"Interior (pasarela)","es_g_out":"Exterior","es_g_wind":"Viento","es_rd":"Hoy","es_re":"Evento","es_rr":"Intensidad","es_uv":"Índice UV","es_ws10":"Velocidad media 10 min","every_n":"Cada","from":"A partir del","fw":"Firmware","fw_err":"Error en la actualización: {err}","fwm_auto":"Automático","fwm_ntf":"Solo aviso","fwm_off":"Apagado","fwn":"Actualización desde internet","fwn_av":"Versión {ver} disponible","fwn_avm":"Versión {ver} disponible (solo instalación manual)","fwn_check":"Buscar actualizaciones","fwn_chk":"Comprobando…","fwn_go":"Instalar {ver}","fwn_inst":"Instalando…","fwn_off":"Actualización desde internet apagada: no se comprueba nada.","fwn_ok":"Actualizado","fwn_rej_rb":"Versión {ver} disponible, descartada tras una actualización fallida","fwn_ver":"Actualización en verificación: espera alrededor de un minuto.","ip":"Dirección IP","m_batt":"Batería del conjunto de sensores","m_batt_low":"baja","m_batt_ok":"ok","m_eco":"Ecowitt","m_eco_none":"No vinculada","m_eco_rx":"Último envío","m_et0y":"ET0 de ayer","m_f":"Factor del césped de referencia","m_fao":"Completa","m_ha":"Home Assistant","m_harg":"Sencilla","m_meth":"Adaptación de las duraciones","m_none":"Ninguna","m_off":"Desactivada","m_pa":"Presión absoluta","m_pfx":"Prefijo de la estación meteorológica (Home Assistant)","m_psl":"Presión a nivel del mar","m_pt_beds":"Parterres, flores, arbustos, setos","m_pt_cool":"Césped de clima templado","m_pt_dry":"Mediterráneas, bajo consumo","m_pt_none":"No adaptar","m_pt_tree":"Árboles, frutales","m_pt_veg":"Huerto","m_pt_warm":"Césped de clima cálido","m_r24":"Lluvia últimas 24 h","m_rh":"Humedad","m_rs":"Radiación solar","m_sh":"Resguardada de la lluvia","m_t":"Temperatura","m_wx":"Resguardada del viento","mmax":"Riego manual máximo","next":"Próximo inicio","now_run":"Regando","ntp":"Servidores NTP","offline":"Dispositivo inaccesible","ok":"OK","ovl":"Solapamiento","ovl_ban":"{count} zonas abiertas a la vez {from}–{to}: {zones}","pause":"Pausar programas","paused":"Programas en pausa","pick_day":"Elige al menos un día.","pick_zone":"Incluye al menos una zona.","r":"Rápido","rain":"Lluvia","rain_attr":"Atributo (opcional)","rain_ent":"Entidad de lluvia de las últimas 24 h (entity_id)","rain_skip":"Omisión por lluvia","rain_thr":"Umbral","rainskip":"Inicios omitidos por lluvia","rainskip_sh":"Las zonas resguardadas de la lluvia arrancan igualmente.","restart_b":"Reiniciar","rtc":"Reloj RTC","s":"Sistema","saved":"Guardado","seq_hdr":"Zonas en secuencia","signal":"Señal","slot":"Franja","st":"Estado","start":"Inicio","time":"Fecha y hora","turn_off_slot":"Desactivar la franja {slot}","un_i":"Imperiales","un_m":"Métricas","units":"Unidades","up":"Subir","uptime":"Encendido desde hace","vp":"Alimentación de válvulas","w_dir":"Dirección","w_gust":"Ráfaga","w_spd":"Velocidad","w_thr_g":"Umbral ráfaga","w_thr_u":"Umbral media (10 min)","wd_e":"E","wd_n":"N","wd_ne":"NE","wd_nw":"NO","wd_s":"S","wd_se":"SE","wd_sw":"SO","wd_w":"O","wfb_chip":"Wi-Fi de respaldo","wifi":"Wi-Fi","wind_h":"Viento","wind_ign":"Ignorar viento","wind_over_nx":"Viento sobre el umbral: los próximos inicios programados esperan a que baje.","wp":"Pausa por viento","ws_now":"Hora del teléfono","ww":"Esperando a que baje el viento","wx":"Meteo","wx_7":"7 días","wx_g":"Gráficos","wx_s":"Sensores","x_30d":"30 días","x_close_q":"¿Cerrar todas las válvulas?","x_device":"Dispositivo","x_diag":"Diagnóstico","x_end":"termina","x_feed_stale":"La estación meteorológica no se actualiza","x_feed_unpaired":"Estación meteorológica no emparejada","x_fwm":"Actualizaciones de firmware","x_fwsrc":"Origen de las actualizaciones","x_irrigation":"Riego","x_last_ev":"Último evento","x_log":"Eventos","x_no":"No","x_no_dev":"No se ha encontrado ningún dispositivo Irry en Home Assistant.","x_no_svc":"Acciones de Irry no encontradas: actualiza el firmware del dispositivo y recarga la integración ESPHome","x_pressure":"Presión","x_pt":"Cultivo","x_restart_q":"¿Reiniciar el dispositivo?","x_saving":"Guardando…","x_station":"Estación","x_sun":"Sol","x_tsrc":"Origen de la hora","x_tvalid":"Hora válida","x_un_auto":"Automáticas (zona horaria)","x_unav":"No disponible","x_wd_collecting":"Recogiendo datos meteorológicos","x_wd_ene":"ENE","x_wd_ese":"ESE","x_wd_fallback":"Datos meteorológicos parciales: se usan valores de reserva","x_wd_missing":"Faltan datos meteorológicos","x_wd_nne":"NNE","x_wd_nnw":"NNO","x_wd_sse":"SSE","x_wd_ssw":"SSO","x_wd_wnw":"ONO","x_wd_wsw":"OSO","x_wdata":"Datos meteorológicos","x_wifi_fb":"Conectado a la Wi-Fi de reserva","x_wifi_pri":"Principal","x_wind_over":"Viento sobre el umbral","x_wind_res":"Reanudación tras el viento","x_wsrc":"Fuente meteorológica","x_yes":"Sí","x_zf":"Factor de la zona","x_zname":"Nombre de la zona","z_man":"Abierta manualmente","z_off":"Sin programa","z_wind":"Pausa por viento · se reanuda {time}","zones":"Zonas"},"pt":{"active":"Ativo","all":"Todas","allok":"Tudo em ordem","applied":"Turno {slot} escrito em {count, plural, one {# zona} other {# zonas}}","apply":"Aplicar ao turno {slot}","aux_def":"Aux","aux_m":"Modo Aux","aux_m_last":"No arranque: último estado","aux_m_off":"No arranque: sempre OFF","aux_m_on":"No arranque: sempre ON","aux_m_sync":"Sincronizado com as zonas","aux_name":"Nome Aux","aux_tof":"Atraso ao desligar (0–600 s)","aux_ton":"Atraso ao ligar (0–120 s)","cfg":"Configuração","ch_time_bad":"Hora inválida","close_all":"Fechar todas","days":"Dias","days_u":"dias","dm_even":"Pares","dm_every":"A cada N","dm_odd":"Ímpares","dm_week":"Semana","dur":"Duração","dur_zone":"Duração por zona","e_generic":"Erro: {err}","e_limit":"Programa recusado: mais de 3 zonas abertas ao mesmo tempo","e_limit_at":"Programa recusado: {count} zonas abertas ao mesmo tempo (máx. 3) · {when} {from}–{to} · {zones}","es_g_in":"Interior (gateway)","es_g_out":"Exterior","es_g_wind":"Vento","es_rd":"Hoje","es_re":"Evento","es_rr":"Intensidade","es_uv":"Índice UV","es_ws10":"Velocidade média 10 min","every_n":"A cada","from":"A partir de","fw":"Firmware","fw_err":"Falha na atualização: {err}","fwm_auto":"Automática","fwm_ntf":"Só avisar","fwm_off":"Desligada","fwn":"Atualização pela internet","fwn_av":"Versão {ver} disponível","fwn_avm":"Versão {ver} disponível (só instalação manual)","fwn_check":"Procurar atualizações","fwn_chk":"A verificar…","fwn_go":"Instalar {ver}","fwn_inst":"A instalar…","fwn_off":"Atualização pela internet desligada: nenhuma verificação.","fwn_ok":"Atualizado","fwn_rej_rb":"Versão {ver} disponível, descartada após uma atualização falhada","fwn_ver":"Atualização em verificação: aguarde cerca de um minuto.","ip":"Endereço IP","m_batt":"Bateria do conjunto de sensores","m_batt_low":"fraca","m_batt_ok":"ok","m_eco":"Ecowitt","m_eco_none":"Não emparelhado","m_eco_rx":"Último envio","m_et0y":"ET0 de ontem","m_f":"Fator do relvado de referência","m_fao":"Completa","m_ha":"Home Assistant","m_harg":"Simples","m_meth":"Adaptação das durações","m_none":"Nenhuma","m_off":"Desligada","m_pa":"Pressão absoluta","m_pfx":"Prefixo da estação meteorológica (Home Assistant)","m_psl":"Pressão ao nível do mar","m_pt_beds":"Canteiros, flores, arbustos, sebes","m_pt_cool":"Relvado de clima temperado","m_pt_dry":"Mediterrânicas, baixo consumo","m_pt_none":"Não adaptar","m_pt_tree":"Árvores, pomar","m_pt_veg":"Horta","m_pt_warm":"Relvado de clima quente","m_r24":"Chuva últimas 24 h","m_rh":"Humidade","m_rs":"Radiação solar","m_sh":"Abrigada da chuva","m_t":"Temperatura","m_wx":"Abrigada do vento","mmax":"Rega manual máxima","next":"Próximo início","now_run":"A regar","ntp":"Servidores NTP","offline":"Dispositivo inacessível","ok":"OK","ovl":"Sobreposição","ovl_ban":"{count} zonas abertas ao mesmo tempo {from}–{to}: {zones}","pause":"Pausar programas","paused":"Programas em pausa","pick_day":"Escolha pelo menos um dia.","pick_zone":"Inclua pelo menos uma zona.","r":"Rápido","rain":"Chuva","rain_attr":"Atributo (opcional)","rain_ent":"Entidade de chuva das últimas 24 h (entity_id)","rain_skip":"Salto por chuva","rain_thr":"Limiar","rainskip":"Inícios saltados por chuva","rainskip_sh":"As zonas abrigadas da chuva arrancam na mesma.","restart_b":"Reiniciar","rtc":"Relógio RTC","s":"Sistema","saved":"Guardado","seq_hdr":"Zonas em sequência","signal":"Sinal","slot":"Turno","st":"Estado","start":"Início","time":"Data e hora","turn_off_slot":"Desativar o turno {slot}","un_i":"Imperiais","un_m":"Métricas","units":"Unidades","up":"Subir","uptime":"Ligado há","vp":"Alimentação das válvulas","w_dir":"Direção","w_gust":"Rajada","w_spd":"Velocidade","w_thr_g":"Limiar rajada","w_thr_u":"Limiar média (10 min)","wd_e":"E","wd_n":"N","wd_ne":"NE","wd_nw":"NO","wd_s":"S","wd_se":"SE","wd_sw":"SO","wd_w":"O","wfb_chip":"Wi-Fi de reserva","wifi":"Wi-Fi","wind_h":"Vento","wind_ign":"Ignorar vento","wind_over_nx":"Vento acima do limiar: os próximos inícios programados esperam que baixe.","wp":"Pausa por vento","ws_now":"Hora do telemóvel","ww":"À espera que o vento baixe","wx":"Meteo","wx_7":"7 dias","wx_g":"Gráficos","wx_s":"Sensores","x_30d":"30 dias","x_close_q":"Fechar todas as válvulas?","x_device":"Dispositivo","x_diag":"Diagnóstico","x_end":"termina","x_feed_stale":"A estação meteorológica não atualiza","x_feed_unpaired":"Estação meteorológica não emparelhada","x_fwm":"Atualizações de firmware","x_fwsrc":"Origem das atualizações","x_irrigation":"Rega","x_last_ev":"Último evento","x_log":"Eventos","x_no":"Não","x_no_dev":"Nenhum dispositivo Irry encontrado no Home Assistant.","x_no_svc":"Ações Irry não encontradas: atualize o firmware do dispositivo e recarregue a integração ESPHome","x_pressure":"Pressão","x_pt":"Cultura","x_restart_q":"Reiniciar o dispositivo?","x_saving":"A guardar…","x_station":"Estação","x_sun":"Sol","x_tsrc":"Origem da hora","x_tvalid":"Hora válida","x_un_auto":"Automáticas (fuso horário)","x_unav":"Indisponível","x_wd_collecting":"A recolher dados meteorológicos","x_wd_ene":"ENE","x_wd_ese":"ESE","x_wd_fallback":"Dados meteorológicos parciais: valores de recurso em uso","x_wd_missing":"Dados meteorológicos em falta","x_wd_nne":"NNE","x_wd_nnw":"NNO","x_wd_sse":"SSE","x_wd_ssw":"SSO","x_wd_wnw":"ONO","x_wd_wsw":"OSO","x_wdata":"Dados meteorológicos","x_wifi_fb":"Ligado ao Wi-Fi de reserva","x_wifi_pri":"Principal","x_wind_over":"Vento acima do limite","x_wind_res":"Retoma após o vento","x_wsrc":"Fonte meteorológica","x_yes":"Sim","x_zf":"Fator da zona","x_zname":"Nome da zona","z_man":"Aberta manualmente","z_off":"Sem programa","z_wind":"Pausa por vento · retoma às {time}","zones":"Zonas"}};

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
};
// Text sensor states -> text keys.
const STATE = {
  method: { none: K('m_off'), hargreaves: K('m_harg'), fao56: K('m_fao') },
  wdata: { off: K('m_off'), missing: K('x_wd_missing'), collecting: K('x_wd_collecting'), fallback: K('x_wd_fallback'), ok: K('ok') },
  feed: { none: K('m_none'), unpaired: K('m_eco_none'), stale: K('x_feed_stale'), ok: K('ok') },
  wpause: { off: K('m_none'), waiting: K('ww'), paused: K('wp') },
  tsrc: { NTP: K('ntp'), RTC: K('rtc'), PHONE: K('ws_now') },
  wifi: { primary: K('x_wifi_pri'), fallback: K('wfb_chip'), none: K('m_none') },
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
};
// Device units per quantity: [metric, imperial] = [unit, decimals]
const DEV = {
  t: [['°C', 1], ['°F', 1]], w: [['km/h', 1], ['mph', 1]], p: [['hPa', 1], ['inHg', 2]],
  r: [['mm', 1], ['in', 2]], rr: [['mm/h', 1], ['in/h', 2]],
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
    case 'method': case 'wdata': case 'feed': case 'wpause': case 'tsrc': case 'wifi': return map(STATE[f]);
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
function rows(m, list, x = {}) {
  const r = list.filter((e) => e && (e.head || m.E(e.k))).map((e) => {
    const o = e.head ? { ...e } : { ...e, entity: m.E(e.k) };
    delete o.k;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return o;
  });
  const out = r.filter((e, i) => !e.head || (r[i + 1] && !r[i + 1].head));
  return out.some((e) => !e.head) ? { type: 'custom:irry-rows-card', device: m.dev.id, rows: out, grid_options: { columns: 'full' }, ...x } : null;
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
          { head: t('x_device') },
          { k: 'restart', name: t('restart_b'), confirm: t('x_restart_q'), edit: true },
        ]),
      ]),
    ],
  };
}

const VIEWS = { status: statusView, irrigation: irrigationView, weather: weatherView, settings: settingsView };
class IrryViewStrategy {
  static view(kind, config, hass) {
    const t = tr(lang(hass, config)), m = irryModel(hass, config && config.device);
    if (!m) return noDevice(t);
    return VIEWS[kind](m, t, config || {});
  }
}
class IrryStatusStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('status', c, h); } }
class IrryIrrigationStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('irrigation', c, h); } }
class IrryWeatherStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('weather', c, h); } }
class IrrySettingsStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('settings', c, h); } }
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
  'irrigation_overlap_warning', 'firmware_update_status', 'wi_fi_network', 'wi_fi_fallback_active', 'units'];
function alerts(m, c) {
  const t = c.t, st = m.st, A = [], add = (type, text) => A.push([type, text]);
  const f = (k) => { const s = m.so(k); return s ? fmtState('', s, c) : ''; };
  if (st('zone_active') === 'unavailable') return [['error', t('offline')]];
  const za = st('zone_active');
  if (za && za !== '-' && !BAD.includes(za)) add('info', `${t('now_run')}: ${za}`);
  if (st('programs_paused') === 'on') add('warning', t('paused'));
  if (st('rain_skip_active') === 'on') add('warning', `${t('rainskip')}: ${f('rain_last_24h')} ≥ ${f('rain_skip_threshold')}. ${t('rainskip_sh')}`);
  const wp = st('wind_pause');
  if (wp === 'waiting') add('warning', t('ww'));
  if (wp === 'paused') {
    const rs = st('wind_resume');
    add('warning', rs && !BAD.includes(rs) ? `${t('wp')} · ${t('z_wind', { time: fmtTime(rs, c) })}` : t('wp'));
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
  signature() {
    const m = this._m;
    if (!m) return 'none';
    return JSON.stringify([this._l, m.imp, m.zones.map(m.label), BANNER_KEYS.map((k) => { const s = m.so(k); return s && [s.state, s.attributes.unit_of_measurement]; })]);
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
    for (const r of this._c.rows || []) ids.push(r.entity, r.ref, ...(r.refs || []));
    return JSON.stringify([this._l, this._m.imp, this._m.zones.map(this._m.label),
      ids.map((i) => { const s = i && h.states[i]; return s && [s.state, s.attributes.unit_of_measurement]; })]);
  }
  paint() {
    const r = this.shadowRoot, c = this.ctx(), t = this._t, h = this._h;
    if (!this._m) return this.noDev();
    const avail = (row) => ((h.states[row.ref] || {}).state || '').match(/^(\S+) available/);
    const list = (this._c.rows || []).map((row, i) => ({ row, i, s: row.entity && h.states[row.entity] }))
      .filter(({ row, s }) => row.head || (s && !(row.hide_empty && (BAD.includes(s.state) || s.state === '-'))))
      .filter(({ row }) => row.fmt !== 'fwgo' || avail(row));
    const html = [];
    list.forEach(({ row, i, s }, j) => {
      if (row.head) {
        if (list[j + 1] && !list[j + 1].row.head) html.push(`<div class="h">${esc(row.head)}</div>`);
        return;
      }
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
    return null;
  }
  async write(row, el) {
    const h = this._h, s = h.states[row.entity], dom = row.entity.split('.')[0], target = { entity_id: row.entity };
    try {
      if (dom === 'switch' || dom === 'input_boolean') await h.callService(dom, el.checked ? 'turn_on' : 'turn_off', {}, target);
      else if (dom === 'select') await h.callService('select', 'select_option', { option: el.value }, target);
      else if (dom === 'text') await h.callService('text', 'set_value', { value: el.value }, target);
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

const def = (n, c) => customElements.get(n) || customElements.define(n, c);
def('ll-strategy-dashboard-irry-the-seven', IrryDashboardStrategy);
def('ll-strategy-view-irry-status', IrryStatusStrategy);
def('ll-strategy-view-irry-irrigation', IrryIrrigationStrategy);
def('ll-strategy-view-irry-weather', IrryWeatherStrategy);
def('ll-strategy-view-irry-settings', IrrySettingsStrategy);
def('irry-banner-card', IrryBannerCard);
def('irry-rows-card', IrryRowsCard);
def('irry-slot-card', IrrySlotCard);
def('irry-rapid-card', IrryRapidCard);
window.customCards = window.customCards || [];
window.customCards.push(
  { type: 'irry-rapid-card', name: 'Irry Rapid', description: 'Same start and duration, zones one after another' },
  { type: 'irry-slot-card', name: 'Irry zone slots', description: 'The three slots of one zone (zone: N), saved on change' },
  { type: 'irry-banner-card', name: 'Irry status', description: 'Alerts of the Irry device in the user language' },
  { type: 'irry-rows-card', name: 'Irry rows', description: 'Irry entities with translated names, states and device units' },
);
console.info(`%c IRRY THE SEVEN %c ${IRRY_VERSION} `, 'background:#2e7d32;color:#fff', '');
if (typeof module !== 'undefined') {
  module.exports = { irryModel, statusView, irrigationView, weatherView, settingsView, alerts, tr, slug, errText, ovlText,
    eventText, fwText, fmtState, devValue, toUnit, I18N };
}
})();
