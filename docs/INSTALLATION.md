# Installation

## A. Einfachster Start: eigener, vorbereiteter Vault

1. Öffne die [Downloads der neuesten Version](https://github.com/Ninyago53/obsidian-fehlerliste/releases/latest).
2. Lade **Fehlerliste-Starter-Vault.zip** herunter und entpacke sie. Auf macOS genügt ein Doppelklick.
3. Öffne Obsidian. Über den Vault-Wechsler unten links **Anderen Vault öffnen → Ordner als Vault öffnen** wählen.
4. Wähle den entpackten Ordner **Fehlerliste**. Nicht den übergeordneten Downloads-Ordner und nicht nur den Unterordner Fehlerliste-Notion wählen.
5. Öffne **Einstellungen → Externe Erweiterungen** (englisch **Community plugins**). Erlaube Community-Erweiterungen, wenn du den enthaltenen Code verwenden möchtest, und schalte **Fehlerliste** ein.
6. Öffne **Fehlerliste – Start** und dort **Fehlerliste öffnen**. Die Tabelle ist zunächst leer. Über **Neuer Fehler** legst du deinen ersten Eintrag an.

Die Tabelle, Eigenschaftstypen und der Vorlagenordner sind bereits vorbereitet. Aktivieren musst du die Erweiterung selbst; dafür gibt es keine Installation im Hintergrund.

## B. In einen bestehenden Vault installieren

Vorher eine Sicherung des Vaults erstellen. Lade **Fehlerliste-Plugin.zip** von den Releases herunter und entpacke sie.

### Plugin richtig ablegen

1. In Obsidian unter **Einstellungen → Externe Erweiterungen** neben den installierten Erweiterungen das Ordnersymbol wählen.
2. Den entpackten Ordner **fehlerliste-notion-farben** direkt in diesen `plugins`-Ordner kopieren.
3. So muss die Struktur aussehen:

```text
Dein Vault/
└── .obsidian/
    └── plugins/
        └── fehlerliste-notion-farben/
            ├── main.js
            ├── manifest.json
            └── styles.css
```

Keinen zusätzlichen Ordner wie „Obsidian-Erweiterung“ dazwischenschieben. Versteckte Dateien lassen sich im macOS-Finder mit **Cmd+Shift+.** anzeigen, unter Windows über **Ansicht → Anzeigen → Ausgeblendete Elemente**.

4. Obsidian neu starten und **Fehlerliste** in den externen Erweiterungen aktivieren.
5. Beim ersten Start im Einrichtungsdialog **Fehlerliste einrichten** wählen. Falls der Dialog nicht erscheint: **Cmd/Ctrl+P → Fehlerliste: Fehlerliste einrichten**.

Der Assistent ergänzt nur Dateien, die noch fehlen:

```text
Dein Vault/
├── Fehlerliste – Start.md
└── Fehlerliste-Notion/
    ├── Fehlerliste.base
    ├── Einträge/
    └── Vorlagen/
        └── Neuer Fehler.md
```

Es wird weder dein gesamter Vault ersetzt noch eine vorhandene Fehlerliste überschrieben. Falls bereits eine gleichnamige Tabelle mit abweichenden Spalten existiert, wird diese beibehalten. Ein Name, der bereits als Datei statt als benötigter Ordner existiert, muss vorab geklärt werden.

### Eigenschaftstypen bei bestehenden Vaults

Falls Auswahlfelder als normaler Text erscheinen: In einer Fehlernotiz links neben dem Eigenschaftsnamen den Typ wählen.

| Eigenschaft | Typ |
| --- | --- |
| Fehlerbeschreibung | Text |
| Fach | Liste |
| Klausur | Liste |
| Wo Fehler | Text |
| Status | Liste |
| Datum | Datum |

Obsidian verwendet Eigenschaftstypen vaultweit. Prüfe vorhandene andere Verwendungen, bevor du einen Typ änderst. Der Assistent verändert deine bisherigen Typ-Einstellungen nicht automatisch.

Die Vorlage ist optional: Unter **Einstellungen → Vorlagen** kannst du **Fehlerliste-Notion/Vorlagen** auswählen. Wenn du schon einen Vorlagenordner verwendest, behalte ihn. Das Formular und das automatische Datum funktionieren ohne Änderung dieser Einstellung.

## Alltag

- Den Tab **Fehlerliste** anheften, wenn du ihn immer griffbereit haben möchtest.
- Mit **Neuer Fehler** eine Beschreibung eingeben. Fächer kannst du auswählen oder neu eintippen.
- **Fächer** verwaltet verfügbare und entfernte Auswahlwerte. Entfernen löscht keine Fehlernotizen.
- Über **Schnellfilter** eine Teilmenge zeigen. **PDF** exportiert die aktuelle Ansicht.
- In Textfeldern werden `$$ ... $$` inline gesetzt. Zum Weiterschreiben die Zelle anklicken und anschließend mit Enter bestätigen oder eine andere Zelle wählen.
- Die Tabelle braucht einen sichtbaren Datumswert: Neue Dateien im Ordner **Fehlerliste-Notion/Einträge** bekommen bei laufender Erweiterung das lokale Tagesdatum. Bereits vorhandene Datumswerte werden beibehalten.

## Update

Obsidian vollständig schließen. Im Plugin-Ordner **nur** `main.js`, `manifest.json` und `styles.css` durch die neue Version ersetzen. **data.json behalten** – darin liegen deine Fachfarben und entfernten Optionen. Die Ordner mit deinen Einträgen und deine `.base`-Datei nicht durch den Starter-Vault ersetzen. Anschließend Obsidian neu öffnen.

## Wenn etwas fehlt

**Plugin erscheint nicht:** Ordnerstruktur oben prüfen und Obsidian neu starten. Die drei Dateien müssen direkt im Plugin-Ordner liegen.

**Tabelle leer:** Neue Einträge müssen im Unterordner **Fehlerliste-Notion/Einträge** liegen. Aktive Filter prüfen. Der Starter enthält absichtlich keine persönlichen oder beispielhaften Fehlernotizen.

**Fachspalte fehlt:** Oben unter **Eigenschaften** das Feld **Fach** einblenden. Die Daten sind dadurch normalerweise nicht gelöscht.

**Formel bleibt Quelltext:** Erst die Zelle verlassen. Auf korrekt geschlossene `$$` achten. Ein Beispiel ist `$$\frac{1}{k^3}$$`.

**Neue Obsidian-Version verursacht Probleme:** Erweiterung deaktivieren und einen [Issue](https://github.com/Ninyago53/obsidian-fehlerliste/issues) mit Obsidian-/Plugin-Version und einer anonymisierten Beschreibung anlegen. Die eigentlichen Daten bleiben Markdown-Dateien.

Offizielle Grundlagen: [Obsidian-Erweiterungen aktivieren](https://docs.obsidian.md/Plugins/Getting%20started/Build%20a%20plugin), [Bases](https://obsidian.md/help/bases), [Eigenschaften](https://obsidian.md/help/properties).
