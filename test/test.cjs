// node ha/test/test.cjs: dashboard generation against a fake hass, entity references, texts.
global.HTMLElement = class {};
const reg = {};
const wait = {};
global.customElements = {
  get: (n) => reg[n],
  define: (n, c) => { reg[n] = c; (wait[n] || []).forEach((f) => f()); },
  whenDefined: (n) => (reg[n] ? Promise.resolve() : new Promise((f) => (wait[n] = wait[n] || []).push(f))),
};
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
    ok(d.views.length === 5 && d.views[2].path === 'day' && d.views[4].path === 'settings', `${prefix}: 5 views`);
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
      if (o.type === 'custom:irry-rows-card') o.rows.forEach((r) => { if (!r.head && !r.note && !r.name) unnamed.push(r.entity); });
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
  ok(m.zones.length === 7 && m.label(1) === 'Prato' && m.label(2) === 'Zona 2', 'zones and labels');
  ok(m.action('rapid') === 'it7ws_8dee48_rapid' && m.action('set_slot') === 'it7ws_8dee48_set_slot', 'actions by mac');
  ok(lib.irryModel(fakeHass({ zones: 4 })).zones.length === 4, '4 zones');
  // No device, language override, device option.
  const none = fakeHass(); none.devices = {};
  const dn = await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, none);
  ok(JSON.stringify(dn).includes('Nessun dispositivo Irry'), 'no device message');
  const de = await reg['ll-strategy-dashboard-irry-the-seven'].generate({ language: 'de', device: 'Irry The Seven 8dee48' }, fakeHass());
  ok(de.views[0].title === 'Status' && de.views[1].title === 'Bewässerung', 'language override');
  const v = await reg['ll-strategy-view-irry-weather'].generate({}, fakeHass());
  // Weather and Settings: one section holding the tabs card; tabs[].sections = the former view sections.
  const tabsOf = (vw) => vw.sections.length === 1 && vw.sections[0].cards[0].type === 'custom:irry-tabs-card' ? vw.sections[0].cards[0].tabs : null;
  const cardsOf = (vw) => vw.sections.flatMap((x) => x.cards || []).flatMap((c) => (c.tabs ? c.tabs.flatMap((tb) => tb.sections.flat()) : [c]));
  const wt = tabsOf(v);
  ok(wt && wt.map((x) => x.name).join() === 'Grafici,Attuale,Ecowitt' && wt.map((x) => x.sections.length).join() === '3,2,1', `weather tabs ${JSON.stringify(wt && wt.map((x) => [x.name, x.sections.length]))}`);
  ok(cardsOf(v).some((x) => x.type === 'statistics-graph' && x.hide_legend && !/\(/.test(x.title)), 'rain chart: no legend suffix');
  // windrose-card 2.7 wants exactly one of data_period or an active period_selector button.
  reg['windrose-card'] = class {};
  const vr = await reg['ll-strategy-view-irry-weather'].generate({}, fakeHass());
  const rose = cardsOf(JSON.parse(JSON.stringify(vr))).find((x) => x.type === 'custom:windrose-card');
  const act = rose ? (rose.buttons_config?.buttons || []).filter((x) => x.type === 'period_selector' && x.active).length : -1;
  ok(rose && (!!rose.data_period) !== (act === 1) && act <= 1, `windrose period: data_period ${!!rose?.data_period}, active ${act}`);
  delete reg['windrose-card'];
  // windrose-card listed as a resource but registered after this file: the weather view waits for it.
  const late = fakeHass();
  late.resources = [{ url: '/hacsfiles/windrose-card/windrose-card.js?hacstag=1', type: 'module' }];
  setTimeout(() => customElements.define('windrose-card', class {}), 30);
  const vl = JSON.stringify(await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, late));
  ok(vl.includes('custom:windrose-card'), 'windrose registered late is kept');
  delete reg['windrose-card'];
  const sv = await reg['ll-strategy-view-irry-settings'].generate({}, fakeHass());
  const stb = tabsOf(sv);
  // Initial tab: Grafici by default; a remembered tab is found by id, a stale value (old index) falls back to the default.
  {
    const wc = v.sections[0].cards[0], mem = {}, ls = global.localStorage;
    global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, x) => { mem[k] = String(x); } };
    const tc = new lib.IrryTabsCard(); tc.setConfig(wc);
    const a0 = tc.saved(); mem['irry.tab.weather'] = 'ecowitt'; const a1 = tc.saved(); mem['irry.tab.weather'] = '0'; const a2 = tc.saved();
    global.localStorage = ls;
    ok(wc.default === 'graphs' && wt.map((x) => x.id).join() === 'graphs,now,ecowitt' && a0 === 0 && a1 === 2 && a2 === 0, `weather tab memory ${a0},${a1},${a2}`);
  }
  ok(stb && stb.map((x) => `${x.name}:${x.sections.length}`).join() === 'Zone:7,Meteo:3,Aux:1,Sistema:3', `settings tabs ${stb && stb.map((x) => `${x.name}:${x.sections.length}`)}`);
  ok(JSON.stringify(stb[0].sections[0]).includes('"heading":"Zona 1 · Prato"') && JSON.stringify(stb[0].sections[1]).includes('"heading":"Zona 2"'), 'zone titles: index and name');
  // Weather view without the station: no weather tab.
  const nw = fakeHass();
  for (const k of Object.keys(nw.entities)) if (/weather_(temperature|wind_speed)$/.test(k)) delete nw.entities[k];
  ok((await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, nw)).views.length === 4, 'no weather view without station');
  // Texts: ICU plural and placeholders.
  const t = lib.tr('it'), te = lib.tr('en');
  ok(t('applied', { slot: 2, count: 1 }) === 'Slot 2 scritto su 1 zona', t('applied', { slot: 2, count: 1 }));
  ok(te('applied', { slot: 2, count: 3 }) === 'Slot 2 written to 3 zones', te('applied', { slot: 2, count: 3 }));
  ok(t('fwn_av', { ver: '2.4.1' }).includes('2.4.1'), 'placeholders');
  for (const l of Object.keys(lib.I18N)) ok(Object.keys(lib.I18N[l]).length === Object.keys(lib.I18N.en).length, `${l} complete`);
  // Firmware error text.
  const e = lib.errText(m, t, 'it', new Error('limit mon 2026-11-02 06:00-06:10 1,2,3,4'));
  ok(e.includes('4 zone') && e.includes('06:00–06:10') && e.includes('Prato, Zona 2, Zona 3, Zona 4'), e);
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
  { const u = S('Units').entity_id; hs.states = { ...hs.states, [u]: { ...hs.states[u], state: 'Imperial' } }; }  // HA replaces states
  const mi = lib.irryModel(hs), ci = { ...c, m: mi };
  ok(mi.imp && lib.fmtState('', S('Weather Temperature'), ci) === '65,1 °F' && lib.fmtState('', S('Weather Pressure'), ci) === '29,92 inHg', 'imperial');
  ok(Math.abs(lib.toUnit(11.2, 'mph', 'm/s') - 5.007) < 0.01, 'back to the entity unit');
  ok(lib.alerts(ms, c).some(([, x]) => x === t('paused')), 'banner paused');
  // x8: no buzzer entities, so no alarm section and no Silence Alarm tile, and no reference to them.
  const h8 = fakeHass({ x8: true }), d8 = await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, h8), j8 = JSON.stringify(d8);
  ok(refs(d8).every((e) => h8.states[e]), 'x8: every entity exists');
  ok(!/alarm_sound|quiet_from|silence_alarm/.test(j8) && /find_device/.test(j8), 'x8: no buzzer, Find Device kept');
  const s8 = tabsOf(await reg['ll-strategy-view-irry-settings'].generate({}, h8)).map((x) => x.sections.length).join();
  ok(s8 === '7,3,1,2', `x8: settings without the alarm section ${s8}`);
  ok(lib.I18N.it.x_find_led === 'Il LED lampeggia per 10 s' && !/buzz|cical/i.test(lib.I18N.en.x_find_led + lib.I18N.it.x_find_led), 'x8: Find note without the buzzer');
  const jw = JSON.stringify(await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, fakeHass()));
  ok(/alarm_sound/.test(jw) && /silence_alarm/.test(jw) && /quiet_to/.test(jw), 'ws: alarm entities');
  // Day plan: Mon 2026-11-02 10:00. Zone 1 Mon/Wed 06:00 10 min, zone 2 every 3 days from 11-02 06:10, zone 3 even
  // days 23:50 30 min (tail after midnight), zone 4 odd days 07:00.
  const hd = fakeHass(), md = lib.irryModel(hd), Z = lib.devSlots(md), td = { dn: lib.dnOf('2026-11-02'), m: 600 };
  const L = (D) => D.list.map((x) => `${x.zi + 1}:${lib.hm(x.a)}-${lib.hm(x.b)}${x.tl ? 't' : ''}${x.h ? 'h' : ''}`).join(' ');
  ok((td.dn + 3) % 7 === 0, 'Monday');
  let D = lib.dayModel(Z, 0, td, null, null);
  ok(L(D) === '1:06:00-06:10 2:06:10-06:25 3:23:50-00:00', `day 0: ${L(D)}`);
  ok(D.rows[0].bars.length === 1 && D.rows[0].bars[0].past === 1 && D.rows[2].bars[0].past === 0, 'past hatched');
  ok(L(lib.dayModel(Z, 1, td, null, null)) === '3:00:00-00:20t 4:07:00-07:05', `day 1: ${L(lib.dayModel(Z, 1, td, null, null))}`);
  ok(L(lib.dayModel(Z, 3, td, null, null)) === '3:00:00-00:20t 2:06:10-06:25 4:07:00-07:05', `day 3: ${L(lib.dayModel(Z, 3, td, null, null))}`);
  ok(lib.runs({ dm: 2 }, lib.dnOf('2026-10-31')) === false && lib.runs({ dm: 2 }, lib.dnOf('2026-10-29')), 'odd days skip the 31st');
  // History through the get action: today zone 1 done, zone 2 skipped by rain; yesterday zone 3 by HA past midnight.
  hd.getData[`hist/${td.dn}`] = { d: td.dn, o: td.dn - 10, x: 1, r: [[360, 600, 1, 1, 1, 0], [370, 0, 2, 1, 9, 2]] };
  hd.getData[`hist/${td.dn - 1}`] = { d: td.dn - 1, o: td.dn - 10, x: 0, r: [[1430, 1800, 3, 0, 6, 1]] };
  const jr = await lib.irryGet(hd, md, 'hist', td.dn), jy = await lib.irryGet(hd, md, 'hist', td.dn - 1);
  ok(JSON.stringify(hd.ws[0]) === JSON.stringify({ type: 'call_service', domain: 'esphome', service: 'it7ws_8dee48_get',
    service_data: { what: 'hist', arg: td.dn }, return_response: true }), `get call ${JSON.stringify(hd.ws[0])}`);
  ok(jr.x === 1 && jr.r.length === 2, 'hist reply');
  D = lib.dayModel(Z, 0, td, jr.r, jy.r);
  ok(D.real && L(D) === '3:00:00-00:20th 1:06:00-06:10h 2:06:10-06:10h 3:23:50-00:00', `day 0 with history: ${L(D)}`);
  ok(D.rows[2].bars.some((b) => b.tl && b.c === 0) && D.rows[0].bars[0].c === 1, 'history colours: slot 1, by hand');
  ok(D.rows[0].bars[0].h === 1 && D.rows[2].bars.some((b) => !b.h && !b.tl), 'history bars flagged, plan bars not');
  ok(lib.dayModel(Z, -1, td, jy.r, null).list.length === 1 && lib.dayModel(Z, -5, td, null, null).none, 'past days');
  ok(lib.getCall(lib.irryModel({ ...hd, services: { esphome: {} } }), 'notes') === null, 'no get service');
  // Overlaps: zone 2 every day 06:05 15 min on zone 1 Mon/Wed 06:00 10 min. Today with zone 1 at 50 %: 06:00-06:05,
  // no real overlap (1 with the programmed durations); Wednesday: 1 possible overlap.
  const Zo = JSON.parse(JSON.stringify(Z));
  Object.assign(Zo[1].s[0], { t: 365, dm: 0, m: [1, 1, 1, 1, 1, 1, 1] });
  const Do = lib.dayModel(Zo, 0, td, null, null, [50]);
  ok(Do.ov.length === 0 && Do.ovp.length === 1 && !Do.pos && Do.rows[0].bars[0].b === 365, `overlaps today: ${JSON.stringify([Do.ov, Do.ovp])}`);
  const Dp = lib.dayModel(Zo, 2, td, null, null, [50]);
  ok(Dp.pos && Dp.ov.length === 1 && Dp.ov[0].a === 365 && Dp.ov[0].b === 370, `possible overlaps: ${JSON.stringify(Dp.ov)}`);
  ok(lib.dayModel(Zo, 0, td, null, null).ov.length === 1, 'today with no factor: the programmed durations');
  // Events: start/end pair = one row with the zone name, slot and outcome from the history; slot writes grouped;
  // a skip from the history only; zone numbers in the texts replaced by the names.
  const he = fakeHass(), me = lib.irryModel(he), now = Date.now(), at = (min) => new Date(Math.floor(now / 60e3) * 60e3 - min * 60e3);
  const k0 = lib.devToday(he, at(120)), k9 = lib.devToday(he, at(30));
  const He = { [k0.dn]: [[k0.m, 600, 1, 1, 1, 0]] };
  He[k9.dn] = [...(He[k9.dn] || []), [k9.m, 0, 4, 1, 9, 0]];
  const ev = [{ s: 'Zone 1 avviata per 10 min', at: at(120) }, { s: 'Zone 1 terminata', at: at(110) }, { s: 'Set slot Z1 S1', at: at(100) },
    { s: 'Set slot Z2 S1', at: at(99) }, { s: 'Set slot Z3 S2', at: at(98) }, { s: 'Zone 2 terminata', at: at(60) },
    { s: 'Set slot Z2 S2 refused: limit', at: at(50) }, { s: 'Zone 3 avviata per 5 min', at: at(2) }];
  const EV = lib.evModel(me, t, 'it', he, ev, He).map((x) => `${x.tm} ${x.txt}`);
  const hmA = (min) => lib.hm(lib.devToday(he, at(min)).m);
  const want = [`${hmA(2)}– Zona 3 · ${t('in_prog')}`, `${hmA(30)} Zona 4 · S1 · ${t('h_o9')}`, `${hmA(50)} Zona 2 · ${t('slot')} 2: ${t('e_limit')}`,
    `…–${hmA(60)} Zona 2`, `${hmA(100)}–${hmA(98)} Slot 1, 2 scritti su 3 zone`, `${hmA(120)}–${hmA(110)} Prato · 10 min · S1`];
  ok(JSON.stringify(EV) === JSON.stringify(want), `events model ${JSON.stringify(EV)} != ${JSON.stringify(want)}`);
  // Status: zones as Open / Closed rows, wind thresholds in whole units.
  const sj = await reg['ll-strategy-view-irry-status'].generate({}, fakeHass());
  const zr = sj.sections.flatMap((x) => x.cards).find((x) => x.type === 'custom:irry-rows-card' && x.rows.some((r) => /zone_1_manual$/.test(r.entity)));
  ok(zr && zr.rows.find((r) => /zone_1_manual$/.test(r.entity)).fmt === 'open' && !JSON.stringify(sj).includes('"type":"tile","entity":"switch.network_irry_the_seven_8dee48_zone_1_manual"'), 'status: zones open / closed');
  const hw = fakeHass(), cw = { h: hw, m: lib.irryModel(hw), t, l: 'it' };
  const wr = sj.sections.flatMap((x) => x.cards).flatMap((x) => x.rows || []).find((r) => /wind_mean_10_min$/.test(r.entity));
  ok(lib.fmtState('pair', hw.states[wr.entity], cw, wr) === '12,6 / 18 km/h', `wind pair ${lib.fmtState('pair', hw.states[wr.entity], cw, wr)}`);
  // Ecowitt raw fields: groups, piezo label, battery names, sea-level pressure from the device, unknown fields.
  const ce = { h: hd, m: md, t, l: 'it' };
  const G = lib.ecoGroups(ce, { tempf: '64.4', humidity: '60', baromrelin: '29.9', soilmoisture2: '41', wh65batt: '0',
    soilbatt2: '1.4', drain_piezo: '0.2', PASSKEY: 'x', foo: '1' }, '1013,2 hPa');
  const gh = G.map((x) => x.head), gr = Object.fromEntries(G.filter((x) => x.head !== t('es_g_bat')).flatMap((x) => x.rows));
  const gb = Object.fromEntries(G.find((x) => x.head === t('es_g_bat')).rows);
  ok(gh.includes(t('es_g_soil')) && gh.includes(t('es_g_bat')) && gh[gh.length - 1] === t('es_g_unk'), `eco groups ${gh}`);
  ok(gr[t('m_psl')] === '1013,2 hPa' && gr[`${t('es_sm')} CH2`] === '41 %' && gr.foo === '1' && !gr.PASSKEY, `eco rows ${JSON.stringify(gr)}`);
  ok(gr[t('m_t')] === '18,0 °C' && gr[`${t('es_rd')} · piezo`] === '5,1 mm' && gb[t('m_batt')] === t('m_batt_ok')
    && gb[`${t('es_sm')} CH2`] === '1,40 V', JSON.stringify(gb));
  // Only the extras: a field whose entity has a value is left out; 16-point direction with degrees; UV with no unit.
  const G2 = lib.ecoGroups(ce, { tempf: '64.4', baromrelin: '29.9', drain_piezo: '0.2', winddir: '200', uv: '3' }, '1013,2 hPa',
    (k) => k === 'weather_temperature' || k === 'weather_pressure_sea_level');
  const g2 = Object.fromEntries(G2.flatMap((x) => x.rows));
  ok(!g2[t('m_t')] && !g2[t('m_psl')] && g2[`${t('es_rd')} · piezo`] === '5,1 mm' && g2[t('w_dir')] === `${t('x_wd_ssw')} · 200°`
    && g2[t('es_uv')] === '3', `eco extras ${JSON.stringify(g2)}`);
  // Status: firmware version row, uptime as a duration, value / threshold pairs; x8: Find note for the LED only.
  const js = JSON.stringify(await reg['ll-strategy-view-irry-status'].generate({}, fakeHass()));
  const jg = JSON.stringify(stb[3].sections[1]);
  ok(!js.includes(`"heading":"${t('x_diag')}"`) && !js.includes('"value":"2.5.0"') && js.includes('irry-events-card') && !js.includes('"logbook"'), 'status: no diagnostics, events card');
  ok(jg.includes(`"heading":"${t('x_diag')}"`) && jg.includes('"value":"2.5.0"') && jg.includes('uptime') && JSON.stringify(stb[3].sections[0]).includes('restart'), 'settings Sistema: diagnostics after Device');
  ok(lib.fmtState('dur', { state: '5530', attributes: {} }, c) === `1 ${t('h')} 32 ${t('min')}`, `uptime ${lib.fmtState('dur', { state: '5530', attributes: {} }, c)}`);
  ok(JSON.stringify(await reg['ll-strategy-view-irry-settings'].generate({}, h8)).includes(t('x_find_led'))
    && JSON.stringify(await reg['ll-strategy-view-irry-settings'].generate({}, fakeHass())).includes(t('find_ok')), 'Find note ws / x8');
  // R8 Mode: in Aux mode zone 7 is left out of every view, in Zone 7 mode the Aux items; ws and x8.
  for (const x8 of [false, true]) {
    const tag = x8 ? 'x8' : 'ws';
    const ha = fakeHass({ x8, r8: 'Aux' }), hz = fakeHass({ x8, r8: 'Zone 7' });
    const da = await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, ha), dz = await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, hz);
    const views = async (hh) => { const o = []; for (const k of ['status', 'irrigation', 'day', 'weather', 'settings']) o.push(await reg[`ll-strategy-view-irry-${k}`].generate({}, hh)); return o; };
    const ja = JSON.stringify([da, await views(ha)]), jz = JSON.stringify([dz, await views(hz)]);
    ok(lib.irryModel(ha).zones.join() === '1,2,3,4,5,6' && lib.irryModel(ha).aux && !/zone_7_|"zone":7/.test(ja) && /_aux"|aux_mode/.test(ja), `${tag} Aux mode: no zone 7`);
    ok(lib.irryModel(hz).zones.length === 7 && !lib.irryModel(hz).aux && /zone_7_/.test(jz) && !/_aux"|aux_mode|aux_label|aux_on_delay/.test(jz), `${tag} Zone 7 mode: no Aux`);
    const sa = tabsOf(await reg['ll-strategy-view-irry-settings'].generate({}, ha)).map((x) => `${x.id}:${x.sections.length}`).join();
    const sz = tabsOf(await reg['ll-strategy-view-irry-settings'].generate({}, hz)).map((x) => x.id).join();
    ok(sa === `zones:6,weather:3,aux:1,system:${x8 ? 2 : 3}` && sz === 'zones,weather,system', `${tag} settings tabs ${sa} / ${sz}`);
    ok(lib.ovlText(lib.irryModel(ha), t, 'it', '2 zones tue 2026-11-03 06:11-06:20 6,7').endsWith(lib.irryModel(ha).label(6)), `${tag} overlap text without zone 7`);
  }
  // Irrigation: one tabs card with the "lead" layout, Rapid first, then the zones in order.
  {
    const iv = await reg['ll-strategy-view-irry-irrigation'].generate({}, fakeHass()), ic = iv.sections[0].cards[0];
    ok(iv.sections.length === 1 && ic.type === 'custom:irry-tabs-card' && ic.layout === 'lead' && ic.tabs.length === 1 && ic.tabs[0].sections.length === 8
      && JSON.stringify(ic.tabs[0].sections[0]).includes('irry-rapid-card') && JSON.stringify(ic.tabs[0].sections[7]).includes('"zone":7'), 'irrigation: lead layout, Rapid then Z1..Z7');
  }
  // No empty section or card in any view, on ws and x8.
  for (const hh of [fakeHass(), h8]) for (const k of ['status', 'irrigation', 'day', 'weather', 'settings']) {
    const vv = await reg[`ll-strategy-view-irry-${k}`].generate({}, hh);
    ok(vv.sections.every((x) => x && x.cards.every(Boolean)), `${k}: no empty section or card`);
  }
  // The new cards paint against the fake hass (a stub DOM: catches runtime errors, not the look).
  const el = () => ({ addEventListener() {}, dataset: {}, value: '' });
  global.setInterval = () => 0; global.clearInterval = () => {};
  const hc = fakeHass(), tdc = lib.devToday(hc);
  hc.getData = { hist: { d: tdc.dn, o: tdc.dn - 3, x: 0, r: [[360, 600, 1, 1, 7, 0]] }, ecoraw: { age: 12, f: { tempc: '18', humidity: '50', windspeedkmh: '5', dewpointc: '9' } },
    mhist: { p: 1, rs: 86400, r0: (tdc.dn - 6) * 86400, rn: [0, 1.2, 0, 0, 3.4, 0, 0.2] }, notes: { run: 0, v: '2.4.1', url: 'https://example.com/n' } };
  const evId = lib.irryModel(hc).E('last_event'), nowS = Date.now() / 1000;
  hc.history = { [evId]: [{ s: 'Set slot Z1 S2', lu: nowS - 7200 }, { s: 'Rapid S1: 3 zones', lu: nowS - 60 }] };
  for (const [name, cls] of [['events', lib.IrryEventsCard], ['day', lib.IrryDayCard], ['eco', lib.IrryEcoCard], ['coef', lib.IrryCoefCard], ['cal', lib.IrryCalCard], ['notes', lib.IrryNotesCard]]) {
    const card = new cls(); let html = '';
    card.style = {}; card.dispatchEvent = () => {};
    card.attachShadow = () => { card.shadowRoot = { activeElement: null, set innerHTML(v) { html = v; }, get innerHTML() { return html; },
      querySelector: () => el(), querySelectorAll: () => [el()] }; return card.shadowRoot; };
    try {
      card.setConfig({}); card.hass = hc;
      await new Promise((r) => setImmediate(r));
      card.hass = hc;
      ok(html.length > 0, `${name} card painted`);
      if (name === 'day') ok(html.includes(t('h_o7')) && html.includes('nowl') && html.includes('tlt'), 'day card: badge, now-line, timeline');
      if (name === 'coef') ok(html.includes(t('m_hist')) && html.includes('3,4') && html.includes(t('x_all_zones')), 'coef card: rain of the last days, all zones');
      if (name === 'events') ok(html.includes(t('x_ev_set1', { slots: '2', count: 1 })) && html.includes(t('applied', { slot: 1, count: 3 })) && !html.includes('Rapid S1'), `events card ${html.replace(/<style>[^]*<\/style>/, "")}`);
      if (name === 'notes') ok(html.includes('https://example.com/n'), 'notes card: link');
      if (name === 'eco') ok(html.includes(t('es_g_out')) && html.includes('12 s'), 'eco card: groups and age');
    } catch (e) { ok(false, `${name} card: ${e.stack}`); }
  }
  // ---------------------------------------------------------------- 0.3.x functions: pure helpers and card methods.
  // Card on a stub shadow root: paint() output in html(), controls as plain objects.
  const mk = (cls, cfg, hh) => {
    const card = new cls(); let html = '';
    card.style = {}; card.dispatchEvent = () => {};
    card.attachShadow = () => { card.shadowRoot = { activeElement: null, set innerHTML(v) { html = v; }, get innerHTML() { return html; },
      querySelector: () => el(), querySelectorAll: () => [] }; return card.shadowRoot; };
    card.setConfig(cfg); card.hass = hh;
    return { card, html: () => html };
  };
  const tick = () => new Promise((r) => setImmediate(r));
  const sset = (hh, name, state, attributes) => {
    const id = Object.keys(hh.entities).find((i) => hh.entities[i].name === name);
    hh.states = { ...hh.states, [id]: { entity_id: id, state, attributes: attributes || hh.states[id].attributes } };  // as HA: a new object
  };
  // hacsReady: resources unreadable or with no HACS card listed: no wait.
  {
    const keep = [reg['windrose-card'], reg['mini-graph-card']];
    delete reg['windrose-card']; delete reg['mini-graph-card'];
    const t0 = Date.now();
    await lib.hacsReady({ callWS: () => Promise.reject(new Error('no')) });
    await lib.hacsReady({ callWS: () => Promise.resolve([]) });
    await lib.hacsReady({ callWS: () => Promise.resolve([{ url: '/local/other.js' }]) });
    const hr = fakeHass(); hr.callWS = () => Promise.reject(new Error('no'));
    const vr = JSON.stringify(await reg['ll-strategy-view-irry-weather'].generate({}, hr));
    ok(Date.now() - t0 < 200 && !vr.includes('windrose-card') && vr.includes('irry-tabs-card'), `hacsReady: no resources, no wait (${Date.now() - t0} ms)`);
    if (keep[0]) reg['windrose-card'] = keep[0];
    if (keep[1]) reg['mini-graph-card'] = keep[1];
  }
  // Rows card writes: each domain with its own service, on the row entity; invalid text and a cancelled confirm write nothing.
  {
    const hw2 = fakeHass(), mw = lib.irryModel(hw2), E = mw.E;
    const sw2 = JSON.stringify(await reg['ll-strategy-view-irry-settings'].generate({}, hw2));
    const thr = { entity: E('wind_mean_threshold'), edit: true, int: true };
    const R = [{ entity: E('programs_paused'), edit: true }, { entity: E('units'), edit: true },
      { entity: E('weather_prefix'), edit: true, pat: '^sensor\\.[a-z0-9_]+$' }, { entity: E('quiet_from'), edit: true },
      { entity: E('restart'), edit: true, confirm: 'Restart?' }, thr];
    const { card } = mk(lib.IrryRowsCard, { rows: R }, hw2);
    const fe = (value, x = {}) => ({ value, blur() {}, classList: { add(c) { x.bad = c; } }, ...x });
    const last = () => hw2.calls[hw2.calls.length - 1];
    const W = async (row, e) => { const n0 = hw2.calls.length; await card.write(row, e); return hw2.calls.length > n0 ? last() : null; };
    const cs = [];
    cs.push(await W(R[0], fe('', { checked: true })), await W(R[1], fe('Metric')), await W(R[3], fe('06:30')));
    const bad = {}; const cbad = await W(R[2], fe('Sensor X', bad)), cgood = await W(R[2], fe('sensor.ws_2350'));
    global.window.confirm = () => false; const cno = await W(R[4], fe(''));
    global.window.confirm = () => true; const cyes = await W(R[4], fe(''));
    const sig = (c) => c && `${c.domain}.${c.service} ${JSON.stringify(c.data)} ${c.target && c.target.entity_id}`;
    ok(sig(cs[0]) === `switch.turn_on {} ${E('programs_paused')}` && sig(cs[1]) === `select.select_option {"option":"Metric"} ${E('units')}`
      && sig(cs[2]) === `time.set_value {"time":"06:30:00"} ${E('quiet_from')}`, `rows write: switch, select, time ${cs.map(sig)}`);
    ok(!cbad && bad.bad === 'bad' && sig(cgood) === `text.set_value {"value":"sensor.ws_2350"} ${E('weather_prefix')}`, 'rows write: text pattern');
    ok(!cno && sig(cyes) === `button.press {} ${E('restart')}`, 'rows write: button confirm');
    // Wind thresholds: whole km/h (mph) on screen, written in m/s on the entity step, within its range.
    const ctl = card.control('number', thr, hw2.states[thr.entity], 5, 'x');
    const nv = [];
    for (const v of ['20', '19,5', '200', '-3']) nv.push((await W(thr, fe(v))).data.value);
    const hi2 = fakeHass(); sset(hi2, 'Units', 'Imperial');
    const ci = mk(lib.IrryRowsCard, { rows: [thr] }, hi2).card;
    const ctli = ci.control('number', thr, hi2.states[thr.entity], 0, 'x');
    await ci.write(thr, fe('12'));
    const swr = tabsOf(JSON.parse(sw2)).flatMap((x) => x.sections.flat()).flatMap((x) => x.rows || []).filter((r) => /wind_(mean|gust)_threshold$/.test(r.entity));
    ok(swr.length === 2 && swr.every((r) => r.edit && r.int), 'settings: wind threshold rows edit, whole units');
    ok(ctl.includes('value="18"') && ctl.includes('step="1"') && ctl.includes('km/h') && ctli.includes('value="11"') && ctli.includes('mph'), `wind threshold control ${ctl} / ${ctli}`);
    ok(nv.join() === '5.6,5.4,25.5,0' && hi2.calls[0].data.value === 5.4 && hi2.calls[0].target.entity_id === thr.entity, `wind threshold write ${nv} / ${hi2.calls[0].data.value}`);
  }
  // Conditional rows (B4): the rain entity fields without an Ecowitt feed, the Ecowitt note with one; quiet hours only in that mode.
  {
    const hb = fakeHass(), cfgs = tabsOf(await reg['ll-strategy-view-irry-settings'].generate({}, hb)).flatMap((x) => x.sections.flat())
      .filter((x) => x.type === 'custom:irry-rows-card').flatMap((x) => x.rows);
    const shown = () => cfgs.filter((r) => r.only && lib.rowShown(hb, r)).map((r) => (r.entity ? r.entity.replace(/^.*\./, '') : 'eco_note'));
    sset(hb, 'Weather Feed', 'none'); sset(hb, 'Alarm Sound', 'On'); const s1 = shown().join();
    sset(hb, 'Weather Feed', 'ok'); sset(hb, 'Alarm Sound', 'Quiet Hours'); const s2 = shown().join();
    sset(hb, 'Weather Feed', 'unavailable'); const s3 = shown().join();
    const p = 'network_irry_the_seven_8dee48_';
    ok(s1 === `${p}rain_entity,${p}rain_attribute,${p}weather_prefix` && s2 === `eco_note,${p}quiet_from,${p}quiet_to`
      && s3.startsWith(`${p}rain_entity`), `conditional rows ${s1} / ${s2} / ${s3}`);
    const rc = mk(lib.IrryRowsCard, { rows: cfgs.filter((r) => r.only && r.entity) }, hb);
    ok(rc.html().includes(t('rain_ent')) && rc.html().includes(t('buz_from')), 'conditional rows painted');
  }
  // Effective duration today (B7): the slot duration scaled by the zone factor; nothing when the method does not adapt.
  {
    const he7 = fakeHass(); sset(he7, 'Zone 1 Irrigation Factor', '80');
    const sc = mk(lib.IrrySlotCard, { zone: 1 }, he7).card, e10 = sc.est({ duration: 10 }), e0 = sc.est({ duration: 0 });
    sset(he7, 'Zone 1 Plant Type', 'Not adapted'); const ena = sc.est({ duration: 10 });
    sset(he7, 'Zone 1 Plant Type', 'Cool-season lawn'); sset(he7, 'Irrigation Method', 'none'); const eno = sc.est({ duration: 10 });
    ok(e10.includes(t('x_today_est', { min: 8 })) && e0 === '' && ena === '' && eno === '', `slot effective duration ${e10}|${e0}|${ena}|${eno}`);
  }
  // Rapid card: the zones in use (no zone 7 in Aux mode), move buttons off at the ends, the action data, the limit refusal.
  {
    const hr8 = fakeHass({ r8: 'Aux' }), rp = mk(lib.IrryRapidCard, {}, hr8), rh = rp.html(), rc = rp.card;
    const zs = [...rh.matchAll(/data-zone="(\d)"/g)].map((x) => x[1]).join();
    ok(zs === '1,2,4,3,5,6' && /data-mv="0" data-d="-1" disabled/.test(rh) && /data-mv="5" data-d="1" disabled/.test(rh)
      && !/data-mv="0" data-d="1" disabled/.test(rh) && !/data-mv="5" data-d="-1" disabled/.test(rh), `rapid card zones ${zs}`);
    await rc.go();
    const g1 = hr8.calls[hr8.calls.length - 1];
    rc._v.mode = 'every'; rc._v.every_n = 3; rc._v.from = '2026-11-02'; rc._inc.add(5);
    await rc.go();
    const g2 = hr8.calls[hr8.calls.length - 1];
    hr8.fail = 'limit mon 06:00-06:10 1,2,7';
    await rc.go();
    ok(g1.service === 'it7ws_8dee48_rapid' && g1.data.zones === '1,2,4,3' && g1.data.mode === 'week' && g1.data.days === 'mon,wed'
      && g1.data.every_n === 0 && g1.data.from === '' && g1.data.slot === 1 && g1.data.start === '06:00' && g1.data.duration === 10, `rapid go ${JSON.stringify(g1.data)}`);
    ok(g2.data.zones === '1,2,4,3,5' && g2.data.mode === 'every' && g2.data.every_n === 3 && g2.data.from === '2026-11-02' && g2.data.days === '', `rapid go every ${JSON.stringify(g2.data)}`);
    const lm = rc._msgs.r;
    ok(lm.cls === 'err' && lm.text === lib.errText(lib.irryModel(hr8), t, 'it', new Error(hr8.fail)) && lm.text.includes(t('x_zone_n', { n: 2 })) && !lm.text.includes('7'), `rapid limit ${lm.text}`);
  }
  // Events: slot writes more than 5 min apart are two rows; a zone with no name is "Zona N".
  {
    const hv = fakeHass(), mv = lib.irryModel(hv), now2 = Date.now(), at2 = (min) => new Date(Math.floor(now2 / 60e3) * 60e3 - min * 60e3);
    const E2 = lib.evModel(mv, t, 'it', hv, [{ s: 'Set slot Z1 S1', at: at2(30) }, { s: 'Set slot Z2 S1', at: at2(20) },
      { s: 'Zone 2 avviata per 5 min', at: at2(10) }, { s: 'Zone 2 terminata', at: at2(5) }], {}).map((x) => x.txt);
    ok(E2.length === 3 && E2[0].startsWith(`${t('x_zone_n', { n: 2 })} · `) && E2[1] === E2[2] && E2[1] === t('x_ev_set1', { slots: '1', count: 1 }), `events: separate writes ${JSON.stringify(E2)}`);
  }
  // Day card overlaps: a later day shows the possible ones (dashed), today with the zone factor the real and programmed counts.
  {
    const ho = fakeHass();
    for (const d of ['1-Mon', '2-Tue', '3-Wed', '4-Thu', '5-Fri', '6-Sat', '7-Sun']) { sset(ho, `Zone 1 S1 ${d}`, 'on'); sset(ho, `Zone 2 S1 ${d}`, 'on'); }
    sset(ho, 'Zone 2 S1 Start', '06:05:00'); sset(ho, 'Zone 2 S1 Days Mode', 'Weekdays');
    const dl = mk(lib.IrryDayCard, {}, ho); dl.card._g = 2; dl.card._sig = ''; dl.card.hass = ho; await tick();
    const ph = dl.html();
    sset(ho, 'Zone 1 Irrigation Factor', '50');
    const d0 = mk(lib.IrryDayCard, {}, ho); await tick(); const th = d0.html();
    ok(ph.includes('class="ovw po"') && ph.includes(t('x_ovl_pos', { count: 1 })) && ph.includes(t('x_ovl_poss')), 'day card: possible overlaps on a later day');
    ok(th.includes(`${t('x_ovl_pos', { count: 1 })}, ${t('x_ovl_today', { count: 0 })}`) && !th.includes('class="ovw'), 'day card today: 0 real, 1 programmed');
  }
  // Timeline range: 1 h around the bars on whole hours, at least 4 h, up to 24:00; the whole day with no bar or when asked.
  {
    const R2 = (bars, full) => lib.dayRange(bars, full).join('-');
    ok(R2([{ a: 360, b: 385 }]) === '300-540' && R2([{ a: 1430, b: 1460 }]) === '1200-1440' && R2([]) === '0-1440'
      && R2([{ a: 360, b: 385 }], true) === '0-1440' && R2([{ a: 0, b: 30 }]) === '0-240' && R2([{ a: 300, b: 420 }, { a: 900, b: 960 }]) === '240-1020',
    `day range ${R2([{ a: 360, b: 385 }])} ${R2([{ a: 1430, b: 1460 }])} ${R2([{ a: 0, b: 30 }])} ${R2([{ a: 300, b: 420 }, { a: 900, b: 960 }])}`);
  }
  // Tabs card grid: rows of the lead layout from the number of zones (7: 3 rows, Aux mode 6: 2 rows).
  {
    const gr2 = async (hh) => { const cfg = (await reg['ll-strategy-view-irry-irrigation'].generate({}, hh)).sections[0].cards[0];
      const ls = global.localStorage; global.localStorage = { getItem: () => null, setItem() {} };
      const tc = mk(lib.IrryTabsCard, cfg, hh); global.localStorage = ls; return (tc.html().match(/grid lead" style="--rows:(\d)/) || [])[1]; };
    const g7 = await gr2(fakeHass()), g6 = await gr2(fakeHass({ r8: 'Aux' }));
    ok(g7 === '3' && g6 === '2', `tabs lead rows ${g7} / ${g6}`);
  }
  // R8 Mode with no valid state: both zone 7 and Aux, as with no R8 Mode entity.
  {
    const mu = lib.irryModel(fakeHass({ r8: 'unavailable' }));
    ok(mu.zones.length === 7 && mu.aux, 'R8 Mode unavailable: zone 7 and Aux');
  }
  // Clock and graph decimals: HA profile time format, else the language; decimals of the HA unit.
  {
    const sys = ['h23', 'h24'].includes(new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle);
    ok(lib.hour24({ locale: { time_format: '24', language: 'en' } }) === true && lib.hour24({ locale: { time_format: '12', language: 'it' } }) === false
      && lib.hour24({ locale: { time_format: 'language', language: 'it' } }) === true && lib.hour24({ locale: { time_format: 'language', language: 'en' } }) === false
      && lib.hour24({ locale: { time_format: 'system', language: 'it' } }) === sys && lib.hour24({}) === false, 'hour24');
    const hd2 = fakeHass(); sset(hd2, 'Weather Pressure', '29.92', { unit_of_measurement: 'inHg' }); sset(hd2, 'Weather Pressure Sea Level', '30.01', { unit_of_measurement: 'inHg' }); sset(hd2, 'Weather Humidity', '60', { unit_of_measurement: '%' });
    const md2 = lib.irryModel(hd2);
    const ud = ['weather_temperature', 'weather_pressure', 'weather_humidity', 'weather_wind_speed', 'weather_uv_index'].map((k) => lib.unitDec(md2, k)).join();
    const mg = reg['mini-graph-card']; reg['mini-graph-card'] = class {};
    const wj = JSON.stringify(await reg['ll-strategy-view-irry-weather'].generate({}, hd2));
    if (mg) reg['mini-graph-card'] = mg; else delete reg['mini-graph-card'];
    ok(ud === "1,2,0,1,0" && wj.includes("\"hour24\":true") && wj.includes("\"decimals\":2"), `unit decimals ${ud} ${(wj.match(/"(hour24|decimals)":\w+/g) || []).join()}`);
  }
  // Coefficients (B5): the shared value once, then the zones that differ; zones with no slot enabled left out.
  {
    const hk = fakeHass(), mkm = () => lib.irryModel(hk), L = () => lib.coefLines(mkm(), t, 'it').map((x) => x.join(': ')).join(' | ');
    for (let z = 1; z <= 7; z++) sset(hk, `Zone ${z} Irrigation Factor`, '80');
    const k1 = L();
    sset(hk, 'Zone 2 Irrigation Factor', '90'); const k2 = L();
    [1, 2, 3, 4].forEach((z, i) => sset(hk, `Zone ${z} Irrigation Factor`, String(60 + i * 10))); const k3 = L();
    sset(hk, 'Zone 4 Plant Type', 'Not adapted'); sset(hk, 'Zone 3 Sheltered from Rain', 'on'); const k4 = L();
    ok(k1 === `${t('x_all_zones')}: 80 %`, `coef: one shared value ${k1}`);
    ok(k2 === `${t('x_all_zones')}: 80 % | Zona 2: 90 %`, `coef: one zone differs ${k2}`);
    ok(k3 === 'Prato: 60 % | Zona 2: 70 % | Zona 3: 80 % | Zona 4: 90 %', `coef: all differ, zones with no slot left out ${k3}`);
    ok(k4 === `Prato: 60 % | Zona 2: 70 % | Zona 3: 80 % · ${t('m_sh')} | Zona 4: ${t('m_pt_none')}`, `coef: sheltered, not adapted ${k4}`);
    sset(hk, 'Irrigation Method', 'none');
    const kc = mk(lib.IrryCoefCard, {}, hk); await tick();
    ok(kc.html().includes(t('wx_c_off')) && !kc.html().includes(t('x_all_zones')), 'coef card: method off');
  }
  // Banner wind texts: resume after the window -> the skip; resume inside it -> resume and window end; waiting zones.
  {
    const hwp = fakeHass(), cwp = () => ({ h: hwp, m: lib.irryModel(hwp), t, l: 'it' }), now3 = Date.now();
    const iso = (min) => new Date(now3 + min * 60e3).toISOString();
    sset(hwp, 'Wind Pause', 'paused'); sset(hwp, 'Wind Resume', iso(30.5)); sset(hwp, 'Wind Skip At', iso(20.5)); sset(hwp, 'Wind Paused Zones', '1,2'); sset(hwp, 'Wind Waiting Zones', '');
    const a1 = lib.alerts(lib.irryModel(hwp), cwp()).map((x) => x[1]);
    sset(hwp, 'Wind Skip At', iso(45.5)); const a2 = lib.alerts(lib.irryModel(hwp), cwp()).map((x) => x[1]);
    sset(hwp, 'Wind Pause', 'waiting'); sset(hwp, 'Wind Waiting Zones', '2'); const a3 = lib.alerts(lib.irryModel(hwp), cwp()).map((x) => x[1]);
    const ft = (min) => lib.fmtTime(iso(min), cwp());
    ok(a1.includes([t('wp'), t('wp_skip', { time: ft(20.5) }), t('wp_zs', { list: 'Prato, Zona 2' })].join(' · ')), `banner wind skip ${JSON.stringify(a1)}`);
    ok(a2.some((x) => x.startsWith(`${t('wp')} · `) && x.includes(` · ${t('wp_win', { time: ft(45.5) })}`) && !x.includes(t('wp_skip', { time: ft(45.5) }))), `banner wind resume ${JSON.stringify(a2)}`);
    ok(a3.includes(`${t('ww')} · ${t('ww_zs', { list: 'Zona 2' })}`), `banner wind waiting ${JSON.stringify(a3)}`);
  }
  // Calibration card: painted with the reference ET0, its value written on the entity step, Calibrate pressed.
  {
    const hc2 = fakeHass(), mc = lib.irryModel(hc2), cc = mk(lib.IrryCalCard, {}, hc2), ch = cc.html();
    await cc.card.setEtr({ value: '5,64', blur() {} });
    const st0 = global.setTimeout; global.setTimeout = (f) => { f(); return 0; };
    try { await cc.card.cal(); } finally { global.setTimeout = st0; }
    const [c1, c2] = hc2.calls;
    ok(ch.includes('data-etr') && ch.includes('value="5"') && ch.includes(t('m_cal')), `cal card painted ${ch.length}`);
    ok(c1 && c1.service === 'set_value' && c1.data.value === 5.6 && c1.target.entity_id === mc.E('irrigation_reference_et0')
      && c2 && c2.domain === 'button' && c2.target.entity_id === mc.E('irrigation_calibrate') && cc.card._msg.text === t('saved'), `cal card writes ${JSON.stringify(hc2.calls)}`);
  }
  {
    // Every text key the source names, also through helpers and ternaries, is in the built I18N: a string literal that is
    // a key of the text sources must be inlined. The literals below are state, attribute or unit values, not texts.
    const fs = require('fs'), rd = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'irry-the-seven.js'), 'utf8');
    const dict = { ...rd(path.join(__dirname, '..', '..', 'src', 'ui', 'i18n', 'en.json')), ...(rd(path.join(__dirname, '..', 'i18n.json')).en || {}) };
    const NOT_TEXT = ['n', 'mac', 'in', 'on', 'off', 'restart'];
    const lits = new Set([...src.matchAll(/'([a-z][a-z0-9_]*)'/g)].map((x) => x[1]));
    const miss = [...lits].filter((k) => k in dict && !NOT_TEXT.includes(k) && !(k in lib.I18N.en));
    ok(!miss.length, `keys used in the source but missing from dist I18N: ${miss.join(' ')}`);
    ok(['up', 'x_down', 'prev_week', 'prev_day', 'next_day', 'next_week', 'h_none', 'no_irr', 'e_nodata'].every((k) => lib.I18N.en[k] && lib.I18N.it[k]),
      'indirect keys inlined (en, it)');
    // shouldRegenerate: state changes that generate() reads, and the Irry actions.
    const SR = lib.shouldRegenerate, h0 = fakeHass(), cfg = {};
    const cp = (h) => ({ ...h, states: { ...h.states }, services: { esphome: { ...h.services.esphome } } });
    const h1 = cp(h0); h1.states[Object.keys(h1.states).find((i) => i.endsWith('_weather_temperature'))] = { state: '19.0', attributes: {} };
    ok(SR(cfg, h0, h1) === false, 'shouldRegenerate: an unrelated state change does not regenerate');
    ok(SR(cfg, undefined, h0) === false, 'shouldRegenerate: no previous hass');
    const z = (h, name, v) => { const id = Object.keys(h.entities).find((i) => h.entities[i].name === name); h.states[id] = { ...h.states[id], state: v }; return h; };
    ok(SR(cfg, h0, z(cp(h0), 'Zone 2 Label', 'Orto')) === true, 'shouldRegenerate: zone renamed');
    ok(SR(cfg, h0, z(cp(h0), 'R8 Mode', 'Aux')) === true, 'shouldRegenerate: R8 Mode');
    ok(SR(cfg, h0, z(cp(h0), 'Aux Label', 'Pompa')) === true, 'shouldRegenerate: Aux name');
    const h2 = cp(h0); delete h2.services.esphome.it7ws_8dee48_get;
    ok(SR(cfg, h0, h2) === true, 'shouldRegenerate: Irry actions changed');
    ok(SR({ device: 'nope' }, h0, z(cp(h0), 'Zone 2 Label', 'Orto')) === false, 'shouldRegenerate: other device');
    ok(['IrryDashboardStrategy', 'IrryStatusStrategy', 'IrryIrrigationStrategy', 'IrryDayStrategy', 'IrryWeatherStrategy', 'IrrySettingsStrategy'].every((c) => lib[c] && lib[c].shouldRegenerate === SR),
      'shouldRegenerate on the strategies');
  }

  // ---- 0.3.9: code review 2.5.1
  {
    const nm = (hh, name) => Object.keys(hh.entities).find((i) => hh.entities[i].name === name);
    const put = (hh, name, v) => { const id = nm(hh, name); hh.states = { ...hh.states, [id]: { ...hh.states[id], state: v } }; return hh; };
    const fe = (value, x = {}) => ({ value, blur() {}, classList: { add() {} }, ...x });
    // M-F2: "today" and times on the device clock (Time Zone sensor), HA zone when it is a POSIX string.
    const hz = put(fakeHass(), 'Time Zone', 'America/New_York'), mz = lib.irryModel(hz), at3 = new Date('2026-11-05T03:30:00Z');
    const dz = lib.devToday(mz, at3), dh = lib.devToday(hz, at3);
    ok(mz.tz === 'America/New_York' && dz.dn === lib.dnOf('2026-11-04') && dz.m === 22 * 60 + 30, `device today in its zone ${JSON.stringify(dz)}`);
    ok(dh.dn === lib.dnOf('2026-11-05') && dh.m === 4 * 60 + 30, `bare hass: HA zone ${JSON.stringify(dh)}`);
    ok(lib.fmtTime(at3.toISOString(), { h: hz, m: mz, t, l: 'it' }).includes('22:30'), 'fmtTime in the device zone');
    ok(lib.irryModel(put(fakeHass(), 'Time Zone', 'CET-1CEST,M3.5.0,M10.5.0/3')).tz === 'Europe/Rome', 'POSIX time zone: HA zone');
    ok(lib.irryModel(put(fakeHass(), 'Time Zone', 'unavailable')).tz === 'Europe/Rome', 'no time zone: HA zone');
    // action(): the node of each device, never another device's action.
    const two = (o) => {
      const hh = fakeHass();
      hh.devices = { ...hh.devices, dev3: { id: 'dev3', name: 'Irry Back', manufacturer: 'Irry', connections: [['mac', 'aa:bb:cc:12:34:56']], ...(o.d3 || {}) } };
      if (o.d1) hh.devices.dev1 = { ...hh.devices.dev1, ...o.d1 };
      hh.services = { esphome: Object.fromEntries([...o.nodes.flatMap((p) => ['rapid', 'set_slot', 'get'].map((a) => `${p}_${a}`)), 'other_rapid'].map((k) => [k, {}])) };
      return [lib.irryModel(hh, 'dev1'), lib.irryModel(hh, 'dev3')].map((m) => m && m.action('get'));
    };
    let a2 = two({ nodes: ['it7ws_8dee48', 'it7ws_123456'] });
    ok(a2[0] === 'it7ws_8dee48_get' && a2[1] === 'it7ws_123456_get', `two devices by MAC ${a2}`);
    a2 = two({ nodes: ['it7ws_8dee48', 'backyard'], d3: { configuration_url: 'http://backyard.local:80' } });
    ok(a2[0] === 'it7ws_8dee48_get' && a2[1] === 'backyard_get', `renamed node by its web UI host ${a2}`);
    a2 = two({ nodes: ['front', 'backyard'], d3: { name: 'backyard' } });
    ok(a2[0] === 'front_get' && a2[1] === 'backyard_get', `registry name, then the last one by exclusion ${a2}`);
    a2 = two({ nodes: ['front', 'backyard'], d3: { configuration_url: 'http://192.168.1.20:80' } });
    ok(a2[0] === null && a2[1] === null, `two renamed nodes, no hint: no action ${a2}`);
    const h1n = fakeHass(); h1n.services = { esphome: { garden_rapid: {}, garden_set_slot: {}, garden_get: {}, other_rapid: {} } };
    ok(lib.irryModel(h1n).action('rapid') === 'garden_rapid', 'one device, renamed node');
    // index(): two entities with the same name.
    const hc2 = fakeHass(), vp = nm(hc2, 'Valve Power'), rn = Object.keys(hc2.entities).find((i) => i.endsWith('_rain_last_24h'));
    hc2.entities = { [rn]: { ...hc2.entities[rn], name: 'Valve Power' }, ...hc2.entities };
    hc2.entities[rn] = { ...hc2.entities[rn], name: 'Valve Power' };
    const mc2 = lib.irryModel(hc2);
    ok(rn && mc2.E('valve_power') === vp && mc2.E('rain_last_24h') === rn, `slug collision ${mc2.E('valve_power')} ${mc2.E('rain_last_24h')}`);
    // errText: HA wraps the device message.
    const me = lib.irryModel(fakeHass()), pre = 'Failed to execute the action call it7ws_8dee48_set_slot on Irry The Seven 8dee48: ';
    ok(lib.errText(me, t, 'it', new Error(pre + 'limit')) === t('e_limit') && lib.errText(me, t, 'it', new Error('limit')) === t('e_limit'), 'errText: limit with the HA prefix');
    ok(lib.errText(me, t, 'it', new Error(pre + 'limit mon 06:00-06:10 1,2,3,4')).includes('Prato'), 'errText: limit at, with the HA prefix');
    ok(lib.errText(me, t, 'it', new Error(pre + 'unlimited')).startsWith('Errore'), 'errText: not a limit');
    // Memo: one model per states reference, one translator per language, no signature with the same states.
    const hm2 = fakeHass(), m1 = lib.irryModel(hm2);
    ok(lib.irryModel({ ...hm2 }) === m1 && lib.irryModel({ ...hm2, states: { ...hm2.states } }) !== m1 && lib.tr('it') === lib.tr('it'), 'model and translator memo');
    const rw = mk(lib.IrryRowsCard, { rows: [{ entity: m1.E('units'), edit: true }] }, hm2), rcw = rw.card;
    let sg = 0; const sg0 = rcw.signature.bind(rcw); rcw.signature = () => { sg++; return sg0(); };
    rcw.hass = { ...hm2 }; const sgA = sg;
    rcw.hass = put({ ...hm2 }, 'Units', 'Imperial');
    ok(sgA === 0 && sg === 1, `signature only when states change ${sgA} ${sg}`);
    // Rows: a refused write is shown, the next good one clears it; the entity picker counts as editing.
    const hf = fakeHass(); hf.fail = 'boom';
    const rf = mk(lib.IrryRowsCard, { rows: [{ entity: lib.irryModel(hf).E('units'), edit: true, name: 'Unità' }] }, hf);
    await rf.card.write(rf.card._c.rows[0], fe('Metric'));
    const fh = rf.html(); hf.fail = null;
    await rf.card.write(rf.card._c.rows[0], fe('Metric'));
    ok(/class="msg"[^>]*>Unità: Errore: boom<\/div><\/div>/.test(fh) && /class="msg"[^>]*><\/div>/.test(rf.html()), 'rows: write error at the bottom, then cleared (line kept)');
    rf.card.shadowRoot.activeElement = { tagName: 'HA-SELECTOR' };
    ok(rf.card.busy() === true, 'busy: ha-selector');
    rf.card.shadowRoot.activeElement = null;
    // Rapid: a draft is kept while the card follows labels and R8 Mode.
    const hq = fakeHass({ r8: 'Zone 7' }), rq = mk(lib.IrryRapidCard, {}, hq), cq = rq.card;
    cq._v.duration = 33; cq.changed('r');
    const hq2 = put(put({ ...hq }, 'Zone 1 Label', 'Siepe'), 'R8 Mode', 'Aux');
    cq.hass = hq2;
    ok(rq.html().includes('Siepe') && cq._v.duration === 33 && cq._edit && !cq._order.includes(7) && !/data-zone="7"/.test(rq.html()), 'rapid: draft kept, labels and zones follow');
    // GetCard: an error for a past day is retried after a minute, a reply is kept.
    const hg = fakeHass(); let wsn = 0, bad2 = true;
    hg.callWS = (q) => { wsn++; return bad2 ? Promise.reject(new Error('down')) : Promise.resolve({ response: { j: { d: 1 } } }); };
    const gq = mk(lib.IrryDayCard, {}, hg).card; await tick();
    const w0 = wsn; gq.got('hist', 100, Infinity); await tick(); gq.got('hist', 100, Infinity);
    const w1 = wsn; gq._d['hist/100'].at -= 61e3; bad2 = false; gq.got('hist', 100, Infinity); await tick();
    const w2 = wsn; gq._d['hist/100'].at -= 3600e3; gq.got('hist', 100, Infinity);
    ok(w1 - w0 === 1 && w2 - w1 === 1 && wsn === w2 && gq._d['hist/100'].j.d === 1, `get: error retried, reply kept ${w0} ${w1} ${w2} ${wsn}`);
    // hacsReady: a listed card never defined delays generate() at most HACS_WAIT; defined later, it regenerates.
    const keep = [reg['windrose-card'], reg['mini-graph-card']];
    delete reg['windrose-card']; delete reg['mini-graph-card'];
    const hh = fakeHass(); hh.resources = [{ url: '/hacsfiles/windrose-card/windrose-card.js' }];
    const t1 = Date.now(); await lib.hacsReady(hh); const dt = Date.now() - t1;
    ok(dt >= 1400 && dt < 2500, `hacsReady: at most 1.5 s (${dt} ms)`);
    const hB = { ...hh, states: { ...hh.states } }; lib.shouldRegenerate({}, hh, hh);
    reg['windrose-card'] = class {};
    ok(lib.shouldRegenerate({}, hh, hB) === true, 'shouldRegenerate: HACS card defined late');
    delete reg['windrose-card'];
    if (keep[0]) reg['windrose-card'] = keep[0];
    if (keep[1]) reg['mini-graph-card'] = keep[1];
    // TabsCard: setConfig again on the same element shows the new tabs.
    const ls2 = global.localStorage; global.localStorage = { getItem: () => null, setItem() {} };
    const tb = mk(lib.IrryTabsCard, { tabs: [{ id: 'a', name: 'Uno', sections: [] }, { id: 'b', name: 'Due', sections: [] }] }, fakeHass());
    const tb0 = tb.html();
    tb.card.setConfig({ tabs: [{ id: 'a', name: 'Tre', sections: [] }, { id: 'c', name: 'Quattro', sections: [] }] });
    global.localStorage = ls2;
    ok(tb0.includes('Uno') && tb.html().includes('Tre') && tb.html().includes('Quattro') && !tb.html().includes('Uno'), 'tabs: setConfig on a reused element');
    // M-F3 parity with the firmware: zone 7 in Aux mode does not count in overlaps.
    const ov = (r8) => {
      let hv = fakeHass({ r8 });
      for (const [k, v] of [['Start', '06:00:00'], ['Duration', '10.0'], ['Enable', 'on'], ['1-Mon', 'on']]) hv = put(hv, `Zone 7 S1 ${k}`, v);
      const mv = lib.irryModel(hv), w = lib.ovDay(lib.devSlots(mv), lib.dnOf('2026-11-02'));
      return w.some((x) => x.zs.some((i) => mv.zones[i] === 7));
    };
    ok(ov('Zone 7') === true && ov('Aux') === false, 'M-F3: zone 7 in Aux mode not in overlaps');
  }
  // ---- 0.4.0: firmware 2.6.0 (Zone N Next Start, Problems, get prog rk)
  {
    const nm = (hh, name) => Object.keys(hh.entities).find((i) => hh.entities[i].name === name);
    const put = (hh, name, v) => { const id = nm(hh, name); hh.states = { ...hh.states, [id]: { ...hh.states[id], state: v } }; return hh; };
    const cx = (hh) => { const m = lib.irryModel(hh); return { h: hh, m, t, l: 'it' }; };
    const S2 = (hh, name) => hh.states[nm(hh, name)];
    // Next start per zone: a row in the status zones and in each zone section, hidden while empty.
    const hn = put(fakeHass(), 'Zone 1 Next Start', '2026-11-06T05:00:00+00:00'), dn = await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, hn);
    const js = JSON.stringify(dn), id1 = nm(hn, 'Zone 1 Next Start');
    ok(js.split(id1).length - 1 === 2 && /"zone_7_next_start"|zone_7_next_start/.test(js), 'next start: status and zone rows, all zones');
    ok(refs(dn).every((e) => hn.states[e]), 'next start: every entity exists');
    ok(lib.fmtState('ts', S2(hn, 'Zone 1 Next Start'), cx(hn)).includes('06:00'), 'next start in the device zone');
    const rn = mk(lib.IrryRowsCard, { device: 'dev1', rows: [{ entity: nm(hn, 'Zone 2 Next Start'), name: 'x', fmt: 'ts', hide_empty: true }] }, hn);
    ok(!rn.html().includes('>x<'), 'next start: empty row hidden');
    // Problems: the device UI words; '' all OK; the overlap with its window.
    const c0 = cx(fakeHass());
    ok(lib.fmtState('prob', S2(c0.h, 'Problems'), c0) === t('allok'), 'problems empty: all good');
    let hp = put(fakeHass(), 'Problems', 'net_lost,clock_bad,ha_lost,rain_old,rain_unit,wind_old,net_trial,rain_bad');
    const cp = cx(hp), fp = lib.fmtState('prob', S2(hp, 'Problems'), cp);
    const want = [t('ch_net_lost'), t('ch_time_bad'), t('ch_ha_lost'), t('ch_rain_bad', { why: t('rain_old') }), t('ch_rain_bad', { why: t('x_rain_unit') }),
      t('ch_wind_old'), t('ch_trial'), t('ch_rain_bad', { why: t('rain_badv') })];
    ok(fp === want.join(' · '), `problems worded: ${fp}`);
    const ap = lib.alerts(cp.m, cp);
    ok(want.every((w) => ap.some(([, x]) => x === w)) && ap.find(([, x]) => x === t('ch_time_bad'))[0] === 'error', 'banner: one line per problem, clock as error');
    ok(!lib.alerts(c0.m, c0).some(([ty]) => ty === 'warning' || ty === 'error'), 'banner: no warning with Problems empty');
    // Time Valid off is not a second clock line when Problems exists (the firmware decides).
    const hv = put(put(fakeHass(), 'Time Valid', 'off'), 'Problems', '');
    ok(!lib.alerts(lib.irryModel(hv), cx(hv)).some(([, x]) => x === t('ch_time_bad')), 'banner: Time Valid not re-judged');
    hp = put(put(fakeHass(), 'Problems', 'ovl'), 'Irrigation Overlap Warning', '2 zones tue 2026-11-03 06:11-06:20 1,2');
    const ao = lib.alerts(lib.irryModel(hp), cx(hp)).filter(([, x]) => x.startsWith(t('ovl')));
    ok(ao.length === 1 && ao[0][0] === 'warning' && ao[0][1].startsWith(t('ovl') + ': ') && ao[0][1].includes('Prato'), `banner: overlap once, with its window ${JSON.stringify(ao)}`);
    // Firmware before 2.6.0 (no Problems entity): the clock and overlap lines as before.
    const ho = put(put(fakeHass(), 'Time Valid', 'off'), 'Irrigation Overlap Warning', '2 zones tue 2026-11-03 06:11-06:20 1,2');
    delete ho.entities[nm(ho, 'Problems')];
    const aold = lib.alerts(lib.irryModel(ho), cx(ho));
    ok(aold.some(([ty, x]) => ty === 'error' && x === t('ch_time_bad')) && aold.some(([ty, x]) => ty === 'info' && x.startsWith(t('ovl'))), 'banner: older firmware');
    ok(lib.fmtState('prob', { state: 'unknown', attributes: {} }, c0) === '-', 'problems unknown: no verdict');
    const bp = mk(reg['irry-banner-card'], { device: 'dev1' }, fakeHass()), b0 = bp.html();
    bp.card.hass = put(fakeHass(), 'Problems', 'wind_old');
    ok(!b0.includes(t('ch_wind_old')) && bp.html().includes(t('ch_wind_old')), 'banner card follows Problems');
    // Rapid: the slot flag from get prog rk, fetched again when a slot changes.
    const hr = fakeHass(); hr.getData.prog = { rk: [1, 2, 0] };
    const rp = mk(lib.IrryRapidCard, { device: 'dev1' }, hr);
    await tick(); await tick();
    const progs = () => hr.ws.filter((q) => (q.service_data || {}).what === 'prog').length;
    ok(rp.html().includes(t('uni')) && progs() === 1, `rapid: slot 1 uniform from rk (${progs()} get)`);
    rp.card.hass = { ...hr, states: { ...hr.states } }; await tick();
    ok(progs() === 1, 'rapid: same program, no new get');
    hr.getData.prog = { rk: [2, 2, 0] };
    const h2 = put({ ...hr, states: { ...hr.states } }, 'Zone 1 S1 Duration', '12.0'); rp.card.hass = h2; await tick(); await tick();
    ok(progs() === 2 && rp.html().includes(t('mixed')), 'rapid: slot change, rk fetched again');
    rp.card._slot = 3; rp.card._sig = ''; rp.card.hass = { ...h2, states: { ...h2.states } };
    ok(rp.html().includes(t('empty')), 'rapid: slot 3 empty');
    const hx = fakeHass(); hx.getData.prog = null;
    const rx = mk(lib.IrryRapidCard, { device: 'dev1' }, hx); await tick(); await tick();
    ok(![t('uni'), t('mixed'), t('empty')].some((x) => rx.html().includes('>' + x + '<')), 'rapid: no rk, no flag');
  }
  // ---- 0.4.1: zone action, weather data in use (firmware 2.6.1)
  {
    const nm = (hh, name) => Object.keys(hh.entities).find((i) => hh.entities[i].name === name);
    const put = (hh, name, v) => { const id = nm(hh, name); hh.states = { ...hh.states, [id]: { ...hh.states[id], state: v } }; return hh; };
    const cx = (hh) => ({ h: hh, m: lib.irryModel(hh), t, l: 'it' });
    const fe = (x) => ({ blur() {}, classList: { add() {} }, ...x });
    // Zone toggles: esphome.<node>_zone with zone / on, the refusal code in the user language.
    const hz = fakeHass(), dz = await reg['ll-strategy-dashboard-irry-the-seven'].generate({}, hz), jz = JSON.stringify(dz);
    ok((jz.match(/"zone":1[,}]/g) || []).length >= 2, 'zone rows carry their zone number');
    const row = { entity: nm(hz, 'Zone 4 Manual'), name: 'Zona 4', fmt: 'open', edit: true, zone: 4 };
    const rc = mk(lib.IrryRowsCard, { device: 'dev1', rows: [row] }, hz);
    await rc.card.write(row, fe({ checked: true }));
    const c1 = hz.calls.pop();
    ok(c1 && c1.domain === 'esphome' && c1.service === 'it7ws_8dee48_zone' && c1.data.zone === 4 && c1.data.on === true, `zone action ${JSON.stringify(c1)}`);
    await rc.card.write(row, fe({ checked: false }));
    ok(hz.calls.pop().data.on === false, 'zone action: close');
    hz.fail = 'Failed to execute the action call it7ws_8dee48_zone on Irry The Seven 8dee48: open_limit';
    await rc.card.write(row, fe({ checked: true })); hz.fail = null;
    ok(/class="msg"[^>]*>[^<]+/.test(rc.html()) && rc.html().includes(t('e_open_limit')), 'zone refused: open_limit shown');
    for (const [code, k] of [['ota_pv', 'e_ota_pv'], ['zone', 'e_zone'], ['limit', 'e_limit']])
      ok(lib.errText(cx(hz).m, t, 'it', new Error(`Failed to execute the action call x on y: ${code}`)) === t(k), `errText ${code}`);
    ok(lib.errText(cx(hz).m, t, 'it', 'nolimit').startsWith(t('e_generic', { err: '' }).trim().slice(0, 4)), 'errText: a word ending in limit is not the code');
    // Firmware before 2.6.1 (no zone action): the switch, as before.
    const ho = fakeHass(); delete ho.services.esphome.it7ws_8dee48_zone;
    const ro = mk(lib.IrryRowsCard, { device: 'dev1', rows: [row] }, ho);
    await ro.card.write({ ...row, entity: nm(ho, 'Zone 4 Manual') }, fe({ checked: true }));
    const c2 = ho.calls.pop();
    ok(c2.domain === 'switch' && c2.service === 'turn_on', 'older firmware: switch turn_on');
    // Weather data in use: "{n} days · estimated: wind, solar radiation", info, as the device Weather tab.
    let hw = put(put(put(fakeHass(), 'Weather Data', 'fallback'), 'Weather Fallback', 'wind,solar'), 'Weather Days Used', '2');
    const cw = cx(hw), want = `${t('m_days', { count: 2 })} · ${t('m_q_fb', { list: `${t('m_u').toLowerCase()}, ${t('m_rs').toLowerCase()}` })}`;
    ok(lib.fmtState('wdata', hw.states[nm(hw, 'Weather Data')], cw) === want, `weather data row: ${lib.fmtState('wdata', hw.states[nm(hw, 'Weather Data')], cw)}`);
    const aw = lib.alerts(cw.m, cw).find(([, x]) => x.startsWith(t('m_data')));
    ok(aw && aw[0] === 'info' && aw[1] === `${t('m_data')}: ${want}` && !lib.alerts(cw.m, cw).some(([, x]) => x === t('x_wd_fallback')), 'banner: weather data line, info');
    hw = put(put(fakeHass(), 'Weather Data', 'ok'), 'Weather Days Used', '3');
    ok(lib.fmtState('wdata', hw.states[nm(hw, 'Weather Data')], cx(hw)) === t('m_days', { count: 3 }), 'weather data ok: days only');
    hw = put(put(fakeHass(), 'Weather Data', 'off'), 'Weather Days Used', 'unknown');
    ok(lib.fmtState('wdata', hw.states[nm(hw, 'Weather Data')], cx(hw)) === t('m_off'), 'method off: Off');
    const hf = put(put(fakeHass(), 'Weather Data', 'fallback'), 'Weather Fallback', 'humidity');
    for (const k of ['Weather Fallback', 'Weather Days Used']) delete hf.entities[nm(hf, k)];
    ok(lib.alerts(lib.irryModel(hf), cx(hf)).some(([, x]) => x === t('x_wd_fallback')), 'older firmware: fallback text');
    const rw = mk(lib.IrryRowsCard, { device: 'dev1', rows: [{ entity: nm(hz, 'Weather Data'), name: 'D', fmt: 'wdata', refs: [nm(hz, 'Weather Fallback')] }] },
      put(put(fakeHass(), 'Weather Data', 'fallback'), 'Weather Fallback', 'humidity'));
    const w0 = rw.html(); rw.card.hass = put(put(put(fakeHass(), 'Weather Data', 'fallback'), 'Weather Fallback', 'humidity'), 'Weather Fallback', 'wind');
    ok(w0.includes(t('m_rh').toLowerCase()) && rw.html().includes(t('m_u').toLowerCase()), 'weather data row follows Weather Fallback');
  }
  // ---- 0.4.1: toggles repaint from the newest hass and keep the requested state until it arrives
  {
    const nm = (hh, name) => Object.keys(hh.entities).find((i) => hh.entities[i].name === name);
    const put = (hh, name, v) => { const id = nm(hh, name); return { ...hh, states: { ...hh.states, [id]: { ...hh.states[id], state: v } } }; };
    const fe = (x) => ({ blur() {}, classList: { add() {} }, ...x });
    const on = (c) => /class="tg"[^>]* checked/.test(c.html());
    const h0 = fakeHass(), row = { entity: nm(h0, 'Zone 4 Manual'), name: 'Zona 4', fmt: 'open', edit: true, zone: 4 };
    const rc = mk(lib.IrryRowsCard, { device: 'dev1', rows: [row] }, h0);
    // The new state arrives before callService answers (the zone action replies after the switch publishes).
    h0.callService = function (...a) { this.calls.push(a); rc.card.hass = put(h0, 'Zone 4 Manual', 'on'); return Promise.resolve(); };
    await rc.card.write(row, fe({ checked: true }));
    ok(on(rc) && rc.html().includes(t('x_open')), 'state before the reply: shown open, not the old hass');
    // No state yet: the requested state is kept, then the real one after the timeout.
    const h1 = fakeHass(), r1 = mk(lib.IrryRowsCard, { device: 'dev1', rows: [row] }, h1); r1.card._pms = 30;
    await r1.card.write(row, fe({ checked: true }));
    ok(on(r1), 'pending: requested state kept');
    r1.card.hass = put(h1, 'Uptime', '5');
    ok(on(r1), 'pending: kept across another state change');
    await new Promise((r) => setTimeout(r, 120));
    ok(!on(r1), 'pending: back to the real state after the timeout');
    // Arrives later: the pending entry goes away with the real state.
    const h2 = fakeHass(), r2 = mk(lib.IrryRowsCard, { device: 'dev1', rows: [row] }, h2);
    await r2.card.write(row, fe({ checked: true }));
    r2.card.hass = put(h2, 'Zone 4 Manual', 'on');
    ok(on(r2) && Object.keys(r2.card._pd).length === 0, 'pending cleared by the real state');
    // Refused: no pending, the real state and the reason.
    const h3 = fakeHass(), r3 = mk(lib.IrryRowsCard, { device: 'dev1', rows: [row] }, h3);
    h3.fail = 'Failed to execute the action call it7ws_8dee48_zone on Irry: open_limit';
    await r3.card.write(row, fe({ checked: true }));
    ok(!on(r3) && r3.html().includes(t('e_open_limit')) && !r3.card._pd[row.entity], 'refused: real state and reason');
    ok(h3.calls.length && h3.calls.every((c) => c.notify === false), 'refused: no HA toast, the card shows it');
    r3.card._ems = 30; h3.fail = 'Failed: open_limit';
    await r3.card.write(row, fe({ checked: true }));
    ok(r3.html().includes(t('e_open_limit')), 'refused again: reason shown');
    await new Promise((r) => setTimeout(r, 80));
    ok(!r3.html().includes('<ha-alert') && !r3.html().includes(t('e_open_limit')) && r3.card._err === '', 'reason gone after the timeout');
  }
  // ---- 0.4.3: constant height on the Status view
  {
    const nm = (hh, name) => Object.keys(hh.entities).find((i) => hh.entities[i].name === name);
    const put = (hh, name, v) => { const id = nm(hh, name); return { ...hh, states: { ...hh.states, [id]: { ...hh.states[id], state: v } } }; };
    const fe = (x) => ({ blur() {}, classList: { add() {} }, ...x });
    const shape = (c) => (c.html().match(/class="(r|msg|h|note)[" ]/g) || []).join();
    const h0 = fakeHass(), sv = await reg['ll-strategy-view-irry-status'].generate({}, h0), cards = sv.sections.flatMap((x) => x.cards);
    const js = JSON.stringify(sv);
    ok(!js.includes('"visibility"') && !js.includes('hide_empty'), 'status: no card or row shown on a condition');
    const st = sv.sections.find((x) => x.cards.some((c) => c.heading === t('st')));
    ok(st && st.cards.findIndex((c) => c.heading === t('m_meth')) > st.cards.findIndex((c) => c.heading === t('st')), 'status: duration adaptation below Stato, same section');
    const zr = cards.find((c) => c.type === 'custom:irry-rows-card' && c.rows.some((r) => /zone_1_manual$/.test(r.entity)));
    const z = mk(lib.IrryRowsCard, zr, h0), s0 = shape(z);
    ok(s0.includes('msg') && z.html().includes('—'), 'zones: message line reserved, empty end shown as —');
    let hh = put(put(h0, 'Zone 1 Manual', 'on'), 'Zone 1 End', '2026-11-05T10:00:00+00:00'); z.card.hass = hh;
    ok(shape(z) === s0, 'zones: same rows with a zone open');
    hh.fail = 'Failed: open_limit'; z.card._ems = 30;
    await z.card.write(zr.rows[0], fe({ checked: true }));
    ok(shape(z) === s0 && z.html().includes(t('e_open_limit')), 'zones: same rows with the message');
    await new Promise((r) => setTimeout(r, 80));
    ok(shape(z) === s0 && !z.html().includes(t('e_open_limit')), 'zones: same rows after the message');
    // Banner: a zone opened or programs paused replace a line, they do not add one.
    const M = (x) => lib.irryModel(x), C = (x) => ({ h: x, m: M(x), t, l: 'it' }), n0 = lib.alerts(M(h0), C(h0)).length;
    const h1 = put(h0, 'Zone Active', 'Zona 1'), h2 = put(h1, 'Programs Paused', 'on');
    ok(lib.alerts(M(h1), C(h1)).length === n0 && lib.alerts(M(h2), C(h2)).length === n0, `banner: same lines on commands ${n0}`);
    // Events: room for five lines from the start.
    { const ec = mk(reg['irry-events-card'], { device: 'dev1' }, fakeHass()); ok(/rows ev5/.test(ec.html()), 'events: room for five lines'); }
  }
  console.log(`test.cjs: ${n} checks, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
