#!/usr/bin/env python3
"""Build dist/irry-the-seven.js: the source with the texts it uses inlined.

Texts: i18n.json, plus, inside the firmware repository, the device UI translations
(../src/ui/i18n/<lang>.json, only the keys the source asks for with t('key')).
  build.py                 write dist/irry-the-seven.js
  build.py --export DIR    also write the standalone repository tree to DIR, with i18n.json
                           holding every text it needs (no UI translations required there)
"""
import json
import pathlib
import re
import shutil
import sys

HA = pathlib.Path(__file__).resolve().parent
UI = HA.parent / 'src' / 'ui'
LANGS = ['en', 'it', 'de', 'fr', 'es', 'pt']
FILES = ['README.md', 'build.py', 'hacs.json', 'src/irry-the-seven.js', 'test/fake.cjs', 'test/test.cjs', 'test/preview.html']


def texts(src):
    keys = {k for k in re.findall(r"(?:\b|_)t\('([a-z0-9_]+)'", src) if not k.endswith('_')}
    keys |= {'dm_' + m for m in re.search(r"const MODES = \[([^\]]*)\]", src).group(1).replace("'", '').replace(' ', '').split(',')}
    extra = json.loads((HA / 'i18n.json').read_text())
    out, missing = {}, []
    for lang in LANGS:
        ui_file = UI / 'i18n' / f'{lang}.json'
        ui = json.loads(ui_file.read_text()) if ui_file.exists() else {}
        both = {**ui, **extra.get(lang, {})}
        out[lang] = {k: both[k] for k in sorted(keys) if k in both}
        missing += [f'{lang}:{k}' for k in sorted(keys) if k not in both]
    if missing:
        sys.exit('missing texts: ' + ' '.join(missing))
    return out


def dump(d):
    return '{\n' + ',\n'.join(f'  "{l}": ' + json.dumps(v, ensure_ascii=False) for l, v in d.items()) + '\n}\n'


def main():
    src = (HA / 'src' / 'irry-the-seven.js').read_text()
    out = texts(src)
    blob = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    dist = re.sub(r'/\*I18N\*/.*?/\*END\*/', lambda m: blob, src, count=1, flags=re.S)
    # One scope: loaded as a module or as a classic script, nothing leaks into the page.
    dist = '(() => {\n' + dist + '})();\n'
    (HA / 'dist').mkdir(exist_ok=True)
    (HA / 'dist' / 'irry-the-seven.js').write_text(dist)
    print(f'dist/irry-the-seven.js: {len(out["en"])} keys x {len(LANGS)} languages, {len(dist)} bytes')
    if len(sys.argv) == 3 and sys.argv[1] == '--export':
        to = pathlib.Path(sys.argv[2])
        for f in FILES + ['dist/irry-the-seven.js']:
            (to / f).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(HA / f, to / f)
        shutil.copy(UI / 'LICENSE', to / 'LICENSE')
        (to / 'i18n.json').write_text(dump(out))
        print(f'exported to {to}')


if __name__ == '__main__':
    main()
