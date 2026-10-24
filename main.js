const { Plugin, Modal, Menu, Notice, TFile, normalizePath, setIcon, parseYaml, stringifyYaml, loadMathJax, renderMath, finishRenderMath } = require('obsidian');
const ROOT = 'Fehlerliste-Notion';
const SETUP_FILES = {
  "Fehlerliste-Notion/Fehlerliste.base": "filters:\n  and:\n    - 'file.ext == \"md\"'\n    - 'file.inFolder(\"Fehlerliste-Notion/Einträge\")'\nproperties:\n  note.Fehlerbeschreibung:\n    displayName: Fehler (Beschreibung)\n  note.Fach:\n    displayName: Fach\n  note.Klausur:\n    displayName: Klausur\n  note.Wo Fehler:\n    displayName: Wo fehler\n  note.Status:\n    displayName: status\n  note.Datum:\n    displayName: Datum\nviews:\n  - type: table\n    name: Fehlerliste\n    order:\n      - note.Fehlerbeschreibung\n      - note.Fach\n      - note.Klausur\n      - note.Wo Fehler\n      - note.Status\n      - note.Datum\n    sort:\n      - property: note.Datum\n        direction: DESC\n    rowHeight: medium\n    columnSize:\n      note.Fehlerbeschreibung: 500\n      note.Fach: 170\n      note.Klausur: 100\n      note.Wo Fehler: 130\n      note.Status: 110\n      note.Datum: 120\n",
  "Fehlerliste-Notion/Vorlagen/Neuer Fehler.md": "---\nFehlerbeschreibung: \"\"\nFach: []\nKlausur:\n  - NEIN\nWo Fehler: \"\"\nStatus:\n  - mid\nDatum: \"{{date:YYYY-MM-DD}}\"\n---\n## Erklärung / richtiger Lösungsweg\n\n",
  "Fehlerliste – Start.md": "# Fehlerliste\n\n[[Fehlerliste-Notion/Fehlerliste.base|→ Fehlerliste öffnen]]\n\nDeine Fehler bleiben als Markdown-Dateien lokal in diesem Vault.\n\n## Einmal aktivieren\n1. **Einstellungen → Externe Erweiterungen / Community plugins** öffnen.\n2. Community-Erweiterungen erlauben, sofern noch deaktiviert.\n3. **Fehlerliste** aktivieren.\n4. Oben die Fehlerliste öffnen. **Neuer Fehler** legt den ersten Eintrag an.\n\n## So benutzt du sie\n- **Neuer Fehler:** Beschreibung, Fach und Fundstelle eingeben. Datum ist vorausgefüllt.\n- **Fächer:** Fächer hinzufügen, aus der Auswahl entfernen oder wiederherstellen.\n- **Schwere:** gravierend / mid / leicht. **Klausur:** JA / NEIN.\n- **Formeln:** z. B. `Es gilt $$\\frac{1}{k^3}$$ für große k.` – die Formel steht im Satz.\n- Formel anklicken, um den ursprünglichen Text weiterzubearbeiten.\n- **Schnellfilter:** nach Fach und Klausur filtern.\n- **PDF:** die gefilterte Liste als PDF exportieren (Desktop).\n\nDie Beispiel-Fächer kannst du an deinen Studiengang anpassen. Es sind keine persönlichen Fehlereinträge enthalten.\n\n## Vorhandener Vault\nDu musst diesen Starter-Vault nicht verwenden: Installiere das Plugin in deinem eigenen Vault und führe über **Cmd/Ctrl+P → Fehlerliste: Fehlerliste einrichten** die Einrichtung aus. Bestehende Dateien werden nicht überschrieben.\n\n[Ausführliche Anleitung](https://github.com/Ninyago53/obsidian-fehlerliste/blob/main/docs/INSTALLATION.md)\n"
};
const COLORS = {"Physik": ["hsl(272, 40%, 89%)", "hsl(272, 40%, 28%)", "hsl(272, 40%, 50%)"], "Informatik": ["hsl(6, 62%, 89%)", "hsl(6, 62%, 28%)", "hsl(6, 62%, 50%)"], "Allgemein": ["hsl(40, 5%, 89%)", "hsl(40, 5%, 28%)", "hsl(40, 5%, 50%)"], "Technische Mechanik": ["hsl(42, 60%, 89%)", "hsl(42, 60%, 28%)", "hsl(42, 60%, 50%)"], "Mathematik": ["hsl(210, 55%, 89%)", "hsl(210, 55%, 28%)", "hsl(210, 55%, 50%)"], "Elektrotechnik": ["hsl(145, 38%, 89%)", "hsl(145, 38%, 28%)", "hsl(145, 38%, 50%)"], "JA": ["hsl(5, 75%, 89%)", "hsl(5, 75%, 28%)", "hsl(5, 75%, 50%)"], "NEIN": ["hsl(145, 38%, 89%)", "hsl(145, 38%, 28%)", "hsl(145, 38%, 50%)"], "gravierend": ["hsl(5, 75%, 89%)", "hsl(5, 75%, 28%)", "hsl(5, 75%, 50%)"], "mid": ["hsl(42, 65%, 89%)", "hsl(42, 65%, 28%)", "hsl(42, 65%, 50%)"], "leicht": ["hsl(145, 38%, 89%)", "hsl(145, 38%, 28%)", "hsl(145, 38%, 50%)"]};
const SUBJECTS = ["Physik", "Informatik", "Allgemein", "Technische Mechanik", "Mathematik", "Elektrotechnik"];
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function paint(el, value, dot=false, customColor) {
  const c = customColor || COLORS[value];
  if (!c) return;
  el.classList.add('fln-pill');
  el.classList.toggle('fln-dot', dot);
  el.style.setProperty('--fln-bg', c[0]);
  el.style.setProperty('--fln-text', c[1]);
  el.style.setProperty('--fln-dot', c[2]);
}


const TEXT_PROPERTIES = new Set(['Fehlerbeschreibung', 'Wo Fehler']);
const OPTION_KEYS = ['fach', 'klausur', 'status'];
// Quick filters live in the view's own filter list in the .base file, recognisable by this shape.
const QUICK_FILTERS = { Fach: /^note\.Fach\.containsAny\((.*)\)$/, Klausur: /^note\.Klausur\.containsAny\((.*)\)$/ };
// Columns may be resized by hand, but together never wider than the visible table.
const DESCRIPTION = 'note.Fehlerbeschreibung';
const DESCRIPTION_MIN = 150;
function mathParts(text) {
  const parts = []; let last = 0;
  const pattern = /(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ math: match[1], original: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

class NewError extends Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; }
  onOpen() {
    const c = this.contentEl;
    this.modalEl.addClass('fln-glass-modal');
    c.addClass('fln-form');
    c.createEl('h2', { text: 'Neuer Fehler' });
    const fields = {};
    const field = (label, type, options) => {
      const row = c.createDiv('fln-field');
      const caption = row.createEl('label', { text: label });
      const el = row.createEl(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
      el.id = `fln-${Object.keys(fields).length}`; caption.htmlFor = el.id;
      if (type === 'subject') {
        el.type = 'text'; el.value = options.includes('Mathematik') ? 'Mathematik' : (options[0] || '');
        const list = row.createEl('datalist'); list.id = `${el.id}-options`;
        el.setAttribute('list', list.id);
        el.setAttribute('placeholder', 'Fach auswählen oder neues Fach eingeben');
        for (const value of options) list.createEl('option', { value });
        const preview = row.createSpan();
        const refresh = () => {
          const value = el.value.trim(); preview.textContent = value;
          if (value) paint(preview, value, false, this.plugin.subjectColor(value));
        };
        el.addEventListener('change', refresh); refresh();
      } else if (type === 'select') {
        for (const value of options) el.createEl('option', { value, text: value });
        const preview = row.createSpan();
        const refresh = () => { preview.textContent = el.value; paint(preview, el.value, label !== 'Fach'); };
        el.addEventListener('change', refresh); refresh();
      } else if (type !== 'textarea') el.type = type;
      if (type === 'text' || type === 'textarea') el.setAttribute('autocomplete', 'off');
      fields[label] = el;
      return el;
    }
    field('Fehler (Beschreibung)', 'textarea');
    field('Fach', 'subject', this.plugin.subjects());
    field('Klausur', 'select', this.plugin.availableOptions('klausur', ['NEIN', 'JA']));
    field('Wo fehler', 'text');
    field('status', 'select', this.plugin.availableOptions('status', ['mid', 'gravierend', 'leicht']));
    field('Datum', 'date').value = today();
    const save = c.createEl('button', { text: 'Fehler speichern', cls: 'mod-cta' });
    save.addEventListener('click', async () => {
      const description = fields['Fehler (Beschreibung)'].value.trim();
      if (!description) return new Notice('Bitte eine Fehlerbeschreibung eingeben.');
      const subject = fields.Fach.value.trim();
      if (!subject) return new Notice('Bitte ein Fach auswählen oder neu eingeben.');
      const date = fields.Datum.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Notice('Bitte ein gültiges Datum auswählen.');
      save.disabled = true;
      try {
        for (const folder of [ROOT, `${ROOT}/Einträge`]) {
          if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
        }
        const data = { Fehlerbeschreibung: description, Fach: [subject], Klausur: [fields.Klausur.value], 'Wo Fehler': fields['Wo fehler'].value.trim(), Status: [fields.status.value], Datum: date };
        const stem = `${ROOT}/Einträge/${date} – Fehler`;
        let path = `${stem}.md`, n = 2;
        while (this.app.vault.getAbstractFileByPath(path)) path = `${stem} ${n++}.md`;
        const created = await this.app.vault.create(normalizePath(path), `---\n${JSON.stringify(data, null, 2)}\n---\n## Erklärung / richtiger Lösungsweg\n\n`);
        this.plugin.recordUndo({ type: 'create', path: created.path });
        await this.plugin.setSubjectRemoved(subject, false);
        this.plugin.subjectColor(subject);
        this.close();
        new Notice('Fehler gespeichert.');
        const base = this.app.vault.getAbstractFileByPath(`${ROOT}/Fehlerliste.base`);
        if (base) await this.app.workspace.getLeaf(false).openFile(base);
      } catch (e) { new Notice(`Speichern fehlgeschlagen: ${e.message}`); save.disabled = false; }
    });
  }
  onClose() { this.contentEl.empty(); }
}
class ConfirmDelete extends Modal {
  constructor(app, name, onConfirm) { super(app); this.name = name; this.onConfirm = onConfirm; }
  onOpen() {
    const c = this.contentEl;
    this.modalEl.addClass('fln-glass-modal');
    c.createEl('h2', { text: 'Eintrag löschen?' });
    c.createEl('p', { text: `„${this.name}“ wird in den Papierkorb verschoben.`, cls: 'fln-caption' });
    const buttons = c.createDiv('modal-button-container');
    buttons.createEl('button', { text: 'Abbrechen' }).addEventListener('click', () => this.close());
    const confirm = buttons.createEl('button', { text: 'Löschen', cls: 'mod-warning' });
    confirm.addEventListener('click', () => { this.close(); this.onConfirm(); });
  }
  onClose() { this.contentEl.empty(); }
}
class SubjectManager extends Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; }
  onOpen() {
    this.modalEl.addClass('fln-glass-modal');
    const c = this.contentEl; c.addClass('fln-subject-manager'); c.empty();
    c.createEl('h2', { text: 'Fächer verwalten' });
    c.createEl('p', { text: 'Entfernte Fächer und Werte verschwinden aus der Auswahl. Deine bisherigen Einträge behalten ihre Zuordnung.', cls: 'fln-caption' });
    const addRow = c.createDiv('fln-subject-add');
    const input = addRow.createEl('input', { type: 'text', attr: { placeholder: 'Neues Fach', 'aria-label': 'Neues Fach', autocomplete: 'off' } });
    const add = addRow.createEl('button', { text: 'Hinzufügen', cls: 'mod-cta' });
    add.addEventListener('click', async () => {
      const name = input.value.trim();
      if (!name) return;
      add.disabled = true;
      try { this.plugin.subjectColor(name); await this.plugin.setSubjectRemoved(name, false); this.onOpen(); }
      catch (_) { add.disabled = false; new Notice('Das Fach konnte nicht gespeichert werden.'); }
    });
    for (const removed of [false, true]) {
      const values = this.plugin.subjects(true).filter(name => this.plugin.isSubjectRemoved(name) === removed);
      if (!values.length) continue;
      c.createEl('h3', { text: removed ? 'Entfernt' : 'Verfügbar' });
      for (const name of values) {
        const row = c.createDiv('fln-subject-row');
        const label = row.createSpan({ text: name });
        paint(label, name, false, this.plugin.subjectColor(name));
        const button = row.createEl('button', { text: removed ? 'Wiederherstellen' : 'Entfernen' });
        button.addEventListener('click', async () => {
          button.disabled = true;
          try { await this.plugin.setSubjectRemoved(name, !removed); this.onOpen(); }
          catch (_) { button.disabled = false; new Notice('Die Änderung konnte nicht gespeichert werden.'); }
        });
      }
    }
    for (const [key, title] of [['klausur', 'Klausur'], ['status', 'Status']]) {
      const values = this.plugin.settings.removedOptions[key];
      if (!values.length) continue;
      c.createEl('h3', { text: `Entfernt – ${title}` });
      for (const name of values) {
        const row = c.createDiv('fln-subject-row');
        paint(row.createSpan({ text: name }), name, true);
        const button = row.createEl('button', { text: 'Wiederherstellen' });
        button.addEventListener('click', async () => {
          button.disabled = true;
          try { await this.plugin.setOptionRemoved(key, name, false); this.onOpen(); }
          catch (_) { button.disabled = false; new Notice('Die Änderung konnte nicht gespeichert werden.'); }
        });
      }
    }
  }
  onClose() { this.contentEl.empty(); }
}

class SetupModal extends Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; }
  onOpen() {
    this.modalEl.addClass('fln-glass-modal');
    this.contentEl.createEl('h2', { text: 'Deine Fehlerliste einrichten' });
    this.contentEl.createEl('p', { text: 'Erstellt die Tabelle, einen Ordner für Einträge und eine Vorlage. Vorhandene Dateien werden behalten.', cls: 'fln-caption' });
    const button = this.contentEl.createEl('button', { text: 'Fehlerliste einrichten', cls: 'mod-cta' });
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await this.plugin.setupVault(); this.close(); }
      catch (error) { button.disabled = false; new Notice(`Einrichtung fehlgeschlagen: ${error.message}`); }
    });
    this.contentEl.createEl('button', { text: 'Später' }).addEventListener('click', () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}

module.exports = class Fehlerfarben extends Plugin {
  async onload() {
    const data = await this.loadData();
    this.settings = data && typeof data === 'object' ? data : {};
    this.settings.subjectColors = this.settings.subjectColors || {};
    this.settings.removedSubjects = Array.isArray(this.settings.removedSubjects) ? this.settings.removedSubjects.filter(s => typeof s === 'string') : [];
    const removedOptions = this.settings.removedOptions && typeof this.settings.removedOptions === 'object' ? this.settings.removedOptions : {};
    this.settings.removedOptions = {};
    for (const key of ['klausur', 'status']) {
      this.settings.removedOptions[key] = Array.isArray(removedOptions[key]) ? removedOptions[key].filter(s => typeof s === 'string') : [];
    }
    this.register(() => clearTimeout(this.colorSaveTimer));
    this.addCommand({ id: 'setup', name: 'Fehlerliste einrichten', callback: () => new SetupModal(this.app, this).open() });
    this.app.workspace.onLayoutReady(() => {
      if (!this.app.vault.getAbstractFileByPath(`${ROOT}/Fehlerliste.base`) && !this.settings.setupOffered) {
        this.settings.setupOffered = true;
        this.saveData(this.settings).catch(() => {});
        new SetupModal(this.app, this).open();
      }
    });
    const open = () => new NewError(this.app, this).open();
    this.addCommand({ id: 'neuer-fehler', name: 'Neuen Fehler eintragen', callback: open });
    this.addRibbonIcon('list-plus', 'Neuen Fehler eintragen', open);
    const manage = () => new SubjectManager(this.app, this).open();
    this.addCommand({ id: 'faecher-verwalten', name: 'Fächer verwalten', callback: manage });
    this.addRibbonIcon('tags', 'Fächer verwalten', manage);
    const exportPdf = () => this.exportPdf();
    this.addCommand({ id: 'pdf-export', name: 'Fehlerliste als PDF exportieren', callback: exportPdf });
    this.mathPreviews = new Map();
    this.limitedTables = new Map();
    this.undoStack = [];
    this.mathEditRequests = new WeakSet();
    this.mathEditTimers = new Set();
    this.register(() => { for (const timer of this.mathEditTimers) clearTimeout(timer); });
    const process = () => {
      this.updateFreeTextMode();
      for (const base of document.querySelectorAll('.bases-view, .bases-embed')) {
        // Scope layout and toolbar to this database, using its unique description property.
        if (!base.querySelector('[data-property="note.Fehlerbeschreibung"], [data-property="Fehlerbeschreibung"]')) continue;
        base.classList.add('fln-base');
        const shell = base.classList.contains('bases-view') ? base.parentElement : base;
        shell.classList.add('fln-shell');
        const toolbar = shell.querySelector('.bases-toolbar') || shell.querySelector('.bases-header');
        // Icon + label buttons; labels collapse to icons when the toolbar gets narrow (see styles.css).
        const add = (cls, icon, label, title, onClick) => {
          if (!toolbar || toolbar.querySelector(`.${cls.split(' ')[0]}`)) return null;
          const button = document.createElement('button');
          button.className = `${cls} fln-tool`;
          button.setAttribute('aria-label', title);
          setIcon(button.createSpan({ cls: 'fln-tool-icon' }), icon);
          button.createSpan({ cls: 'fln-tool-label', text: label });
          button.addEventListener('click', event => onClick(event, button));
          toolbar.appendChild(button);
          return button;
        };
        if (add('fln-filter', 'list-filter', 'Schnellfilter', 'Nach Fächern und Klausur filtern', (e, b) => this.openQuickFilter(e, b))) this.refreshQuickFilterLabel();
        add('fln-pdf', 'file-down', 'PDF', 'Als PDF exportieren (mit aktueller Sortierung und Filtern)', exportPdf);
        add('fln-manage', 'tags', 'Fächer', 'Fächer verwalten', manage);
        add('fln-new mod-cta', 'plus', 'Neuer Fehler', 'Neuen Fehler eintragen', open);
        this.renderTextMath(base, schedule);
        for (const table of this.openTables()) this.limitTableWidth(table);
        for (const pill of base.querySelectorAll('.multi-select-pill')) {
          const value = (pill.querySelector('.multi-select-pill-content')?.textContent || pill.textContent || '').trim();
          const cell = pill.closest('[data-property]');
          const prop = cell?.getAttribute('data-property')?.replace(/^note\./, '');
          if (['Fach','Klausur','Status'].includes(prop)) paint(pill, value, prop !== 'Fach', prop === 'Fach' ? this.subjectColor(value) : undefined);
        }
      }
      // Obsidian tags each property value menu with its key; choice menus get a Notion-style layout.
      for (const box of document.querySelectorAll('.suggestion-container.mod-property-value')) {
        const key = box.getAttribute('data-property-key')?.replace(/^note\./, '');
        if (!OPTION_KEYS.includes(key) || box.querySelector(':scope > .fln-option-header')) continue;
        box.classList.add('fln-option-menu');
        const header = document.createElement('div');
        header.className = 'fln-option-header'; header.textContent = 'Option auswählen oder erstellen';
        box.prepend(header);
      }
      // Native suggestion items remain editable and retain their normal behavior.
      const allSubjects = this.subjects(true);
      for (const item of document.querySelectorAll('.suggestion-item')) {
        const value = item.textContent.trim();
        const dot = ['JA','NEIN','gravierend','mid','leicht'].includes(value);
        const menu = item.closest('.fln-option-menu');
        const key = menu?.getAttribute('data-property-key')?.replace(/^note\./, '');
        if (menu) {
          item.classList.toggle('fln-hidden-subject', this.isOptionRemoved(key, value));
          if (key !== 'fach' || allSubjects.includes(value)) this.decorateOption(item, key, value);
          continue;
        }
        item.classList.toggle('fln-hidden-subject', this.isSubjectInput() && this.isSubjectRemoved(value));
        if (COLORS[value] || allSubjects.includes(value)) paint(item, value, dot, dot ? undefined : this.subjectColor(value));
      }
    };
    let timer;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(process, 90); };
    // Cmd/Ctrl+Z in the error list undoes the latest change, from Bases or from this plugin.
    this.registerDomEvent(window, 'keydown', event => {
      if (event.key.toLowerCase() !== 'z' || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      if (event.isComposing || !this.undoStack.length || !this.isListActive()) return;
      // Text being typed keeps its own native undo.
      const target = event.target;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('.modal-container')) return;
      event.preventDefault(); event.stopPropagation();
      this.undoLast();
    }, true);
    this.rowTrash = document.createElement('button');
    this.rowTrash.className = 'fln-row-trash clickable-icon';
    this.rowTrash.setAttribute('aria-label', 'Eintrag löschen');
    setIcon(this.rowTrash, 'trash-2');
    document.body.appendChild(this.rowTrash);
    this.register(() => this.rowTrash.remove());
    this.rowTrash.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      const row = this.trashRow; this.hideRowTrash();
      if (row) this.deleteRowEntry(row);
    });
    this.registerDomEvent(document, 'pointermove', event => {
      if (this.rowTrash.contains(event.target)) return;
      const row = event.target?.closest?.('.fln-base .bases-tbody .bases-tr');
      if (row && !row.querySelector('.is-measuring')) this.showRowTrash(row); else this.hideRowTrash();
    });
    this.registerDomEvent(document, 'scroll', () => this.hideRowTrash(), true);
    this.registerDomEvent(document.documentElement, 'mouseleave', () => this.hideRowTrash());
    this.registerDomEvent(document, 'focusin', () => { this.updateFreeTextMode(); schedule(); });
    this.registerDomEvent(document, 'focusout', schedule);
    this.registerDomEvent(document, 'input', () => { this.updateFreeTextMode(); schedule(); });
    this.registerDomEvent(document, 'pointerdown', event => {
      const cell = event.target?.closest?.('.fln-base .bases-td');
      if (cell && this.mathPreviews.has(cell) && event.button === 0) {
        this.mathEditRequests.add(cell);
        this.clearMathPreview(cell);
      }
    }, true);
    this.registerDomEvent(document, 'click', event => {
      const cell = event.target?.closest?.('.fln-base .bases-td');
      if (!cell || !this.mathEditRequests.has(cell)) return;
      this.mathEditRequests.delete(cell);
      // Obsidian first updates its table selection; then explicitly reopen the native editor.
      const timer = setTimeout(() => {
        this.mathEditTimers.delete(timer);
        this.focusMathEditor(cell);
        schedule();
      }, 0);
      this.mathEditTimers.add(timer);
    }, true);
    this.register(() => { this.mathStopped = true; document.body.classList.remove('fln-text-edit'); });
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    this.register(() => { observer.disconnect(); clearTimeout(timer); });
    this.app.workspace.onLayoutReady(schedule);
    this.registerEvent(this.app.workspace.on('active-leaf-change', schedule));
    this.registerEvent(this.app.metadataCache.on('changed', schedule));
    // Register after initial vault indexing so existing notes are never backfilled.
    this.newDateTimers = new Set();
    this.register(() => {
      for (const id of this.newDateTimers) clearTimeout(id);
      this.newDateTimers.clear();
    });
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on('create', file => {
        if (!this.isErrorEntry(file)) return;
        const date = today();
        // Give Bases or a template time to finish supplying initial properties.
        const id = setTimeout(() => {
          this.newDateTimers.delete(id);
          this.fillNewEntryDate(file, date).catch(() => new Notice('Das Datum konnte nicht automatisch eingetragen werden.'));
        }, 400);
        this.newDateTimers.add(id);
      }));
    });
  }

  async setupVault({ open = true } = {}) {
    const created = [];
    for (const folder of [ROOT, `${ROOT}/Einträge`, `${ROOT}/Vorlagen`]) {
      const existing = this.app.vault.getAbstractFileByPath(folder);
      if (existing && !Array.isArray(existing.children)) throw new Error(`„${folder}“ ist bereits als Datei vorhanden.`);
      if (!existing) await this.app.vault.createFolder(folder);
    }
    for (const [path, contents] of Object.entries(SETUP_FILES)) {
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing && Array.isArray(existing.children)) throw new Error(`„${path}“ ist bereits als Ordner vorhanden.`);
      if (existing) continue;
      await this.app.vault.create(normalizePath(path), contents); created.push(path);
    }
    this.settings.setupOffered = true;
    await this.saveData(this.settings);
    if (open) {
      const file = this.app.vault.getAbstractFileByPath(`${ROOT}/Fehlerliste.base`);
      if (file) await this.app.workspace.getLeaf(false).openFile(file);
    }
    new Notice(created.length ? 'Fehlerliste eingerichtet. Neue Einträge erstellst du mit „Neuer Fehler“.' : 'Fehlerliste ist bereits eingerichtet. Bestehende Dateien wurden beibehalten.');
    return created;
  }

  updateFreeTextMode() {
    const active = document.activeElement;
    const cell = active?.closest?.('[data-property]');
    const prop = cell?.getAttribute('data-property')?.replace(/^note\./, '');
    const tableText = cell?.closest('.fln-base') && TEXT_PROPERTIES.has(prop);
    // The Bases New dialog uses the regular Properties editor outside the table DOM.
    const row = active?.closest?.('.metadata-property[data-property-key]');
    const rowKey = row?.getAttribute('data-property-key')?.toLowerCase();
    const propertyText = active?.closest?.('.metadata-property-value') &&
      ['fehlerbeschreibung', 'wo fehler'].includes(rowKey);
    document.body.classList.toggle('fln-text-edit', Boolean(tableText || propertyText));
  }
  focusMathEditor(cell) {
    if (!cell.isConnected) return;
    this.clearMathPreview(cell);
    const editor = cell.querySelector('.bases-metadata-value .metadata-input-longtext[contenteditable="true"], .bases-metadata-value [contenteditable="true"], .bases-metadata-value textarea, .bases-metadata-value input');
    if (!editor) return;
    editor.focus({ preventScroll: true });
    if (editor.isContentEditable) {
      const doc = editor.ownerDocument;
      const range = doc.createRange();
      range.selectNodeContents(editor); range.collapse(false);
      const selection = doc.getSelection();
      selection?.removeAllRanges(); selection?.addRange(range);
    } else if (typeof editor.setSelectionRange === 'function') {
      const length = editor.value.length;
      editor.setSelectionRange(length, length);
    }
    this.updateFreeTextMode();
  }
  clearMathPreview(cell) {
    const cached = this.mathPreviews?.get(cell);
    if (!cached) return;
    cached.preview.remove(); cached.source.classList.remove('fln-math-source');
    this.mathPreviews.delete(cell);
  }
  renderTextMath(base, schedule) {
    for (const [cell] of this.mathPreviews) {
      if (!cell.isConnected || !cell.closest('.fln-base')) this.clearMathPreview(cell);
    }
    let changed = false;
    for (const cell of base.querySelectorAll('.bases-td[data-property]')) {
      const prop = cell.getAttribute('data-property')?.replace(/^note\./, '');
      if (!TEXT_PROPERTIES.has(prop) || cell.closest('.bases-thead')) continue;
      if (cell.contains(document.activeElement) || this.mathEditRequests.has(cell)) {
        this.clearMathPreview(cell); continue;
      }
      const source = cell.querySelector('.bases-metadata-value') || cell.querySelector('.bases-rendered-value');
      if (!source) { this.clearMathPreview(cell); continue; }
      const text = source.textContent || '';
      const previous = this.mathPreviews.get(cell);
      if (previous?.text === text && previous.source === source && previous.preview.parentNode === source.parentNode) continue;
      this.clearMathPreview(cell);
      const parts = mathParts(text);
      if (!parts.some(p => 'math' in p)) continue;
      if (!this.mathAvailable) {
        if (!this.mathReady) {
          this.mathReady = loadMathJax().then(() => {
            if (!this.mathStopped) { this.mathAvailable = true; schedule(); }
          }).catch(() => { new Notice('Die Formeldarstellung konnte nicht geladen werden. Der LaTeX-Text bleibt erhalten.'); });
        }
        continue;
      }
      const doc = cell.ownerDocument;
      const preview = doc.createElement('div'); preview.className = 'fln-math-preview';
      for (const part of parts) {
        if ('text' in part) preview.appendChild(doc.createTextNode(part.text));
        else {
          try { preview.appendChild(renderMath(part.math, false)); }
          catch (_) { preview.appendChild(doc.createTextNode(part.original)); }
        }
      }
      // Never replace source.textContent: native cell editing must receive the original LaTeX.
      source.classList.add('fln-math-source'); source.parentNode.appendChild(preview);
      this.mathPreviews.set(cell, { source, preview, text }); changed = true;
    }
    if (changed) finishRenderMath().catch(() => {});
  }

  isErrorEntry(file) {
    return file?.extension === 'md' &&
      file.path.normalize('NFC').startsWith(`${ROOT}/Einträge/`);
  }
  async fillNewEntryDate(file, date) {
    if (!this.isErrorEntry(file) || this.app.vault.getAbstractFileByPath(file.path) !== file) return;
    await this.app.fileManager.processFrontMatter(file, frontmatter => {
      const key = Object.keys(frontmatter).find(k => k.toLowerCase() === 'datum') || 'Datum';
      const value = frontmatter[key];
      if (value == null || (typeof value === 'string' && value.trim() === '')) {
        frontmatter[key] = date;
      }
    });
  }
  showRowTrash(row) {
    const view = row.closest('.fln-base');
    const header = view?.querySelector('.bases-thead');
    const rect = row.getBoundingClientRect();
    const viewRect = view.getBoundingClientRect();
    const top = rect.top + 6;
    // Hide while the row is scrolled under the sticky header or out of the view.
    if (top < (header ? header.getBoundingClientRect().bottom : viewRect.top) || top + 28 > viewRect.bottom) return this.hideRowTrash();
    const right = Math.min(rect.right, viewRect.left + view.clientWidth);
    this.trashRow = row;
    this.rowTrash.style.top = `${top}px`;
    this.rowTrash.style.left = `${right - 32}px`;
    this.rowTrash.classList.add('is-visible');
  }
  hideRowTrash() {
    this.trashRow = null;
    this.rowTrash?.classList.remove('is-visible');
  }
  async deleteRowEntry(row) {
    let file = null;
    for (const table of this.openTables()) {
      const match = (table.rows || []).find(r => r.el === row);
      if (match) { file = match.entry?.file; break; }
    }
    // Only notes inside the error folder can be deleted from here.
    if (!file || !this.isErrorEntry(file)) return new Notice('Dieser Eintrag konnte nicht gefunden werden.');
    const description = this.app.metadataCache.getFileCache(file)?.frontmatter?.Fehlerbeschreibung;
    const name = typeof description === 'string' && description.trim()
      ? (description.trim().length > 60 ? `${description.trim().slice(0, 60)}…` : description.trim())
      : file.basename;
    const remove = async () => {
      try {
        // Keep a copy so Cmd+Z can bring the entry back.
        const path = file.path, content = await this.app.vault.read(file);
        await this.app.fileManager.trashFile(file);
        this.recordUndo({ type: 'delete', path, content });
        new Notice('Eintrag in den Papierkorb verschoben.');
      } catch (e) { new Notice(`Löschen fehlgeschlagen: ${e.message}`); }
    };
    // Follow Obsidian's own "confirm file deletion" setting.
    if (this.app.vault.getConfig?.('promptDelete') === false) await remove();
    else new ConfirmDelete(this.app, name, remove).open();
  }
  baseFile() {
    const file = this.app.vault.getAbstractFileByPath(`${ROOT}/Fehlerliste.base`);
    return file instanceof TFile ? file : null;
  }
  viewName() {
    const table = this.openTables()[0];
    return table?.config?.name || table?.config?.getViewName?.() || null;
  }
  // Returns the view config in `data`, plus the user's own filters and the quick filter values.
  splitFilters(data, name) {
    const views = Array.isArray(data?.views) ? data.views : [];
    const view = views.find(v => v?.name === name) || views[0];
    const values = { Fach: [], Klausur: [] };
    if (!view) return { view, own: [], values };
    const filters = view.filters;
    const items = !filters ? [] : (Array.isArray(filters.and) && Object.keys(filters).length === 1 ? filters.and : [filters]);
    const own = [];
    for (const item of items) {
      const key = typeof item === 'string' && Object.keys(QUICK_FILTERS).find(k => QUICK_FILTERS[k].test(item.trim()));
      if (!key) { own.push(item); continue; }
      try { values[key] = JSON.parse(`[${QUICK_FILTERS[key].exec(item.trim())[1]}]`).map(String); }
      catch (_) { own.push(item); }
    }
    return { view, own, values };
  }
  async readQuickFilters() {
    const file = this.baseFile();
    if (!file) return { Fach: [], Klausur: [] };
    try { return this.splitFilters(parseYaml(await this.app.vault.cachedRead(file)), this.viewName()).values; }
    catch (_) { return { Fach: [], Klausur: [] }; }
  }
  async refreshQuickFilterLabel(values) {
    values = values || await this.readQuickFilters();
    const count = values.Fach.length + values.Klausur.length;
    for (const button of document.querySelectorAll('.fln-filter')) {
      const label = button.querySelector('.fln-tool-label');
      if (label) label.textContent = count ? `Schnellfilter (${count})` : 'Schnellfilter';
      button.dataset.count = count ? String(count) : '';
      button.classList.toggle('is-active', count > 0);
    }
  }
  async setQuickFilter(key, value, on) {
    const file = this.baseFile();
    if (!file) return new Notice('Fehlerliste.base wurde nicht gefunden.');
    const name = this.viewName();
    let before = null, result = null;
    try {
      await this.app.vault.process(file, text => {
        before = text;
        const data = parseYaml(text);
        const { view, own, values } = this.splitFilters(data, name);
        if (!view) throw new Error('Keine Ansicht gefunden.');
        const set = key === null ? new Set() : new Set(values[key]);
        if (key !== null) { if (on) set.add(value); else set.delete(value); }
        const next = key === null ? { Fach: [], Klausur: [] } : { ...values, [key]: [...set] };
        const list = [...own];
        for (const k of Object.keys(QUICK_FILTERS)) {
          if (next[k].length) list.push(`note.${k}.containsAny(${next[k].map(v => JSON.stringify(v)).join(', ')})`);
        }
        if (list.length) view.filters = { and: list }; else delete view.filters;
        result = next;
        return stringifyYaml(data);
      });
      if (before !== null) this.recordUndo({ type: 'file', path: file.path, content: before });
      this.refreshQuickFilterLabel(result);
    } catch (e) { new Notice(`Filter konnte nicht gesetzt werden: ${e.message}`); }
  }
  async openQuickFilter(event, button) {
    const values = await this.readQuickFilters();
    const menu = new Menu();
    const section = (title, key, options) => {
      menu.addItem(item => item.setTitle(title).setDisabled(true));
      for (const option of options) {
        const on = values[key].includes(option);
        menu.addItem(item => item.setTitle(option).setChecked(on)
          .onClick(() => this.setQuickFilter(key, option, !on)));
      }
    };
    // Offer every selectable subject plus those still used by entries, even if removed from the choice.
    const used = new Set();
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!this.isErrorEntry(file)) continue;
      const raw = this.app.metadataCache.getFileCache(file)?.frontmatter?.Fach;
      for (const value of (Array.isArray(raw) ? raw : [raw])) if (typeof value === 'string' && value.trim()) used.add(value.trim());
    }
    const subjects = [...new Set([...this.subjects(), ...used, ...values.Fach])].sort((a, b) => a.localeCompare(b, 'de'));
    section('Fächer', 'Fach', subjects);
    menu.addSeparator();
    section('Klausur', 'Klausur', ['JA', 'NEIN']);
    if (values.Fach.length || values.Klausur.length) {
      menu.addSeparator();
      menu.addItem(item => item.setTitle('Alle Schnellfilter entfernen').setIcon('x')
        .onClick(() => this.setQuickFilter(null, null, false)));
    }
    const rect = button.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
  }
  async exportPdf() {
    const table = this.openTables().find(t => Array.isArray(t.data?.properties) && t.data.properties.length);
    if (!table) return new Notice('Öffne zuerst die Fehlerliste.');
    const ipc = window.electron?.ipcRenderer;
    if (!ipc) return new Notice('Der PDF-Export ist nur in der Desktop-App verfügbar.');
    if (this.exporting) return;
    this.exporting = true;
    // Bases has already applied the view's sort, filters and grouping to this data.
    const properties = table.data.properties;
    const groups = table.data.groupedData || [];
    const count = groups.reduce((sum, group) => sum + (group.entries?.length || 0), 0);
    const root = document.createElement('div');
    root.className = 'print fln-print';
    document.body.appendChild(root);
    new Notice('PDF wird erstellt …');
    try {
      root.createEl('h1', { text: 'Fehlerliste' });
      const now = new Date();
      root.createDiv({ cls: 'fln-print-meta', text: `${count} ${count === 1 ? 'Eintrag' : 'Einträge'} · Stand ${now.toLocaleDateString('de-DE')}` });
      const tableEl = root.createEl('table');
      // Keep the on-screen column proportions.
      const colgroup = tableEl.createEl('colgroup');
      const widths = properties.map(property => table.columnInfo?.[property]?.getWidth?.(table.minColWidth || 40, table.maxColWidth || 300) || 100);
      const total = widths.reduce((a, b) => a + b, 0);
      for (const width of widths) colgroup.createEl('col').style.width = `${(width / total * 100).toFixed(2)}%`;
      const headRow = tableEl.createEl('thead').createEl('tr');
      for (const property of properties) {
        const name = table.config?.getDisplayName?.(property) || property.replace(/^note\./, '');
        headRow.createEl('th', { text: name });
      }
      const body = tableEl.createEl('tbody');
      let math = false;
      for (const group of groups) {
        if (group.key != null && groups.length > 1) {
          const cell = body.createEl('tr', { cls: 'fln-print-group' }).createEl('td', { attr: { colspan: String(properties.length) } });
          cell.setText(String(group.key) || '–');
        }
        for (const entry of group.entries || []) {
          const row = body.createEl('tr');
          for (const property of properties) math = this.renderPrintCell(row.createEl('td'), entry, property) || math;
        }
      }
      if (math) await finishRenderMath().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 200));
      const filepath = this.pdfPath(now);
      await new Promise(resolve => {
        ipc.once('print-to-pdf', resolve);
        ipc.send('print-to-pdf', {
          filepath, open: true, pageSize: 'A4', landscape: false, printBackground: true,
          margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
        });
      });
      new Notice(`PDF gespeichert: ${filepath}`);
    } catch (e) {
      new Notice(`PDF-Export fehlgeschlagen: ${e.message}`);
    } finally {
      root.remove();
      this.exporting = false;
    }
  }
  renderPrintCell(td, entry, property) {
    const name = property.replace(/^note\./, '');
    let value;
    if (property.startsWith('note.')) {
      const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter || {};
      const key = Object.keys(frontmatter).find(k => k.toLowerCase() === name.toLowerCase());
      value = key ? frontmatter[key] : undefined;
    } else {
      try { value = entry.getValue(property)?.toString(); } catch (_) {}
    }
    if (value == null || value === '') return false;
    const choice = ['fach', 'klausur', 'status'].includes(name.toLowerCase());
    if (choice || Array.isArray(value)) {
      for (const item of (Array.isArray(value) ? value : [value])) {
        const text = String(item);
        const colors = name.toLowerCase() === 'fach' ? this.subjectColor(text) : COLORS[text];
        const chip = td.createSpan({ cls: 'fln-print-chip', text: '' });
        if (colors) {
          chip.style.background = colors[0]; chip.style.color = colors[1];
          if (name.toLowerCase() !== 'fach') chip.createSpan({ cls: 'fln-print-dot' }).style.background = colors[2];
        }
        chip.appendText(text);
      }
      return false;
    }
    let text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [y, m, d] = text.split('-');
      text = `${d}.${m}.${y}`;
    }
    const parts = mathParts(text);
    if (!parts.some(part => 'math' in part)) { td.setText(text); return false; }
    for (const part of parts) {
      if ('text' in part) td.appendText(part.text);
      else {
        try { td.appendChild(renderMath(part.math, false)); }
        catch (_) { td.appendText(part.original); }
      }
    }
    return true;
  }
  pdfPath(date) {
    const path = require('path'), fs = require('fs');
    let folder;
    try { folder = require('electron').remote.app.getPath('downloads'); }
    catch (_) { folder = path.join(require('os').homedir(), 'Downloads'); }
    const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    let file = path.join(folder, `Fehlerliste ${stamp}.pdf`), n = 2;
    while (fs.existsSync(file)) file = path.join(folder, `Fehlerliste ${stamp} (${n++}).pdf`);
    return file;
  }
  recordUndo(action) {
    if (this.undoing) return;
    this.undoStack.push(action);
    if (this.undoStack.length > 50) this.undoStack.shift();
  }
  isListActive() {
    const view = this.app.workspace.activeLeaf?.view;
    return view?.file?.path?.normalize('NFC') === `${ROOT}/Fehlerliste.base`;
  }
  async undoLast() {
    const action = this.undoStack.pop();
    if (!action) return;
    this.undoing = true;
    try {
      if (action.type === 'bases') {
        // Skip markers whose edit Bases already undid itself.
        if (!action.table.undoStack?.length) { this.undoing = false; return this.undoLast(); }
        await action.table.undoTransaction();
      } else if (action.type === 'delete') {
        if (this.app.vault.getAbstractFileByPath(action.path)) return new Notice('Der Eintrag existiert bereits.');
        const folder = action.path.slice(0, action.path.lastIndexOf('/'));
        if (folder && !this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
        await this.app.vault.create(action.path, action.content);
        new Notice('Eintrag wiederhergestellt.');
      } else if (action.type === 'create') {
        const file = this.app.vault.getAbstractFileByPath(action.path);
        if (file) { await this.app.fileManager.trashFile(file); new Notice('Neuer Eintrag zurückgenommen.'); }
      } else if (action.type === 'option') {
        await this.setOptionRemoved(action.key, action.value, false);
        new Notice(`„${action.value}“ wieder in der Auswahl.`);
      } else if (action.type === 'file') {
        const file = this.app.vault.getAbstractFileByPath(action.path);
        if (file instanceof TFile) { await this.app.vault.modify(file, action.content); this.refreshQuickFilterLabel(); }
        new Notice('Filter zurückgesetzt.');
      } else if (action.type === 'widths') {
        const state = this.limitedTables.get(action.table);
        if (!state) return;
        this.setCustomWidths(action.table, action.widths);
        action.table.updateVirtualDisplay();
        action.table.saveColumnSizes();
        new Notice('Spaltenbreiten zurückgesetzt.');
      }
    } catch (e) {
      new Notice(`Rückgängig fehlgeschlagen: ${e.message}`);
    } finally { this.undoing = false; }
  }
  limitTableWidth(table) {
    if (this.limitedTables.has(table) || typeof table.updateVirtualDisplay !== 'function') return;
    // `intended` holds the widths you set; `applied` what is shown after fitting to the screen.
    const state = { original: table.updateVirtualDisplay, originalSave: table.saveColumnSizes, intended: new Map(), applied: new Map() };
    // Run before every Bases redraw, including each step of a column drag.
    table.updateVirtualDisplay = (...args) => {
      try { this.clampColumns(table, state); } catch (_) {}
      return state.original.apply(table, args);
    };
    // Save your own widths, not the ones temporarily shortened for a narrow window.
    if (typeof state.originalSave === 'function') {
      table.saveColumnSizes = (...args) => {
        try { this.clampColumns(table, state); } catch (_) {}
        const before = state.saved;
        state.saved = new Map(state.intended);
        if (before && [...state.intended].some(([property, width]) => before.get(property) !== width)) {
          this.recordUndo({ type: 'widths', table, widths: before });
        }
        const shown = this.setCustomWidths(table, state.intended);
        try { return state.originalSave.apply(table, args); }
        finally { this.setCustomWidths(table, shown); }
      };
    }
    // Mark each Bases edit in the shared history so Cmd+Z keeps the right order.
    if (typeof table.createTransaction === 'function' && Array.isArray(table.undoStack)) {
      state.originalTransaction = table.createTransaction;
      table.createTransaction = async (...args) => {
        const before = table.undoStack.length;
        const result = await state.originalTransaction.apply(table, args);
        if (table.undoStack.length > before) this.recordUndo({ type: 'bases', table });
        return result;
      };
    }
    this.limitedTables.set(table, state);
    table.updateVirtualDisplay();
    state.saved = new Map(state.intended);
  }
  setCustomWidths(table, widths) {
    const previous = new Map();
    for (const [property, width] of widths) {
      const info = table.columnInfo?.[property];
      if (!info) continue;
      previous.set(property, info.customWidth); info.customWidth = width;
    }
    return previous;
  }
  clampColumns(table, state) {
    const properties = table.data?.properties;
    if (!Array.isArray(properties) || !properties.length || !table.scrollEl) return;
    const infos = properties.map(property => table.columnInfo?.[property]);
    if (infos.some(info => !info || typeof info.getWidth !== 'function')) return;
    const available = Math.floor(table.scrollEl.clientWidth) - 1;
    if (available <= 0) return;
    // A width that differs from what we last applied was set by you (drag) or by Bases (saved config).
    const changed = [];
    properties.forEach((property, i) => {
      const width = infos[i].customWidth;
      if (state.applied.has(property) && width === state.applied.get(property)) return;
      if (state.intended.has(property) && width !== state.intended.get(property)) changed.push(property);
      state.intended.set(property, width);
    });
    for (const property of [...state.intended.keys()]) if (!properties.includes(property)) state.intended.delete(property);
    const min = table.minColWidth || 40, max = table.maxColWidth || 300;
    properties.forEach((property, i) => { infos[i].customWidth = state.intended.get(property); });
    const widths = infos.map(info => info.getWidth(min, max));
    let excess = widths.reduce((a, b) => a + b, 0) - available;
    if (excess > 0) {
      // Shrink the column you just widened first, then the description, then the widest.
      const rest = properties.filter(property => !changed.includes(property))
        .sort((a, b) => (b === DESCRIPTION) - (a === DESCRIPTION) || widths[properties.indexOf(b)] - widths[properties.indexOf(a)]);
      for (const property of [...changed, ...rest]) {
        if (excess <= 0) break;
        const i = properties.indexOf(property);
        const floor = property === DESCRIPTION ? DESCRIPTION_MIN : min;
        const cut = Math.min(excess, Math.max(0, widths[i] - floor));
        if (!cut) continue;
        widths[i] -= cut; excess -= cut;
        infos[i].customWidth = widths[i];
        // A column you drag stops at the edge, and that is the width that gets saved.
        if (changed.includes(property)) state.intended.set(property, widths[i]);
      }
    }
    state.applied = new Map(properties.map((property, i) => [property, infos[i].customWidth]));
  }
  openTables() {
    const tables = [];
    for (const leaf of this.app.workspace.getLeavesOfType?.('bases') || []) {
      const view = leaf.view;
      if (view.file?.path?.normalize('NFC') !== `${ROOT}/Fehlerliste.base`) continue;
      const table = view.controller?.view;
      if (table) tables.push(table);
    }
    return tables;
  }

  isSubjectInput() {
    const active = document.activeElement;
    const cell = active?.closest?.('[data-property]');
    const property = cell?.getAttribute('data-property')?.replace(/^note\./, '').toLowerCase();
    const row = active?.closest?.('.metadata-property[data-property-key]');
    return (cell?.closest('.fln-base') && property === 'fach') ||
      Boolean(active?.closest?.('.metadata-property-value') && row?.getAttribute('data-property-key')?.toLowerCase() === 'fach');
  }
  isSubjectRemoved(name) { return this.settings.removedSubjects.includes(name); }
  isOptionRemoved(key, value) {
    return key === 'fach' ? this.isSubjectRemoved(value) : (this.settings.removedOptions[key] || []).includes(value);
  }
  async setOptionRemoved(key, value, removed) {
    if (key === 'fach') return this.setSubjectRemoved(value, removed);
    const previous = this.settings.removedOptions;
    const values = new Set(previous[key] || []);
    if (removed) values.add(value); else values.delete(value);
    this.settings.removedOptions = { ...previous, [key]: [...values] };
    try { await this.saveData(this.settings); }
    catch (error) { this.settings.removedOptions = previous; throw error; }
  }
  availableOptions(key, values) {
    // Never leave a required choice empty: if everything was removed, offer all values.
    const left = values.filter(value => !this.isOptionRemoved(key, value));
    return left.length ? left : values;
  }
  async setSubjectRemoved(name, removed) {
    const previous = this.settings.removedSubjects;
    const values = new Set(previous);
    if (removed) values.add(name); else values.delete(name);
    this.settings.removedSubjects = [...values];
    try { await this.saveData(this.settings); }
    catch (error) { this.settings.removedSubjects = previous; throw error; }
  }
  subjects(includeRemoved = false) {
    const all = new Set([...SUBJECTS, ...Object.keys(this.settings.subjectColors)]);
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(`${ROOT}/`)) continue;
      const raw = this.app.metadataCache.getFileCache(file)?.frontmatter?.Fach;
      for (const value of (Array.isArray(raw) ? raw : [raw])) {
        if (typeof value === 'string' && value.trim()) all.add(value.trim());
      }
    }
    return [...all].filter(name => includeRemoved || !this.isSubjectRemoved(name)).sort((a,b) => a.localeCompare(b, 'de'));
  }
  subjectColor(value) {
    if (Object.hasOwn(COLORS, value)) return COLORS[value];
    if (Object.hasOwn(this.settings.subjectColors, value)) return this.settings.subjectColors[value];
    // Choose the most distinct available hue; persist it so it does not change later.
    const used = [272, 6, 42, 210, 145];
    for (const colors of Object.values(this.settings.subjectColors)) {
      const match = /^hsl\((\d+)/.exec(colors[0]);
      if (match) used.push(Number(match[1]));
    }
    let best = 0, distance = -1;
    for (let hue = 0; hue < 360; hue++) {
      const d = Math.min(...used.map(h => Math.min(Math.abs(hue-h), 360-Math.abs(hue-h))));
      if (d > distance) { best = hue; distance = d; }
    }
    const colors = [`hsl(${best}, 50%, 89%)`, `hsl(${best}, 50%, 28%)`, `hsl(${best}, 50%, 50%)`];
    Object.defineProperty(this.settings.subjectColors, value, { value: colors, enumerable: true, writable: true, configurable: true });
    clearTimeout(this.colorSaveTimer);
    this.colorSaveTimer = setTimeout(() => this.saveData(this.settings).catch(() => new Notice('Fachfarbe konnte nicht dauerhaft gespeichert werden.')), 200);
    return colors;
  }
  decorateOption(item, key, value) {
    if (item.querySelector(':scope > .fln-option-pill')) return;
    // The row stays neutral; only the value is a colored chip, followed by a trash button.
    const pill = document.createElement('span');
    pill.className = 'fln-option-pill';
    pill.append(...item.childNodes);
    item.classList.add('fln-option');
    item.append(pill);
    if (key === 'fach') paint(pill, value, false, this.subjectColor(value));
    else paint(pill, value, true);
    const trash = document.createElement('button');
    trash.className = 'fln-option-trash clickable-icon';
    trash.setAttribute('aria-label', `„${value}“ aus der Auswahl entfernen`);
    setIcon(trash, 'trash-2');
    // Keep focus in the cell and keep the click from selecting the option.
    trash.addEventListener('mousedown', event => event.preventDefault());
    trash.addEventListener('click', async event => {
      event.preventDefault(); event.stopPropagation();
      trash.disabled = true;
      try {
        await this.setOptionRemoved(key, value, true);
        this.recordUndo({ type: 'option', key, value });
        item.classList.add('fln-hidden-subject');
        new Notice(`„${value}“ entfernt. Wiederherstellen unter „Fächer“.`);
      } catch (_) { trash.disabled = false; new Notice('Die Änderung konnte nicht gespeichert werden.'); }
    });
    item.append(trash);
  }
  onunload() {
    for (const [table, state] of this.limitedTables || []) {
      table.updateVirtualDisplay = state.original;
      if (state.originalSave) table.saveColumnSizes = state.originalSave;
      if (state.originalTransaction) table.createTransaction = state.originalTransaction;
      this.setCustomWidths(table, state.intended);
      try { table.updateVirtualDisplay(); } catch (_) {}
    }
    document.querySelectorAll('.fln-option-header, .fln-option-trash').forEach(x => x.remove());
    document.querySelectorAll('.fln-option-menu').forEach(x => x.classList.remove('fln-option-menu'));
    for (const [cell] of this.mathPreviews || []) this.clearMathPreview(cell);
    document.body.classList.remove('fln-text-edit');
    document.querySelectorAll('.fln-new, .fln-manage, .fln-pdf, .fln-filter, .fln-print').forEach(x => x.remove());
    document.querySelectorAll('.fln-shell').forEach(x => x.classList.remove('fln-shell'));
    document.querySelectorAll('.fln-hidden-subject').forEach(x => x.classList.remove('fln-hidden-subject'));
    document.querySelectorAll('.fln-base').forEach(x => x.classList.remove('fln-base'));
    document.querySelectorAll('.fln-pill').forEach(x => {
      x.classList.remove('fln-pill','fln-dot');
      for (const p of ['--fln-bg','--fln-text','--fln-dot']) x.style.removeProperty(p);
    });
  }
};
