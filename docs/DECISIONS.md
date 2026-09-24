# DECISIONS

Stand: 24.09.2026

## D-001 — Schrittweise Entwicklung
Änderungen erfolgen in kleinen, abgeschlossenen Paketen. Tests und CI sind Gate vor dem nächsten Paket.

## D-002 — GitHub als technische Wahrheit
Vor Änderungen wird der tatsächliche Repository-Stand geprüft. Dokumentation muss dem Code folgen.

## D-003 — Supabase als gemeinsame Datenbasis
Gemeinsam synchronisierte Kalenderdaten sollen serverseitig in Supabase liegen. Lokaler Speicher ist nicht dauerhaft die gemeinsame Wahrheit.

## D-004 — RLS als Sicherheitsgrenze
Berechtigungen für Familieninformationen werden serverseitig durch PostgreSQL/Supabase RLS abgesichert. Clientseitige Sichtbarkeit ist nur zusätzliche UI-Logik.

## D-005 — Getrennte Konten und Rollen
Mehrbenutzerzugriff erfolgt über getrennte Benutzerkonten und explizite Rollen. Vorgesehene Rollen sind owner, partner und coparent.

## D-006 — Keine freien Membership-Schreibrechte
Mitgliedschaften dürfen nicht beliebig vom Browser erzeugt werden. Ein sicherer Einladungs-/Annahmeprozess ist erforderlich.

## D-007 — Fachlogik vor UI
Datenmodell, Rechte und Synchronisationslogik werden stabilisiert, bevor darauf umfangreiche UI-Funktionen aufgebaut werden.

## D-008 — Work gezielt einsetzen
Kleine/mittlere Pakete bleiben im Projektchat. Repo-weite Audits, große Migrationen und Meilensteinprüfungen kommen in die WORK QUEUE.
