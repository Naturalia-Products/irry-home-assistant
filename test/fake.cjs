// Fake hass for the tests: one ws device (x8: no buzzer entities), 7 zones, entity names as the firmware publishes them.
// getData[what] is the j of the "get" action; ws[] records the callWS messages.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
function fakeHass({ prefix = 'network_irry_the_seven_8dee48', zones = 7, lang = 'it', x8 = false } = {}) {
  const names = {
    binary_sensor: ['Rain Skip Active', 'Rain Value Valid', 'Time Valid', 'Valve Power', 'Weather Battery', 'Weather Water Leak', 'Wi-Fi Fallback Active',
      'Wind Over Threshold'],
    button: ['Close All Zone Valves', 'Find Device', 'Firmware Check', 'Firmware Install', 'Ignore Wind', 'Irrigation Calibrate', 'Restart'],
    number: ['Aux Off Delay', 'Aux On Delay', 'Irrigation Reference ET0', 'Manual Max Duration', 'Rain Skip Threshold', 'Wind Gust Threshold', 'Wind Mean Threshold'],
    select: ['Aux Mode', 'Firmware Update Mode', 'R8 Mode', 'Units'],
    sensor: ['Irrigation ET0 Yesterday', 'Irrigation Factor', 'Rain Last 24h', 'Uptime', 'Weather Humidity', 'Weather Indoor Humidity',
      'Weather Indoor Temperature', 'Weather Pressure', 'Weather Pressure Sea Level', 'Weather Rain Event', 'Weather Rain Rate',
      'Weather Rain Today', 'Weather Solar Radiation', 'Weather Temperature', 'Weather UV Index', 'Weather Wind Direction',
      'Weather Wind Gust', 'Weather Wind Speed', 'Wi-Fi Signal', 'Wind Mean 10 min', 'Latitude', 'Longitude', 'Altitude',
      'Weather Soil Moisture 1', 'Weather Soil Moisture 2', 'Weather Soil Moisture 3', 'Weather Soil Moisture 4',
      'Weather Lightning Distance', 'Weather Lightning Count', 'Weather PM2.5'],
    switch: ['Aux', 'Programs Paused'],
    text: ['Aux Label', 'Rain Attribute', 'Rain Entity', 'Sequence Order', 'Weather Prefix'],
    text_sensor: ['Firmware Source', 'Firmware Update Status', 'IP Address', 'Irrigation Method', 'Irrigation Overlap Warning',
      'Last Event', 'Next Irrigation', 'Time Source', 'Weather Data', 'Weather Feed', 'Weather Last Update', 'Wi-Fi Network',
      'Wind Pause', 'Wind Resume', 'Zone Active', 'Wind Paused Zones', 'Wind Waiting Zones', 'Wind Skip At', 'Next Sheltered Start',
      'Next Sheltered Zone', 'Position Source', 'Altitude Source', 'Time Zone', 'RTC', 'Firmware Last Check'],
    time: [], date: [],
  };
  if (!x8) { names.select.push('Alarm Sound'); names.time.push('Quiet From', 'Quiet To'); names.button.push('Silence Alarm'); }
  for (let n = 1; n <= 7; n++) names.text.push(`Zone ${n} Label`);
  for (let n = 1; n <= zones; n++) {
    const z = `Zone ${n}`;
    names.switch.push(`${z} Manual`, `${z} Sheltered from Rain`, `${z} Sheltered from Wind`);
    names.sensor.push(`${z} Irrigation Factor`);
    names.select.push(`${z} Plant Type`);
    names.text_sensor.push(`${z} End`);
    for (let s = 1; s <= 3; s++) {
      names.switch.push(`${z} S${s} Enable`, `${z} S${s} All Days`, ...['1-Mon', '2-Tue', '3-Wed', '4-Thu', '5-Fri', '6-Sat', '7-Sun'].map((d) => `${z} S${s} ${d}`));
      names.number.push(`${z} S${s} Duration`, `${z} S${s} Every N Days`);
      names.select.push(`${z} S${s} Days Mode`);
      names.time.push(`${z} S${s} Start`);
      names.date.push(`${z} S${s} Every N From`);
    }
  }
  const dom = { text_sensor: 'sensor', time: 'time', date: 'date' };
  const entities = {}, states = {};
  for (const [kind, list] of Object.entries(names)) for (const name of list) {
    const id = `${dom[kind] || kind}.${prefix}_${slug(name)}`;
    entities[id] = { entity_id: id, device_id: 'dev1', name, platform: 'esphome' };
    states[id] = { entity_id: id, state: kind === 'text' ? '' : 'off', attributes: {} };
  }
  const set = (name, state, attributes = {}) => {
    const id = Object.keys(entities).find((i) => entities[i].name === name);
    if (!id) throw new Error('no entity ' + name);
    states[id] = { entity_id: id, state, attributes };
  };
  set('Zone 1 Label', 'Prato');
  set('Zone 2 Label', '');
  set('Zone 1 S1 Start', '06:00:00');
  set('Zone 1 S1 Duration', '10.0');
  set('Zone 1 S1 Enable', 'on');
  set('Zone 1 S1 1-Mon', 'on');
  set('Zone 1 S1 3-Wed', 'on');
  set('Zone 2 S1 Start', '06:10:00');
  set('Zone 2 S1 Duration', '15.0');
  set('Zone 2 S1 Enable', 'on');
  set('Zone 1 S1 Days Mode', 'Weekdays', { options: ['Weekdays', 'Even days', 'Odd days', 'Every N days'] });
  set('Zone 2 S1 Days Mode', 'Every N days', { options: ['Weekdays', 'Even days', 'Odd days', 'Every N days'] });
  set('Zone 2 S1 Every N Days', '3.0');
  set('Zone 2 S1 Every N From', '2026-11-02');
  // Zone 3: even days 23:50 for 30 min (tail after midnight); zone 4: odd days 07:00 for 5 min.
  set('Zone 3 S1 Start', '23:50:00');
  set('Zone 3 S1 Duration', '30.0');
  set('Zone 3 S1 Enable', 'on');
  set('Zone 3 S1 Days Mode', 'Even days', { options: ['Weekdays', 'Even days', 'Odd days', 'Every N days'] });
  set('Zone 4 S1 Start', '07:00:00');
  set('Zone 4 S1 Duration', '5.0');
  set('Zone 4 S1 Enable', 'on');
  set('Zone 4 S1 Days Mode', 'Odd days', { options: ['Weekdays', 'Even days', 'Odd days', 'Every N days'] });
  set('Units', 'Auto', { options: ['Auto', 'Metric', 'Imperial'] });
  set('Zone 1 Plant Type', 'Cool-season lawn', { options: ['Cool-season lawn', 'Warm-season lawn', 'Beds, shrubs, hedges',
    'Vegetable garden', 'Trees, orchard', 'Mediterranean, low water', 'Not adapted'] });
  set('Aux Mode', 'Sync', { options: ['On', 'Off', 'Last', 'Sync'] });
  set('Weather Wind Speed', '12.6', { unit_of_measurement: 'km/h', device_class: 'wind_speed' });
  set('Wind Mean 10 min', '3.5', { unit_of_measurement: 'm/s' });
  set('Wind Mean Threshold', '5.0', { unit_of_measurement: 'm/s', min: 0, max: 25.5, step: 0.1 });
  set('Weather Wind Direction', '200', { unit_of_measurement: '°' });
  set('Weather Temperature', '18.4', { unit_of_measurement: '°C' });
  set('Weather Pressure', '1013.2', { unit_of_measurement: 'hPa' });
  set('Irrigation Method', 'fao56');
  set('Firmware Update Status', '2.4.1 available');
  set('Last Event', 'Rapid S1: 3 zones');
  set('Next Irrigation', '2026-11-04T05:00:00+00:00');
  set('Zone Active', '-');
  set('Irrigation Reference ET0', '5.0', { unit_of_measurement: 'mm', min: 3, max: 8, step: 0.1 });
  set('Latitude', '43.7696', { unit_of_measurement: '°' });
  set('Position Source', 'home_assistant');
  set('RTC', 'valid');
  set('Time Zone', 'Europe/Rome');
  if (!x8) set('Alarm Sound', 'Quiet Hours', { options: ['Off', 'On', 'Quiet Hours'] });
  return {
    language: lang, locale: { language: lang }, config: { time_zone: 'Europe/Rome' },
    devices: {
      dev1: { id: 'dev1', name: 'Irry The Seven 8dee48', manufacturer: 'Irry', model: 'it7ws', connections: [['mac', 'aa:bb:cc:8d:ee:48']] },
      dev2: { id: 'dev2', name: 'Other', manufacturer: 'Espressif', model: 'x' },
    },
    entities, states,
    services: { esphome: { it7ws_8dee48_rapid: {}, it7ws_8dee48_set_slot: {}, it7ws_8dee48_get: {}, other_rapid: {} } },
    calls: [], ws: [], getData: {},
    callService(domain, service, data) { this.calls.push({ domain, service, data }); return this.fail ? Promise.reject(new Error(this.fail)) : Promise.resolve(); },
    // A service with return_response: { context, response: { j } }; getData keys "what/arg" or "what".
    callWS(q) {
      this.ws.push(q);
      if (q.type === 'lovelace/resources') return Promise.resolve(this.resources || []);
      const d = q.service_data || {}, j = this.getData[`${d.what}/${d.arg}`] ?? this.getData[d.what] ?? null;
      return Promise.resolve({ context: {}, response: { j } });
    },
  };
}
module.exports = { fakeHass };
