const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playerlist')
        .setDescription('Mostra la lista completa dei giocatori online (solo Java)'),
    async execute(interaction) {
        // Solo Java
        if (config.serverType !== 'java') {
            await interaction.reply({
                content:
                    '❌ Questo comando è disponibile solo per server Minecraft **Java Edition**!\n' +
                    '💡 I server Bedrock non forniscono la lista dei giocatori.',
                flags: 64, 
            });
            return;
        }

       
        await interaction.deferReply({ flags: 64 }); 

        try {
            const apiUrl = `https://api.mcsrvstat.us/3/${config.serverIP}:${config.serverPort}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data.online) {
                throw new Error('Server offline');
            }

            
            if (!data.players || !data.players.list || data.players.list.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('👥 Lista Giocatori Online')
                    .setDescription(
                        `🌍 **Server:** \`${config.serverIP}${
                            config.serverPort === 25565 ? '' : ':' + config.serverPort
                        }\``,
                    )
                    .setColor(0x5865f2)
                    .setThumbnail(`https://api.mcsrvstat.us/icon/${config.serverIP}`)
                    .addFields({
                        name: '📊 Totale Giocatori',
                        value: `**${data.players?.online || 0}/${data.players?.max || 0}** giocatori online`,
                        inline: false,
                    })
                    .setFooter({
                        text: 'Richiesto da ' + interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                if (data.players?.online > 0) {
                    embed.addFields({
                        name: '🔒 Lista Giocatori Nascosta',
                        value:
                            '⚠️ Questo server ha **' +
                            data.players.online +
                            ' giocatori online** ma non condivide la lista dei nomi.\n\n' +
                            '**Possibili motivi:**\n' +
                            '• Il server ha disabilitato la visualizzazione per privacy\n' +
                            '• Plugin di sicurezza attivi (es. ProtocolLib)\n' +
                            '• Configurazione server per ridurre carico',
                        inline: false,
                    });
                } else {
                    embed.addFields({
                        name: '🎮 Giocatori Online',
                        value: '❌ Nessun giocatore online al momento.',
                        inline: false,
                    });
                }

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            
            const playersPerPage = 20;
            const players = data.players.list;
            const totalPages = Math.ceil(players.length / playersPerPage);
            let currentPage = 0;

            const createEmbed = page => {
                const start = page * playersPerPage;
                const end = start + playersPerPage;
                const currentPlayers = players.slice(start, end);

                const playerList = currentPlayers
                    .map((player, index) => `${start + index + 1}. **${player}**`)
                    .join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('👥 Lista Giocatori Online')
                    .setDescription(
                        `🌍 **Server:** \`${config.serverIP}${
                            config.serverPort === 25565 ? '' : ':' + config.serverPort
                        }\``,
                    )
                    .setColor(0x5865f2)
                    .setThumbnail(`https://api.mcsrvstat.us/icon/${config.serverIP}`)
                    .addFields({
                        name: '📊 Totale Giocatori',
                        value: `**${data.players.online || 0}/${data.players.max || 0}** giocatori online`,
                        inline: false,
                    })
                    .addFields({
                        name: `🎮 Giocatori Online (${start + 1}-${Math.min(
                            end,
                            players.length,
                        )})`,
                        value: playerList,
                        inline: false,
                    });

                if (data.players.online > players.length) {
                    embed.addFields({
                        name: '⚠️ Nota',
                        value: `Il server mostra solo **${players.length}** giocatori su **${data.players.online}** totali.`,
                        inline: false,
                    });
                }

                embed
                    .setFooter({
                        text: `Pagina ${page + 1} di ${totalPages} • Richiesto da ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                return embed;
            };

            const createButtons = page => {
                const previousButton = new ButtonBuilder()
                    .setCustomId('previous')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('next')
                    .setEmoji('➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1);

                return new ActionRowBuilder().addComponents(previousButton, nextButton);
            };

            const message = await interaction.editReply({
                embeds: [createEmbed(currentPage)],
                components: totalPages > 1 ? [createButtons(currentPage)] : [],
            });

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000, 
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({
                        content: '❌ Questi bottoni non sono per te!',
                        flags: 64,
                    });
                    return;
                }

                if (i.customId === 'previous' && currentPage > 0) {
                    currentPage--;
                } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                    currentPage++;
                }

                await i.update({
                    embeds: [createEmbed(currentPage)],
                    components: [createButtons(currentPage)],
                });
            });

            collector.on('end', async () => {
                const disabledButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setEmoji('➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                );

                try {
                    await interaction.editReply({
                        components: [disabledButtons],
                    });
                } catch {
                    
                }
            });
        } catch (error) {
            console.error('❌ Errore nel recupero della lista giocatori:', error.message);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Errore')
                .setDescription(
                    `Non è stato possibile recuperare la lista giocatori dal server \`${config.serverIP}${
                        config.serverPort === 25565 ? '' : ':' + config.serverPort
                    }\``,
                )
                .addFields({
                    name: '🔍 Possibili cause',
                    value:
                        '• Il server è offline\n' +
                        '• Il server sta riavviando\n' +
                        '• Problemi di connessione',
                    inline: false,
                })
                .setColor(0xff0000)
                .setFooter({
                    text: 'Richiesto da ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
