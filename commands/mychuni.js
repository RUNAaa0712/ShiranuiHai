const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('node:path');

// フォントを登録
try {
    const fontPath = path.join(__dirname, '..', 'assets', 'font.ttf');
    registerFont(fontPath, { family: 'MyCustomFont' });
} catch (e) {
    console.error(`フォントの登録に失敗しました。assets/font.ttf を確認してください。`, e);
}

// 角丸の四角形を描画するヘルパー関数
function drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mychuni')
        .setDescription('あなたの課題曲を確認します。'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const gasUrl = process.env.GAS_WEB_APP_URL;

        try {
            const response = await axios.get(gasUrl, { params: { userId: userId } });
            
            if (response.data.status !== 'success') {
                await interaction.editReply(`⚠️ ${response.data.message || '課題曲が見つかりませんでした。'}`);
                return;
            }

            const musicDetails = response.data.musicDetails;
            const entryName = response.data.entryName; // 🔴 エントリーネームを取得

            if (!musicDetails || musicDetails.length === 0) {
                await interaction.editReply('あなたの課題曲はまだ設定されていません。');
                return;
            }

            // --- 画像生成処理 (縦レイアウト) ---
            const canvasWidth = 800;
            const canvasHeight = 700;
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // 1. 背景を描画
            try {
                const backgroundPath = path.join(__dirname, '..', 'assets', 'background.png');
                const background = await loadImage(backgroundPath);
                ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);
            } catch (bgError) {
                console.error(`背景画像の読み込みに失敗`, bgError);
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }

            // --- 描画設定 ---
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            // 🔴 2. ヘッダー（エントリーネーム）を描画 ---
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.font = 'bold 48px MyCustomFont';
            ctx.fillText(`${entryName} さんの課題曲`, canvasWidth / 2, 60);

            // 3. 各曲の情報を縦に描画
            const topMargin = 120; // ヘッダー分のスペースを空けるため、余白を増やす
            const cardHeight = 190; 
            const leftMargin = 50;
            const rightMargin = 50;

            for (let i = 0; i < musicDetails.length; i++) {
                const music = musicDetails[i];
                const currentY = topMargin + i * cardHeight;

                // --- 半透明の背景パネルを描画 ---
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                drawRoundRect(ctx, leftMargin, currentY, canvasWidth - leftMargin - rightMargin, 170, 15);
                ctx.fill();

                // --- ジャケットを描画 ---
                const jacketSize = 130;
                const jacketX = leftMargin + 20;
                const jacketY = currentY + 20;
                try {
                    const jacketImage = await loadImage(music.jacketUrl);
                    ctx.drawImage(jacketImage, jacketX, jacketY, jacketSize, jacketSize);
                } catch (imgError) {
                    console.error(`ジャケット画像の読み込みに失敗: ${music.jacketUrl}`);
                    ctx.fillStyle = '#333';
                    ctx.fillRect(jacketX, jacketY, jacketSize, jacketSize);
                }
                
                // --- テキストを描画 ---
                const textX = jacketX + jacketSize + 25;
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                ctx.font = 'bold 42px MyCustomFont';
                ctx.fillText(music.title, textX, jacketY + 15, 500);

                ctx.font = '32px MyCustomFont';
                const chartInfo = `${music.chartType} / LV. ${music.level}`;
                ctx.fillText(chartInfo, textX, jacketY + 80);
            }

            // 4. 生成した画像をDiscordに送信
            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'mychuni-card.png' });
            await interaction.followUp({ files: [attachment] });
            await interaction.editReply({ content: '課題曲はこちら！' });

        } catch (error) {
            console.error('コマンド実行中にエラーが発生しました:', error);
            await interaction.editReply('❌ Botの内部でエラーが発生しました。');
        }
    },
};