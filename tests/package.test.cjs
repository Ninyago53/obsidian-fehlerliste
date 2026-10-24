const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');

test('release archives are empty of user data, include hidden configuration and reproduce exactly',()=>{
  const python=process.env.PYTHON||'python3';
  execFileSync(python,['scripts/package.py'],{cwd:ROOT});
  const first=fs.readFileSync(path.join(ROOT,'dist/SHA256SUMS.txt'),'utf8');
  const verify=`import zipfile,json,hashlib\nfrom pathlib import Path\np=Path('dist')\nwith zipfile.ZipFile(p/'Fehlerliste-Starter-Vault.zip') as z:\n names=z.namelist()\n assert z.testzip() is None\n assert 'Fehlerliste/.obsidian/plugins/fehlerliste-notion-farben/main.js' in names\n assert not any(n.endswith('data.json') or '/workspace' in n or n.endswith('.pdf') for n in names)\n assert not any('/Einträge/' in n and not n.endswith('.gitkeep') for n in names)\n assert json.loads(z.read('Fehlerliste/.obsidian/community-plugins.json'))==[]\n assert json.loads(z.read('Fehlerliste/.obsidian/app.json'))['safeMode'] is True\n assert json.loads(z.read('Fehlerliste/.obsidian/types.json'))['types']['Datum']=='date'\n for n in names:\n  assert not n.startswith('/') and '..' not in n.split('/')\nwith zipfile.ZipFile(p/'Fehlerliste-Plugin.zip') as z:\n assert len(z.namelist())==3 and z.testzip() is None\nfor line in (p/'SHA256SUMS.txt').read_text().splitlines():\n digest,name=line.split('  ')\n assert hashlib.sha256((p/name).read_bytes()).hexdigest()==digest\n`;
  execFileSync(python,['-c',verify],{cwd:ROOT});
  execFileSync(python,['scripts/package.py'],{cwd:ROOT});
  assert.equal(fs.readFileSync(path.join(ROOT,'dist/SHA256SUMS.txt'),'utf8'),first);
});
