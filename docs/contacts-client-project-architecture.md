# Architettura Referenti CRM

Data: 2026-03-01

## Decisione

Per reintrodurre i referenti nel gestionale non abbiamo ripristinato l'intero
modello legacy `companies + contacts + deals` di Atomic CRM.

Abbiamo invece scelto un approccio Pareto e scalabile:

- `clients` resta l'anagrafica azienda/controparte principale del gestionale
- `contacts` torna a essere la risorsa per le persone/referenti
- `contacts.client_id` collega ogni referente al cliente attuale
- `project_contacts` e' la join table che collega i referenti ai progetti

## Perche' questa scelta

Ripristinare integralmente `companies` avrebbe reintrodotto due modelli
concorrenti per la stessa entita' di business:

- `clients` nel gestionale custom
- `companies` nel CRM legacy

Questo avrebbe aumentato fragilita', duplicazioni e rischio di incoerenze nei
workflow AI, nei filtri, nelle relazioni e nell'analisi dati.

La scelta adottata mantiene:

- un solo master per aziende/controparti: `clients`
- una sola risorsa persone/referenti: `contacts`
- una relazione pulita e scalabile cliente -> referenti -> progetti

## Scope implementato

- migration DB `20260301213000_reactivate_contacts_for_clients_projects.sql`
- riattivazione resource `contacts` nel CRM
- nuove schermate contatti: lista, create, edit, show
- sezione referenti nel dettaglio cliente
- sezione referenti nel dettaglio progetto
- collegamento automatico al progetto quando un referente viene creato da un
  progetto
- dialog per collegare un referente cliente gia esistente a un progetto
- normalizzazione dati lato provider per `contacts` e `project_contacts`

## Confini intenzionali di questa fase

Non abbiamo ripristinato:

- `companies`
- `deals`
- `contact_notes`
- task legacy collegati ai contatti legacy

Questa esclusione e' intenzionale. Serve a non perdere controllo del dominio
attuale mentre si reintroduce la capacita' CRM davvero necessaria: gestire
persone associate a clienti e progetti.

## Effetti sul dominio

Esempio corretto:

- cliente: `ASSOCIAZIONE CULTURALE GUSTARE SICILIA`
- referente: `Diego Caltabiano`
- progetti collegati: `Gustare Sicilia`, `Bella tra i Fornelli`

Quindi il referente non sostituisce mai il cliente fiscale.

## Passi successivi raccomandati

1. Estendere il read-context AI per includere i referenti nel launcher unificato.
2. Introdurre un dominio generale `party/suppliers` se l'area fornitori verra'
   modellata come controparte autonoma e non solo come estensione dei clienti.
3. Valutare se riusare una parte del merge legacy di `contacts` solo quando ci
   sara' bisogno reale di deduplica avanzata.
