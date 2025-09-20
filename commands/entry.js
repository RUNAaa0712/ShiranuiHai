const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('entry')
        .setDescription('スコアアタック大会にエントリーします。')
        .addStringOption(option =>
            option.setName('entryname')
                .setDescription('エントリーする名前を入力してください。')
                .setRequired(true)),
    async execute(interaction) {
        // ephemeral（一時的なメッセージ）で応答を保留
        // deferReplyのephemeralはまだこの書き方でOKです
        await interaction.deferReply({ ephemeral: true });

        const entryName = interaction.options.getString('entryname');
        const userId = interaction.user.id;
        // サーバーでの表示名を取得（ニックネームなど）
        const displayName = interaction.member.displayName;
        const gasUrl = process.env.GAS_WEB_APP_URL;

        try {
            const response = await axios.post(gasUrl, {
                entryName: entryName,
                userId: userId,
                displayName: displayName, // 表示名も送信
            });

            if (response.data.status === 'success') {
                await interaction.editReply(`✅ **${entryName}** でエントリーを受け付けました！(Player: ${displayName})`);
            } else if (response.data.status === 'duplicate') {
                await interaction.editReply(`⚠️ その名前はすでにエントリーされています。`);
            } else {
                await interaction.editReply(`❌ エラーが発生しました: ${response.data.message}`);
            }
        } catch (error) {
            console.error('GASとの通信中にエラーが発生しました:', error);
            await interaction.editReply('❌ Botの内部でエラーが発生しました。管理者にご連絡ください。');
        }
    },
};