# Entwicklung

`main.js` ist der Plugin-Quelltext; ein Bundler und zusätzliche npm-Pakete sind nicht erforderlich. `styles.css` enthält die Darstellung. Die Dateien unter `starter/` definieren den leeren Starter-Vault. Die Einrichtungskonstanten in `main.js` müssen mit den Starterdateien übereinstimmen; ein Test prüft das.

```sh
npm test
npm run build
```

Die Tests verwenden isolierte Obsidian-/DOM-Stubs. Sie prüfen Einrichtung ohne Überschreiben, wiederholte Einrichtung, Datum, Fachverwaltung, Text-/Formelaufteilung und die Paketstruktur. Sie ersetzen keinen vollständigen visuellen Test in Obsidian. Vor einer Veröffentlichung sollte der Starter in einem neuen Test-Vault mit der aktuellen Desktop-Version geöffnet werden.

## Version veröffentlichen

1. `manifest.json`, `package.json` und `versions.json` synchron aktualisieren.
2. Tests und Build ausführen, einen frischen Test-Vault prüfen.
3. Änderungen committen und pushen.
4. Einen Tag **genau in der Form der Manifest-Version** setzen, z. B. `1.5.0` – ohne v-Präfix.
5. Der Workflow unter `.github/workflows/release.yml` testet, paketiert und erstellt eine öffentliche GitHub-Release mit den drei Standard-Plugin-Dateien, beiden ZIPs und Prüfsummen.

Ein normaler Quellcode-Download über GitHubs **Code → Download ZIP** ist kein fertig eingerichteter Vault. Für Anwender sind die Release-Dateien gedacht.

## Interne Schnittstellen

Die native Tabellenintegration verwendet unter anderem `view.controller.view`, Bases-Transaktionen, Zell-Renderer und Spalteninformationen. Der PDF-Export verwendet den Desktop-IPC-Kanal `print-to-pdf`. Diese sind nicht durch die öffentliche Plugin-API stabil garantiert. Anpassungen deshalb zuerst in einem Test-Vault prüfen und Mindestversion/Kompatibilität dokumentieren.

Es gibt keine automatische Submission in das offizielle Community-Verzeichnis. Das wäre ein separater Schritt nach Prüfung der jeweils geltenden [Obsidian-Anforderungen](https://docs.obsidian.md/plugins/releasing/submit-plugin).
