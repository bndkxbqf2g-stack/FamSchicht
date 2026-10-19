# Sicherer Einladungs- und Beitrittsfluss

Stand: 19.10.2026

## Ziel
`partner` und `coparent` sollen einem bestehenden Haushalt mit einem eigenen Supabase-Auth-Konto beitreten können, ohne dass der Browser frei in `memberships` schreiben darf.

## Sicherheitsgrenze
- `memberships` erhält weiterhin keine direkten INSERT/UPDATE/DELETE-Rechte für den Browser.
- Der Coparent-Kalenderzugriff ist nach der synthetischen Zugriffsmatrix live: gemeinsame Kalenderdaten und Aufgaben dürfen gelesen, angelegt und bearbeitet werden. Partnerzugriff und Realtime bleiben nicht freigegeben.
- Ein Einladungslink ist ein Bearer-Geheimnis. Der rohe Token wird niemals in der Datenbank gespeichert oder geloggt.
- Autorisierung beruht nicht auf `user_metadata`; maßgeblich sind der authentifizierte Benutzer und serverseitige Daten.
- Kalender-Personen in `household_members` bleiben von Auth-Mitgliedschaften getrennt.

## Zielarchitektur
### 1. Einladung erzeugen
Der angemeldete Owner gibt Empfänger-E-Mail und Rolle (`partner` oder `coparent`) an.

Eine serverseitige Funktion erzeugt:
- eine zufällige, ausreichend lange Einmal-Kennung,
- ausschließlich deren kryptografischen Hash in der Datenbank,
- Empfänger-E-Mail normalisiert,
- Zielrolle,
- Haushalt,
- Ablaufzeit,
- Ersteller,
- Statusinformationen für widerrufen/verwendet.

Der rohe Token existiert nur für den Einladungslink.

### 2. Einladung zustellen
Der Link enthält nur den zufälligen Token und keine Familien- oder Rollendaten, denen der Client vertrauen dürfte.

### 3. Empfänger authentifizieren
Der Empfänger meldet sich über sein eigenes Supabase-Auth-Konto an. Vor Annahme muss die serverseitig bekannte Auth-E-Mail zur eingeladenen E-Mail passen.

### 4. Einladung atomar annehmen
Eine serverseitige, JWT-geschützte Operation:
1. ermittelt den Hash des übergebenen Tokens,
2. findet genau eine nicht widerrufene, nicht verbrauchte und nicht abgelaufene Einladung,
3. prüft die Auth-E-Mail,
4. prüft die erlaubte Rolle,
5. legt `memberships(household_id,user_id,role)` an,
6. markiert die Einladung in derselben Transaktion als verbraucht.

Ein bereits vorhandenes Membership darf nicht stillschweigend auf eine andere Rolle umgeschrieben werden.

## Aktueller Umsetzungsstand
- Serverseitige Erzeugung, atomare Annahme und Widerruf sind über die JWT-geschützte Edge Function `household-invitations` und service_role-interne RPCs umgesetzt.
- Die Owner-UI für Erzeugung liegt im ausgelagerten Einstellungen-Bereich; der Empfänger wird nach dem Magic-Link-Login automatisch zur Annahme geführt.
- Die Owner-UI bietet Erzeugung, Kopieren und Widerruf des zuletzt erzeugten Links an. Für den Coparent liefert eine abgesicherte Kontextfunktion ausschließlich den eigenen Haushaltskontext; Rollen- und Verwaltungsdaten bleiben tabellen-seitig owner-only.

## Technische Richtung
Für Erzeugung und Annahme wird eine serverseitige Supabase-Grenze verwendet, bevorzugt JWT-geschützte Edge Functions. Die Browser-App erhält keinen Service-Role-Key.

Einladungsdaten sollen nicht über die normale Data API lesbar sein. Bevorzugt wird eine interne/private Datenstruktur, auf die ausschließlich die serverseitige Einladungslogik zugreift.

## Fehlerfälle
Die API gibt keine unnötigen Details darüber preis, ob ein Token existiert oder zu welchem Haushalt er gehört. Für ungültig, abgelaufen, widerrufen, bereits verwendet oder falsche Empfänger-E-Mail erhält der Client einen neutralen Annahmefehler.

## Verbindliche Testmatrix vor Live-Freigabe
- Owner kann Einladung für `partner` erzeugen.
- Owner kann Einladung für `coparent` erzeugen.
- Andere Rollenwerte werden abgelehnt.
- Nicht-Owner kann keine Einladung für einen fremden Haushalt erzeugen.
- Richtiger eingeladener Auth-Benutzer kann einmalig annehmen.
- Benutzer mit anderer E-Mail kann denselben Token nicht annehmen.
- Abgelaufener Token wird abgelehnt.
- Widerrufener Token wird abgelehnt.
- Bereits verwendeter Token wird beim zweiten Versuch abgelehnt.
- Annahme erzeugt exakt ein Membership mit der eingeladenen Rolle.
- Bestehendes Membership wird nicht durch eine neue Einladung hoch- oder heruntergestuft.
- Coparent kann gemeinsame Kalenderdaten und Aufgaben lesen, anlegen und bearbeiten.
- Coparent sieht weder `visibility=self` noch `category=shift`/`private` und kann solche Zeilen nicht anlegen oder durch Update erzeugen.
- Coparent kann keine Schichten löschen; Löschen bleibt owner-only.
- Coparent kann `households`, `memberships` oder `household_members` nicht direkt lesen.
- Partner und Fremdkonto erhalten keinen Kalenderzugriff.
- Haushalte bleiben gegeneinander vollständig isoliert.

## Umsetzungsreihenfolge
1. Serververtrag und Datenmodell als Migration vorbereiten, ohne freie Membership-Schreibrechte.
2. Erzeugungs-/Annahmeoperation serverseitig implementieren und automatisiert prüfen.
3. Mit getrennten synthetischen Owner-/Partner-/Coparent-/Fremdkonten testen.
4. Den konkret freigegebenen Coparent-Kalenderumfang per RLS live schalten; die Rollen-/Admin-Tabellen bleiben owner-only.
5. Realtime erst auf der geprüften Rechtebasis ergänzen.
