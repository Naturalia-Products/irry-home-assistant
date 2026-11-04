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
  S('Units').state = 'Imperial';
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
    hh.states[id] = { entity_id: id, state, attributes: attributes || hh.states[id].attributes };
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
  console.log(`test.cjs: ${n} checks, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
