// node ha/test/test.cjs: dashboard generation against a fake hass, entity references, texts.
global.HTMLElement = class {};
const reg = {};
global.customElements = { get: (n) => reg[n], define: (n, c) => { reg[n] = c; } };
global.window = {};
const path = require('path');
const { fakeHass } = require('./fake.cjs');
const lib = require(path.join(__dirname, '..', 'dist', 'irry-the-seven.js'));
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('FAIL', msg); } };

// Every entity / entity_id value in the generated config must exist in hass.
function refs(o, out = []) {
  if (Array.isArray(o)) o.forEach((x) => refs(x, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
    if ((k === 'entity' || k === 'entity_id') && typeof v === 'string') out.push(v);
    else if (k === 'entities' && Array.isArray(v)) v.forEach((x) => (typeof x === 'string' ? out.push(x) : refs(x, out)));
    else refs(v, out);
  }
  return out;
}
(async () => {
  for (const prefix of ['irry_the_seven_8dee48', 'network_irry_the_seven_8dee48', 'garden_my_irry']) {
    const h = fakeHass({ prefix });
    const d = await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, h);
    ok(d.views.length === 4 && d.views[3].path === 'settings', `${prefix}: 4 views`);
    const r = refs(d);
    const bad = r.filter((e) => !h.states[e]);
    ok(bad.length === 0, `${prefix}: unknown entities ${bad.join(' ')}`);
    ok(r.length > 100, `${prefix}: ${r.length} references`);
    ok(JSON.stringify(d.views[0].sections[0]).includes('irry-banner-card'), `${prefix}: banner card`);
    // No raw firmware name left: every tile and row carries the name in the device words.
    const unnamed = [];
    (function walk(o) {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== 'object') return;
      if (o.type === 'tile' && !o.name) unnamed.push(o.entity);
      if (o.type === 'custom:irry-rows-card') o.rows.forEach((r) => { if (!r.head && !r.name) unnamed.push(r.entity); });
      Object.values(o).forEach(walk);
    })(d);
    ok(unnamed.length === 0, `${prefix}: unnamed ${unnamed.join(' ')}`);
    ok(d.views[0].title === 'Stato', `${prefix}: Italian title ${d.views[0].title}`);
  }
  // Renamed entity: falls back on the entity_id suffix.
  const h = fakeHass();
  const id = Object.keys(h.entities).find((i) => h.entities[i].name === 'Valve Power');
  h.entities[id].name = 'Corrente valvole';
  const m = lib.irryModel(h);
  ok(m.E('valve_power') === id, 'renamed entity by suffix');
  ok(m.E('irrigation_factor') === 'sensor.network_irry_the_seven_8dee48_irrigation_factor', 'shortest suffix wins');
  ok(m.zones.length === 7 && m.label(1) === 'Prato' && m.label(2) === 'Zone 2', 'zones and labels');
  ok(m.action('rapid') === 'it7ws_8dee48_rapid' && m.action('set_slot') === 'it7ws_8dee48_set_slot', 'actions by mac');
  ok(lib.irryModel(fakeHass({ zones: 4 })).zones.length === 4, '4 zones');
  // No device, language override, device option.
  const none = fakeHass(); none.devices = {};
  const dn = await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, none);
  ok(JSON.stringify(dn).includes('Nessun dispositivo Irry'), 'no device message');
  const de = await reg['ll-strategy-dashboard-irry-the-seven'].generate({ language: 'de', device: 'Irry The Seven 8dee48' }, fakeHass());
  ok(de.views[0].title === 'Status' && de.views[1].title === 'Bewässerung', 'language override');
  const v = await reg['ll-strategy-view-irry-weather'].generate({}, fakeHass());
  ok(v.sections.length === 4, 'weather view strategy');
  const sv = await reg['ll-strategy-view-irry-settings'].generate({}, fakeHass());
  ok(sv.sections.length === 7 + 5, 'settings view strategy');
  // Weather view without the station: no weather tab.
  const nw = fakeHass();
  for (const k of Object.keys(nw.entities)) if (/weather_(temperature|wind_speed)$/.test(k)) delete nw.entities[k];
  ok((await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, nw)).views.length === 3, 'no weather view without station');
  // Texts: ICU plural and placeholders.
  const t = lib.tr('it'), te = lib.tr('en');
  ok(t('applied', { slot: 2, count: 1 }) === 'Slot 2 scritto su 1 zona', t('applied', { slot: 2, count: 1 }));
  ok(te('applied', { slot: 2, count: 3 }) === 'Slot 2 written to 3 zones', te('applied', { slot: 2, count: 3 }));
  ok(t('fwn_av', { ver: '2.4.1' }).includes('2.4.1'), 'placeholders');
  for (const l of Object.keys(lib.I18N)) ok(Object.keys(lib.I18N[l]).length === Object.keys(lib.I18N.en).length, `${l} complete`);
  // Firmware error text.
  const e = lib.errText(m, t, 'it', new Error('limit mon 2026-11-02 06:00-06:10 1,2,3,4'));
  ok(e.includes('4 zone') && e.includes('06:00–06:10') && e.includes('Prato, Zone 2, Zone 3, Zone 4'), e);
  ok(lib.errText(m, t, 'it', new Error('limit tue 06:00-06:10 1,2,3,4')).includes('mar'), 'weekday error');
  ok(lib.errText(m, t, 'it', new Error('bad zone')) === 'Errore: bad zone', 'generic error');
  // States and units in the device words.
  const hs = fakeHass(), ms = lib.irryModel(hs), c = { h: hs, m: ms, t, l: 'it' };
  const S = (name) => hs.states[Object.keys(hs.entities).find((i) => hs.entities[i].name === name)];
  const f = (fmt, name) => lib.fmtState(fmt, S(name), c);
  ok(f('', 'Weather Wind Speed') === '12,6 km/h' && f('', 'Wind Mean 10 min') === '12,6 km/h', 'wind in km/h');
  ok(f('plant', 'Zone 1 Plant Type') !== 'Cool-season lawn' && f('aux', 'Aux Mode') !== 'Sync', 'select options translated');
  ok(f('method', 'Irrigation Method') === t('m_fao') && f('fw', 'Firmware Update Status').includes('2.4.1'), 'states translated');
  ok(f('event', 'Last Event') === t('applied', { slot: 1, count: 3 }), 'last event');
  ok(f('dir', 'Weather Wind Direction').startsWith(t('x_wd_ssw')), f('dir', 'Weather Wind Direction'));
  const pz = S('Programs Paused'); pz.state = 'on';
  ok(lib.fmtState('next', S('Next Irrigation'), c, { ref: pz.entity_id }) === t('paused'), 'next when paused');
  ok(lib.ovlText(ms, t, 'it', '2 zones tue 2026-11-03 06:11-06:20 1,2').includes('Prato'), 'overlap text');
  ok(lib.eventText(ms, t, 'it', 'Set slot Z1 S2 refused: limit').includes('Prato'), 'set slot refused');
  S('Units').state = 'Imperial';
  const mi = lib.irryModel(hs), ci = { ...c, m: mi };
  ok(mi.imp && lib.fmtState('', S('Weather Temperature'), ci) === '65,1 °F' && lib.fmtState('', S('Weather Pressure'), ci) === '29,92 inHg', 'imperial');
  ok(Math.abs(lib.toUnit(11.2, 'mph', 'm/s') - 5.007) < 0.01, 'back to the entity unit');
  ok(lib.alerts(ms, c).some(([, x]) => x === t('paused')), 'banner paused');
  console.log(`test.cjs: ${n} checks, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
