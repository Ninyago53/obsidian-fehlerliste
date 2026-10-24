const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');

function fixture() {
  const files = new Map(); const writes = []; const saves = [];
  const app = {
    vault: {
      getAbstractFileByPath: p => files.get(p),
      getMarkdownFiles: () => [...files.values()].filter(f => f.extension === 'md'),
      async createFolder(p) { assert(!files.has(p)); files.set(p, {path:p, children:[]}); },
      async create(p, content) { assert(!files.has(p)); const file={path:p, extension:path.extname(p).slice(1),content}; files.set(p,file);writes.push(p);return file; }
    },
    fileManager: {async processFrontMatter(file, callback) { callback(file.frontmatter); }},
    metadataCache: {getFileCache:file=>({frontmatter:file.frontmatter})},
    workspace: {getLeaf:()=>({openFile:async()=>{}}),getLeavesOfType:()=>[]}
  };
  class Plugin {constructor(app){this.app=app;}async saveData(data){saves.push(JSON.parse(JSON.stringify(data)));}}
  const context=vm.createContext({
    module:{exports:{}},require(name){assert.equal(name,'obsidian');return {Plugin,Modal:class {},Menu:class {},TFile:class {},Notice:class {},normalizePath:p=>p};},
    setTimeout,clearTimeout,Date,console
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT,'main.js'),'utf8'),context);
  const plugin = new context.module.exports(app);
  plugin.settings={subjectColors:{},removedSubjects:[],removedOptions:{klausur:[],status:[]}};
  return {files,writes,saves,app,plugin,context};
}

test('first-run setup creates an empty working database and matches starter sources',async()=>{
  const {plugin,files,context}=fixture();
  const created=await plugin.setupVault({open:false});
  assert.equal(created.length,3);
  assert(files.has('Fehlerliste-Notion/Einträge'));
  assert(![...files.keys()].some(p=>p.startsWith('Fehlerliste-Notion/Einträge/')));
  const embedded=vm.runInContext('SETUP_FILES',context);
  for(const [name,content] of Object.entries(embedded)) {
    assert.equal(content,fs.readFileSync(path.join(ROOT,'starter',name),'utf8'));
    assert.equal(files.get(name).content,content);
  }
});

test('setup is idempotent and preserves an existing database verbatim',async()=>{
  const {plugin,files,writes}=fixture();
  files.set('Fehlerliste-Notion',{path:'Fehlerliste-Notion',children:[]});
  files.set('Fehlerliste-Notion/Fehlerliste.base',{content:'my own filters and columns',extension:'base'});
  await plugin.setupVault({open:false});
  const count=writes.length;
  assert.equal(files.get('Fehlerliste-Notion/Fehlerliste.base').content,'my own filters and columns');
  assert.equal((await plugin.setupVault({open:false})).length,0);
  assert.equal(writes.length,count);
});

test('setup reports a file/folder name conflict without overwriting it',async()=>{
  const {plugin,files,writes}=fixture();
  files.set('Fehlerliste-Notion',{content:'keep me',extension:'md'});
  await assert.rejects(plugin.setupVault({open:false}),/bereits als Datei/);
  assert.equal(writes.length,0);assert.equal(files.get('Fehlerliste-Notion').content,'keep me');
});

test('new entries get the chosen day; existing dates and other folders are preserved',async()=>{
  const {plugin,files}=fixture();
  const f={path:'Fehlerliste-Notion/Einträge/new.md'.normalize('NFD'),extension:'md',frontmatter:{}};
  files.set(f.path,f);await plugin.fillNewEntryDate(f,'2026-10-24');
  assert.equal(f.frontmatter.Datum,'2026-10-24');
  await plugin.fillNewEntryDate(f,'2026-11-01');assert.equal(f.frontmatter.Datum,'2026-10-24');
  const outside={path:'Elsewhere/new.md',extension:'md',frontmatter:{}};files.set(outside.path,outside);
  await plugin.fillNewEntryDate(outside,'2026-10-24');assert.equal(outside.frontmatter.Datum,undefined);
});

test('subject removal persists, keeps colors and can be restored',async()=>{
  const {plugin,saves}=fixture();
  const color=JSON.stringify(plugin.subjectColor('Astronomie'));
  await plugin.setSubjectRemoved('Astronomie',true);
  assert(!plugin.subjects().includes('Astronomie'));assert(plugin.subjects(true).includes('Astronomie'));
  assert.equal(JSON.stringify(plugin.subjectColor('Astronomie')),color);
  const restored=fixture().plugin;restored.settings=saves.at(-1);
  assert(!restored.subjects().includes('Astronomie'));
  await restored.setSubjectRemoved('Astronomie',false);assert(restored.subjects().includes('Astronomie'));
  clearTimeout(plugin.colorSaveTimer);clearTimeout(restored.colorSaveTimer);
});

test('math parser supports mixed text, multiple formulas and unclosed delimiters',()=>{
  const {context}=fixture();
  const parts=vm.runInContext('mathParts("Text $$x^2$$ und $$y$$.")',context);
  assert.equal(parts.filter(p=>'math'in p).length,2);assert.equal(parts[1].math,'x^2');
  assert.equal(vm.runInContext('mathParts("Unvollständig $$x").some(p=>\'math\'in p)',context),false);
});

test('public desktop manifest, version files and plugin syntax are consistent',()=>{
  const manifest=require('../manifest.json'), pkg=require('../package.json'),versions=require('../versions.json');
  assert.equal(manifest.version,pkg.version);assert.equal(versions[manifest.version],manifest.minAppVersion);
  assert.equal(manifest.isDesktopOnly,true);
  execFileSync(process.execPath,['--check',path.join(ROOT,'main.js')]);
});

test('public source contains no private vault paths, personal settings or embedded entry text',()=>{
  const plugin=fs.readFileSync(path.join(ROOT,'main.js'),'utf8');
  assert(!plugin.includes('/Users/'));assert(!plugin.includes('OneDrive'));assert(!plugin.includes('CloudStorage'));
  assert(!plugin.includes('Partial Fraction Decomposition'));assert(!plugin.includes('Substitution falsch'));
  assert(!fs.existsSync(path.join(ROOT,'data.json')));
  assert(!fs.existsSync(path.join(ROOT,'.obsidian')));
});
