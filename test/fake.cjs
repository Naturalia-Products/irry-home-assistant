// Fake hass for the tests: one ws device, entity names, attributes and example states from the shared fixture
// entities.json (the firmware's own list), then the scenario states below.
// getData[what] is the j of the "get" action; ws[] records the callWS messages.
const fs = require('fs'),
  path = require('path');
const FIX = fs.existsSync(path.join(__dirname, 'fixtures'))
  ? path.join(__dirname, 'fixtures')
  : path.join(__dirname, '..', '..', 'tests', 'fixtures');
const ENT = JSON.parse(fs.readFileSync(path.join(FIX, 'entities.json'), 'utf8')).domains;
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
// ESPHome platform -> HA domain (datetime by its type).
const domOf = (kind, e) =>
  kind === 'text_sensor'
    ? 'sensor'
    : kind === 'datetime'
      ? e.type === 'DATE'
        ? 'date'
        : 'time'
      : kind;
const ATTR = {
  options: 'options',
  unit_of_measurement: 'unit_of_measurement',
  device_class: 'device_class',
  min_value: 'min',
  max_value: 'max',
  step: 'step',
};
// dev / devName / mac / node: identity of the device (fakeMulti merges several); zones: the zones beyond it are left out
// (their labels kept); noWeather drops the weather sensors.
function fakeHass({
  prefix = 'network_irry_the_seven_8dee48',
  zones = 7,
  lang = 'it',
  r8,
  dev = 'dev1',
  devName = 'Irry The Seven 8dee48',
  mac = 'aa:bb:cc:8d:ee:48',
  node = 'it7ws_8dee48',
  noWeather = false,
} = {}) {
  const entities = {},
    states = {};
  for (const [kind, list] of Object.entries(ENT))
    for (const e of list) {
      const zn = /^Zone (\d+) (.*)$/.exec(e.name);
      if (zn && +zn[1] > zones && zn[2] !== 'Label') continue;
      if (noWeather && kind === 'sensor' && e.name.startsWith('Weather ')) continue;
      const id = `${domOf(kind, e)}.${prefix}_${slug(e.name)}`,
        attributes = {};
      for (const [k, a] of Object.entries(ATTR)) if (e[k] !== undefined) attributes[a] = e[k];
      entities[id] = { entity_id: id, device_id: dev, name: e.name, platform: 'esphome' };
      states[id] = { entity_id: id, state: e.example, attributes };
    }
  const set = (name, state, attributes = {}) => {
    const id = Object.keys(entities).find((i) => entities[i].name === name);
    if (!id && noWeather && name.startsWith('Weather ')) return;
    if (!id) throw new Error('no entity ' + name);
    states[id] = { entity_id: id, state, attributes: { ...states[id].attributes, ...attributes } };
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
  set('Zone 1 S1 Days Mode', 'Weekdays', {
    options: ['Weekdays', 'Even days', 'Odd days', 'Every N days'],
  });
  set('Zone 2 S1 Days Mode', 'Every N days', {
    options: ['Weekdays', 'Even days', 'Odd days', 'Every N days'],
  });
  set('Zone 2 S1 Every N Days', '3.0');
  set('Zone 2 S1 Every N From', '2026-11-02');
  // Zone 3: even days 23:50 for 30 min (tail after midnight); zone 4: odd days 07:00 for 5 min.
  set('Zone 3 S1 Start', '23:50:00');
  set('Zone 3 S1 Duration', '30.0');
  set('Zone 3 S1 Enable', 'on');
  set('Zone 3 S1 Days Mode', 'Even days', {
    options: ['Weekdays', 'Even days', 'Odd days', 'Every N days'],
  });
  set('Zone 4 S1 Start', '07:00:00');
  set('Zone 4 S1 Duration', '5.0');
  set('Zone 4 S1 Enable', 'on');
  set('Zone 4 S1 Days Mode', 'Odd days', {
    options: ['Weekdays', 'Even days', 'Odd days', 'Every N days'],
  });
  set('Units', 'Auto', { options: ['Auto', 'Metric', 'Imperial'] });
  set('Zone 1 Plant Type', 'Cool-season lawn', {
    options: [
      'Cool-season lawn',
      'Warm-season lawn',
      'Beds, shrubs, hedges',
      'Vegetable garden',
      'Trees, orchard',
      'Mediterranean, low water',
      'Not adapted',
    ],
  });
  set('Aux Mode', 'Sync', { options: ['On', 'Off', 'Last', 'Sync'] });
  set('Weather Wind Speed', '12.6', { unit_of_measurement: 'km/h', device_class: 'wind_speed' });
  set('Wind Mean 10 min', '3.5', { unit_of_measurement: 'm/s' });
  set('Wind Mean Threshold', '5.0', { unit_of_measurement: 'm/s', min: 0, max: 25.5, step: 0.1 });
  set('Weather Wind Direction', '200', { unit_of_measurement: '°' });
  set('Weather Temperature', '18.4', { unit_of_measurement: '°C' });
  set('Weather Pressure', '1013.2', { unit_of_measurement: 'hPa' });
  set('Irrigation Method', 'FAO-56', { options: ['None', 'Hargreaves', 'FAO-56'] });
  set('Firmware Update Status', '3.0.1 available');
  set('Last Event', 'Rapid S1: 3 zones');
  set('Next Irrigation', '2026-11-04T05:00:00+00:00');
  set('Zone Active', '-');
  set('Irrigation Reference ET0', '5.0', { unit_of_measurement: 'mm', min: 3, max: 8, step: 0.1 });
  set('Latitude', '43.7696', { unit_of_measurement: '°' });
  set('Position Source', 'home_assistant');
  set('RTC', 'valid');
  set('Time Zone', 'Europe/Rome');
  // Problems '' = all OK; Zone N Next Start (timestamp) unknown = no start.
  set('Problems', '');
  // The control rules of these states (Aux in Sync, nothing sounding, no zone, no wind pause).
  // Login limiter and HTTPS: one address banned for 60 s after a sixth wrong password.
  set('Security Login Lockout', 'on');
  set('Security Active Bans', '1');
  set('Security Failed Logins', '6');
  set('Security Last Event', '43 lock admin 192.168.1.23 60');
  set('Security Ban List', '192.168.1.23 until 10:42');
  set(
    'TLS Key Fingerprint',
    Array.from({ length: 32 }, (_, i) =>
      (i * 7 + 16).toString(16).toUpperCase().padStart(2, '0'),
    ).join(':'),
  );
  set(
    'TLS Certificate Fingerprint',
    Array.from({ length: 32 }, (_, i) =>
      (i * 5 + 32).toString(16).toUpperCase().padStart(2, '0'),
    ).join(':'),
  );
  set('Blocked Controls', 'aux:aux_sync,silence:none,closeall:none,windign:nowind');
  set('Weather Fallback', '');
  set('Weather Days Used', '3');
  for (let n = 1; n <= zones; n++) set(`Zone ${n} Next Start`, 'unknown');
  // R8 Mode not published yet unless the test asks (the strategy then shows zone 7 and Aux, as the tests expect).
  set('R8 Mode', r8 || 'unknown');
  set('Alarm Sound', 'Quiet Hours', { options: ['Off', 'On', 'Quiet Hours'] });
  return {
    language: lang,
    locale: { language: lang },
    config: { time_zone: 'Europe/Rome' },
    devices: {
      [dev]: {
        id: dev,
        name: devName,
        manufacturer: 'Irry',
        model: 'it7ws',
        sw_version: '3.0.0 (ESPHome 2026.10.0)',
        connections: [['mac', mac]],
      },
      dev2: { id: 'dev2', name: 'Other', manufacturer: 'Espressif', model: 'x' },
    },
    entities,
    states,
    services: {
      esphome: {
        [`${node}_rapid`]: {},
        [`${node}_set_slot`]: {},
        [`${node}_get`]: {},
        [`${node}_zone`]: {},
        other_rapid: {},
      },
    },
    calls: [],
    ws: [],
    getData: {},
    callService(domain, service, data, target, notify = true) {
      this.calls.push({ domain, service, data, target, notify });
      return this.fail ? Promise.reject(new Error(this.fail)) : Promise.resolve();
    },
    // A service with return_response: { context, response: { j } }; getData keys "what/arg" or "what".
    callWS(q) {
      this.ws.push(q);
      if (q.type === 'lovelace/resources') return Promise.resolve(this.resources || []);
      if (q.type === 'history/history_during_period') return Promise.resolve(this.history || {});
      const d = q.service_data || {},
        j = this.getData[`${d.what}/${d.arg}`] ?? this.getData[d.what] ?? null;
      return Promise.resolve({ context: {}, response: { j } });
    },
  };
}
// Several Irry devices in one hass: fakeHass of each option set, registries and actions merged (the first is the base).
function fakeMulti(list, common = {}) {
  const hs = list.map((o) => fakeHass({ ...common, ...o })),
    h = hs[0];
  for (const x of hs.slice(1)) {
    Object.assign(h.entities, x.entities);
    Object.assign(h.states, x.states);
    Object.assign(h.devices, x.devices);
    Object.assign(h.services.esphome, x.services.esphome);
  }
  return h;
}
module.exports = { fakeHass, fakeMulti };
