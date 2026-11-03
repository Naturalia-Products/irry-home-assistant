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

Requires Home Assistant 2026.10 or later and the device added through the ESPHome integration.

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
  device: Irry The Seven 8dee48   # device name or id, only with more than one Irry
  language: it                    # en, it, de, fr, es, pt; default: the Home Assistant language
  windrose: false                 # do not use windrose-card even when installed
  mini_graph: false               # do not use mini-graph-card even when installed
```

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

## Develop

`src/irry-the-seven.js` is the source; `python3 build.py` writes `dist/irry-the-seven.js` with the texts it uses
from `i18n.json`. `node test/test.cjs` checks the generated dashboards against a fake Home Assistant;
`test/preview.html` (served over http from this folder) shows the two cards.

## Licence

MIT, see [LICENSE](LICENSE).
