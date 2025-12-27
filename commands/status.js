const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Mostra lo stato corrente del server Minecraft'),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            const apiUrl = config.serverType === "bedrock"
                ? `https://api.mcsrvstat.us/bedrock/3/${config.serverIP}:${config.serverPort}`
                : `https://api.mcsrvstat.us/3/${config.serverIP}:${config.serverPort}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data.online) {
                throw new Error('Server offline');
            }

            let serverDisplay;
            if (config.serverType === "bedrock") {
                serverDisplay = `\`${config.serverIP}:${config.serverPort}\``;
            } else {
                serverDisplay = config.serverPort === 25565
                    ? `\`${config.serverIP}\``
                    : `\`${config.serverIP}:${config.serverPort}\``;
            }

            const embed = new EmbedBuilder()
                .setTitle('🟢 Server Minecraft Online')
                .setDescription(`🌍 **IP Server:** ${serverDisplay}\n\u200B`)
                .setColor(0x00FF00)
                .setThumbnail(`https://api.mcsrvstat.us/icon/${config.serverIP}`);

            if (data.version) {
                embed.addFields({
                    name: '📝 Versione',
                    value: data.version || 'Sconosciuta',
                    inline: true
                });
            }

            if (data.players) {
                embed.addFields({
                    name: '👥 Giocatori',
                    value: `${data.players.online || 0}/${data.players.max || 0}`,
                    inline: true
                });
            }

            if (data.debug && data.debug.ping) {
                embed.addFields({
                    name: '📊 Ping',
                    value: `${Math.round(data.debug.ping)}ms`,
                    inline: true
                });
            }

            embed.addFields({
                name: '\u200B',
                value: '',
                inline: false
            });

            let motdText = "Nessun MOTD";
            if (data.motd && data.motd.clean && data.motd.clean.length > 0) {
                motdText = data.motd.clean.join('\n');
            } else if (data.motd && data.motd.raw && data.motd.raw.length > 0) {
                motdText = data.motd.raw.join('\n');
            }

            if (motdText.length > 1024) {
                motdText = motdText.substring(0, 1020) + "...";
            }

            embed.addFields({
                name: '📢 MOTD',
                value: motdText,
                inline: false
            });

            embed
                .setFooter({
                    text: 'Richiesto da ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Errore comando /status:', error.message);

            let serverDisplay;
            if (config.serverType === "bedrock") {
                serverDisplay = `\`${config.serverIP}:${config.serverPort}\``;
            } else {
                serverDisplay = config.serverPort === 25565
                    ? `\`${config.serverIP}\``
                    : `\`${config.serverIP}:${config.serverPort}\``;
            }

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Server Offline')
                .setDescription(`🚫 Il server ${serverDisplay} è attualmente offline o non raggiungibile.`)
                .addFields({
                    name: '🔍 Possibili cause',
                    value: '• Il server è spento\n• Il server sta riavviando\n• Problemi di connessione\n• Firewall o porta bloccata',
                    inline: false
                })
                .setColor(0xFF0000)
                .setThumbnail('https://cdn-icons-png.freepik.com/512/9972/9972749.png')
                .setFooter({
                    text: 'Richiesto da ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
