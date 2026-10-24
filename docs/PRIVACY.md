# Datenschutz und lokale Berechtigungen

Die veröffentlichten Pakete werden aus einer festgelegten Liste von Projektdateien erzeugt. Persönliche Fehlereinträge, Screenshots, `data.json`, Obsidian-Arbeitsbereiche, Sicherungen und lokale Dateipfade sind nicht Bestandteil des Downloads.

Der Plugin-Code enthält keine eingebauten Netzwerkaufrufe, Telemetrie oder Kontoanmeldung. Das bedeutet nicht, dass der übrige Obsidian-Vault offline bleiben muss: Von dir separat aktivierte Synchronisationsdienste und andere Plugins haben ihre eigenen Regeln.

Die Erweiterung liest die Eigenschaften der Fehlernotizen und legt bei der Einrichtung Dateien unter **Fehlerliste-Notion/** sowie **Fehlerliste – Start.md** an. Sie bearbeitet Einträge auf deine Eingaben hin und schreibt Einstellungen in ihren eigenen Plugin-Ordner. Schnellfilter und Spaltenänderungen werden in der Base gespeichert. Beim Löschen wird der normale Obsidian-Papierkorb verwendet. Die Standard-Löschbestätigung ersetzt keine Datensicherung.

Der PDF-Export schreibt eine PDF in den Downloads-Ordner und kann sie anschließend öffnen. Diese Datei enthält die von dir exportierten Einträge; behandle sie entsprechend.

Obsidian-Desktop-Plugins haben technisch weitreichenden lokalen Zugriff. Der Quelltext ist offen einsehbar und die Veröffentlichung ist noch nicht vom Obsidian-Community-Verzeichnis geprüft. Aktiviere Plugins nur, wenn du ihnen vertraust.
