# ROADMAP

Stand: 24.09.2026

## Aktive Reihenfolge
1. Dokumentation und tatsächlichen Datenbankstand konsolidieren.
2. Supabase-Schema/RLS sicher versionieren und testen.
3. Kalender-Service für persistente calendar_events einführen.
4. Lokale -> Supabase-Migration kontrolliert umsetzen.
5. Sicheren Einladungsfluss für partner/coparent bauen.
6. Mehrbenutzer- und Sichtbarkeitstests mit getrennten Testkonten.
7. Realtime-Synchronisierung erst nach stabiler Rechtebasis.
8. UI/UX danach weiter ausbauen.

## Qualitäts-Gates
Jedes Paket: Tests -> Build -> Deployment/CI prüfen. Fehler stoppen die Feature-Reihenfolge.

## WORK QUEUE
### READY
- Repo-weites Architektur-/Security-Audit nach Abschluss der ersten Supabase-Synchronisierung.

### WAITING
- End-to-End-Mehrbenutzer-Audit mit owner/partner/coparent; Voraussetzung: Einladungsfluss und Kalender-Synchronisierung fertig.
- Meilenstein-Audit vor Nutzung echter Familiendaten; Voraussetzung: RLS-Testmatrix vollständig.

### DONE
- Basis-App auf GitHub Pages lauffähig.
- Magic-Link-Auth.
- Owner-only Haushalts-Setup im Client.
