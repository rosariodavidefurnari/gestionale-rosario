# Session Workflow & Self-Improving System

## SESSION START (ogni sessione, senza eccezioni)
1. CLAUDE.md e rules/ sono caricati automaticamente
2. Leggi progress.md → capire fase corrente
3. Leggi learnings.md → review learnings recenti
4. Leggi docs/architecture.md → capire stato attuale
5. Comunica in italiano:
   "Siamo alla fase [X]. Ultima sessione: [Y]. Prossimi step: [Z].
    Learnings recenti: [lista breve]. Da dove vuoi partire?"
6. ASPETTA conferma utente prima di scrivere codice

## CORE LOOP (dopo ogni lavoro non banale)
1. **Reflect**: Cosa ha funzionato? Cosa no? Pattern emerso?
2. **Triage**: Ogni scoperta → applica ora / cattura in learnings / dismissi
3. **Cascade**: Il learning si applica ad altri file/pattern?

## SESSION END (non negoziabile)
1. Aggiorna progress.md (task completati, prossimo step, decisioni)
2. Aggiorna docs/architecture.md (se tabelle/pagine/componenti aggiunti)
3. Aggiorna learnings.md (nuove scoperte della sessione)

## EVOLUTION
- Learning ripetuto 2+ volte → proponi promozione a regola in .claude/rules/
- Workflow ripetuto 2+ volte → valuta creazione skill in .claude/skills/
- learnings.md supera ~30 voci → consolidamento
- SEMPRE chiedere all'utente prima di modifiche strutturali

## ANTI-PATTERNS
- Non creare file "just in case"
- Non finire sessione senza aggiornare progress.md
- Non elencare scoperte senza triaggiare (applica/cattura/dismissi)
- Non evolvere il sistema silenziosamente — chiedi all'utente
- Non saltare il linting dopo le modifiche
