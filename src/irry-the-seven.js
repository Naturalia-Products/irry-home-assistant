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

const IRRY_VERSION = '0.6.0';
const I18N = /*I18N*/ {} /*END*/;

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MODES = ['week', 'even', 'odd', 'every'];  // order of the "Days Mode" select options
const BAD = ['unknown', 'unavailable', ''];
const K = (k) => k;  // marks a text key for build.py where t() is called later
// Select options (English, stable for automations and backups) -> text keys.
// Irrigation Method select (firmware 2.8.0): its options, as the device publishes them.
const METH = { None: K('m_off'), Hargreaves: K('m_harg'), 'FAO-56': K('m_fao') }, METH_NONE = 'None';
const OPT = {
  method: METH,
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
  method: METH,
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
const TR = {};
function tr(l) { return TR[l] || (TR[l] = mkTr(l)); }
function mkTr(l) {
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
  for (const e of ents) if (e.name) (byName[slug(e.name)] ||= []).push(e.entity_id);
  const cache = {};
  // Entity renamed in HA: the entity_id keeps the original suffix; the shortest match wins
  // ("irrigation_factor" also ends "zone_1_irrigation_factor"). Two entities with the same name (one renamed
  // like another): the one whose entity_id suffix is the key, else the suffix rule over all entities.
  const bySuffix = (ids, k) => {
    const c = ids.filter((i) => i.split('.')[1] === k || i.endsWith('_' + k)).sort((a, b) => a.length - b.length);
    return c.length && (c.length === 1 || c[0].length < c[1].length) ? c[0] : null;
  };
  const E = (k) => {
    if (k in cache) return cache[k];
    const n = byName[k] || [];
    const id = n.length === 1 ? n[0] : (n.length && bySuffix(n, k)) || bySuffix(ents.map((e) => e.entity_id), k);
    return (cache[k] = id || null);
  };
  return (per[dev.id] = { E });
}

// Imperial where the US customary system is in daily use (same rule as the device UI).
const IMPZ = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Juneau|Sitka|Nome|Yakutat|Metlakatla|Adak|Boise|Detroit|Menominee|Indiana\/|Kentucky\/|North_Dakota\/)|Pacific\/Honolulu|US\/|Africa\/Monrovia|Asia\/(Yangon|Rangoon))/;

// Model of one device: entity lookup E(key), states, zones, labels, units, action names.
// l: language of the texts (an unnamed zone is "Zone N" in it), default the HA user language.
// One model per hass.states reference (HA replaces the object on every state change) and device / language.
const MODEL = new WeakMap();
function irryModel(hass, want, l) {
  const st0 = hass.states || {};
  let per = MODEL.get(st0);
  if (!per) MODEL.set(st0, (per = new Map()));
  const key = `${want || ''}|${l || ''}`, x = per.get(key);
  if (x && x.e === hass.entities && x.d === hass.devices && x.s === hass.services && x.c === hass.config && x.lo === hass.locale) {
    if (x.m) x.m.h = hass;
    return x.m;
  }
  const m = mkModel(hass, want, l);
  per.set(key, { m, e: hass.entities, d: hass.devices, s: hass.services, c: hass.config, lo: hass.locale });
  return m;
}
function mkModel(hass, want, l) {
  const dev = pickDevice(hass, want);
  if (!dev) return null;
  const { E } = index(hass, dev);
  const so = (k) => { const id = E(k); return id ? hass.states[id] : undefined; };
  const st = (k) => { const s = so(k); return s ? s.state : undefined; };
  // R8 Mode (family A): zone 7 and Aux share the output; the entities of the mode not chosen exist but are inert,
  // so they are left out everywhere, as the device UI does. No R8 Mode entity, or no valid state: show both.
  const r8 = st('r8_mode'), z7 = r8 !== 'Aux', aux = r8 !== 'Zone 7';
  const zones = [];
  for (let n = 1; n <= 8; n++) if (E(`zone_${n}_manual`) && (n !== 7 || z7)) zones.push(n);
  const zt = tr(l || lang(hass));
  const label = (n) => { const v = st(`zone_${n}_label`); return v && !BAD.includes(v) ? v : zt('x_zone_n', { n }); };
  const un = st('units'), tz = devTz(hass, st);
  const imp = un === 'Imperial' || (un !== 'Metric' && IMPZ.test(tz || ''));
  const node = nodeOf(hass, dev), sv = (hass.services && hass.services.esphome) || {};
  const action = (act) => (node && sv[`${node}_${act}`] ? `${node}_${act}` : null);
  return { h: hass, dev, E, so, st, zones, label, imp, tz, node, action, aux };
}

// Device time zone: the "Time Zone" sensor when it is an IANA name (the firmware publishes a POSIX string when no
// name is set, which Intl rejects), else the HA one; undefined = the browser zone.
const TZOK = new Map();
function tzValid(z) {
  if (!z || typeof z !== 'string') return false;
  if (!TZOK.has(z)) {
    let ok = true;
    try { new Intl.DateTimeFormat('en', { timeZone: z }); } catch (e) { ok = false; }
    TZOK.set(z, ok);
  }
  return TZOK.get(z);
}
function devTz(hass, st) {
  const z = st && st('time_zone'), hz = hass && hass.config && hass.config.time_zone;
  return tzValid(z) ? z : tzValid(hz) ? hz : undefined;
}
// Time zone of a model, or of HA for a bare hass.
const tzOf = (x) => (x && x.dev ? x.tz : devTz(x));

// ESPHome names a device action "<node name, - as _>_<action>" (build_service_name of the HA esphome integration),
// while the HA device keeps the friendly name. The node of each Irry device (a prefix with the rapid and set_slot
// actions) is found by, in order: the host of its web UI in configuration_url ("http://it7ws-8dee48.local"), its
// registry name when it is a node name, the MAC suffix of the default node name, and last by exclusion (one device
// and one node left). Still ambiguous: no action, never the action of another device.
const NODES = new WeakMap();
function nodeOf(hass, dev) {
  const sv = (hass.services && hass.services.esphome) || {}, dv = hass.devices || {};
  let per = NODES.get(sv);
  if (!per) NODES.set(sv, (per = new WeakMap()));
  let map = per.get(dv);
  if (!map) per.set(dv, (map = assignNodes(hass)));
  return map[dev.id] || null;
}
function assignNodes(hass) {
  const sv = Object.keys((hass.services && hass.services.esphome) || {}), has = new Set(sv);
  const free = new Set(sv.filter((s) => s.endsWith('_rapid')).map((s) => s.slice(0, -6)).filter((p) => has.has(`${p}_set_slot`)));
  const asNode = (s) => (/^[a-z0-9][a-z0-9-]*$/.test(s || '') && !/^\d+(-\d+)*$/.test(s) ? s.replace(/-/g, '_') : null);
  const rules = [
    (d) => { try { return asNode(new URL(d.configuration_url).hostname.replace(/\.local\.?$/, '')); } catch (e) { return null; } },
    (d) => asNode(d.name),
    (d) => {
      const mac = ((d.connections || []).find((c) => c[0] === 'mac') || [])[1];
      const m6 = mac ? mac.replace(/:/g, '').slice(-6).toLowerCase() : '';
      const c = m6 ? [...free].filter((p) => p.endsWith('_' + m6) || p.endsWith(m6)) : [];
      return c.length === 1 ? c[0] : null;
    },
  ];
  const out = {};
  let left = irryDevices(hass);
  for (const rule of rules) {
    left = left.filter((d) => {
      const p = rule(d);
      if (!p || !free.has(p)) return true;
      out[d.id] = p;
      free.delete(p);
      return false;
    });
  }
  if (left.length === 1 && free.size === 1) out[left[0].id] = [...free][0];
  return out;
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
// Intl formatters are costly to build and asked for on every repaint: one per language and options.
const FMT = new Map();
function dtf(l, o) {
  const k = `${l}|${JSON.stringify(o)}`;
  let f = FMT.get(k);
  if (!f) FMT.set(k, (f = new Intl.DateTimeFormat(l, o)));
  return f;
}
const nf = (v, d, l) => {
  const k = `n|${l}|${d}`;
  let f = FMT.get(k);
  if (!f) FMT.set(k, (f = new Intl.NumberFormat(l, { minimumFractionDigits: d, maximumFractionDigits: d })));
  return f.format(v);
};
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
  const tz = c.m ? c.m.tz : devTz(c.h);
  const z = tz ? { timeZone: tz } : {};
  const o = { hour: '2-digit', minute: '2-digit', ...z };
  const day = (x) => dtf('en-CA', z).format(x);
  if (day(d) !== day(new Date())) Object.assign(o, { weekday: 'short', day: 'numeric', month: 'short' });
  return dtf(c.l, o).format(d);
}
function dayNames(l, w = 'short') {
  const f = dtf(l, { weekday: w });
  return DAYS.map((d, i) => f.format(new Date(2026, 10, 2 + i)));  // 2026-11-02 is a Monday
}
const dateText = (l, y, mo, d) => dtf(l, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(+y, mo - 1, +d));
// Same helpers as the device UI: minutes -> HH:MM, a duration in minutes, an age in seconds.
const hm = (x) => { x = ((x % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const fmin = (t, x) => (x < 60 ? `${x} ${t('min')}` : `${Math.floor(x / 60)} ${t('h')}${x % 60 ? ` ${x % 60} ${t('min')}` : ''}`);
const ago = (s, t) => (s == null ? '-' : s < 90 ? `${s} s` : s < 5400 ? `${Math.round(s / 60)} min` : s < 172800 ? `${Math.round(s / 3600)} h`
  : `${Math.round(s / 86400)} ${t ? t('x_d') : 'd'}`);
// Duration in seconds as "1 h 32 min" or "3 d 4 h" (uptime).
const fdur = (t, s) => (s < 3600 ? `${Math.floor(s / 60)} ${t('min')}` : s < 86400 ? `${Math.floor(s / 3600)} ${t('h')} ${Math.floor((s % 3600) / 60)} ${t('min')}`
  : `${Math.floor(s / 86400)} ${t('x_d')} ${Math.floor((s % 86400) / 3600)} ${t('h')}`);
// Absolute time and, in brackets, how long ago.
const tsAgo = (iso, c) => { const d = new Date(iso); return isNaN(d) ? '-' : `${fmtTime(iso, c)} (${ago(Math.max(0, Math.round((Date.now() - d) / 1000)), c.t)})`; };

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
// Today on the device clock: { dn, m (minute of the day) }. x: a model (its time zone, see devTz) or hass (HA zone).
function devToday(x, now = new Date()) {
  const o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  const tz = tzOf(x), f = dtf('en-CA', tz ? { ...o, timeZone: tz } : o);
  const p = {};
  f.formatToParts(now).forEach((x) => { p[x.type] = x.value; });
  return { dn: Date.UTC(+p.year, +p.month - 1, +p.day) / 864e5, m: (+p.hour % 24) * 60 + +p.minute };
}
const MAXO = 3;  // zones open at once, as it7::MAX_OPEN
// Windows of day dn with two or more zones open: { a, b, zs } (minutes a..b, zone indexes); the tail after midnight
// counts on the next day; two slots of the same zone do not count.
function ovDay(Z, dn) {
  const a = new Uint8Array(1440);
  Z.forEach((zn, z) => zn.s.forEach((s) => {
    if (!s.e || !s.d) return;
    if (runs(s, dn)) for (let x = s.t; x < Math.min(s.t + s.d, 1440); x++) a[x] |= 1 << z;
    if (s.t + s.d > 1440 && runs(s, dn - 1)) for (let x = 0; x < s.t + s.d - 1440; x++) a[x] |= 1 << z;
  }));
  return ovWin(a);
}
// Overlap windows of the bars as drawn (history and today's adapted plan).
function ovBars(rows) {
  const a = new Uint8Array(1440);
  rows.forEach((r) => r.bars.forEach((b) => { for (let x = Math.round(b.a); x < Math.min(Math.round(b.b), 1440); x++) a[x] |= 1 << r.zi; }));
  return ovWin(a);
}
// Windows of a minute mask (bit z = zone index z open) with two or more zones open.
function ovWin(a) {
  const w = [];
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
// the day before (null: not loaded or in the future), fz = today's factor (%) of each zone or null (durations as programmed).
// Overlaps: ov = windows of the bars as drawn (past days and today); on later days the factor is not known yet, so ov
// comes from the programmed durations and pos is set (possible overlaps); ovp = today's windows with the programmed durations. Bars { a, b, c (1-3 slot, 0 by hand), tl (tail), past, h (history) },
// list items { a, b, zi, k (slot index) | h (history row), tl }, overlap windows, nm = minute of now (-1 future, 1440 past).
function dayModel(Z, g, td, hr, hy, fz = []) {
  const dn = td.dn + g, nm = g < 0 ? 1440 : g ? -1 : td.m, real = !!hr, list = [];
  const col = (x) => (x[3] >= 1 && x[3] <= 3 ? x[3] : 0);
  const open = (z, k) => [...(hr || []), ...(hy || [])].some((x) => x[2] === z && x[3] === k + 1 && !x[4]);
  const rows = Z.map((zn, zi) => {
    const bars = [];
    const bar = (a, b, c, tl, h) => {  // h: from the history (done); a plan bar is split at now
      const x = Math.max(a, Math.min(b, nm));
      if (x > a) bars.push({ a, b: x, c, tl, past: 1, h });
      if (b > x) bars.push({ a: x, b, c, tl, past: 0, h });
    };
    if (real) {
      hr.forEach((x) => {
        if (x[2] !== zn.z) return;
        if (hsk(x[4])) { list.push({ a: x[0], b: x[0], zi, h: x }); return; }
        const e = Math.min(x[0] + x[1] / 60, 1440);
        bar(x[0], e, col(x), 0, 1);
        list.push({ a: x[0], b: e, zi, h: x });
      });
      (hy || []).forEach((x) => {
        const e = x[0] + x[1] / 60 - 1440;
        if (x[2] !== zn.z || hsk(x[4]) || e <= 0) return;
        bar(0, e, col(x), 1, 1);
        list.push({ a: 0, b: e, zi, h: x, tl: 1 });
      });
    }
    // Up to today the history replaces the program; today the program goes on after now.
    const f = !g && fz[zi] != null ? fz[zi] : null;
    if (!real || !g) zn.s.forEach((s0, k) => {
      const s = f == null ? s0 : { ...s0, d: Math.round((s0.d * f) / 100) };  // today: the duration the device will run
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
  return { dn, nm, real, rows, list, ov: g > 0 ? ovDay(Z, dn) : ovBars(rows), pos: g > 0, ovp: g ? null : ovDay(Z, dn), none: g < 0 && !real };
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
// Codes the actions answer alone at the end of error_message (rapid / set_slot limit; zone: zone, ota_pv, open_limit).
const ECODE = { limit: K('e_limit'), open_limit: K('e_open_limit'), ota_pv: K('e_ota_pv'), zone: K('e_zone') };
// Firmware error text ("limit mon 2026-11-02 06:00-06:10 1,2,3,4", or a code) in the user language.
function errText(m, t, l, e) {
  const msg = String((e && (e.message || e.error)) || e);
  const g = msg.match(/limit (\w{3})(?: (\d{4})-(\d\d)-(\d\d))? (\d\d:\d\d)-(\d\d:\d\d) ([\d,]+)/);
  // HA wraps the device error_message: "Failed to execute the action call <name> on <device>: <message>".
  if (!g) { const k = msg.match(/(?:^|: )(limit|open_limit|ota_pv|zone)$/); return k ? t(ECODE[k[1]]) : t('e_generic', { err: msg }); }
  const when = g[2] ? dateText(l, g[2], g[3], g[4]) : dayNames(l)[DAYS.indexOf(g[1])];
  const zs = g[7].split(',').filter((z) => m.zones.includes(+z));
  return t('e_limit_at', { count: zs.length, when, from: g[5], to: g[6], zones: zs.map((z) => m.label(+z)).join(', ') });
}
// Overlap Warning "2 zones tue 2026-11-03 06:11-06:20 1,2" -> "mar 3 nov · <the device UI banner text>".
function ovlText(m, t, l, s) {
  const g = String(s).match(/^(\d+) zones (\w{3})(?: (\d{4})-(\d\d)-(\d\d))? (\d\d:\d\d)-(\d\d:\d\d) ([\d,]+)/);
  if (!g) return s;
  const when = g[3] ? dateText(l, g[3], g[4], g[5]) : dayNames(l)[DAYS.indexOf(g[2])];
  return `${when} · ${t('ovl_ban', { count: +g[1], from: g[6], to: g[7], zones: g[8].split(',').filter((z) => m.zones.includes(+z)).map((z) => m.label(+z)).join(', ') })}`;
}
// Weather data in use, as the device Weather tab: "{n} days · estimated: wind, solar radiation" from Weather Days Used and
// Weather Fallback (firmware 2.6.1, humidity,wind,solar); null when the firmware has neither entity.
const WFB = { humidity: K('m_rh'), wind: K('m_u'), solar: K('m_rs') };
function wdUsed(m, t) {
  const fb = m.so('weather_fallback'), du = m.so('weather_days_used');
  if (!fb && !du) return null;
  const n = parseInt(du && du.state, 10);
  const list = fb && !BAD.includes(fb.state) ? fb.state.split(',').map((x) => WFB[x.trim()]).filter(Boolean).map((k) => t(k).toLowerCase()).join(', ') : '';
  return [isNaN(n) ? '' : t('m_days', { count: n }), list ? t('m_q_fb', { list }) : ''].filter(Boolean).join(' · ') || null;
}
// Problems (firmware 2.6.0, spec §8.3): the health codes that are not OK, comma-separated, '' = all OK. Worded with the
// device UI texts of the Status health card; ovl with the Overlap Warning window.
const PROB = { net_trial: K('ch_trial'), net_lost: K('ch_net_lost'), clock_bad: K('ch_time_bad'), ha_lost: K('ch_ha_lost'), wind_old: K('ch_wind_old') };
const PROB_RAIN = { rain_old: K('rain_old'), rain_bad: K('rain_badv'), rain_unit: K('x_rain_unit') };
const probCodes = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
function probText(m, t, l, p) {
  if (PROB[p]) return t(PROB[p]);
  if (PROB_RAIN[p]) return t('ch_rain_bad', { why: t(PROB_RAIN[p]) });
  if (p === 'ovl') { const ov = m.st('irrigation_overlap_warning'); return ov && !BAD.includes(ov) ? `${t('ovl')}: ${ovlText(m, t, l, ov)}` : t('ovl'); }
  return p;
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
    case 'wdata': if ((v === 'ok' || v === 'fallback') && wdUsed(m, t)) return wdUsed(m, t);  // falls through
    case 'method': case 'feed': case 'wpause': case 'tsrc': case 'wifi': case 'rtc': case 'pos': return map(STATE[f]);
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
    case 'pw': return BAD.includes(v) ? '-' : t(v === 'on' ? K('vp_on') : K('vp_off'));
    case 'fwst': return BAD.includes(v) ? '-' : fwText(t, v);
    case 'batt': return BAD.includes(v) ? '-' : t(v === 'on' ? K('m_batt_low') : K('m_batt_ok'));
    case 'batt': return t(v === 'on' ? K('m_batt_low') : K('m_batt_ok'));
    case 'zact': return BAD.includes(v) || v === '-' ? t('m_none') : v;
    case 'ts': return BAD.includes(v) ? '-' : fmtTime(v, c);
    case 'prob': return v === '' ? t('allok') : BAD.includes(v) ? '-' : probCodes(v).map((p) => probText(m, t, c.l, p)).join(' · ');
    case 'tsago': return BAD.includes(v) ? '-' : tsAgo(v, c);
    case 'dur': { const x = parseFloat(v); return isNaN(x) ? '-' : fdur(t, x); }
    case 'num': { const x = parseFloat(v); return isNaN(x) ? '-' : nf(x, x % 1 ? 1 : 0, c.l); }  // a value with no unit (UV index)
    case 'open': return t(v === 'on' ? K('x_open') : K('x_closed'));
    case 'pair': {  // value / threshold (row.ref), one unit when both share it
      const r2 = row.ref && c.h.states[row.ref];
      if (BAD.includes(v) || !r2) return fmtState('', s, c);
      const a = devValue(parseFloat(v), s.attributes.unit_of_measurement, m.imp), b = devValue(parseFloat(r2.state), r2.attributes.unit_of_measurement, m.imp);
      const da = a && a[2], db = row.int ? 0 : b && b[2];  // int: threshold in whole units, as the Settings field (step 1)
      if (a && b && a[1] === b[1]) return `${nf(a[0], da, c.l)} / ${nf(b[0], db, c.l)} ${a[1]}`;
      return `${fmtState('', s, c)} / ${fmtState('', r2, c)}`;
    }
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
const heading = (text, icon) => ({ type: 'heading', heading: text, ...(icon ? { icon } : {}) });
const section = (cards, x = {}) => ({ type: 'grid', cards: cards.filter(Boolean), ...x });
const noDevice = (t) => ({
  type: 'sections', max_columns: 2,
  sections: [section([{ type: 'markdown', content: `<ha-alert alert-type="warning">${t('x_no_dev')}</ha-alert>` }])],
});
// Rows card: name in the device words, value translated and in the device units (edit: writable control).
// Rows of entities the device does not have are dropped, and so is a heading with no row after it.
// { note } is a text line, { name, value } a fixed value; only: { k, state } shows the row while that entity has that state
// (a list: one of them; no state: while it exists). ctl: the firmware control whose Blocked Controls code makes the
// control inert (see ctlWhy); dropped when the device has no Blocked Controls.
// dash_by: {k, state}: the row's value shown as a dash while that entity has that state.
const METHOD_OFF = { k: 'irrigation_method', state: METH_NONE };
function rows(m, list, x = {}) {
  const r = list.filter((e) => e && (!e.only || m.E(e.only.k)) && (e.head || e.note || e.value || m.E(e.k))).map((e) => {
    const o = e.head || e.note || e.value ? { ...e } : { ...e, entity: m.E(e.k) };
    if (o.only) o.only = o.only.state === undefined ? undefined : { entity: m.E(e.only.k), state: e.only.state };
    if (o.dash_by) o.dash_by = m.E(e.dash_by.k) ? { entity: m.E(e.dash_by.k), state: e.dash_by.state } : undefined;
    if (o.ctl) o.ctl = m.E('blocked_controls') ? { entity: m.E('blocked_controls'), c: e.ctl } : undefined;
    delete o.k;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return o;
  });
  const out = r.filter((e, i) => !e.head || (r[i + 1] && !r[i + 1].head));
  return out.some((e) => !e.head && !e.note) ? { type: 'custom:irry-rows-card', device: m.dev.id, rows: out, grid_options: { columns: 'full' }, ...x } : null;
}

// Zone heading: the output number and, when set, the name ("Zone 1 · North olives").
function zoneHead(m, t, n) {
  const l = m.st(`zone_${n}_label`);
  return l && !BAD.includes(l) ? `${t('x_zone_n', { n })} · ${l}` : t('x_zone_n', { n });
}
// One view section holding the in-card tabs card: tabs = [[id, name, [section, ...]], ...], empty tabs dropped.
// The id (stable, not the position) is what the browser remembers; def = tab shown when nothing is remembered.
function tabbed(m, view, tabs, def, layout) {
  const tb = tabs.map(([id, name, ss]) => ({ id, name, sections: ss.filter(Boolean).map((x) => x.cards) })).filter((x) => x.sections.length);
  return {
    type: 'sections', max_columns: 4,
    sections: [section([{ type: 'custom:irry-tabs-card', device: m.dev.id, view, tabs: tb, ...(def ? { default: def } : {}), ...(layout ? { layout } : {}), grid_options: { columns: 'full' } }], { column_span: 4 })],
  };
}

// Control rules (firmware 2.7.0, spec §8.4): the firmware alone decides when a command is refused and publishes it as
// Blocked Controls, "<control>:<code>" comma separated ('' = everything allowed, the same pairs as status "ac").
const ctlList = (v) => {
  const o = {};
  if (v && !BAD.includes(v)) for (const p of v.split(',')) { const i = p.indexOf(':'); if (i > 0) o[p.slice(0, i)] = p.slice(i + 1); }
  return o;
};
// The device texts of the codes; silence and closeall say only "none" (nothing to do), find "on" while it runs (a press
// restarts it: not inert, its answer shown meanwhile).
const CTLW = { ota_pv: K('e_ota_pv'), open_limit: K('e_open_limit'), aux_zone: K('e_aux_zone'), aux_sync: K('e_aux_sync'),
  aux_ota: K('e_aux_ota'), nowind: K('e_nowind'), fw_off: K('e_fw_off'), fw_busy: K('e_fw_busy'), ota_busy: K('e_ota_busy'),
  fw_mem: K('e_fw_mem'), ota_factory: K('e_ota_factory'), fw_none: K('e_fw_none'), fw_rejected: K('e_fw_rejected'),
  fw_force: K('e_fw_force'), fw_window: K('e_fw_window'), nodata: K('e_nodata'), nosrc: K('wind_nosrc') };
const CTLN = { silence: K('x_why_noalarm'), closeall: K('x_why_nozone') };
// Reasons shown as an error (red) rather than a warning: the zone limit asks the user to close a zone first.
const CTLE = ['open_limit'];
// Code of control c in the Blocked Controls text v, or '' (allowed).
const ctlCode = (v, c) => ctlList(v)[c] || '';
// Reason (truthy) why control c is inert with code, or '' (allowed, or find running).
const ctlWhy = (t, c, code) => (!code || code === 'on' ? '' : code === 'none' ? t(CTLN[c] || K('x_unav')) : CTLW[code] ? t(CTLW[code]) : code);
const LONG_MS = 500;  // long press = history
// Zone N Manual: an opening is refused (ota_pv, open_limit); closing never.
const zoneCtl = { ctl: 'zone', off_on: true };
// Find Device: its answer shown while the firmware says it runs (find:on); a press restarts it.
const findRow = (m, t, name) => ({ k: 'find_device', name, edit: true, wide: true, ok: t(m.E('alarm_sound') ? K('find_ok') : K('x_find_led')), ctl: 'find' });
const silenceRow = (t, x = {}) => ({ k: 'silence_alarm', name: t('silence'), edit: true, ...x, ctl: 'silence' });

function statusView(m, t) {
  const E = m.E, has = (k) => !!E(k);
  const auxName = m.st('aux_label');
  // Zones as rows: a tile would show the switch state (On / Off) where the valve is Open / Closed.
  const zt = rows(m, m.zones.flatMap((n) => [
    { k: `zone_${n}_manual`, name: m.label(n), fmt: 'open', edit: true, zone: n, ...zoneCtl },
    // Always shown ("—" while empty): rows appearing on a command would resize the card.
    { k: `zone_${n}_end`, name: `${m.label(n)} · ${t('x_end')}`, fmt: 'ts', dash: true },
    // Firmware 2.6.0: the zone's own next start (empty = none); a rain skip is said by the banner.
    { k: `zone_${n}_next_start`, name: `${m.label(n)} · ${t('next')}`, fmt: 'ts', dash: true },
  ]).concat([
    // Inactive while it would do nothing: no zone open.
    { k: 'close_all_zone_valves', name: t('close_all'), edit: true, wide: true, confirm: t('x_close_q'), ctl: 'closeall' },
  ]), { irr: true, msg_top: true });
  return {
    type: 'sections', max_columns: 4,
    sections: [
      // No banner: its lines are in the cards (irrigation in Zones, health in Stato, weather in Duration adaptation).
      section([
        heading(t('st'), 'mdi:sprinkler-variant'),
        rows(m, [
          { k: 'zone_active', name: t('now_run'), fmt: 'zact' },
          // Valve Power: the state of the valve supply (read-only), tap = history like the other rows.
          { k: 'valve_power', name: t('vp'), fmt: 'pw', icon: ['mdi:power-plug', 'mdi:power-plug-off'] },
          { k: 'problems', name: t('x_problems'), fmt: 'prob', ref: E('irrigation_overlap_warning') || undefined },
          { k: 'next_irrigation', name: t('next'), fmt: 'next', ref: E('programs_paused') || undefined },
          { k: 'wind_resume', name: t('x_wind_res'), fmt: 'ts', dash: true },
          // Before firmware 2.6.0 (no Problems): the clock state.
          !has('problems') && { k: 'time_valid', name: t('x_tvalid'), fmt: 'yes' },
          // Firmware and Wi-Fi are in Diagnostics only; every row is always painted, so the card keeps its height.
        ]),
        // Full-width buttons, one per line, the state on the button (st: on / off text) and long press = history; a
        // tile cannot be inert. Aux and Silence Alarm (Waveshare only) inert as the firmware says.
        rows(m, [
          m.aux && { k: 'aux', name: auxName && !BAD.includes(auxName) ? auxName : t('aux_def'), edit: true, wide: true, st: [t('vp_on'), t('vp_off')], ctl: 'aux' },
          { k: 'programs_paused', name: t('pause'), edit: true, wide: true, st: [t('x_yes'), t('x_no')] },
          silenceRow(t, { wide: true }),
        ]),
        // Duration adaptation in the same section: below Stato in every layout (a section of its own flows beside it).
        heading(t('m_meth'), 'mdi:sprout'),
        rows(m, [
          // The method select; inert as the firmware says (meth:nosrc, no weather source).
          { k: 'irrigation_method', name: t('m_meth'), fmt: 'method', edit: true, ctl: 'meth' },
          { k: 'weather_data', name: t('x_wdata'), fmt: 'wdata', refs: [E('weather_days_used'), E('weather_fallback')].filter(Boolean) },
          // Method off: factor and ET0 shown as a dash (the method state as the device reports it). Ecowitt and its
          // battery are in Diagnostics, a flat battery also in Problems.
          { k: 'irrigation_factor', name: t('m_f'), dash_by: METHOD_OFF },
          { k: 'irrigation_et0_yesterday', name: t('m_et0y'), dash_by: METHOD_OFF },
        ]),
      ]),
      section([heading(t('zones'), 'mdi:map-marker-radius'), zt]),
      E('last_event') && section([
        heading(t('x_log'), 'mdi:history'),
        { type: 'custom:irry-events-card', device: m.dev.id, grid_options: { columns: 'full' } },
      ]),
      // Rain and wind in one column: each value with its threshold on one row.
      section([
        heading(`${t('rain')} · ${t('wind_h')}`, 'mdi:weather-windy'),
        rows(m, [
          { head: t('rain') },
          { k: 'rain_last_24h', name: `${t('m_r24')} / ${t('rain_thr')}`, fmt: 'pair', ref: E('rain_skip_threshold') || undefined },
          { k: 'rain_skip_active', name: t('rain_skip'), fmt: 'yes' },
          { head: t('wind_h') },
          { k: 'wind_mean_10_min', name: `${t('es_ws10')} / ${t('rain_thr')}`, fmt: 'pair', int: true, ref: E('wind_mean_threshold') || undefined },
          { k: 'weather_wind_gust', name: `${t('w_gust')} / ${t('rain_thr')}`, fmt: 'pair', int: true, ref: E('wind_gust_threshold') || undefined },
          { k: 'wind_over_threshold', name: t('x_wind_over'), fmt: 'yes' },
          { k: 'wind_pause', name: t('wp'), fmt: 'wpause' },
          // Ignored by the firmware without a wind pause or wait; its answer in the card's message line.
          { k: 'ignore_wind', name: t('wind_ign'), edit: true, wide: true, ok: t('wind_ignd'), ctl: 'windign' },
        ]),
      ]),
    ].filter(Boolean),
  };
}

function irrigationView(m, t) {
  const E = m.E, has = (k) => !!E(k), dev = m.dev.id;
  const zone = (n) => section([
    heading(zoneHead(m, t, n), 'mdi:sprinkler-variant'),
    rows(m, [
      // The end of the opening, in the format of the next start (a tile shows a long date).
      { k: `zone_${n}_end`, name: t('x_end'), fmt: 'ts', hide_empty: true },
      { k: `zone_${n}_next_start`, name: t('next'), fmt: 'ts', hide_empty: true },
      { k: `zone_${n}_manual`, name: t('x_man_open'), fmt: 'open', edit: true, zone: n, ...zoneCtl },
      { k: `zone_${n}_irrigation_factor`, name: t('x_zf') },
    ]),
    { type: 'custom:irry-slot-card', device: dev, zone: n, grid_options: { columns: 'full' } },
  ]);
  // Rapid alone in the first column, zones in row order on the other three (Z1 Z2 Z3 / Z4 Z5 Z6 / Z7): the sections
  // view packs columns by height, so the layout is the tabs card's own grid ("lead"), one tab and no bar.
  return tabbed(m, 'irrigation', [['all', t('r'), [
    section([
      heading(t('r'), 'mdi:flash'),
      rows(m, [{ k: 'irrigation_overlap_warning', name: t('ovl'), fmt: 'ovl', hide_empty: true }]),
      { type: 'custom:irry-rapid-card', device: dev, grid_options: { columns: 'full' } },
    ]),
    ...m.zones.map(zone),
  ]]], null, 'lead');
}

// Day: the device Day tab (timeline and day list), plan from the slot entities, history from get hist.
function dayView(m, t) {
  return {
    type: 'sections', max_columns: 4,
    sections: [section([{ type: 'custom:irry-day-card', device: m.dev.id, grid_options: { columns: 'full' } }], { column_span: 4 })],
  };
}

// 24-hour clock of the HA user (Profile → Time format), for mini-graph-card.
function hour24(h) {
  const f = h && h.locale && h.locale.time_format;
  if (f === '24') return true;
  if (f === '12') return false;
  try {
    const l = f === 'system' ? undefined : (h && h.locale && h.locale.language) || 'en';
    const c = new Intl.DateTimeFormat(l, { hour: 'numeric' }).resolvedOptions().hourCycle;
    return c === 'h23' || c === 'h24';
  } catch (e) { return true; }
}
// Graph decimals of the HA unit, as the device units table (°C 1, km/h 1, hPa 1, inHg 2, mm 1, in 2; % and W/m² 0).
function unitDec(m, k) {
  const s = m.so(k), u = s && s.attributes.unit_of_measurement, x = UNIT[u];
  if (!x) return 0;
  const d = DEV[x[0]].find((e) => e[0] === u);
  return d ? d[1] : DEV[x[0]][0][1];
}

function weatherView(m, t, opt = {}) {
  const E = m.E, has = (k) => !!E(k);
  const ce = typeof customElements !== 'undefined' ? customElements : { get: () => null };
  const ents = (ks) => ks.filter(([k]) => E(k)).map(([k, name]) => ({ entity: E(k), name }));
  const mini = !!ce.get('mini-graph-card') && opt.mini_graph !== false;
  const h24 = hour24(m.h);
  const graph = (title, ks) => {
    const e = ents(ks);
    if (!e.length) return null;
    return mini
      ? { type: 'custom:mini-graph-card', name: title, hours_to_show: 24, points_per_hour: 6, line_width: 2, entities: e,
        hour24: h24, decimals: unitDec(m, ks[0][0]),
        show: { legend: e.length > 1, average: true, extrema: true, labels: false, fill: false, points: false }, grid_options: { columns: 12 } }
      : { type: 'history-graph', title, hours_to_show: 24, entities: e, grid_options: { columns: 12 } };
  };
  const labels = {};
  WD_KEYS.forEach((k, i) => { labels[k] = t(WD[i]); });
  const rose = has('weather_wind_direction') && has('weather_wind_speed') && !!ce.get('windrose-card') && opt.windrose !== false && {
    type: 'custom:windrose-card', title: t('w_dir'), refresh_interval: 300, windspeed_bar_location: 'bottom',
    rose_config: { center_calm_percentage: true },
    direction_labels: { custom_labels: labels, show_cardinal_directions: true, show_intercardinal_directions: true,
      show_secondary_intercardinal_directions: false },
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
  const S = {
    wind: section([
        heading(t('es_g_wind'), 'mdi:weather-windy'),
        rose,
        ...(mini
          ? [graph(t('w_spd'), [['weather_wind_speed', t('w_spd')]]), graph(t('w_gust'), [['weather_wind_gust', t('w_gust')]])]
          : [graph(t('es_g_wind'), [['weather_wind_speed', t('w_spd')], ['wind_mean_10_min', t('es_ws10')], ['weather_wind_gust', t('w_gust')]])]),
      ]),
    sens: section([
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
          { k: 'weather_uv_index', name: t('es_uv'), fmt: 'num' },
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
          { k: 'weather_last_update', name: t('m_eco_rx'), fmt: 'tsago' },
          { k: 'weather_battery', name: t('m_batt'), fmt: 'batt' },
        ]),
      ]),
    graphs: section([
        heading(t('wx_g'), 'mdi:chart-line'),
        graph(t('m_t'), [['weather_temperature', t('es_g_out')], ['weather_indoor_temperature', t('es_g_in')]]),
        graph(t('m_rh'), [['weather_humidity', t('es_g_out')], ['weather_indoor_humidity', t('es_g_in')]]),
        graph(t('m_psl'), [['weather_pressure_sea_level', t('m_psl')]]),
        graph(t('m_rs'), [['weather_solar_radiation', t('m_rs')]]),
      ]),
    coef: section([
        heading(t('wx_c'), 'mdi:sprout'),
        { type: 'custom:irry-coef-card', device: m.dev.id, grid_options: { columns: 'full' } },
      ]),
    eco: has('weather_feed') && section([
        heading(t('m_eco'), 'mdi:access-point'),
        { type: 'custom:irry-eco-card', device: m.dev.id, grid_options: { columns: 'full' } },
      ]),
    rain: section([
        heading(t('rain'), 'mdi:weather-pouring'),
        graph(t('es_rr'), [['weather_rain_rate', t('es_rr')]]),
        has('weather_rain_today') && { type: 'statistics-graph', title: `${t('wx_7')} · ${t('x_rain_daily')}`,
          entities: [{ entity: E('weather_rain_today'), name: t('x_rain_daily') }],  // HA adds " (<stat type>)" to the name: no legend
          stat_types: ['change'], period: 'day', days_to_show: 7, chart_type: 'bar', hide_legend: true, grid_options: { columns: 12 } },
      ]),
  };
  // Tabs sized to one screen: values now, the graphs, the raw Ecowitt upload.
  return tabbed(m, 'weather', [['graphs', t('wx_g'), [S.wind, S.graphs, S.rain]], ['now', t('x_tab_now'), [S.sens, S.coef]], ['ecowitt', t('m_eco'), [S.eco]]], 'graphs');
}

function settingsView(m, t) {
  const E = m.E;
  // Weather source as the device: Ecowitt when the feed is paired or pairable; the HA fields stay editable otherwise
  // (HA has no source entity, so with no source they are the way to choose Home Assistant).
  const ECO = ['unpaired', 'stale', 'ok'], NOECO = ['none', ...BAD];
  // Installed firmware: HA ESPHome writes sw_version as "<project version> (ESPHome <version>)".
  const ver = String(m.dev.sw_version || '').split(' ')[0];
  const zone = (n) => section([
    heading(zoneHead(m, t, n), 'mdi:sprinkler-variant'),
    rows(m, [
      { k: `zone_${n}_label`, name: t('x_zname'), edit: true },
      { k: `zone_${n}_plant_type`, name: t('x_pt'), fmt: 'plant', edit: true },
      { k: `zone_${n}_sheltered_from_rain`, name: t('m_sh'), edit: true },
      { k: `zone_${n}_sheltered_from_wind`, name: t('m_wx'), edit: true },
    ]),
  ]);
  const S = {
    rain: section([
        heading(t('rain'), 'mdi:weather-pouring'),
        rows(m, [
          { k: 'rain_skip_threshold', name: t('rain_thr'), edit: true },
          { k: 'rain_entity', name: t('rain_ent'), edit: true, pick: 'sensor', pat: '^sensor\\.[a-z0-9_]+$', only: { k: 'weather_feed', state: NOECO } },
          { k: 'rain_attribute', name: t('rain_attr'), edit: true, only: { k: 'weather_feed', state: NOECO } },
          { note: t('m_rain_eco'), only: { k: 'weather_feed', state: ECO } },
        ]),
      ]),
    wind: section([
        heading(t('wind_h'), 'mdi:weather-windy'),
        rows(m, [
          { k: 'wind_mean_threshold', name: t('w_thr_u'), edit: true, int: true },
          { k: 'wind_gust_threshold', name: t('w_thr_g'), edit: true, int: true },
        ]),
      ]),
    wx: section([
        heading(t('wx'), 'mdi:weather-partly-cloudy'),
        rows(m, [
          { k: 'weather_feed', name: t('x_wsrc'), fmt: 'wsrc', refs: [E('weather_prefix'), E('rain_entity')].filter(Boolean) },
          { k: 'irrigation_method', name: t('m_meth'), fmt: 'method', edit: true, ctl: 'meth' },
          { k: 'weather_prefix', name: t('m_pfx'), edit: true, pat: '^sensor\\.[a-z0-9_]+$', only: { k: 'weather_feed', state: NOECO } },
        ]),
        E('irrigation_reference_et0') && { type: 'custom:irry-cal-card', device: m.dev.id, grid_options: { columns: 'full' } },
        rows(m, [
          { head: t('x_position') },
          { k: 'latitude', name: t('m_lat'), fmt: 'posv', ref: E('position_source') || undefined },
          { k: 'longitude', name: t('m_lon'), fmt: 'posv', ref: E('position_source') || undefined },
          { k: 'altitude', name: t('m_alt'), fmt: 'posv', ref: E('altitude_source') || undefined },
        ]),
      ]),
    buz: E('alarm_sound') && section([  // Waveshare only
        heading(t('buz'), 'mdi:volume-high'),
        rows(m, [
          { k: 'alarm_sound', name: t('buz'), fmt: 'buz', edit: true },
          { k: 'quiet_from', name: t('buz_from'), edit: true, only: { k: 'alarm_sound', state: 'Quiet Hours' } },
          { k: 'quiet_to', name: t('buz_to'), edit: true, only: { k: 'alarm_sound', state: 'Quiet Hours' } },
          { note: t('buz_h') },
          silenceRow(t),
        ]),
      ]),
    aux: section([
        heading(t('aux_def'), 'mdi:power-socket-eu'),
        rows(m, [
          { k: 'aux_label', name: t('aux_name'), edit: true },
          { k: 'aux_mode', name: t('aux_m'), fmt: 'aux', edit: true },
          { k: 'aux_on_delay', name: t('aux_ton'), edit: true },
          { k: 'aux_off_delay', name: t('aux_tof'), edit: true },
        ]),
      ]),
    sys: section([
        heading(t('s'), 'mdi:cog'),
        rows(m, [
          { k: 'units', name: t('units'), fmt: 'units', edit: true },
          { k: 'manual_max_duration', name: t('mmax'), edit: true },
          { head: t('fw') },
          { k: 'firmware_update_status', name: t('fwn'), fmt: 'fw' },
          { k: 'firmware_update_mode', name: t('x_fwm'), fmt: 'fwm', edit: true },
          { k: 'firmware_check', name: t('fwn_check'), edit: true, ctl: 'fwchk' },
          // Install (HA button, no force).
          { k: 'firmware_install', name: t('fwn_go'), fmt: 'fwgo', ref: E('firmware_update_status') || undefined, edit: true, ctl: 'fwinst' },
          { k: 'firmware_last_check', name: t('fwn_last'), fmt: 'tsago' },
        ]),
        m.action('get') && { type: 'custom:irry-notes-card', device: m.dev.id, grid_options: { columns: 'full' } },
        rows(m, [
          { head: t('time') },
          { k: 'time_zone', name: t('tz') },
          { k: 'rtc', name: t('rtc'), fmt: 'rtc' },
          { head: t('x_device') },
          { k: 'restart', name: t('restart_b'), confirm: t('x_restart_q'), edit: true },
        ]),
      ]),
    // Diagnostics (moved from Status): installed firmware, time, network, station.
    diag: section([
        heading(t('x_diag'), 'mdi:information-outline'),
        rows(m, [
          { head: t('fw') },
          ver && { name: t('fw_cur'), value: ver },
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
          { k: 'uptime', name: t('uptime'), fmt: 'dur' },
          { head: t('m_eco') },
          { k: 'weather_feed', name: t('x_eco_pair'), fmt: 'feed' },
          { k: 'weather_last_update', name: t('m_eco_rx'), fmt: 'tsago' },
          { k: 'weather_battery', name: t('m_batt'), fmt: 'batt' },
          // Find Device at the end of Diagnostics, full width (x8: LED only).
          findRow(m, t, t('find')),
        ]),
      ]),
  };
  return tabbed(m, 'settings', [['zones', t('zones'), m.zones.map(zone)], ['weather', t('wx'), [S.rain, S.wind, S.wx]], ['aux', t('aux_def'), [m.aux && S.aux]],
    ['system', t('s'), [S.sys, S.diag, S.buz]]]);
}

// HACS cards load in parallel with this file: wait (max HACS_WAIT ms) for the ones listed as dashboard resources, so
// the weather view does not drop them when this strategy registers first. One defined later regenerates the
// dashboard through shouldRegenerate (regenKey has the defined HACS cards).
const HACS_WAIT = 1500;
const HACS = ['windrose-card', 'mini-graph-card'];
async function hacsReady(hass) {
  if (typeof customElements === 'undefined' || HACS.every((n) => customElements.get(n))) return;
  let res = [];
  try { res = await hass.callWS({ type: 'lovelace/resources' }); } catch (e) { return; }
  if (!Array.isArray(res)) return;
  const want = HACS.filter((n) => !customElements.get(n) && res.some((r) => String(r.url || '').includes(n)));
  if (!want.length) return;
  await Promise.race([Promise.all(want.map((n) => customElements.whenDefined(n))), new Promise((ok) => setTimeout(ok, HACS_WAIT))]);
}

const VIEWS = { status: statusView, irrigation: irrigationView, day: dayView, weather: weatherView, settings: settingsView };
class IrryViewStrategy {
  static view(kind, config, hass) {
    const t = tr(lang(hass, config)), m = irryModel(hass, config && config.device, lang(hass, config));
    if (!m) return noDevice(t);
    return VIEWS[kind](m, t, config || {});
  }
}
class IrryStatusStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('status', c, h); } }
class IrryIrrigationStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('irrigation', c, h); } }
class IrryDayStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('day', c, h); } }
class IrryWeatherStrategy extends HTMLElement { static async generate(c, h) { await hacsReady(h); return IrryViewStrategy.view('weather', c, h); } }
class IrrySettingsStrategy extends HTMLElement { static async generate(c, h) { return IrryViewStrategy.view('settings', c, h); } }
class IrryDashboardStrategy extends HTMLElement {
  static async generate(config, hass) {
    const t = tr(lang(hass, config)), m = irryModel(hass, config && config.device, lang(hass, config));
    if (!m) return { title: 'Irry', views: [{ title: 'Irry', path: 'irry', ...noDevice(t) }] };
    const views = [
      { title: t('st'), path: 'status', icon: 'mdi:sprinkler-variant', ...statusView(m, t) },
      { title: t('x_irrigation'), path: 'irrigation', icon: 'mdi:calendar-clock', ...irrigationView(m, t) },
      { title: t('g'), path: 'day', icon: 'mdi:calendar-today', ...dayView(m, t) },
    ];
    if (m.E('weather_temperature') || m.E('weather_wind_speed')) {
      await hacsReady(hass);
      views.push({ title: t('wx'), path: 'weather', icon: 'mdi:weather-partly-cloudy', ...weatherView(m, t, config || {}) });
    }
    views.push({ title: t('cfg'), path: 'settings', icon: 'mdi:cog', ...settingsView(m, t) });
    return { title: m.dev.name_by_user || m.dev.name || 'Irry', views };
  }
}

// HA regenerates a strategy only on registry changes. What generate() reads from states (zone names, R8 Mode,
// Aux name, units) and the Irry actions change without one, so they are compared here as well.
const REGEN = new WeakMap();
function regenKey(hass, config) {
  if (!hass) return '';
  let c = REGEN.get(hass);
  if (!c) REGEN.set(hass, (c = new Map()));
  const want = (config && config.device) || '';
  if (!c.has(want)) {
    const m = irryModel(hass, want || undefined, 'en');
    c.set(want, JSON.stringify(m ? [[1, 2, 3, 4, 5, 6, 7, 8].map((n) => m.st(`zone_${n}_label`) ?? null),
      m.st('r8_mode') ?? null, m.st('aux_label') ?? null, m.st('units') ?? null,
      Object.keys((hass.services && hass.services.esphome) || {}).sort(),
      typeof customElements === 'undefined' ? [] : HACS.filter((n) => customElements.get(n))] : null));
  }
  return c.get(want);
}
function shouldRegenerate(config, oldHass, newHass) { return !!oldHass && regenKey(oldHass, config) !== regenKey(newHass, config); }
[IrryDashboardStrategy, IrryStatusStrategy, IrryIrrigationStrategy, IrryDayStrategy, IrryWeatherStrategy, IrrySettingsStrategy]
  .forEach((C) => { C.shouldRegenerate = shouldRegenerate; });

// ---------------------------------------------------------------- cards
const CSS = `
  .wrap{padding:0 16px 16px} .row{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:8px 0}
  .slot{border-top:1px solid var(--divider-color);padding-top:10px;margin-top:10px}
  .slot:first-child{border-top:0;margin-top:0}
  .sh{display:flex;align-items:center;gap:8px;cursor:pointer;min-height:32px} .sh .b{flex:1} .sh .sub{color:var(--secondary-text-color);font-weight:400}
  .sh .cv{color:var(--secondary-text-color);transition:transform .15s} .slot.open .sh .cv{transform:rotate(90deg)}
  .slot.off .sh .b{color:var(--secondary-text-color)} .est{font-size:13px;color:var(--secondary-text-color)}
  label{font-size:14px;color:var(--secondary-text-color);display:flex;gap:6px;align-items:center}
  input,select{font:inherit;color:var(--primary-text-color);background:var(--card-background-color,#fff);
    border:1px solid var(--divider-color);border-radius:6px;padding:4px 6px}
  select[aria-disabled=true]{cursor:default;border-style:dashed}
  input[type=number]{width:5em} .b{font-weight:500;color:var(--primary-text-color)}
  .days{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
  button.day{width:34px;height:34px;border-radius:50%;padding:0;font-weight:500;background:none;
    border:1px solid var(--divider-color);color:var(--secondary-text-color)}
  button.day.on{background:var(--primary-color);border-color:transparent;color:var(--text-primary-color,#fff);font-weight:700}
  button.day.all{width:auto;height:30px;border-radius:6px;padding:0 10px;margin-left:8px;align-self:center;font-size:13px;
    border:1px dashed var(--divider-color);color:var(--primary-color);background:none;font-weight:500}
  button.day.all.on{border-style:solid;border-color:var(--primary-color)}
  button{font:inherit;border:0;border-radius:6px;padding:6px 14px;cursor:pointer;background:var(--primary-color);color:var(--text-primary-color,#fff)}
  button.s{background:none;color:var(--primary-color);padding:2px 6px} button:disabled{opacity:.5;cursor:default}
  .r.wide{display:block;padding:6px 0} .r.wide + .r.wide{border-top:0;padding-top:0}
  button.w{display:flex;width:100%;min-height:40px;align-items:center;justify-content:center;gap:6px;background:rgba(127,127,127,.15);
    color:var(--primary-text-color);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
  button.w.on{background:var(--primary-color);color:var(--text-primary-color,#fff)} button.w .ws{font-weight:500} button.w .ws::before{content:'· '}
  button.w.ro{cursor:pointer} button.w[aria-disabled=true]{background:none;box-shadow:inset 0 0 0 1px var(--divider-color);color:var(--primary-text-color);cursor:default}
  button.w.on[aria-disabled=true]{box-shadow:inset 0 0 0 2px var(--primary-color)} button.w[aria-disabled=true] .ws{color:var(--primary-color)}
  button:not(.w)[aria-disabled=true]{background:none;box-shadow:inset 0 0 0 1px var(--divider-color);color:var(--secondary-text-color);cursor:default}
  .tg[aria-disabled=true]{cursor:default;outline:1px dashed var(--secondary-text-color);outline-offset:2px}
  button.mv{width:32px;height:32px;padding:0;border-radius:50%;background:none;color:var(--secondary-text-color);display:inline-flex;
    align-items:center;justify-content:center} button.mv:hover{background:rgba(127,127,127,.15);color:var(--primary-text-color)}
  button.mv:disabled{visibility:hidden} .z label{flex:1;color:var(--primary-text-color)}
  .step{display:inline-flex;align-items:center;gap:6px}
  .step button{width:30px;height:30px;padding:0;border-radius:50%;background:rgba(127,127,127,.18);color:var(--primary-text-color)}
  .step span{min-width:3.2em;text-align:center;color:var(--primary-text-color)}
  .tg{appearance:none;-webkit-appearance:none;width:36px;height:20px;border-radius:10px;border:0;padding:0;margin:0;
    background:rgba(127,127,127,.45);position:relative;cursor:pointer;flex:none}
  .tg::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
  .tg:checked{background:var(--primary-color)} .tg:checked::after{left:18px}
  .msg{font-size:14px;min-height:1.2em} .err{color:var(--error-color)} .ok{color:var(--success-color,#43a047)}
  .warn{color:var(--warning-color)}
  .z{display:flex;gap:6px;align-items:center;margin:2px 0}
  .rows{padding:4px 16px 8px} .r{display:flex;align-items:center;gap:12px;min-height:40px}
  .msg{height:2.6em;line-height:1.3em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:var(--secondary-text-color);font-size:.9em;border-top:1px solid var(--divider-color);padding-top:4px}
  .msg[data-k=err]{color:var(--error-color)} .msg[data-k=ok]{color:var(--success-color)} .msg[data-k=warn]{color:var(--warning-color)}
  .msg.top{border-top:0;border-bottom:1px solid var(--divider-color);padding:4px 0}
  .r + .r{border-top:1px solid var(--divider-color)}
  .r .n{flex:1;color:var(--secondary-text-color)} .r .ic{--mdc-icon-size:20px;color:var(--state-icon-color,var(--secondary-text-color));margin-right:-4px}
  .r .ic.on{color:var(--state-active-color,var(--primary-color))} .r .v{color:var(--primary-text-color);text-align:right}
  .r.tap{cursor:pointer} .r input[type=text]{width:12em} .r select{max-width:16em} .r ha-selector{flex:0 1 18em;min-width:12em}
  input.bad,input:invalid{border-color:var(--error-color)}
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
    this._l = lang(h, this._c);
    this._m = irryModel(h, this._c.device, this._l);
    this._t = tr(this._l);
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (this.busy()) return;  // keep what the user is editing
    // Same states, registries, language and theme as the last signature: nothing to do. A change of the card's own
    // state clears _sig (or _seen, for the minute tick) to be looked at again.
    const seen = [h.states, h.entities, h.devices, h.services, h.config, h.locale, h.themes, this._l];
    if (this._sig && this._seen && seen.every((x, i) => x === this._seen[i])) return;
    this._seen = seen;
    const sig = this.signature();
    if (sig === this._sig) return;
    this._sig = sig;
    this.load();
    this.paint();
  }
  // Editing: focus in a text field, a select or the HA entity picker (ha-selector).
  busy() {
    const a = this.shadowRoot.activeElement;
    return !!(a && /^(INPUT|SELECT|TEXTAREA|HA-SELECTOR)$/.test(a.tagName) && a.type !== 'checkbox');
  }
  load() {}
  ctx() { return { h: this._h, m: this._m, t: this._t, l: this._l }; }
  noDev() { this.shadowRoot.innerHTML = `<ha-card><div class="wrap">${esc(this._t('x_no_dev'))}</div></ha-card>`; }
  more(entityId) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true })); }
}

// Status alerts in the user language (a card, so it follows the states: a strategy only regenerates on registry changes).
const BANNER_KEYS = ['zone_active', 'programs_paused', 'rain_skip_active', 'rain_last_24h', 'rain_skip_threshold', 'wind_pause',
  'wind_resume', 'wind_over_threshold', 'time_valid', 'weather_data', 'weather_feed', 'weather_battery',
  'irrigation_overlap_warning', 'firmware_update_status', 'wi_fi_network', 'wi_fi_fallback_active', 'units',
  'wind_paused_zones', 'wind_waiting_zones', 'wind_skip_at', 'next_sheltered_start', 'next_sheltered_zone', 'problems',
  'weather_fallback', 'weather_days_used'];
function alerts(m, c) {
  const t = c.t, st = m.st, A = [], add = (type, text) => A.push([type, text]);
  if (st('zone_active') === 'unavailable') return [['error', t('offline')]];
  const L0 = irrLines(m, c, A);
  const pr = m.so('problems');
  if (pr && pr.state !== 'unknown') probCodes(pr.state).forEach((p) => add(p === 'clock_bad' ? 'error' : 'warning', probText(m, t, c.l, p)));
  else if (st('time_valid') === 'off') add('error', t('ch_time_bad'));
  const wd = st('weather_data');
  if (wd === 'missing') add('warning', t('x_wd_missing'));
  if (wd === 'fallback') { const u = wdUsed(m, t); add('info', u ? `${t('m_data')}: ${u}` : t('x_wd_fallback')); }  // x_wd_fallback: before 2.6.1
  const fd = st('weather_feed');
  if (fd === 'unpaired') add('warning', t('x_feed_unpaired'));
  if (fd === 'stale') add('warning', t('x_feed_stale'));
  if (st('weather_battery') === 'on') add('warning', `${t('m_batt')}: ${t('m_batt_low')}`);
  const ov = st('irrigation_overlap_warning');
  if (!pr && ov && !BAD.includes(ov)) add('info', `${t('ovl')}: ${ovlText(m, t, c.l, ov)}`);
  const fw = st('firmware_update_status') || '';
  if (/ available/.test(fw)) add('info', fwText(t, fw));
  if (st('wi_fi_fallback_active') === 'on' || st('wi_fi_network') === 'fallback') add('info', t('x_wifi_fb'));
  if (!A.length) return [['success', t('allok')]];
  return L0 ? A : [['info', `${t('now_run')}: —`], ...A];
}
// Irrigation lines (running zone and pause in one, rain skip, wind) into A; returns the running / pause line or null.
// The banner and the message line of the Zones card.
function irrLines(m, c, A = []) {
  const t = c.t, st = m.st, add = (type, text) => A.push([type, text]);
  const f = (k) => { const s = m.so(k); return s ? fmtState('', s, c) : ''; };
  if (st('zone_active') === 'unavailable') { add('error', t('offline')); return null; }
  // Running zone and pause share one line, always there: a line added by a command would resize the banner.
  const za = st('zone_active'), run = za && za !== '-' && !BAD.includes(za), pz = st('programs_paused') === 'on';
  const L0 = pz ? ['warning', run ? `${t('paused')} · ${t('now_run')}: ${za}` : t('paused')] : run ? ['info', `${t('now_run')}: ${za}`] : null;
  if (L0) add(...L0);
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
  return L0;
}
class IrryBannerCard extends IrryCard {
  connectedCallback() { this._tick = setInterval(() => { if (this._h) { this._seen = null; this.hass = this._h; } }, 60e3); }
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

// Conditional row (only: { entity, state }): shown while that entity has that state (or one of a list).
function rowShown(h, row) { return !row.only || [].concat(row.only.state).includes((h.states[row.only.entity] || {}).state); }
// Rows: { entity, name, fmt, edit, hide_empty, ref, refs, confirm } or { head }.
// Read-only rows open the HA more-info dialog; edit rows write with the entity's own service.
// A toggle keeps the requested state until the entity reports it, at most PEND_MS (as PEND in the device UI).
const PEND_MS = 10e3, ERR_MS = 3e3;
const EMPTY = (v) => !v || v === '-' || BAD.includes(v);
class IrryRowsCard extends IrryCard {
  getCardSize() { return 1 + ((this._c && this._c.rows) || []).length; }
  // Pending toggles: dropped once the entity has the requested state, or after PEND_MS.
  settle() {
    const pd = this._pd || {}, now = Date.now();
    for (const [e, x] of Object.entries(pd)) if (((this._h.states[e] || {}).state === x.v) || now - x.at >= (this._pms || PEND_MS)) delete pd[e];
    return pd;
  }
  signature() {
    if (!this._m) return 'none';
    const h = this._h, ids = [], pd = this.settle();
    for (const r of this._c.rows || []) ids.push(r.entity, r.ref, r.only && r.only.entity, ...(r.refs || []), r.ctl && r.ctl.entity, r.dash_by && r.dash_by.entity);
    // irr: the irrigation lines of the banner (minute: the wind resume countdown).
    if (this._c.irr) ids.push(...BANNER_KEYS.map(this._m.E), ...this._m.zones.map((n) => this._m.E(`zone_${n}_sheltered_from_rain`)));
    return JSON.stringify([this._l, this._m.imp, this._m.zones.map(this._m.label), this._err || '', this._why || '', this._whyK || '', this._ok || '', pd,
      this._c.irr && this._m.st('wind_pause') === 'paused' ? Math.floor(Date.now() / 60000) : 0,
      ids.map((i) => { const s = i && h.states[i]; return s && [s.state, s.attributes.unit_of_measurement]; })]);
  }
  paint() {
    const r = this.shadowRoot, c = this.ctx(), t = this._t, h = this._h;
    if (!this._m) return this.noDev();
    const avail = (row) => ((h.states[row.ref] || {}).state || '').match(/^(\S+) available/);
    const list = (this._c.rows || []).map((row, i) => ({ row, i, s: row.entity && h.states[row.entity] }))
      .filter(({ row }) => rowShown(h, row))
      .filter(({ row, s }) => row.head || row.note || row.value || (s && !(row.hide_empty && EMPTY(s.state))))
      .filter(({ row }) => row.fmt !== 'fwgo' || avail(row));
    const html = [];
    list.forEach(({ row, i, s }, j) => {
      if (row.head) {
        if (list[j + 1] && !list[j + 1].row.head) html.push(`<div class="h">${esc(row.head)}</div>`);
        return;
      }
      if (row.note) { html.push(`<div class="note">${esc(row.note)}</div>`); return; }
      if (row.value) { html.push(`<div class="r"><span class="n">${esc(row.name)}</span><span class="v">${esc(row.value)}</span></div>`); return; }
      const dom = row.entity.split('.')[0];
      const name = row.fmt === 'fwgo' ? t('fwn_go', { ver: avail(row)[1] }) : row.name;
      if (row.wide) { html.push(`<div class="r wide">${this.wide(dom, row, s, i, name)}</div>`); return; }
      const ctl = row.edit ? this.control(dom, row, s, i, name) : null;
      html.push(ctl
        ? `<div class="r"><span class="n">${dom === 'button' ? '' : esc(name)}</span>${ctl}</div>`
        : `<div class="r tap" data-more="${esc(row.entity)}">${row.icon ? `<ha-icon class="ic${s.state === 'on' ? ' on' : ''}" icon="${esc(row.icon[s.state === 'on' ? 0 : 1])}"></ha-icon>` : ''}<span class="n">${esc(name)}</span><span class="v">${esc(((x) => ((row.dash && (EMPTY(s.state) || x === '-')) || (row.dash_by && (h.states[row.dash_by.entity] || {}).state === row.dash_by.state) ? '—' : x))(fmtState(row.fmt, s, c, row)))}</span></div>`);
    });
    // Message line, reserved (empty) on cards that write: the card keeps its height. Refusal, then the
    // confirmation of a button (row.ok), then (irr) the irrigation lines of the banner. msg_top: above the rows.
    const il = [];
    if (this._c.irr) irrLines(this._m, c, il);
    // A control running on the device (find:on): its answer while it runs.
    const run = (this._c.rows || []).find((x) => x.ok && x.ctl && ctlCode((h.states[x.ctl.entity] || {}).state, x.ctl.c) === 'on');
    const ok = this._ok || (run && run.ok);
    const [mk, mt] = this._err ? ['err', this._err] : this._why ? [this._whyK || 'warn', this._why] : ok ? ['ok', ok]
      : il.length ? [il.some(([y]) => y !== 'info') ? 'warn' : 'info', il.map(([, x]) => x).join(' · ')] : ['', ''];
    const msg = this._c.irr || (this._c.rows || []).some((x) => x.edit)
      ? `<div class="msg${this._c.msg_top ? ' top' : ''}" data-k="${mk}" role="status" title="${esc(mt)}">${esc(mt)}</div>` : '';
    const top = this._c.msg_top ? msg : '', bot = this._c.msg_top ? '' : msg;
    r.innerHTML = `<style>${CSS}</style><ha-card>${this._c.title ? `<h1 class="card-header">${esc(this._c.title)}</h1>` : ''}<div class="rows">${top}${html.join('')}${bot}</div></ha-card>`;
    r.querySelectorAll('[data-more]').forEach((el) => el.addEventListener('click', () => this.more(el.dataset.more)));
    // Long press (or right click) on a full-width switch: its history; the click that follows is not a command.
    r.querySelectorAll('[data-lp]').forEach((el) => {
      let tm = 0;
      const stop = () => clearTimeout(tm);
      el.addEventListener('pointerdown', () => { stop(); this._lp = false; tm = setTimeout(() => { this._lp = true; this.more(el.dataset.lp); }, LONG_MS); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((x) => el.addEventListener(x, stop));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); stop(); this.more(el.dataset.lp); });
    });
    r.querySelectorAll('[data-i]').forEach((el) => {
      const row = this._c.rows[+el.dataset.i];
      // Full-width switch: a button whose press asks the other state (aria-pressed = the state shown).
      if (el.dataset.w) el.addEventListener('click', () => { if (this._lp) { this._lp = false; return; } this.write(row, { checked: el.getAttribute('aria-pressed') !== 'true', blur: () => el.blur() }); });
      else if (el.classList.contains('tg')) {
        // Inert toggle: the tap does not move it (preventDefault), its reason is shown.
        el.addEventListener('click', (e) => {
          const s = this._h.states[row.entity], p = this._pd && this._pd[row.entity], why = s && this.inert(row, p ? { ...s, state: p.v } : s);
          if (why) { e.preventDefault(); this.deny(row, why); }
        });
        el.addEventListener('change', () => this.write(row, el));
      } else el.addEventListener(el.tagName === 'BUTTON' ? 'click' : 'change', () => this.write(row, el));
    });
    // Entity picker of HA (ha-selector, loaded by the HA frontend) in place of a text field.
    r.querySelectorAll('[data-pk]').forEach((el) => {
      const row = this._c.rows[+el.dataset.pk], s = h.states[row.entity], p = document.createElement('ha-selector');
      p.hass = h;
      p.selector = { entity: { domain: row.pick } };
      p.value = BAD.includes(s.state) ? '' : s.state;
      p.addEventListener('value-changed', (e) => this.write(row, { value: (e.detail && e.detail.value) || '', blur() {} }));
      el.replaceWith(p);
    });
  }
  // Inert: the firmware blocks the row's control (off_on: only while the switch is off, the closing is always
  // allowed). The reason (truthy) or ''.
  inert(row, v) {
    if (!row.ctl || (row.off_on && v && v.state === 'on')) return '';
    return ctlWhy(this._t, row.ctl.c, ctlCode((this._h.states[row.ctl.entity] || {}).state, row.ctl.c));
  }
  // Tap on an inert control: its reason in the message line for ERR_MS, no command.
  deny(row, why) {
    // A full-width switch: its history is on the long press.
    const lp = row.wide && /^(switch|input_boolean)\./.test(row.entity) ? ` · ${this._t('x_why_hist')}` : '';
    const msg = this._why = `${row.name || row.entity}: ${why}${lp}`;
    this._whyK = row.ctl && CTLE.includes(ctlCode((this._h.states[row.ctl.entity] || {}).state, row.ctl.c)) ? 'err' : 'warn';
    this._sig = ''; this.hass = this._h;
    setTimeout(() => { if (this._why === msg) { this._why = ''; this._sig = ''; if (this._h) this.hass = this._h; } }, this._ems || ERR_MS);
  }
  // Full-width button: a press (button, filled while it can act), a switch with its state on the button (filled while
  // on), or a read-only state (tap = history). Inert: aria-disabled (outlined, readable), a tap says why, long press
  // = history; unavailable: disabled.
  wide(dom, row, s, i, name) {
    const t = this._t, una = s.state === 'unavailable';
    if (dom === 'button') {
      const ia = !una && this.inert(row, s);
      return `<button class="w${ia || una ? '' : ' on'}" data-i="${i}"${una ? ' disabled' : ia ? ' aria-disabled="true"' : ''}>${esc(name)}</button>`;
    }
    const p = this._pd && this._pd[row.entity], v = p ? { ...s, state: p.v } : s, on = v.state === 'on', st = row.st || [t('vp_on'), t('vp_off')];
    const txt = BAD.includes(v.state) ? t('x_unav') : on ? st[0] : st[1];
    const sw = row.edit && (dom === 'switch' || dom === 'input_boolean'), off = sw && (una || this.inert(row, v));
    const act = sw ? `data-i="${i}" data-w="1" data-lp="${esc(row.entity)}"` : `data-more="${esc(row.entity)}"`;
    return `<button class="w${on ? ' on' : ''}${sw ? '' : ' ro'}" ${act} aria-pressed="${on}"${off ? ' aria-disabled="true"' : ''}>`
      + `<span>${esc(name)}</span><span class="ws">${esc(txt)}</span></button>`;
  }
  // Writable control for the row, or null (read-only domain).
  control(dom, row, s, i, name) {
    const a = s.attributes, t = this._t, dis = s.state === 'unavailable' ? ' disabled' : '';
    if (dom === 'switch' || dom === 'input_boolean') {
      const p = this._pd && this._pd[row.entity], v = p ? { ...s, state: p.v } : s;
      return `${row.fmt ? `<span class="v">${esc(fmtState(row.fmt, v, this.ctx(), row))}</span>` : ''}`
        + `<input class="tg" type="checkbox" data-i="${i}"${v.state === 'on' ? ' checked' : ''}${dis || (this.inert(row, v) ? ' aria-disabled="true"' : '')}>`;
    }
    if (dom === 'select') {
      const tx = (x) => (OPT[row.fmt] && OPT[row.fmt][x] ? t(OPT[row.fmt][x]) : x);
      const o = (a.options || []).map((x) => `<option value="${esc(x)}"${x === s.state ? ' selected' : ''}>${esc(tx(x))}</option>`);
      return `<select data-i="${i}"${dis || (this.inert(row, s) ? ' aria-disabled="true"' : '')}>${o.join('')}</select>`;
    }
    if (dom === 'text') {
      if (row.pick && typeof customElements !== 'undefined' && customElements.get('ha-selector') && !dis) return `<span data-pk="${i}"></span>`;
      return `<input type="text" data-i="${i}" maxlength="${a.max || 255}" value="${esc(BAD.includes(s.state) ? '' : s.state)}"`
        + `${row.pat ? ` pattern="${esc(row.pat)}" spellcheck="false" autocapitalize="off" title="${esc(t('x_bad_ent'))}"` : ''}${dis}>`;
    }
    if (dom === 'number') {
      // int: whole numbers in the device unit (wind thresholds in km/h or mph), written back on the entity step.
      const v = parseFloat(s.state), u = a.unit_of_measurement, x = devValue(v, u, this._m.imp), whole = row.int && x;
      const show = x ? String(+x[0].toFixed(whole ? 0 : x[2])) : isNaN(v) ? '' : String(v);
      return `<label><input type="number" step="${whole ? 1 : 'any'}" data-i="${i}" value="${esc(show)}"${dis}> ${esc(x ? x[1] : u || '')}</label>`;
    }
    if (dom === 'button') {
      return `<button data-i="${i}"${dis || (this.inert(row, s) ? ' aria-disabled="true"' : '')}>${esc(name)}</button>`;
    }
    if (dom === 'time') return `<input type="time" data-i="${i}" value="${esc(/^\d\d:\d\d/.test(s.state) ? s.state.slice(0, 5) : '')}"${dis}>`;
    return null;
  }
  async write(row, el) {
    // The reason is shown in the card: HA's own toast (notifyOnError, 5th argument) stays off.
    const h = this._h, call = (d, sv, data, tg) => h.callService(d, sv, data, tg, false), s = h.states[row.entity], dom = row.entity.split('.')[0], target = { entity_id: row.entity };
    // An inert control sends nothing: its reason in the message line.
    const why = s && this.inert(row, s);
    if (why) { el.blur(); this.deny(row, why); return; }
    this._err = ''; this._ok = ''; this._why = '';
    try {
      // Zone N Manual: the zone action (firmware 2.6.1) answers why an opening is refused; the switch does not.
      const za = row.zone && this._m && this._m.action('zone');
      if (za || dom === 'switch' || dom === 'input_boolean') {
        // Requested state shown at once and kept until the entity reports it (or PEND_MS, then the real state).
        const e = row.entity, at = Date.now();
        (this._pd = this._pd || {})[e] = { v: el.checked ? 'on' : 'off', at };
        setTimeout(() => { if (this._pd[e] && this._pd[e].at === at) { this._sig = ''; if (this._h) this.hass = this._h; } }, (this._pms || PEND_MS) + 50);
      }
      if (za) await call('esphome', za, { zone: row.zone, on: !!el.checked });
      else if (dom === 'switch' || dom === 'input_boolean') await call(dom, el.checked ? 'turn_on' : 'turn_off', {}, target);
      else if (dom === 'select') await call('select', 'select_option', { option: el.value }, target);
      else if (dom === 'text') {
        if (row.pat && el.value && !new RegExp(row.pat).test(el.value)) { if (el.classList) el.classList.add('bad'); return; }
        await call('text', 'set_value', { value: el.value }, target);
      }
      else if (dom === 'time') { if (el.value) await call('time', 'set_value', { time: `${el.value.slice(0, 5)}:00` }, target); }
      else if (dom === 'button') {
        if (row.confirm && !window.confirm(row.confirm)) return;
        await call('button', 'press', {}, target);
        // A visible answer for a press whose effect may not show at once (Ignore Wind, Find Device), gone after
        // ERR_MS (Find Device: then kept while the firmware says it runs).
        if (row.ok) { const ok = this._ok = row.ok; setTimeout(() => { if (this._ok === ok) { this._ok = ''; this._sig = ''; if (this._h) this.hass = this._h; } }, this._ems || ERR_MS); }
      } else if (dom === 'number') {
        // Shown in the device unit, written in the entity's own unit, on its step and within its range.
        const a = s.attributes, u = a.unit_of_measurement, x = devValue(parseFloat(s.state), u, this._m.imp);
        let v = parseFloat(String(el.value).replace(',', '.'));
        if (isNaN(v)) throw new Error('number');
        if (x) v = toUnit(v, x[1], u);
        const step = a.step || 1;
        v = Math.min(a.max ?? v, Math.max(a.min ?? v, Math.round(v / step) * step));
        await call('number', 'set_value', { value: +v.toFixed(6) }, target);
      }
    } catch (e) {
      // Refused or invalid: the reason above the rows, and the device value again.
      if (this._pd) delete this._pd[row.entity];
      const msg = this._err = `${row.name || row.entity}: ${errText(this._m, this._t, this._l, e)}`;
      // Gone after ERR_MS, unless a newer error replaced it.
      setTimeout(() => { if (this._err === msg) { this._err = ''; this._sig = ''; if (this._h) this.hass = this._h; } }, this._ems || ERR_MS);
    }
    el.blur();
    // Repaint from the newest hass: the new state may have arrived while the call was running.
    this._sig = '';
    this.hass = this._h;
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
      <label>${esc(this._durLbl || t('dur'))} ${step('duration', v.duration, 'min')}</label>${this.est ? this.est(v) : ''}</div>
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
// Today's zone factor (%) while the method adapts the durations, else null.
function zoneFactor(m, n) {
  const meth = m.st('irrigation_method'), f = parseFloat(m.st(`zone_${n}_irrigation_factor`));
  if (!meth || meth === METH_NONE || BAD.includes(meth) || m.st(`zone_${n}_plant_type`) === 'Not adapted' || isNaN(f)) return null;
  return f;
}
class IrrySlotCard extends IrryEditCard {
  setConfig(c) { super.setConfig(c); this._open = new Set(); }
  factor() { return zoneFactor(this._m, this._c.zone); }
  est(v) { const f = this.factor(); return f == null || !v.duration ? '' : `<span class="est">${esc(this._t('x_today_est', { min: Math.round((v.duration * f) / 100) }))}</span>`; }
  signature() {
    const m = this._m, n = this._c.zone;
    if (!m) return 'none';
    return JSON.stringify([this._l, m.label(n), [1, 2, 3].map((s) => slotFrom(m, n, s)), this.factor()]);
  }
  load() { this._v = this._m ? [1, 2, 3].map((s) => slotFrom(this._m, this._c.zone, s)) : []; }
  val(k) { return this._v[+k]; }
  // One line per slot (title, days, switch); a tap opens the fields of an enabled slot.
  paint() {
    const t = this._t, r = this.shadowRoot, l = this._l;
    if (!this._m) return this.noDev();
    const dn = dayNames(l);
    const when = (v) => (v.mode === 'week' ? (v.days.length === 7 ? t('all') : v.days.map((d) => dn[DAYS.indexOf(d)]).join(' '))
      : v.mode === 'every' ? `${t('dm_every')} (${v.every_n})` : t('dm_' + v.mode));
    const sl = this._v.map((v, i) => {
      const open = v.enabled && this._open.has(i);
      return `<div class="slot${v.enabled ? '' : ' off'}${open ? ' open' : ''}">
      <div class="sh" data-open="${i}">${v.enabled ? '<span class="cv">›</span>' : ''}<span class="b">${esc(t('slot'))} ${i + 1}`
        + `${v.enabled ? ` · ${esc(v.start)} · ${v.duration} min <span class="sub">· ${esc(when(v))}</span>` : ''}</span>
        <input class="tg" type="checkbox" data-k="${i}" data-f="enabled" title="${esc(t('active'))}"${v.enabled ? ' checked' : ''}></div>
      ${open ? `<div class="body">${this.fields(v, i)}</div>` : ''}${this.msgHtml(i)}</div>`;
    }).join('');
    r.innerHTML = `<style>${CSS}</style><ha-card><div class="wrap" style="padding-top:12px">${sl}</div></ha-card>`;
    this.wire();
    r.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('tg')) return;
      const i = +el.dataset.open;
      if (this._open.has(i)) this._open.delete(i); else this._open.add(i);
      this.paint();
    }));
  }
  // Clicks and edits close together make one write; a slot switched on opens.
  changed(i, repaint) {
    if (this._v[+i].enabled) this._open.add(+i);
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
  signature() {
    const m = this._m;
    return m ? JSON.stringify([this._l, this._slot, this._rk, m.zones.map((n) => [m.label(n), slotFrom(m, n, this._slot)])]) : 'none';
  }
  // Rapid flag per slot from the firmware (get prog rk, it7::rapid_kind: 0 empty, 1 uniform, 2 mixed), fetched again
  // when a slot or the Sequence Order changes; an error leaves no flag until the next change.
  prog() {
    const m = this._m;
    if (!m || !m.action('get')) return;
    const key = JSON.stringify([m.zones.map((n) => [1, 2, 3].map((s) => slotFrom(m, n, s))), m.st('sequence_order')]);
    if (key === this._pk) return;
    this._pk = key;
    irryGet(this._h, m, 'prog', 0).then((j) => { this._rk = j && Array.isArray(j.rk) ? j.rk : null; }, () => { this._rk = null; })
      .finally(() => { this._sig = ''; if (this._h) this.hass = this._h; });
  }
  // From the slot as it is now: the enabled zones by start time, the first one's start / duration / days.
  // With a draft (_edit) only the zone list follows the device (a zone gone or added: R8 Mode); labels, the
  // unavailable state and the rest repaint from the new states without losing what the user set.
  load() {
    const m = this._m;
    if (!m) return;
    this.prog();
    if (this._edit && this._v) {
      this._order = [...this._order.filter((n) => m.zones.includes(n)), ...m.zones.filter((n) => !this._order.includes(n))];
      this._inc = new Set([...this._inc].filter((n) => m.zones.includes(n)));
      return;
    }
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
  kind() {
    const k = this._rk ? this._rk[this._slot - 1] : null;
    return k == null ? '' : `<span class="${k === 1 ? 'ok' : ''}">${esc(this._t([K('empty'), K('uni'), K('mixed')][k] || K('mixed')))}</span>`;
  }
  val() { return this._v; }
  changed(key, repaint) { this._edit = true; super.changed(key, repaint); }
  paint() {
    const t = this._t, r = this.shadowRoot, m = this._m;
    if (!m) return this.noDev();
    const so = [1, 2, 3].map((s) => `<option value="${s}"${s === this._slot ? ' selected' : ''}>${esc(t('slot'))} ${s}</option>`).join('');
    // Order buttons: move the zone one place up / down (hidden where it cannot move).
    const last = this._order.length - 1;
    const mv = (i, d, k, path) => `<button class="mv" data-mv="${i}" data-d="${d}"${(d < 0 ? !i : i === last) ? ' disabled' : ''}`
      + ` title="${esc(t(k))}" aria-label="${esc(t(k))}"><svg viewBox="0 0 24 24" width="20" height="20"><path d="${path}" fill="currentColor"/></svg></button>`;
    const zl = this._order.map((n, i) => `<div class="z">
      <label><input type="checkbox" data-zone="${n}"${this._inc.has(n) ? ' checked' : ''}> ${esc(m.label(n))}</label>
      ${mv(i, -1, K('up'), 'M7 14l5-5 5 5z')}${mv(i, 1, K('x_down'), 'M7 10l5 5 5-5z')}</div>`).join('');
    const off = [1, 2, 3].filter((s) => s !== this._slot).map((s) =>
      `<label><input type="checkbox" data-off="${s}"${this._off.has(s) ? ' checked' : ''}> ${esc(t('turn_off_slot', { slot: s }))}</label>`).join('');
    r.innerHTML = `<style>${CSS}</style><ha-card><div class="wrap" style="padding-top:16px">
      <div class="row"><select data-slot>${so}</select>${this.kind()}</div>
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
    r.querySelectorAll('[data-mv]').forEach((el) => el.addEventListener('click', () => {
      const i = +el.dataset.mv, j = i + +el.dataset.d, o = this._order;
      [o[j], o[i]] = [o[i], o[j]];
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
const GET_RETRY = 60e3;
class IrryGetCard extends IrryCard {
  setConfig(c) { super.setConfig(c); this._d = {}; this._ver = 0; }
  // Every minute: the day may have changed (signature), and errors are retried.
  connectedCallback() { this._tick = setInterval(() => { if (this._h) { this._seen = null; this.hass = this._h; } }, 60e3); }
  disconnectedCallback() { clearInterval(this._tick); }
  // Reply of get what/arg, fetched when older than maxAge ms (Infinity: once); undefined while loading.
  got(what, arg, maxAge) {
    const key = `${what}/${arg}`, c = this._d[key];
    if (!this._m || !this._m.action('get')) return undefined;
    if (c && (c.busy || Date.now() - c.at < (c.err ? Math.min(maxAge, GET_RETRY) : maxAge))) return c.j;
    this._d[key] = { j: c && c.j, at: c ? c.at : 0, busy: 1 };
    irryGet(this._h, this._m, what, arg)
      .then((j) => { this._d[key] = { j, at: Date.now() }; })
      .catch(() => { this._d[key] = { j: c && c.j, at: Date.now(), err: 1 }; })
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
  .tlax{position:relative;height:14px;margin:12px 0 6px 100px;font-size:11.5px;color:var(--secondary-text-color)}
  .tlax span{position:absolute;transform:translateX(-50%)} .tlax span:first-child{transform:none} .tlax span.e{transform:translateX(-100%)}
  .tk{position:absolute;top:0;bottom:0;width:1px;background:var(--divider-color)}
  .ovw{position:absolute;top:0;bottom:0;background:rgba(255,152,0,.28);border-left:1px solid var(--warning-color,#ff9800);border-right:1px solid var(--warning-color,#ff9800)}
  .ovw.er{background:rgba(219,68,55,.25);border-color:var(--error-color)}
  .ovw.po{background:rgba(255,152,0,.1);border-style:dashed;border-color:rgba(255,152,0,.7)}
  .ovs summary{cursor:pointer} .ovs ul{margin:6px 0 0;padding-left:18px}
  .zt{display:flex;justify-content:flex-end;margin-top:6px} .zt button{background:none;color:var(--primary-color);padding:2px 6px;font-size:12.5px}
  .tlr{display:flex;align-items:center;gap:8px;margin:7px 0}
  .tlr .n{width:92px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none;color:var(--secondary-text-color)}
  .tlt{flex:1;position:relative;height:26px;border-radius:8px;overflow:hidden;background:rgba(127,127,127,.12)}
  .bar{position:absolute;top:4px;bottom:4px;border-radius:5px;min-width:3px;box-sizing:border-box}
  .bar.pl{border:2px solid;background:none} .bar.pl.pa{opacity:.45}
  .nowl{position:absolute;top:0;bottom:0;width:2px;background:var(--error-color);border-radius:2px}
  .lg{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:12px;font-size:12px;color:var(--secondary-text-color)}
  .lg span{display:flex;gap:6px;align-items:center} .lg i{width:12px;height:10px;border-radius:3px;display:inline-block;box-sizing:border-box}
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
// Timeline range in minutes: first start - 1 h to last end + 1 h on whole hours (at least 4 h), or the whole day.
function dayRange(bars, full) {
  let lo = 0, hi = 1440;
  if (!full && bars.length) {
    lo = Math.max(0, Math.floor((Math.min(...bars.map((b) => b.a)) - 60) / 60) * 60);
    hi = Math.min(1440, Math.ceil((Math.max(...bars.map((b) => b.b)) + 60) / 60) * 60);
    if (hi - lo < 240) { const c = Math.round((lo + hi) / 120) * 60; lo = Math.max(0, Math.min(c - 120, 1200)); hi = lo + 240; }
  }
  return [lo, hi];
}
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
    const td = devToday(this._m);
    return JSON.stringify([this._l, this._g, this._full, td, this._ver, this.dark(), m.zones.map(m.label), devSlots(m), !!m.action('get'),
      m.zones.map((n) => zoneFactor(m, n))]);
  }
  paint() {
    const m = this._m, t = this._t, l = this._l, r = this.shadowRoot;
    if (!m) return this.noDev();
    const g = this._g, td = devToday(this._m), Z = devSlots(m), svc = !!m.action('get');
    const jr = g <= 0 ? this.hist(td.dn + g, td) : null, jy = g <= 0 ? this.hist(td.dn + g - 1, td) : null;
    const D = dayModel(Z, g, td, jr && jr.r, jy && jy.r, m.zones.map((n) => zoneFactor(m, n))), dn = D.dn, nm = D.nm, HO = this._ho, zn = m.zones.map(m.label);
    const all = D.rows.flatMap((x) => x.bars).filter((b) => b.b > b.a), [lo, hi] = dayRange(all, this._full);
    const zoomed = lo > 0 || hi < 1440, sp = hi - lo, P = (x) => ((Math.min(hi, Math.max(lo, x)) - lo) / sp) * 100;
    const stp = [60, 120, 180, 240, 360].find((v) => sp / v <= 8) || 360;
    const ticks = []; for (let x = Math.ceil(lo / stp) * stp; x <= hi; x += stp) ticks.push(x);
    // Solid = done (history), outline = planned (faded once past), hatched = tail from the day before.
    const one = (b) => {
      const a = Math.max(b.a, lo), e = Math.min(b.b, hi);
      if (e <= a) return '';
      const c = dcol(b.c), pos = `left:${P(a)}%;width:${Math.max(P(e) - P(a), 0.6)}%;`;
      if (b.tl) return `<i class="bar" style="${pos}${hatch(c)}"></i>`;
      if (b.h) return `<i class="bar" style="${pos}background:${c}"></i>`;
      return `<i class="bar pl${b.past ? ' pa' : ''}" style="${pos}border-color:${c}"></i>`;
    };
    const ovw = (zi) => D.ov.filter((w) => w.zs.includes(zi) && w.b > lo && w.a < hi)
      .map((w) => `<i class="ovw${D.pos ? ' po' : w.zs.length > MAXO ? ' er' : ''}" style="left:${P(w.a)}%;width:${P(w.b) - P(w.a)}%"></i>`).join('');
    const tks = ticks.map((x) => (x > lo && x < hi ? `<i class="tk" style="left:${P(x)}%"></i>` : '')).join('');
    const tl = D.rows.map((x) => `<div class="tlr"><span class="n">${esc(zn[x.zi])}</span><div class="tlt">${tks}${ovw(x.zi)}${x.bars.map(one).join('')}`
      + `${nm < lo || nm >= hi ? '' : `<i class="nowl" style="left:${P(nm)}%"></i>`}</div></div>`).join('');
    const ax = ticks.map((x) => `<span${x >= hi ? ' class="e"' : ''} style="left:${P(x)}%">${zoomed ? (x === 1440 ? '24:00' : hm(x)) : x / 60}</span>`).join('');
    const hsrc = (x) => (x[3] >= 1 && x[3] <= 3 ? `S${x[3]}` : x[3] === 4 ? t('h_web') : 'HA');
    // Consecutive rows of the same zone and outcome make one row (×n).
    const pst = (x) => (nm >= x.b ? 'p' : nm >= x.a ? 'n' : 'f');
    const gk = (x) => `${x.zi}|${x.tl ? 1 : 0}|${x.h ? `h${x.h[4]}|${x.h[3]}|${x.h[5]}` : `p${x.k}|${pst(x)}`}`;
    const grp = [];
    D.list.forEach((x) => { const z = grp[grp.length - 1]; if (z && gk(z[0]) === gk(x) && !(x.h && !x.h[4])) z.push(x); else grp.push([x]); });
    const li = (G) => {
      const x = G[0], y = G[G.length - 1], h = x.h, n = G.length > 1 ? `<span class="badge">×${G.length}</span>` : '';
      if (!h) {
        const past = nm >= y.b, now = G.some((q) => nm >= q.a && nm < q.b);
        return `<div class="dli${past ? ' past' : ''}${now ? ' now' : ''}"><i class="sd" style="border:2px solid ${dcol(x.k + 1)};box-sizing:border-box"></i>`
          + `<span class="tm2">${hm(x.a)}–${hm(y.b)}</span><span class="nm">${esc(zn[x.zi])}</span>`
          + `${now ? `<span class="badge ac">${esc(t('in_prog'))}</span>` : ''}${n}<span class="badge">S${x.k + 1}</span></div>`;
      }
      const sk = hsk(h[4]), now = !h[4], c = dcol(h[3] >= 1 && h[3] <= 3 ? h[3] : 0);
      const o = h[4] > 1 ? `<span class="badge${sk || h[4] === 3 || h[4] === 5 || h[4] === 11 ? ' wa' : h[4] === 7 ? ' er' : ''}">${esc(t(HOUT[h[4]] || `h_o${h[4]}`))}</span>` : '';
      return `<div class="dli${now ? ' now' : ' past'}"><i class="sd" style="${sk ? `border:1.5px solid ${c};box-sizing:border-box` : `background:${c}`}"></i>`
        + `<span class="tm2">${hm(x.a)}${sk ? (G.length > 1 ? '–' + hm(y.a) : '') : '–' + hm(Math.round(y.b))}</span><span class="nm">${esc(zn[x.zi])}</span>`
        + `${now ? `<span class="badge ac">${esc(t('in_prog'))}</span>` : o}${n}${h[5] & 1 ? `<span class="badge">${esc(t('h_res'))}</span>` : ''}`
        + `${h[5] & 2 ? `<span class="badge">${esc(t('h_met'))}</span>` : ''}<span class="badge">${esc(hsrc(h))}</span></div>`;
    };
    const nb = (v, txt, k) => `<button class="ib" data-gw="${v}"${v < 0 && !(g > 0 || (HO >= 0 && HO != null && dn > HO)) ? ' disabled' : ''}`
      + ` title="${esc(t(k))}" aria-label="${esc(t(k))}">${txt}</button>`;
    const gw = g - (((g % 7) + 7) % 7), nar = dayNames(l, 'narrow');
    const wk = [0, 1, 2, 3, 4, 5, 6].map((o) => { const d = td.dn + gw + o;
      return `<button data-g="${gw + o}" class="${gw + o === g ? 'on' : ''}${gw + o ? '' : ' td'}">${esc(nar[(d + 3) % 7])}<small>${domOf(d)}</small></button>`; }).join('');
    const date = new Intl.DateTimeFormat(l, { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dn * 864e5);
    // Overlaps: one summary line, the windows in a fold and marked on the timeline.
    // Today: the windows with the programmed durations (as the firmware warning) and those of the bars as drawn;
    // later days: possible windows only (factor not known yet); past days: the real ones.
    const mx = D.ov.reduce((a, w) => Math.max(a, w.zs.length), 0);
    const sum = D.pos ? t('x_ovl_pos', { count: D.ov.length })
      : D.ovp ? `${t('x_ovl_pos', { count: D.ovp.length })}, ${t('x_ovl_today', { count: D.ov.length })}`
        : t('x_ovl_sum', { count: D.ov.length, max: mx });
    const at = D.pos || !D.ov.length ? 'info' : mx > MAXO ? 'error' : 'warning';
    const wl = D.ov.length ? `<details class="ovs"><summary>${esc(sum)}</summary><ul>${D.ov.map((w) => `<li>${esc(t('ovl_ban',
      { count: w.zs.length, from: hm(w.a), to: hm(w.b), zones: w.zs.map((z) => zn[z]).join(', ') }))}</li>`).join('')}</ul></details>` : esc(sum);
    const ov = D.ov.length || (D.ovp && D.ovp.length) ? `<ha-alert alert-type="${at}">${wl}</ha-alert>` : '';
    // Legend: only what the timeline shows.
    const cs = new Set(all.map((b) => b.c)), sw = 'var(--secondary-text-color)';
    const lg = [1, 2, 3].filter((k) => cs.has(k)).map((k) => `<span><i style="background:var(--c${k})"></i>S${k}</span>`).join('')
      + (cs.has(0) ? `<span><i style="background:${sw}"></i>${esc(t('h_man'))}</span>` : '')
      + (all.some((b) => b.h && !b.tl) ? `<span><i style="background:${sw}"></i>${esc(t('h_real'))}</span>` : '')
      + (all.some((b) => !b.h && !b.tl) ? `<span><i style="border:2px solid ${sw}"></i>${esc(t('x_planned'))}</span>` : '')
      + (all.some((b) => b.tl) ? `<span><i style="${hatch(sw)}"></i>${esc(t('x_tail'))}</span>` : '')
      + (D.ov.length ? (D.pos ? `<span><i style="background:rgba(255,152,0,.15);border:1px dashed var(--warning-color,#ff9800)"></i>${esc(t('x_ovl_poss'))}</span>`
        : `<span><i style="background:rgba(255,152,0,.4)"></i>${esc(t('ovl'))}</span>`) : '');
    const zt = all.length && (zoomed || this._full) ? `<div class="zt"><button data-zoom>${esc(this._full ? t('x_zoom') : t('x_full_day'))}</button></div>` : '';
    const notes = `${!svc ? `<div class="note">${esc(t('x_no_svc'))}</div>` : ''}${D.real && jr.x ? `<div class="note">${esc(t('h_part'))}</div>` : ''}`;
    r.innerHTML = `<style>${CSS}${DAYCSS}</style><ha-card><div class="wrap${this.dark() ? ' dark' : ''}" style="padding-top:16px">
      <div class="gnav">${nb(-7, '«', K('prev_week'))}${nb(-1, '‹', K('prev_day'))}
        <label class="fl gdp"><span>${esc(date)}</span><input type="date" data-date value="${isoOf(dn)}"${HO >= 0 && HO != null ? ` min="${isoOf(Math.min(HO, td.dn))}"` : ''} aria-label="${esc(t('pick_date'))}"></label>
        ${g ? `<button data-gw="${-g}">${esc(t('today').replace(/^./, (x) => x.toUpperCase()))}</button>` : ''}${nb(1, '›', K('next_day'))}${nb(7, '»', K('next_week'))}</div>
      <div class="wk">${wk}</div>${ov}
      <div class="tlax">${ax}</div>${tl}${zt}<div class="lg">${lg}</div>
      <div class="ct">${esc(t('day_list'))}</div>${notes}
      ${grp.length ? grp.map(li).join('') : `<div class="note">${esc(t(D.none ? K('h_none') : K('no_irr')))}</div>`}</div></ha-card>`;
    const go = (v) => { this._g = v; this._sig = ''; this.hass = this._h; };
    r.querySelectorAll('[data-gw]').forEach((el) => el.addEventListener('click', () => go(g + +el.dataset.gw)));
    r.querySelectorAll('[data-g]').forEach((el) => el.addEventListener('click', () => go(+el.dataset.g)));
    const z = r.querySelector('[data-zoom]');
    if (z) z.addEventListener('click', () => { this._full = !this._full; this._sig = ''; this.hass = this._h; });
    r.querySelector('[data-date]').addEventListener('change', (e) => { if (e.target.value) { e.target.blur(); go(dnOf(e.target.value) - td.dn); } });
  }
}

// Last events of the device: the Last Event changes of the last 48 h from the HA history, in the user language.
// Events of the last 48 h as rows. The zone events of the firmware ("Zone 6 avviata per 10 min", "Zone 6 terminata",
// always in Italian, zone by number) make one row per irrigation; the history rows of the day (get hist) add the slot
// and the outcome, and the irrigations with no event (skipped by rain or wind). Consecutive slot writes make one row.
// ev = [{ s, at }] oldest first, H = { dn: history rows }; returns [{ k, dn, tm, txt }] newest first.
function evModel(m, t, l, h, ev, H = {}, td = devToday(m)) {
  const zl = (n) => { const v = m.st(`zone_${n}_label`); return v && !BAD.includes(v) ? v : t('x_zone_n', { n }); };
  const zoneOf = (nm) => {
    const g = nm.match(/^(?:Zone|Zona) (\d)$/);
    if (g) return +g[1];
    const x = m.zones.find((n) => m.st(`zone_${n}_label`) === nm);
    return x || 0;
  };
  const key = (at) => { const d = devToday(m, at); return d.dn * 1440 + d.m; };
  const out = [], open = {};
  let set = null, g;
  ev.forEach((x) => {
    const k = key(x.at);
    if ((g = x.s.match(/^(.+) avviata per (\d+) min$/)) && zoneOf(g[1])) { set = null; open[zoneOf(g[1])] = { z: zoneOf(g[1]), a: k }; return; }
    if ((g = x.s.match(/^(.+) terminata$/)) && zoneOf(g[1])) {
      const z = zoneOf(g[1]), o = open[z];
      delete open[z];
      set = null;
      out.push({ z, a: o ? o.a : null, b: k });
      return;
    }
    if ((g = x.s.match(/^Set slot Z(\d) S(\d)$/))) {
      if (set && k - set.b <= 5) { set.zs.add(+g[1]); set.ss.add(+g[2]); set.b = k; } else out.push(set = { zs: new Set([+g[1]]), ss: new Set([+g[2]]), a: k, b: k });
      return;
    }
    set = null;
    out.push({ a: k, txt: eventText(m, t, l, x.s).replace(/\b(?:Zone|Zona) (\d)\b/g, (q, n) => zl(+n)) });
  });
  Object.values(open).forEach((o) => out.push({ z: o.z, a: o.a, b: null }));  // still open
  // History rows: [start min, secs, zone, src, outcome, flags] of day dn.
  const used = new Set(), hrow = [];
  Object.entries(H).forEach(([dn, rs]) => (rs || []).forEach((x, i) => hrow.push({ id: `${dn}/${i}`, k: +dn * 1440 + x[0], x })));
  const near = (u, v) => u != null && Math.abs(u - v) <= 2;
  out.forEach((e) => {
    if (e.z == null) return;
    const r = hrow.find((q) => !used.has(q.id) && q.x[2] === e.z && !hsk(q.x[4])
      && (near(e.a, q.k) || (e.a == null && near(e.b, q.k + Math.round(q.x[1] / 60)))));
    if (r) { used.add(r.id); e.h = r.x; if (e.a == null) e.a = r.k; }
  });
  const now = td.dn * 1440 + td.m;
  hrow.forEach((q) => { if (!used.has(q.id) && q.k >= now - 2880 && q.k <= now) out.push({ z: q.x[2], a: q.k, b: q.x[4] ? q.k + Math.round(q.x[1] / 60) : null, h: q.x }); });
  const src = (x) => (x[3] >= 1 && x[3] <= 3 ? `S${x[3]}` : x[3] === 4 ? t('h_web') : 'HA');
  const res = out.map((e) => {
    const k = e.a != null ? e.a : e.b, dn = Math.floor(k / 1440);
    if (e.zs) {
      const ss = [...e.ss].sort().join(', ');
      return { k, dn, tm: e.b > e.a ? `${hm(e.a)}–${hm(e.b)}` : hm(e.a), txt: t(e.ss.size > 1 ? K('x_ev_setn') : K('x_ev_set1'), { slots: ss, count: e.zs.size }) };
    }
    if (e.z == null) return { k, dn, tm: hm(e.a), txt: e.txt };
    const x = e.h, o = x && x[4] > 1 ? t(HOUT[x[4]] || `h_o${x[4]}`) : '';
    if (x && hsk(x[4])) return { k, dn, tm: hm(e.a), txt: [zl(e.z), src(x), o].join(' · ') };
    const mins = x && x[4] ? Math.round(x[1] / 60) : e.a != null && e.b != null ? e.b - e.a : null;
    const tm = `${e.a != null ? hm(e.a) : '…'}–${e.b != null ? hm(e.b) : ''}`;
    return { k, dn, tm, txt: [zl(e.z), e.b == null ? t('in_prog') : mins != null && fmin(t, mins), x && src(x), o].filter(Boolean).join(' · ') };
  });
  return res.sort((p, q) => q.k - p.k);
}
class IrryEventsCard extends IrryGetCard {
  setConfig(c) { super.setConfig(c); this._ev = null; this._at = 0; this._key = null; this._all = false; }
  signature() {
    const m = this._m, s = m && m.so('last_event');
    if (!s) return 'none';
    return JSON.stringify([this._l, s.state, s.last_changed, this._at, this._ver, this._all, devToday(this._m).dn,
      m.zones.map((n) => m.st(`zone_${n}_label`))]);
  }
  load() {
    const s = this._m && this._m.so('last_event'), id = this._m && this._m.E('last_event');
    if (!s) return;
    const key = `${s.state}|${s.last_changed || s.last_updated || ''}`;
    if (!this._h.callWS || this._key === key) return;
    this._key = key;
    this._h.callWS({ type: 'history/history_during_period', start_time: new Date(Date.now() - 48 * 3600e3).toISOString(),
      entity_ids: [id], minimal_response: true, no_attributes: true })
      .then((r) => {
        this._ev = ((r && r[id]) || []).map((x) => ({ s: x.s != null ? x.s : x.state,
          at: x.lu != null ? new Date(x.lu * 1000) : new Date(x.last_updated || x.last_changed) }))
          .filter((x) => x.s && !BAD.includes(x.s) && !isNaN(x.at));
      })
      .catch(() => { this._ev = []; })
      .finally(() => { this._at = Date.now(); this._sig = ''; if (this._h) this.hass = this._h; });
  }
  // History of today and yesterday, fetched again when Last Event changes.
  hists(td) {
    const age = this._hk === this._key ? 600e3 : 0, H = {};
    this._hk = this._key;
    [td.dn, td.dn - 1].forEach((dn) => { const j = this.got('hist', dn, age); if (j && Array.isArray(j.r)) H[dn] = j.r; });
    return H;
  }
  paint() {
    const t = this._t, m = this._m, r = this.shadowRoot;
    if (!m) return this.noDev();
    const s = m.so('last_event');
    let ev = this._ev || [];
    const at = s && new Date(s.last_changed || s.last_updated || Date.now());
    if (!this._ev && s && !BAD.includes(s.state) && !isNaN(at)) ev = [...ev, { s: s.state, at }];  // the history is not there yet
    const td = devToday(this._m), L = evModel(m, t, this._l, this._h, ev, this.hists(td), td), dy = dayNames(this._l);
    const all = this._all && L.length > 5;
    const rows = (all ? L : L.slice(0, 5)).map((x) => `<div class="r"><span class="tm">${x.dn !== td.dn ? `${esc(dy[(x.dn + 3) % 7])} ` : ''}`
      + `${esc(x.tm)}</span><span class="ev">${esc(x.txt)}</span></div>`).join('');
    const more = L.length > 5 ? `<button class="s more">${esc(all ? t('x_ev_less') : `${t('x_ev_all')} (${L.length})`)}</button>` : '';
    r.innerHTML = `<style>${CSS}
      .tm{flex:none;min-width:7.5em;color:var(--secondary-text-color);font-variant-numeric:tabular-nums;white-space:nowrap}
      .ev{flex:1;color:var(--primary-text-color)} .more{margin:4px 0 0 -6px} .ev5{min-height:205px}</style>`
      + `<ha-card><div class="rows ev5">${rows || `<div class="note">${esc(t('x_ev_none'))}</div>`}${more}</div></ha-card>`;
    const b = r.querySelector('.more');
    if (b) b.onclick = () => { this._all = !all; this._sig = ''; this.hass = this._h; };
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
    case 'deg': return `${t(WD[Math.round(x / 22.5) % 16])} · ${n(x, 0)}°`;
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
// Ecowitt fields the Sensors card already shows as entities: [pattern, entity key ($1 = channel)].
const EDUP = [[/^temp[fc]$/, 'weather_temperature'], [/^humidity$/, 'weather_humidity'], [/^baromabs/, 'weather_pressure'],
  [/^baromrel/, 'weather_pressure_sea_level'], [/^(dailyrain|drain_piezo)/, 'weather_rain_today'], [/^(rainrate|rrain_piezo)/, 'weather_rain_rate'],
  [/^(eventrain|erain_piezo)/, 'weather_rain_event'], [/^last24hrain/, 'rain_last_24h'], [/^windspeed/, 'weather_wind_speed'],
  [/^windspd.*avg10m$/, 'wind_mean_10_min'], [/^windgust/, 'weather_wind_gust'], [/^winddir$/, 'weather_wind_direction'],
  [/^winddir_avg10m$/, 'weather_wind_direction', 1],  // 1: dropped as well, one wind direction per dashboard
  [/^solarradiation$/, 'weather_solar_radiation'], [/^uv$/, 'weather_uv_index'], [/^tempin[fc]$/, 'weather_indoor_temperature'],
  [/^humidityin$/, 'weather_indoor_humidity'], [/^soilmoisture([1-4])$/, 'weather_soil_moisture_$1'], [/^pm25_ch1$/, 'weather_pm2_5'],
  [/^lightning$/, 'weather_lightning_distance'], [/^lightning_num$/, 'weather_lightning_count']];
// Groups [[label, value], ...] of an ecoraw field map; psl = sea-level pressure text from the device (or null);
// dup(entity key) true = that entity has a value, so the first field it comes from is left out (only the extras stay).
function ecoGroups(c, f, psl, dup) {
  const t = c.t, g = EG.map(() => []), seen = {}, gone = {};
  for (const k of Object.keys(f)) {
    const r = EK.find((e) => e[0].test(k));
    if (r && r[1] == null) continue;
    if (!r) { g[EGU].push([k, String(f[k])]); continue; }
    const d = dup && EDUP.find((e) => e[0].test(k)), dk = d && d[1].replace('$1', (k.match(d[0]) || [])[1] || '');
    if (d && (!gone[dk] || d[2]) && dup(dk)) { gone[dk] = 1; continue; }
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
        const dup = (k) => { const s = m.so(k); return !!s && !BAD.includes(s.state); };
        const at = j.age != null ? `${fmtTime(new Date(Date.now() - j.age * 1000).toISOString(), c)} (${ago(j.age, t)})` : '';
        const gs = ecoGroups(c, j.f, psl, dup);
        b = (gs.length ? '' : `<div class="note">${esc(t('x_eco_none'))}</div>`)
          + gs.map((x) => `<div class="h">${esc(x.head)}</div>${x.note ? `<div class="note">${esc(x.note)}</div>` : ''}`
          + x.rows.map(([k, v]) => kv(k, v)).join('')).join('') + (at ? `<div class="h"></div>${kv(t('m_eco_rx'), at)}` : '');
      }
    }
    r.innerHTML = `<style>${CSS}</style><ha-card><div class="rows">${b}</div></ha-card>`;
  }
}

// Zone lines of the coefficients: one line for the value most zones share, then only the zones that differ;
// zones with no slot enabled are left out (all zones when none is enabled). [[name, value], ...]
function coefLines(m, t, l) {
  const pc = (k) => { const v = parseFloat(m.st(k)); return isNaN(v) ? '-' : `${nf(v, 0, l)} %`; };
  const zt = (n) => (m.st(`zone_${n}_plant_type`) === 'Not adapted' ? t('m_pt_none')
    : pc(`zone_${n}_irrigation_factor`) + (m.st(`zone_${n}_sheltered_from_rain`) === 'on' ? ` · ${t('m_sh')}` : '')
    + (m.st(`zone_${n}_sheltered_from_wind`) === 'on' ? ` · ${t('m_wx')}` : ''));
  const on = m.zones.filter((n) => [1, 2, 3].some((k) => slotFrom(m, n, k).enabled)), zs = on.length ? on : m.zones;
  const cnt = {}; zs.forEach((n) => { cnt[zt(n)] = (cnt[zt(n)] || 0) + 1; });
  const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  if (zs.length > 1 && cnt[top] > 1) return [[t('x_all_zones'), top], ...zs.filter((n) => zt(n) !== top).map((n) => [m.label(n), zt(n)])];
  return zs.map((n) => [m.label(n), zt(n)]);
}
// Coefficients: today's factors (entities, as the device Weather → Coefficients) and the rain of the last days (get mhist 1).
class IrryCoefCard extends IrryGetCard {
  signature() {
    const m = this._m;
    if (!m) return 'none';
    const ks = ['irrigation_method', 'weather_data', 'weather_days_used', 'weather_fallback', 'irrigation_factor', 'irrigation_et0_yesterday', 'units',
      ...m.zones.flatMap((n) => [`zone_${n}_irrigation_factor`, `zone_${n}_plant_type`, `zone_${n}_sheltered_from_rain`, `zone_${n}_sheltered_from_wind`])];
    return JSON.stringify([this._l, m.imp, this._ver, m.zones.map(m.label), m.zones.map((n) => [1, 2, 3].map((k) => slotFrom(m, n, k).enabled)),
      ks.map((k) => { const s = m.so(k); return s && [s.state, s.attributes.unit_of_measurement]; })]);
  }
  paint() {
    const m = this._m, t = this._t, c = this.ctx(), r = this.shadowRoot, l = this._l;
    if (!m) return this.noDev();
    const kv = (k, v) => `<div class="r"><span class="n">${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
    const pc = (k) => { const v = parseFloat(m.st(k)); return isNaN(v) ? '-' : `${nf(v, 0, l)} %`; };
    const meth = m.st('irrigation_method');
    let b;
    if (!meth || meth === METH_NONE || BAD.includes(meth)) b = `<div class="note">${esc(t('wx_c_off'))}</div>`;
    else {
      b = `<div class="h">${esc(t('m_res'))}</div>${kv(t('m_f'), pc('irrigation_factor'))}`;
      b += coefLines(m, t, l).map(([k, v]) => kv(k, v)).join('');
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

// Reference ET0 and Calibrate (Settings → Weather). Calibrate is inert while the firmware blocks it (cal:nodata, no
// valid weather day yet): a tap says why; an allowed press is done.
class IrryCalCard extends IrryCard {
  signature() {
    const m = this._m;
    if (!m) return 'none';
    const s = m.so('irrigation_reference_et0');
    return JSON.stringify([this._l, m.imp, s && [s.state, s.attributes.unit_of_measurement], this.why(), this._msg]);
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
        ${m.E('irrigation_calibrate') ? `<button data-cal${this.why() ? ' aria-disabled="true"' : ''}>${esc(t('m_cal'))}</button>` : ''}</div>
      <div class="msg ${msg.cls || ''}">${esc(msg.text || '')}</div>
      <div class="note">${esc(t('m_etr_h', { ref: uf(c, 'r', 5) }))}</div></div></ha-card>`;
    const inp = r.querySelector('[data-etr]');
    inp.addEventListener('change', () => this.setEtr(inp));
    const cb = r.querySelector('[data-cal]');
    if (cb) cb.addEventListener('click', () => this.cal());
  }
  say(text, cls) { this._msg = { text, cls }; this._sig = ''; this.hass = this._h; }
  // Why Calibrate is refused now (Blocked Controls cal), or ''.
  why() { return ctlWhy(this._t, 'cal', ctlCode(this._m.st('blocked_controls'), 'cal')); }
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
    const h = this._h, m = this._m, t = this._t, why = this.why();
    if (why) return this.say(`${t('m_cal')}: ${why}`, 'warn');
    try { await h.callService('button', 'press', {}, { entity_id: m.E('irrigation_calibrate') }); } catch (e) { return this.say(errText(m, t, this._l, e), 'err'); }
    this.say(t('saved'), 'ok');
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

// In-card tabs (no HACS dependency): tabs = [{ name, sections: [[card, ...], ...] }], the chosen tab remembered per
// browser. Each section is a column of the grid; tiles go two per row, the other cards take the column width.
// The child cards are HA cards made by loadCardHelpers(), created when their tab is first shown.
const TABCSS = `
  :host{display:block} .bar{display:flex;gap:4px;padding:4px;margin:0 0 12px;border-radius:12px;background:rgba(127,127,127,.14);
    overflow-x:auto;scrollbar-width:none}
  .bar button{flex:1 0 auto;font:inherit;font-weight:500;font-size:14px;border:0;border-radius:9px;padding:8px 14px;cursor:pointer;
    background:none;color:var(--secondary-text-color);white-space:nowrap}
  .bar button[aria-selected=true]{background:var(--card-background-color,#fff);color:var(--primary-text-color);
    box-shadow:0 1px 3px rgba(0,0,0,.2)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:16px;align-items:start}
  .sec{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0} .sec>*{grid-column:span 2;min-width:0} .sec>.t{grid-column:span 1}
  /* lead: first section alone in column 1, the others in row order on 3 columns; narrower: lead on top, 2 or 1 columns */
  .grid.lead{grid-template-columns:minmax(0,1fr)} .wrap{container-type:inline-size}
  @container (min-width:640px){.grid.lead{grid-template-columns:repeat(2,minmax(0,1fr))} .grid.lead>.sec:first-child{grid-column:1/-1}}
  @container (min-width:1100px){.grid.lead{grid-template-columns:repeat(4,minmax(0,1fr))}
    .grid.lead>.sec:first-child{grid-column:1;grid-row:1/span var(--rows,1)}}`;
class IrryTabsCard extends HTMLElement {
  // hui-card calls setConfig again on the same element when the config changes and the type does not: the old
  // tabs are dropped and the remembered one is shown from the new config.
  setConfig(c) { this._c = c || {}; this._el = {}; this._tab = null; this._r = (this._r || 0) + 1; if (this.shadowRoot) this.show(this.saved()); }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full' }; }
  key() { return `irry.tab.${this._c.view || ''}`; }
  // Remembered tab by id (positions change between versions), else the configured default, else the first.
  saved() {
    const tb = this.tabs(), at = (id) => tb.findIndex((x) => x.id === id);
    let v = null;
    try { v = localStorage.getItem(this.key()); } catch (e) { /* private mode */ }
    const i = v != null ? at(v) : -1;
    return i >= 0 ? i : Math.max(0, at(this._c.default));
  }
  set hass(h) {
    this._h = h;
    Object.values(this._el).forEach((x) => x.forEach((s) => s.forEach((e) => { e.hass = h; })));
    if (!this.shadowRoot) { this.attachShadow({ mode: 'open' }); this.show(this.saved()); }
  }
  tabs() { return (this._c && this._c.tabs) || []; }
  async show(i) {
    const tb = this.tabs(), t = tb[i] ? i : 0, r = this.shadowRoot;
    this._tab = t;
    try { localStorage.setItem(this.key(), String(tb[t] ? tb[t].id ?? t : t)); } catch (e) { /* private mode */ }
    r.innerHTML = `<style>${TABCSS}</style>${tb.length > 1 ? `<div class="bar" role="tablist">${tb.map((x, k) => `<button role="tab" data-i="${k}"
      aria-selected="${k === t}">${esc(x.name)}</button>`).join('')}</div>` : ''}<div class="wrap"><div class="grid${
      this._c.layout === 'lead' ? ' lead' : ''}" style="--rows:${Math.max(1, Math.ceil(((tb[t] ? tb[t].sections.length : 1) - 1) / 3))}"></div></div>`;
    r.querySelectorAll('.bar button').forEach((b) => { b.onclick = () => { if (+b.dataset.i !== this._tab) this.show(+b.dataset.i); }; });
    if (!tb[t]) return;
    const run = ++this._r;
    if (!this._el[t]) {
      const hp = typeof window.loadCardHelpers === 'function' ? await window.loadCardHelpers() : null;
      if (!hp || run !== this._r) return;
      this._el[t] = tb[t].sections.map((cs) => cs.map((cfg) => this.make(hp, cfg)));
    }
    const g = r.querySelector('.grid');
    this._el[t].forEach((cs) => {
      const sec = document.createElement('div');
      sec.className = 'sec';
      cs.forEach((e) => sec.appendChild(e));
      g.appendChild(sec);
    });
  }
  make(hp, cfg) {
    const e = hp.createCardElement(cfg);
    if (cfg.type === 'tile') e.classList.add('t');
    if (this._h) e.hass = this._h;
    // HA asks for a new element when a card definition loads late (custom cards): replace it in place.
    e.addEventListener('ll-rebuild', (ev) => {
      ev.stopPropagation();
      const n = this.make(hp, cfg);
      Object.values(this._el).forEach((x) => x.forEach((s) => { const k = s.indexOf(e); if (k >= 0) s[k] = n; }));
      e.replaceWith(n);
    }, { once: true });
    return e;
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
def('irry-events-card', IrryEventsCard);
def('irry-tabs-card', IrryTabsCard);
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
  { type: 'irry-events-card', name: 'Irry events', description: 'Last events of the device, in the user language' },
  { type: 'irry-notes-card', name: 'Irry release notes', description: 'Link to the notes of the offered firmware' },
  { type: 'irry-tabs-card', name: 'Irry tabs', description: 'Sections of an Irry view behind tabs (used by the dashboard)' },
);
console.info(`%c IRRY THE SEVEN %c ${IRRY_VERSION} `, 'background:#2e7d32;color:#fff', '');
if (typeof module !== 'undefined') {
  module.exports = { irryModel, statusView, irrigationView, weatherView, settingsView, alerts, tr, slug, errText, ovlText,
    eventText, fwText, fmtState, devValue, toUnit, I18N, dayView, dayModel, devSlots, devToday, evModel, zoneHead, runs, ovDay, ctlList, ctlCode, ctlWhy, getCall, irryGet, hm, dnOf,
    ecoGroups, IrryDayCard, IrryEcoCard, IrryCoefCard, IrryCalCard, IrryNotesCard, IrryEventsCard, IrryTabsCard,
    hacsReady, shouldRegenerate, IrryDashboardStrategy, IrryStatusStrategy, IrryIrrigationStrategy, IrryDayStrategy, IrryWeatherStrategy, IrrySettingsStrategy, hour24, unitDec, fmtTime, dayRange, rowShown, coefLines, zoneFactor, IrryRowsCard, IrrySlotCard, IrryRapidCard };
}
