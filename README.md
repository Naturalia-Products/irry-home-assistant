# Irry The Seven for Home Assistant

A ready-made dashboard for the Irry The Seven irrigation controller, plus two cards:

- **Status**: what is happening now (watering, rain skip, wind pause, time, weather data, firmware), the zones with
  their manual switch and expected end time, the values behind the decisions (rain, wind, irrigation factor), events
  and diagnostics.
- **Irrigation**: the Rapid card (one slot, same start and duration, zones one after another), then for each zone
  its plant type, shelter from rain and wind and the three slots.
- **Weather**: the station readings and charts; shown only when the device receives weather data.

The dashboard finds the device by its manufacturer and the entities by their names, so it keeps working when you
assign an area or rename the device. Texts follow the Home Assistant language (English, Italian, German, French,
Spanish, Portuguese).

## Install

With HACS: add this repository as a custom repository of type *Dashboard*, install **Irry The Seven**, reload
the browser.

By hand: copy `dist/irry-the-seven.js` to `/config/www/`, then in *Settings → Dashboards → ⋮ → Resources* add
`/local/irry-the-seven.js` as a *JavaScript module*.

Requires Home Assistant 2026.10 or later, Irry The Seven firmware 3.0.0 or later and the device added through the ESPHome integration.

## Use

Create a new dashboard (*Settings → Dashboards → Add dashboard → New dashboard from scratch*), open it,
*⋮ → Edit dashboard → ⋮ → Raw configuration editor*, replace everything with:

```yaml
strategy:
  type: custom:irry-the-seven
```

Options:

```yaml
strategy:
  type: custom:irry-the-seven
  device: Irry The Seven 8dee48   # device name or id: show only this Irry (see below)
  language: it                    # en, it, de, fr, es, pt; default: the Home Assistant language
  windrose: false                 # do not use windrose-card even when installed
  mini_graph: false               # do not use mini-graph-card even when installed
```

With more than one Irry and no `device`, the dashboard opens on an overview, *Irry*: one card per device, sorted by
name, with what it is doing now, the next irrigation, its problems and whether programs are paused or logins blocked.
Tap the device name, or one of its buttons, to open its Status, Irrigation, Day, Weather (when that device has weather
data) and Settings views; the back arrow returns to the overview. Each device's views have their own address, made
from the end of its MAC address (`/<dashboard>/irry-8dee48-status`), so they can be bookmarked. To give each device a
dashboard of its own, create one dashboard per device with its `device`.

The dashboard is generated each time it opens, so it cannot be edited from the UI. To customise it, use
*⋮ → Edit dashboard → Take control*: it becomes a normal dashboard you can change (and no longer follows updates).

Single views in your own dashboard:

```yaml
views:
  - title: Irrigation
    strategy:
      type: custom:irry-irrigation   # or custom:irry-status, custom:irry-weather
```

Cards on their own:

```yaml
- type: custom:irry-rapid-card
- type: custom:irry-slot-card
  zone: 2
```

When installed, [windrose-card](https://github.com/aukedejong/lovelace-windrose-card) and
[mini-graph-card](https://github.com/kalkih/mini-graph-card) are used for the wind and the charts; without them
the built-in cards are used.

## Login lockout notification

The device blocks an address after repeated wrong passwords (firmware 3.0 or later). The blueprint
`blueprints/automation/irry_the_seven_security.yaml` shows a persistent notification in Home Assistant while any
address is blocked, with the device name, each blocked address and until when, and the duration of the latest
ban. It is updated when a ban starts or changes and removed when the last one ends. It reads only the device's
Security entities and needs no extra permission. Home Assistant cannot lift a ban: bans end by themselves or with
*Unlock all* in the device's Security card.

HACS installs only the dashboard. Import the blueprint once:

[![Import the blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import?blueprint_url=https%3A%2F%2Fgithub.com%2FNaturalia-Products%2Firry-home-assistant%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Firry_the_seven_security.yaml)

or *Settings → Automations & scenes → Blueprints → Import blueprint* with
`https://github.com/Naturalia-Products/irry-home-assistant/blob/main/blueprints/automation/irry_the_seven_security.yaml`.
Then *Create automation* from it and pick the device's *Security Login Lockout* and *Security Ban List*
(and, for the ban duration, *Security Last Event*). To turn the notification off, disable that automation.
One automation per device.

## Develop

`src/irry-the-seven.js` is the source; `python3 build.py` writes `dist/irry-the-seven.js` with the texts it uses
from `i18n.json`. `node test/test.cjs` checks the generated dashboards against a fake Home Assistant;
`test/preview.html` (served over http from this folder) shows the two cards.

## Licence

MIT, see [LICENSE](LICENSE).
