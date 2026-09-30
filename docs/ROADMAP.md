# ROADMAP

Stand: 28.09.2026

## Aktive Reihenfolge
1. Einladungserzeugung und atomare Einladungsannahme mit separater Einstellungen-UI verifizieren; Widerruf bleibt als Service vorhanden.
2. Zugriffsmatrix mit getrennten Owner-/Partner-/Coparent-/Fremdkonten ausführen.
3. Erst nach erfolgreicher Matrix Live-RLS für die konkret benötigten Rollen erweitern.
4. Realtime-Synchronisierung nach stabiler Rechtebasis ergänzen.
5. Google-/Outlook-/ICS-Integration anschließend modular anbinden.
6. UI/UX weiter ausbauen; Drag/Move nur bei zuverlässigem Touch- und Desktop-Verhalten.

## Qualitäts-Gates
Jedes Paket: Tests -> Build -> Deployment/CI prüfen. Fehler stoppen die Feature-Reihenfolge.

## Sicherheitsgrenze
- Live bleibt derzeit owner-only.
- Keine freien Membership-Schreibrechte aus dem Browser.
- Einladungs-Tokens werden nur gehasht gespeichert; der rohe Token ist ein Bearer-Geheimnis.
- Repository-Zielentwürfe für Mehrbenutzer-RLS nicht ungeprüft auf Produktion anwenden.
- Keine echten sensiblen Familiendaten vor abgeschlossener Mehrbenutzer-/RLS-Testmatrix.

## WORK QUEUE
### READY
- Getrennte Testkonten für Owner, Partner, Coparent und Fremdkonto bereitstellen; danach die Zugriffsmatrix ausführen.
- Lokalen Dienstplanfoto-Import mit prüfbarer OCR-Vorschau, Teamübersicht und eigener Kalenderprojektion abschließen und nach Branch-CI als Produktumfang bestätigen.

### WAITING
- Nach Abschluss/Merge des Dienstplanimports: Coparent-Kalenderansicht für Anna, ausschließlich lesend und begrenzt auf Umgangszeiten mit den Kindern (`source: custody`), Schule, Hobbys/Sport und Geburtstage bzw. ausdrücklich freigegebene Kinderfeiern. Schichten/Dienstpläne, allgemeine oder private Termine sowie Einstellungen und Verwaltungsfunktionen bleiben verborgen. Umsetzung erst nach Zugriffsmatrix mit getrennten Konten; RLS muss denselben Filter serverseitig erzwingen. Bis dahin bleibt Live owner-only.
- Repo-weites Architektur-/Security-Audit nach Abschluss der ersten sicheren Mehrbenutzer-Synchronisierung.
- End-to-End-Mehrbenutzer-Audit mit owner/partner/coparent; Voraussetzung: Einladungsfluss und Kalender-Synchronisierung für mehrere Konten fertig.
- Meilenstein-Audit vor Nutzung echter Familiendaten; Voraussetzung: RLS-Testmatrix vollständig.

### DONE
- Basis-App auf GitHub Pages lauffähig.
- Magic-Link-Auth.
- Owner-only Haushalts-Setup im Client.
- Owner-only Supabase-Persistenz für `calendar_events`.
- Data-API-Grants gehärtet.
- Zentrales Haushaltsmitglieder-Domänenmodell.
- Owner-only Supabase-Persistenz für Kalender-Personen über `household_members`.
- Schichtfilter, Darstellung und Persistenz verwenden stabile `ownerId`; Legacy-Namen bleiben Fallback.
- Sicherer Einladungs-/Beitrittsfluss fachlich dokumentiert und serverseitig umgesetzt.
- Getesteter Client-Domänenvertrag für E-Mail, Rolle und opaken Token.
- Privater Einladungsspeicher live installiert; Browserrollen haben keinen Zugriff.
- Einladungs-UI im ausgelagerten Einstellungen-Bereich mit Magic-Link-Rückkehr und Regressionstest.
- Fehlende FK-Indizes live ergänzt und im Repository gespiegelt.
