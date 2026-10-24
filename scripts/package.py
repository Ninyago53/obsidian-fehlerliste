"""Build only allowlisted, reproducible public release files. No local vault access."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
PLUGIN_FILES = ('main.js', 'manifest.json', 'styles.css')

def archive(path, entries):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as output:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, data)

def main():
    manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    plugin_id = manifest['id']
    assert '/' not in plugin_id and '\\' not in plugin_id
    DIST.mkdir(exist_ok=True)
    plugin = {name: (ROOT / name).read_bytes() for name in PLUGIN_FILES}
    for name, data in plugin.items():
        (DIST / name).write_bytes(data)
    archive(DIST / 'Fehlerliste-Plugin.zip', {
        f'{plugin_id}/{name}': data for name, data in plugin.items()
    })
    starter = {}
    for path in sorted((ROOT / 'starter').rglob('*')):
        if path.is_file() and path.name != '.DS_Store':
            starter[f'Fehlerliste/{path.relative_to(ROOT / "starter").as_posix()}'] = path.read_bytes()
    config = {
        'app.json': {'safeMode': True},
        'community-plugins.json': [],
        'core-plugins.json': {'file-explorer': True, 'switcher': True, 'global-search': True,
                              'properties': True, 'templates': True, 'command-palette': True,
                              'bases': True, 'file-recovery': True},
        'types.json': {'types': {'Fehlerbeschreibung': 'text', 'Fach': 'multitext',
                                'Klausur': 'multitext', 'Wo Fehler': 'text',
                                'Status': 'multitext', 'Datum': 'date'}},
        'templates.json': {'folder': 'Fehlerliste-Notion/Vorlagen',
                           'dateFormat': 'YYYY-MM-DD', 'timeFormat': 'HH:mm'},
    }
    for name, value in config.items():
        starter[f'Fehlerliste/.obsidian/{name}'] = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    for name, data in plugin.items():
        starter[f'Fehlerliste/.obsidian/plugins/{plugin_id}/{name}'] = data
    starter['Fehlerliste/LIZENZ.txt'] = (ROOT / 'LICENSE').read_bytes()
    archive(DIST / 'Fehlerliste-Starter-Vault.zip', starter)
    checksums = []
    for name in (*PLUGIN_FILES, 'Fehlerliste-Plugin.zip', 'Fehlerliste-Starter-Vault.zip'):
        checksums.append(f'{hashlib.sha256((DIST / name).read_bytes()).hexdigest()}  {name}')
    (DIST / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n', encoding='utf-8')
    print('Release-Dateien erstellt: dist/ (Plugin, Starter-Vault und Prüfsummen)')

if __name__ == '__main__':
    main()
