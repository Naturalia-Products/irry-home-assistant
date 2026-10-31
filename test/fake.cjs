// Fake hass for the tests: one ws device, 7 zones, entity names as the firmware publishes them.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
function fakeHass({ prefix = 'network_irry_the_seven_8dee48', zones = 7, lang = 'it' } = {}) {
  const names = {
    binary_sensor: ['Rain Skip Active', 'Rain Value Valid', 'Time Valid', 'Valve Power', 'Weather Battery', 'Wi-Fi Fallback Active', 'Wind Over Threshold'],
    button: ['Close All Zone Valves', 'Firmware Check', 'Firmware Install', 'Ignore Wind', 'Restart'],
    number: ['Aux Off Delay', 'Aux On Delay', 'Manual Max Duration', 'Rain Skip Threshold', 'Wind Gust Threshold', 'Wind Mean Threshold'],
    select: ['Aux Mode', 'Firmware Update Mode', 'R8 Mode'],
    sensor: ['Irrigation ET0 Yesterday', 'Irrigation Factor', 'Rain Last 24h', 'Uptime', 'Weather Humidity', 'Weather Indoor Humidity',
      'Weather Indoor Temperature', 'Weather Pressure', 'Weather Pressure Sea Level', 'Weather Rain Event', 'Weather Rain Rate',
      'Weather Rain Today', 'Weather Solar Radiation', 'Weather Temperature', 'Weather UV Index', 'Weather Wind Direction',
      'Weather Wind Gust', 'Weather Wind Speed', 'Wi-Fi Signal', 'Wind Mean 10 min'],
    switch: ['Aux', 'Programs Paused'],
    text: ['Aux Label', 'Rain Attribute', 'Rain Entity', 'Sequence Order', 'Weather Prefix'],
    text_sensor: ['Firmware Source', 'Firmware Update Status', 'IP Address', 'Irrigation Method', 'Irrigation Overlap Warning',
      'Last Event', 'Next Irrigation', 'Time Source', 'Weather Data', 'Weather Feed', 'Weather Last Update', 'Wi-Fi Network',
      'Wind Pause', 'Wind Resume', 'Zone Active'],
    time: [], date: [],
  };
  for (let n = 1; n <= 7; n++) names.text.push(`Zone ${n} Label`);
  for (let n = 1; n <= zones; n++) {
    const z = `Zone ${n}`;
    names.switch.push(`${z} Manual`, `${z} Rain Sheltered`, `${z} Wind Exempt`);
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
  return {
    language: lang, locale: { language: lang },
    devices: {
      dev1: { id: 'dev1', name: 'Irry The Seven 8dee48', manufacturer: 'Irry', model: 'it7ws', connections: [['mac', 'aa:bb:cc:8d:ee:48']] },
      dev2: { id: 'dev2', name: 'Other', manufacturer: 'Espressif', model: 'x' },
    },
    entities, states,
    services: { esphome: { it7ws_8dee48_rapid: {}, it7ws_8dee48_set_slot: {}, other_rapid: {} } },
    calls: [],
    callService(domain, service, data) { this.calls.push({ domain, service, data }); return this.fail ? Promise.reject(new Error(this.fail)) : Promise.resolve(); },
  };
}
module.exports = { fakeHass };
