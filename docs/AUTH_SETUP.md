# Supabase-Anmeldung

Die Web-App verwendet den öffentlichen Supabase Publishable Key (kein Geheimnis) und unterstützt Magic Links sowie einen sechsstelligen E-Mail-Code. **Keine geheimen Schlüssel in GitHub ablegen.**

In Supabase → Authentication → URL Configuration:
- Site URL: `https://bndkxbqf2g-stack.github.io/FamSchicht/`
- Zusätzliche Redirect URL: `https://bndkxbqf2g-stack.github.io/FamSchicht/`

Für den Login in einer iPhone-Home-Bildschirm-App muss die Supabase-Mailvorlage unter Authentication → Email Templates → Magic Link zusätzlich einen Code anzeigen:

```html
<h2>FamSchicht-Anmeldung</h2>
<p>Öffne den Link in Safari:</p>
<p><a href="{{ .ConfirmationURL }}">Anmeldelink öffnen</a></p>
<p>Oder gib diesen sechsstelligen Code direkt in der FamSchicht-Home-App ein:</p>
<p><strong>{{ .Token }}</strong></p>
```

Der Magic Link funktioniert im Browser. Der Code wird direkt in der Home-Bildschirm-App eingegeben und erzeugt dort die eigene Supabase-Sitzung. Die Home-App und Safari besitzen auf iOS getrennte Cookies/Speicher; eine Safari-Anmeldung kann deshalb nicht automatisch in die Home-App übernommen werden.

In GitHub → Settings → Pages muss die Quelle **GitHub Actions** sein. Die Build-Konfiguration verwendet `/FamSchicht/` als Vite-Basispfad.

Sicherheitsstatus: Der Login bleibt e-mailgebunden und verwendet ausschließlich den öffentlichen Publishable Key. Die bestehenden Datenbank-RLS-Regeln sind auf den Besitzer begrenzt. Vor Freigabe echter Familieninformationen mit getrennten Testkonten testen.


## iPhone-Home-App ohne SMTP

Die Home-App kann einen Magic Link auch direkt verifizieren:

1. In der Home-App die eigene E-Mail eingeben und **Anmeldelink senden** drücken.
2. In der E-Mail den Anmeldelink lange gedrückt halten und **Link kopieren** wählen.
3. Zur FamSchicht-Home-App zurückkehren.
4. Den Link in **Anmeldelink aus der E-Mail einfügen** einsetzen.
5. **In dieser App anmelden** drücken.

Der Link wird einmalig direkt über Supabase geprüft. Dadurch entsteht die Sitzung in der Home-App selbst. Dafür ist kein Custom SMTP und keine Änderung der Supabase-Mailvorlage erforderlich. Safari bleibt weiterhin nutzbar, wenn der Link normal geöffnet wird.

Der sechsstellige Code bleibt als spätere Option dokumentiert; dafür wäre weiterhin eine anpassbare Magic-Link-Mailvorlage mit `{{ .Token }}` erforderlich.
