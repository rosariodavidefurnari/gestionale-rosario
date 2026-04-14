# ClientShow — "Genera bozza fattura" sempre disponibile

**Data**: 2026-04-15
**Autore**: Claude (brainstorming con Rosario)
**Stato**: design approvato, pronto per il plan di implementazione

## Contesto

Su `ClientShow` il bottone "Genera bozza fattura" oggi è condizionato a
`hasInvoiceDraftCollectableAmount(draft)`: compare solo se il builder
`buildInvoiceDraftFromClient` ritorna `lineItems` con un totale esigibile > 0.
Il builder filtra servizi ed expenses per `!invoice_ref`, quindi se tutti i
record del cliente sono già stati marcati come fatturati (caso reale:
"ASSOCIAZIONE CULTURALE GUSTARE SICILIA", con 6.227,19 € "da saldare" nel
riepilogo ma ogni servizio già legato a una fattura) il bottone sparisce senza
feedback.

L'utente vuole poter **aprire il dialog "Bozza fattura" in qualsiasi momento**
dalla pagina di un cliente, come percepisce di poter fare già a livello
progetto. Nessun cambio sulla logica del builder, nessuna selezione di
servizi: solo rimuovere la gate UI e aggiungere un empty state informativo
quando non c'è nulla di residuo.

Gli altri Show (`ProjectShow`, `ServiceShow`, `QuoteShow`) restano invariati:
in pratica il bottone lì compare quasi sempre perché i progetti attivi hanno
servizi non ancora fatturati, e l'utente ha esplicitamente limitato lo scope
alla pagina cliente.

## Goal

1. Su `ClientShow`, il bottone "Genera bozza fattura" è sempre montato nel
   toolbar azioni (a fianco di "Nuovo pagamento"/"Modifica"/"Elimina").
2. Cliccando, si apre `InvoiceDraftDialog` anche quando il draft è `null`
   oppure ha `lineItems` vuoti.
3. In quel caso il dialog mostra un empty state chiaro: titolo "Bozza
   fattura", messaggio che spiega perché non c'è nulla da fatturare e come
   recuperare una bozza passata, bottone "Chiudi".
4. Quando il draft è valido, il dialog continua a funzionare esattamente come
   oggi (PDF/XML download, totali, layout commerciale).

## Non-Goal

- Non si persiste nulla nel DB (nessuna tabella `invoice_drafts`,
  `InvoiceDraftDialog` resta `Nessuna scrittura nel DB` come da commento UI).
- Non si introduce selezione di servizi/expenses tramite checkbox.
- Non si modifica nessuno dei 4 builder `buildInvoiceDraftFrom*`.
- Non si tocca `ProjectShow`, `ServiceShow`, `QuoteShow`.
- Non si cambiano i tipi `InvoiceDraftInput` / `InvoiceDraftLineItem`.
- Non si risolve il mini-bug latente sui payments ricevuti (il builder oggi
  somma tutti i `status === "ricevuto"` come linea negativa senza rispettare
  il loro `invoice_ref`): fuori scope, ticket separato se mai riemerge.

## Architecture

### Flusso dati

```text
ClientShow
  ├─ useGetList<Service>  ─────────────┐
  ├─ useGetList<Project>  ─────────────┤
  ├─ useGetList<Expense>  ─────────────┼──► buildInvoiceDraftFromClient({...})
  └─ useGetList<Payment>  ─────────────┘         │
                                                 ▼
                                          invoiceDraft: InvoiceDraftInput | null
                                                 │
                                                 ▼
                          <Button onClick={() => setInvoiceDraftOpen(true)}>
                             Genera bozza fattura
                          </Button>
                                                 │
                                                 ▼
                          <InvoiceDraftDialog
                             open={invoiceDraftOpen}
                             onOpenChange={setInvoiceDraftOpen}
                             draft={invoiceDraft}
                          />
```

Cambio chiave: il `<Button>` e il `draft` passato al dialog non dipendono più
da `hasCollectableAmount`. Il dialog stesso decide come renderizzare in base
al contenuto del draft.

### Empty state semantico

Il dialog oggi ha questo early return:

```tsx
if (!draft) {
  return null;
}
```

Viene sostituito con:

```tsx
if (!draft || normalizedLineItems.length === 0) {
  return <InvoiceDraftEmptyState open={open} onOpenChange={onOpenChange} />;
}
```

dove `InvoiceDraftEmptyState` è un sotto-componente locale allo stesso file
(nessun nuovo file, nessun export pubblico) che renderizza un `<Dialog>`
completo, contenuto minimale, bottone "Chiudi".

La condizione include `normalizedLineItems.length === 0` perché è tecnicamente
possibile che un builder futuro ritorni un `draft` non-null ma con lineItems
vuoti (es. se cambiasse il contratto); oggi non succede, ma costa zero essere
difensivi e rende la funzione UI robusta rispetto a scenari edge.

## Components

### `InvoiceDraftDialog` — modifiche

File: `src/components/atomic-crm/invoicing/InvoiceDraftDialog.tsx`

Modifiche puntuali (scale: ~30 righe nette aggiunte):

1. La variabile `lineItems` (output di `normalizeInvoiceDraftLineItems`) è
   già calcolata con `useMemo` PRIMA del check early return, usa un
   fallback null-safe `draft?.lineItems ?? []`: nessun riordino necessario,
   si può referenziare direttamente nel ramo empty state.
2. Sostituire `if (!draft) return null;` con il ramo empty state descritto
   sopra, usando la condizione combinata `!draft || lineItems.length === 0`.
3. Aggiungere il sotto-componente funzionale `InvoiceDraftEmptyState` nello
   stesso file, con questa struttura:

   ```tsx
   const InvoiceDraftEmptyState = ({
     open,
     onOpenChange,
   }: {
     open: boolean;
     onOpenChange: (open: boolean) => void;
   }) => (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="text-lg font-bold text-[#2C3E50]">
             Bozza fattura
           </DialogTitle>
           <DialogDescription>
             Nessuna voce residua da fatturare per questo cliente.
           </DialogDescription>
         </DialogHeader>
         <div className="rounded-lg border border-dashed border-[#2C3E50]/30 bg-[#E8EDF2]/40 p-4 text-sm text-[#2C3E50]">
           Tutti i servizi e le spese collegate al cliente risultano già
           marcate con un riferimento fattura. Se devi rigenerare una fattura
           già emessa, rimuovi il riferimento (<code>invoice_ref</code>) dai
           record interessati e riapri questa finestra.
         </div>
         <div className="flex justify-end pt-2">
           <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
             Chiudi
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
   ```

   Il testo è in italiano come il resto del dialog, usa la stessa palette
   Navy & Petrolio del layout commerciale esistente, rispetta la convenzione
   "design bambino" (messaggio diretto, un solo CTA, nessun badge).

### `ClientShow` — modifiche

File: `src/components/atomic-crm/clients/ClientShow.tsx`

Modifiche puntuali (scale: ~6 righe cambiate):

1. Rimuovere il ternario `{hasCollectableAmount ? (...) : null}` attorno al
   `<Button>` "Genera bozza fattura" → il bottone è sempre montato.
2. Cambiare il prop del dialog da `draft={hasCollectableAmount ? invoiceDraft : null}`
   a `draft={invoiceDraft}` → il dialog riceve sempre il valore reale del
   builder, è lui a decidere se mostrare empty state o contenuto.
3. Rimuovere la variabile `hasCollectableAmount` se non è usata altrove nel
   file. Verifica: è usata anche nella `useEffect` per l'auto-apertura via
   querystring `?invoiceDraft=true`. Quell'uso va mantenuto:

   ```tsx
   useEffect(() => {
     const searchParams = new URLSearchParams(location.search);
     if (searchParams.get("invoiceDraft") === "true" && hasCollectableAmount) {
       setInvoiceDraftOpen(true);
     }
   }, [hasCollectableAmount, location.search]);
   ```

   Va cambiato in:

   ```tsx
   useEffect(() => {
     const searchParams = new URLSearchParams(location.search);
     if (searchParams.get("invoiceDraft") === "true") {
       setInvoiceDraftOpen(true);
     }
   }, [location.search]);
   ```

   Razionale: se qualcuno atterra su `/clients/:id/show?invoiceDraft=true`,
   il dialog deve comunque aprirsi (anche se poi mostra empty state). Il
   bind a `hasCollectableAmount` oggi è un'ottimizzazione che nasconde
   l'effetto, non più necessaria.

4. La variabile `hasCollectableAmount` diventa inutilizzata: rimuoverla
   completamente insieme all'import di `hasInvoiceDraftCollectableAmount` se
   non più referenziato.

## Data Flow — nessun cambio

- `useGetList<Service>`, `<Project>`, `<Expense>`, `<Payment>` restano come
  oggi.
- `buildInvoiceDraftFromClient` invariato, continua a restituire `null`
  quando non c'è nulla di residuo.
- `InvoiceDraftInput`, `InvoiceDraftLineItem` invariati.
- `downloadInvoiceDraftPdf` / `downloadInvoiceDraftXml` invariati.

## Error Handling

L'unico caso nuovo è `draft === null` in input al dialog, che è gestito
dall'empty state. Non ci sono errori di rete o mutazioni aggiunte. Gli errori
di generazione PDF/XML esistenti (`try/catch` in `handleDownload*`) restano
invariati.

## Testing

### Unit test nuovo

File: `src/components/atomic-crm/invoicing/InvoiceDraftDialog.test.tsx` (nuovo).

Casi:

1. **Empty state con `draft={null}`**
   - Render `<InvoiceDraftDialog open draft={null} onOpenChange={noop} />`
   - Assert che il testo "Nessuna voce residua da fatturare per questo cliente"
     sia presente
   - Assert che i bottoni "Scarica PDF" e "Scarica XML" NON siano presenti
   - Assert che il bottone "Chiudi" sia presente

2. **Empty state con `draft` valido ma `lineItems: []`**
   - Costruire un `draft` minimale con `lineItems: []`
   - Assert stesso comportamento del caso 1

3. **Rendering normale con draft popolato**
   - Costruire un `draft` con 1 line item valida
   - Assert che appaia almeno il bottone "Scarica PDF" (smoke, non duplicare
     la verifica del layout commerciale che è ampia e già coperta da test
     manuali / visuali)

Non è necessario testare `ClientShow.tsx` con un integration test: il cambio
UI è dichiarativo (2-3 righe) e le regressioni sul comportamento normale del
dialog sono coperte dai test builder esistenti + dal caso 3 sopra.

### Verifica manuale

1. `make start`, login admin locale.
2. Aprire un cliente con servizi tutti fatturati (o marcare manualmente
   `invoice_ref` su tutti i servizi di un cliente test).
3. Verificare che il bottone "Genera bozza fattura" sia visibile nel
   toolbar azioni.
4. Click → dialog si apre in empty state con messaggio corretto.
5. Click "Chiudi" → dialog si chiude.
6. Aprire un cliente con almeno un servizio non fatturato → comportamento
   invariato (download PDF/XML funzionanti).
7. Navigare a `/clients/:id/show?invoiceDraft=true` su un cliente vuoto →
   dialog auto-apre in empty state (nuovo comportamento, rispetto a oggi che
   non si apriva).

### Type check / lint / build

Regola standard: `npm run typecheck`, `npm run lint`, `npm run build` devono
passare a zero errori prima del commit.

## File toccati (riassunto)

1. `src/components/atomic-crm/clients/ClientShow.tsx` — rimozione gate,
   semplificazione useEffect (~6 righe)
2. `src/components/atomic-crm/invoicing/InvoiceDraftDialog.tsx` — empty state
   branch + sotto-componente `InvoiceDraftEmptyState` (~30 righe nette)
3. `src/components/atomic-crm/invoicing/InvoiceDraftDialog.test.tsx` — nuovo
   file, 3 casi (~60 righe)
4. `docs/superpowers/specs/2026-04-15-client-invoice-draft-always-available-design.md`
   — questo documento

## Continuity sweep

Il pre-commit hook `continuity:check` richiede che il commit di codice
prodotto includa almeno un doc in `docs/`. Il spec document conta come doc
aggiornato. Non serve toccare `docs/architecture.md` né
`docs/development-continuity-map.md` perché la modifica è una piccola
rifinitura UI senza impatto su moduli/pattern/schema.

Nessun trigger nuovo in `.claude/rules/learning.md` da aggiungere: il
pattern qui ("bottone sempre visibile + empty state nel dialog") è già
applicato in altre parti del CRM e non è una lezione nuova.

## Rischi e mitigazioni

| Rischio | Mitigazione |
| --- | --- |
| Utente apre il dialog per errore su cliente vuoto e lo trova confuso | Messaggio empty state esplicito + istruzioni per rigenerare fatture passate |
| Auto-apertura via querystring fa apparire un dialog vuoto inaspettato | Consapevole: l'utente che costruisce quel link sa cosa sta facendo, l'empty state è comunque informativo |
| Regressione sul comportamento normale del dialog | Test smoke caso 3 + verifica manuale step 6 |
| Sub-componente `InvoiceDraftEmptyState` dimenticato dopo il refactor | Resta locale allo stesso file, nessun export, difficile divergere |

## Prossimi passi

Dopo l'approvazione di questo spec:

1. Invocare `superpowers:writing-plans` per produrre il plan di
   implementazione dettagliato (con i singoli step, i test-first, i comandi
   di verifica).
2. Eseguire il plan step by step.
3. Commit atomico unico con: codice + test + spec.
