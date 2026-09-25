# ROADMAP

Stand: 25.09.2026

## Aktive Reihenfolge
1. Serverseitige Einladungen erzeugen/widerrufen/annehmen; Membership-Anlage atomar und einmalig.
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
- Keine Aufgabe. Der nächste Einladungsbaustein ist klein genug für den Projektchat.

### WAITING
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
- Sicherer Einladungs-/Beitrittsfluss fachlich dokumentiert.
- Getesteter Client-Domänenvertrag für E-Mail, Rolle und opaken Token.
- Privater Einladungsspeicher live installiert; Browserrollen haben keinen Zugriff.
- Fehlende FK-Indizes live ergänzt und im Repository gespiegelt.
