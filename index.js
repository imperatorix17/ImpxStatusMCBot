require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActivityType,
    SlashCommandBuilder,
    REST,
    Routes,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");

if (!config.token) {
    console.error("❌ Token mancante nel config.json!");
    process.exit(1);
}

if (!config.serverIP || !config.serverPort) {
    console.error("❌ serverIP o serverPort mancanti nel config.json!");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const { token, serverIP, serverPort, channelID, serverType, clientId, guildId } = config;

if (serverType !== "java" && serverType !== "bedrock") {
    console.error("❌ Tipo di server non valido nel config.json! Deve essere 'java' o 'bedrock'");
    process.exit(1);
}

let statusMessage = null;
let lastStatus = null;
let lastPlayerCount = null;

client.commands = new Map();

/* ────────────────
   CARICAMENTO COMANDI
   ──────────────── */
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.existsSync(commandsPath)
    ? fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"))
    : [];

const slashData = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        slashData.push(command.data.toJSON());
        console.log(`✅ Comando caricato: ${command.data.name}`);
    } else {
        console.log(`⚠️ Il comando in ${filePath} manca di "data" o "execute".`);
    }
}

/* ────────────────
   REGISTRAZIONE SLASH COMMAND
   ──────────────── */
async function registerSlashCommands() {
    if (!clientId) {
        console.log("⚠️ clientId non trovato nel config.json. Comandi non registrati.");
        return;
    }

    const rest = new REST({ version: "10" }).setToken(token);

    console.log("\n🔧 Registrazione automatica comandi...");

    try {
        if (guildId) {
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: slashData }
            );
            console.log(`✅ ${slashData.length} comandi registrati!`);
        } else {
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: slashData }
            );
            console.log(`✅ ${slashData.length} comandi globali registrati.`);
        }
    } catch (error) {
        console.error("❌ Errore nella registrazione dei comandi:", error);
    }
}

/* ────────────────
   HANDLER INTERAZIONI UNICO
   ──────────────── */
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`❌ Nessun comando corrispondente a ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Errore durante l'esecuzione del comando ${interaction.commandName}:`, error);
        // niente reply qui per evitare 40060, ci pensa il comando
    }
});

/* ────────────────
   ERRORI GLOBALI
   ──────────────── */
client.on("error", error => {
    console.error("❌ Errore del client Discord:", error);
});

process.on("unhandledRejection", error => {
    console.error("❌ Errore promise non gestito:", error);
});

/* ────────────────
   READY + MONITOR STATUS
   ──────────────── */
client.once("clientReady", async () => {
    console.log(`
╔═══════════════════════════════════════╗
║       ImpXStatusMc Bot v1.0.0         ║
║    Minecraft Server Status Monitor    ║
╚═══════════════════════════════════════╝
`);

    console.log(`✅ Connesso come ${client.user.tag}!\n`);
    console.log(`🔍 Informazioni del server:`);
    console.log(`🎮 Tipo Server: ${serverType.toUpperCase()}`);
    console.log(`🌍 Monitorando: ${serverIP}:${serverPort}`);

    await registerSlashCommands();
    await fetchOrCreateStatusMessage();

    updateServerStatus();
    setInterval(updateServerStatus, 30000);
});

/* ────────────────
   FUNZIONI STATUS MESSAGE
   ──────────────── */
async function fetchOrCreateStatusMessage() {
    if (!channelID) {
        console.error("❌ channelID non impostato nel config.json!");
        return;
    }

    try {
        const channel = await client.channels.fetch(channelID);
        if (!channel || !channel.isTextBased()) {
            console.error("❌ Canale non valido!");
            return;
        }

        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(msg => msg.author.id === client.user.id);

        if (botMessage) {
            console.log("🔄 Messaggio di stato esistente trovato, aggiornamento in corso...");
            statusMessage = botMessage;
        } else {
            console.log("📤 Nessun messaggio esistente, invio di uno nuovo...");
            statusMessage = await channel.send({ embeds: [generateLoadingEmbed()] });
        }
    } catch (error) {
        console.error("❌ Errore nel recupero del messaggio di stato:", error);
    }
}

async function updateServerStatus() {
    try {
        const apiUrl =
            serverType === "bedrock"
                ? `https://api.mcsrvstat.us/bedrock/3/${serverIP}:${serverPort}`
                : `https://api.mcsrvstat.us/3/${serverIP}:${serverPort}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.online) {
            throw new Error("Server offline");
        }

        if (lastStatus !== "online") {
            console.log(`✅ Il server ${serverType.toUpperCase()} è tornato online, aggiornamento messaggio...`);
        }

        const currentPlayers = data.players?.online || 0;
        if (lastPlayerCount !== currentPlayers) {
            console.log(`👥 Numero giocatori cambiato: ${lastPlayerCount || 0} → ${currentPlayers}`);
            lastPlayerCount = currentPlayers;
        }

        lastStatus = "online";

        let serverDisplay;
        if (serverType === "bedrock") {
            serverDisplay = `\`${serverIP}:${serverPort}\``;
        } else {
            serverDisplay =
                serverPort === 25565
                    ? `\`${serverIP}\``
                    : `\`${serverIP}:${serverPort}\``;
        }

        const embed = new EmbedBuilder()
            .setTitle("🟢 Server Minecraft Online")
            .setDescription(`🌍 **IP Server:** ${serverDisplay}\n\u200B`)
            .setColor(0x00ff00);

        if (data.version) {
            embed.addFields({
                name: "📝 Versione",
                value: data.version || "Sconosciuta",
                inline: true,
            });
        }

        if (data.players) {
            embed.addFields({
                name: "👥 Giocatori",
                value: `${data.players.online || 0}/${data.players.max || 0}`,
                inline: true,
            });
        }

        if (data.debug && data.debug.ping) {
            embed.addFields({
                name: "📊 Ping",
                value: `${Math.round(data.debug.ping)}ms`,
                inline: true,
            });
        }

        embed.addFields({
            name: "\u200B",
            value: "",
            inline: false,
        });

        let motdText = "Nessun MOTD";
        if (data.motd?.clean?.length) {
            motdText = data.motd.clean.join("\n");
        } else if (data.motd?.raw?.length) {
            motdText = data.motd.raw.join("\n");
        }

        if (motdText.length > 1024) {
            motdText = motdText.substring(0, 1020) + "...";
        }

        embed.addFields({
            name: "📢 MOTD",
            value: motdText,
            inline: false,
        });

        embed.setThumbnail(`https://api.mcsrvstat.us/icon/${serverIP}`)
            .setFooter({ text: "🕛 Ultimo aggiornamento" })
            .setTimestamp();

        if (data.players) {
            client.user.setPresence({
                activities: [{
                    name: `${data.players.online}/${data.players.max} giocatori`,
                    type: ActivityType.Watching,
                }],
                status: "online",
            });
        }

        if (!statusMessage) {
            await fetchOrCreateStatusMessage();
        }

        if (statusMessage) {
            await statusMessage.edit({ embeds: [embed] });
        }
    } catch (error) {
        console.error(`❌ Errore API per il server ${serverType.toUpperCase()}:`, error.message);

        if (lastStatus !== "offline") {
            console.log(`❌ Il server ${serverType.toUpperCase()} è offline, aggiornamento messaggio...`);
        }
        lastStatus = "offline";
        lastPlayerCount = null;

        let serverDisplay;
        if (serverType === "bedrock") {
            serverDisplay = `\`${serverIP}:${serverPort}\``;
        } else {
            serverDisplay =
                serverPort === 25565
                    ? `\`${serverIP}\``
                    : `\`${serverIP}:${serverPort}\``;
        }

        const offlineEmbed = new EmbedBuilder()
            .setTitle("🔴 Server Minecraft Offline")
            .setDescription(`🚫 Il server ${serverDisplay} è attualmente offline o non raggiungibile.`)
            .setColor(0xff0000)
            .setThumbnail("https://cdn-icons-png.freepik.com/512/9972/9972749.png")
            .setFooter({ text: "🕛 Ultimo controllo" })
            .setTimestamp();

        client.user.setPresence({
            activities: [{
                name: "Server Offline",
                type: ActivityType.Watching,
            }],
            status: "dnd",
        });

        if (!statusMessage) {
            await fetchOrCreateStatusMessage();
        }

        if (statusMessage) {
            await statusMessage.edit({ embeds: [offlineEmbed] });
        }
    }
}

function generateLoadingEmbed() {
    return new EmbedBuilder()
        .setTitle(`⏳ Recupero stato server Minecraft ${serverType === "bedrock" ? "Bedrock" : "Java"}...`)
        .setColor(0xffff00)
        .setDescription("Attendere mentre recuperiamo i dettagli più recenti del server.")
        .setTimestamp();
}

/* ────────────────
   SHUTDOWN
   ──────────────── */
process.on("SIGINT", () => {
    console.log("\n👋 Arresto del bot in corso...");
    client.destroy();
    process.exit(0);
});

client.login(token);
