const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('score')
        .setDescription('あなたの現在のスコアを確認します。'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const gasUrl = process.env.GAS_WEB_APP_URL;

        try {
            // GASに action=getScore という目印を付けてリクエスト
            const response = await axios.get(gasUrl, {
                params: {
                    userId: userId,
                    action: 'getScore'
                }
            });

            const data = response.data;
            if (data.status === 'success') {
                const score = data.scoreDetails;

                // 埋め込みメッセージを作成
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500) // オレンジ色
                    .setTitle(`${score.entryName} さんのスコア`)
                    .setDescription('現在のスコアは以下の通りです。')
                    .addFields(
                        { name: `課題曲1: ${score.song1_title}`, value: `**${score.song1_score.toLocaleString()}**`, inline: false },
                        { name: `課題曲2: ${score.song2_title}`, value: `**${score.song2_score.toLocaleString()}**`, inline: false },
                        { name: `課題曲3: ${score.song3_title}`, value: `**${score.song3_score.toLocaleString()}**`, inline: false },
                        { name: '合計スコア', value: `**${score.total_score.toLocaleString()}**` }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Chunithm Score Attack' });

                await interaction.editReply({ embeds: [embed] });

            } else {
                // 'not_found' や 'no_score' などの場合
                await interaction.editReply(`⚠️ ${data.message}`);
            }

        } catch (error) {
            console.error('GASとの通信中にエラーが発生しました:', error);
            await interaction.editReply('❌ Botの内部でエラーが発生しました。管理者にご連絡ください。');
        }
    },
};