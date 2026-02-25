# Architecture Rules — Gestionale Rosario Furnari

## Principio: seguire i pattern di Atomic CRM
Le convenzioni di Atomic CRM (in .claude/skills/) sono la base.
Queste regole AGGIUNGONO specifiche per il gestionale, non le sostituiscono.

## Struttura moduli custom
Ogni nuovo modulo (Progetti, Registro Lavori, Pagamenti, Spese) segue
la stessa struttura dei moduli esistenti (contacts, deals, companies):

```
src/components/atomic-crm/[modulo]/
├── [Modulo]List.tsx        # Lista con filtri
├── [Modulo]Create.tsx      # Form creazione
├── [Modulo]Edit.tsx        # Form modifica
├── [Modulo]Show.tsx        # Dettaglio
├── [Modulo]Inputs.tsx      # Campi form riutilizzabili
└── index.tsx               # Export
```

## Configurazione CRM via props
Personalizzare il componente `<CRM>` in App.tsx con:
- title: "Gestionale Rosario Furnari"
- dealStages → stati pipeline preventivi
- dealCategories → categorie servizio
- disableTelemetry: true

## File length limits (anti-bloat)
- **Components**: MAX 150 righe. Se supera → split.
- **Utility functions**: MAX 50 righe per funzione.
- **Page files**: MAX 100 righe — devono SOLO comporre componenti.

## VIETATO
- Creare API routes custom quando Server Actions o dataProvider bastano
- Modificare i componenti in src/components/ui/ senza motivo
- Hardcodare stringhe UI — usare il sistema i18n (polyglot)
- Ignorare RLS sulle nuove tabelle
- Usare useEffect per data fetching (usare ra-core hooks)
