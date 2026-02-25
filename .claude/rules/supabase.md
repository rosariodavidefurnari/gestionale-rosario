# Supabase Rules — Gestionale Rosario Furnari

## Client usage
Il data provider Supabase è già configurato in Atomic CRM.
Non creare client Supabase custom — usa il dataProvider di ra-supabase-core.

## Accesso esclusivo
- Un solo utente: rosariodavide.furnari@gmail.com
- Registrazione pubblica DISABILITATA in Supabase Dashboard
- RLS policy semplice: `auth.uid() IS NOT NULL` su tutte le tabelle

## Environment variables (VITE_, non NEXT_PUBLIC_)

```
VITE_SUPABASE_URL=https://tuoprogetto.supabase.co
VITE_SB_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxx
```

## Nuove tabelle — checklist obbligatoria
Per ogni nuova tabella:
1. Creare migration in `supabase/migrations/`
2. Abilitare RLS
3. Creare policy `auth.uid() IS NOT NULL` per ALL
4. Aggiungere colonne `created_at` e `updated_at` con default NOW()
5. Se serve, creare VIEW per aggregazioni

## Schema del gestionale
Le tabelle principali sono definite in `Gestionale_Rosario_Furnari_Specifica.md`:
- clients, projects, services, quotes, payments, expenses, settings, keep_alive

## API Keys (nuovo formato 2025/2026)
- Publishable key: `sb_publishable_...` (frontend)
- Secret key: `sb_secret_...` (solo server/Edge Functions)
- JWT: asymmetric signing (RSA) per nuovi progetti
