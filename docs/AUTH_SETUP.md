# Supabase-Anmeldung

Die Web-App verwendet den öffentlichen Supabase Publishable Key (kein Geheimnis) und Magic Links über `@supabase/supabase-js`. **Keine geheimen Schlüssel in GitHub ablegen.**

In Supabase → Authentication → URL Configuration:
- Site URL: `https://bndkxbqf2g-stack.github.io/FamSchicht/`
- Zusätzliche Redirect URL: `https://bndkxbqf2g-stack.github.io/FamSchicht/`

In GitHub → Settings → Pages muss die Quelle **GitHub Actions** sein. Die Build-Konfiguration verwendet `/FamSchicht/` als Vite-Basispfad.

Sicherheitsstatus: Der Login ist implementiert; es gibt noch **keine** sichere Einladung von Partnerin/Mit-Elternteil, keine Synchronisierung und keine Migration lokaler Einträge. Die bestehenden Datenbank-RLS-Regeln sind auf den Besitzer begrenzt. Vor Freigabe echter Familieninformationen mit getrennten Testkonten testen.
