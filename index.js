const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
} = require("discord.js");
require("dotenv").config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- コマンドハンドラのセットアップ ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[警告] ${filePath} のコマンドには、必須の "data" または "execute" プロパティがありません。`
    );
  }
}

// --- Bot起動時の処理 ---
client.once(Events.ClientReady, async (c) => {
  // asyncを追加
  console.log(`${c.user.tag}としてログインしました！`);

  // 起動通知メッセージを送信
  const channelId = process.env.NOTIFICATION_CHANNEL_ID;
  if (channelId) {
    try {
      const channel = await client.channels.fetch(channelId);
      // チャンネルが存在し、テキストベースのチャンネルであることを確認
      if (channel && channel.isTextBased()) {
        await channel.send("✅ **Botがオンラインになりました！**");
      }
    } catch (error) {
      console.error(
        "起動通知の送信に失敗しました。チャンネルIDが正しいか、Botに権限があるか確認してください。",
        error
      );
    }
  } else {
    console.warn("[警告] 通知用のチャンネルIDが.envに設定されていません。");
  }
});

// --- スラッシュコマンドへの応答処理 ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(
      `'${interaction.commandName}' というコマンドは見つかりませんでした。`
    );
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "コマンド実行中にエラーが発生しました！",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "コマンド実行中にエラーが発生しました！",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// Botにログイン
client.login(process.env.DISCORD_TOKEN);

// --- Bot終了時の処理 (Graceful Shutdown) ---
const shutdown = async () => {
  console.log("Botをシャットダウンしています...");
  const channelId = process.env.NOTIFICATION_CHANNEL_ID;
  if (channelId) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        // awaitを使うことで、メッセージ送信が終わるまで待つ
        await channel.send("💤 **Botがオフラインになりました。**");
      }
    } catch (error) {
      console.error("終了通知の送信に失敗しました:", error);
    }
  }
  // Discordとの接続を正常に切断
  client.destroy();
  // プロセスを終了
  process.exit(0);
};

// Ctrl+Cなどでプロセスが終了されるときに`shutdown`関数を呼び出す
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);