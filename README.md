# ImpXStatusMc Bot www.impx.it

Bot Discord in **Node.js + discord.js v14** che monitora uno o più server Minecraft (Java o Bedrock) usando l’API di mcsrvstat.us.  
Mostra lo stato live del server in un canale dedicato e fornisce comandi slash per vedere info dettagliate, player online e MOTD.

## Funzionalità

- Stato live del server Minecraft in un messaggio fissato in un canale:
  - Online/offline
  - Versione
  - Player online / max
  - Ping (se disponibile)
  - MOTD pulito
- Aggiornamento automatico ogni 30 secondi tramite API mcsrvstat.us.
- Comandi slash:
  - `/status` – Stato corrente del server (ephemeral, snapshot rapido).
  - `/info-mc` – Informazioni dettagliate (versione, tipo, MOTD, software, hostname).
  - `/playerlist` – Lista paginata dei player online (solo Java), con bottoni per sfogliare le pagine.
- Supporto per:
  - **Java Edition**
  - **Bedrock Edition** (IP:PORT forzato, gestione MOTD, player count quando supportato).

## Requisiti

- Node.js **18+** (raccomandato 18/20/22).
- Un bot Discord registrato su [Discord Developer Portal].
- Permessi del bot:
  - `applications.commands`
  - Lettura/scrittura messaggi nel canale status.

## Installazione

1. Clona o scarica il repository:
- `git clone https://github.com/imperatorix17/ImpxStatusMCBot.git`
- `cd ImpxStatusMCBot`


2. Installa le dipendenze:
- `npm install`


Minimo:
- `discord.js`
- eventuale `node-fetch` / fetch globale (Node 18+ ha `fetch` built-in) [web:94].

3. Modifica `config.json` nella root:

- `serverType`: `"java"` oppure `"bedrock"`.
- `guildId`: opzionale; se valorizzato, i comandi vengono registrati solo in quella guild (immediati). Se omesso, vengono registrati globalmente (fino a 1h di propagazione).

## Avvio

- `node index.js`


In console vedrai:

- Caricamento comandi da `commands/`.
- Registrazione automatica dei comandi slash via REST.
- Connessione del bot e inizio del ciclo di aggiornamento status.

## Comandi

### `/status`

- Risposta **ephemeral** con:
  - IP (solo host per Java standard, host:porta se porta custom o Bedrock).
  - Versione.
  - Player online / max.
  - Ping (se disponibile).
  - MOTD.
- Usa `deferReply({ flags: 64 })` + `editReply()` per evitare timeout e doppie risposte [web:6][web:16].

### `/info-mc`

- Risposta **ephemeral** con:
  - IP e tipo server (Java / Bedrock).
  - Versione.
  - MOTD pulito.
  - Software (solo Java, se fornito dall’API).
  - Hostname (se disponibile).

### `/playerlist` (solo Java)

- Solo se `serverType === "java"`.
- Se Bedrock: risposta immediata ephemeral con errore informativo.
- Se online:
  - Embed con player online.
  - Paginazione (20 giocatori per pagina) con bottoni `⬅️` / `➡️`.
  - Collector di componenti valido 5 minuti, poi bottoni disabilitati.


## Note tecniche

- L’API di [mcsrvstat.us][web:84] combina ping e query in un unico JSON e supporta Java 1.7+ e Bedrock/enable-query [web:84][web:104].
- Tutti i comandi ephemeral usano `flags: 64` per evitare warning sulle opzioni `ephemeral` deprecate nelle interazioni [web:14][web:15].
- Pattern standard:
  - Comandi: `deferReply({ flags: 64 })` → `editReply()`.
  - Nessun `reply()` dopo un `deferReply()` sulla stessa interaction per evitare `DiscordAPIError[40060]` (“Interaction has already been acknowledged”) [web:6][web:11][web:4].

## Troubleshooting

- **Comandi non visibili**:
  - Controlla `clientId` e `guildId` in `config.json`.
  - Assicurati che il bot abbia `applications.commands` e sia nel server corretto [web:58][web:72].
- **Comandi visibili ma non rispondono**:
  - Verifica che `index.js` carichi i file in `commands/` e non ci siano altri `client.on("interactionCreate")` duplicati.
- **Errore 40060 (Interaction has already been acknowledged)**:
  - Assicurati che **ogni comando** usi una sola volta `reply()` o `deferReply()` e poi solo `editReply()`/`followUp()` [web:6][web:11].

---

Per deploy su VPS / hosting (PM2, systemd, ecc.) puoi semplicemente eseguire:

- pm2 start index.js --name impxstatusmc

Grazie per aver provato il mio Bot Discord!

- Imperatorix


