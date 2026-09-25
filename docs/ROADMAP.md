# ROADMAP

Stand: 25.09.2026

## Aktive Reihenfolge
1. Schicht-Persistenz vollständig auf stabile Mitglieder-ID ausrichten; Legacy-Namen nur als Migrationsfallback behalten.
2. Sicheren Einladungs-/Beitrittsfluss für partner/coparent entwerfen.
3. Mehrbenutzer-RLS ausschließlich mit getrennten Testkonten und Zugriffsmatrix vorbereiten.
4. Erst danach Live-RLS für weitere Rollen erweitern.
5. Realtime-Synchronisierung nach stabiler Rechtebasis ergänzen.
6. Google-/Outlook-/ICS-Integration anschließend modular anbinden.
7. UI/UX weiter ausbauen; Drag/Move nur bei zuverlässigem Touch- und Desktop-Verhalten.

## Qualitäts-Gates
Jedes Paket: Tests -> Build -> Deployment/CI prüfen. Fehler stoppen die Feature-Reihenfolge.

## Sicherheitsgrenze
- Live bleibt derzeit owner-only.
- Repository-Zielentwürfe für Mehrbenutzer-RLS nicht ungeprüft auf Produktion anwenden.
- Keine echten sensiblen Familiendaten vor abgeschlossener Mehrbenutzer-/RLS-Testmatrix.

## WORK QUEUE
### READY
- Repo-weites Architektur-/Security-Audit nach Abschluss der ersten sicheren Mehrbenutzer-Synchronisierung.

### WAITING
- End-to-End-Mehrbenutzer-Audit mit owner/partner/coparent; Voraussetzung: Einladungsfluss und Kalender-Synchronisierung für mehrere Konten fertig.
- Meilenstein-Audit vor Nutzung echter Familiendaten; Voraussetzung: RLS-Testmatrix vollständig.

### DONE
- Basis-App auf GitHub Pages lauffähig.
- Magic-Link-Auth.
- Owner-only Haushalts-Setup im Client.
- Owner-only Supabase-Persistenz für `calendar_events`.
- Data-API-Grants gehärtet.
- Zentrales Haushaltsmitglieder-Domänenmodell.
- Personenfilter und Schichtauswahl aus Mitglieder-Modell.
- Neue Schichten mit stabiler `ownerId` und Legacy-Fallback.
- Owner-only Supabase-Persistenz für Kalender-Personen über `household_members`.
- Schichtfilter und Darstellung bevorzugen stabile `ownerId`; Legacy-Namen bleiben Fallback.
