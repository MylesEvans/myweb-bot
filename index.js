require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  Collection,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("MyWeb Bot is running!"));
app.listen(PORT, () => console.log(`✅ Web server listening on port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});
client.commands = new Collection();

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "search") {
    const query = interaction.options.getString("query");
    await interaction.deferReply();

    try {
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`,
      );
      const data = await response.json();

      let answer = data.Abstract || data.Answer || data.Definition || null;

      const embed = new EmbedBuilder()
        .setTitle(`🔍 DuckDuckGo Search: ${query}`)
        .setColor("Green")
        .setDescription(answer ? answer : "No direct answer found.")
        .setFooter({ text: "Powered by DuckDuckGo Instant Answer API" });

      if (data.AbstractURL) {
        embed.addFields({
          name: "More Info",
          value: `[Visit here](${data.AbstractURL})`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Error fetching search result.");
    }
  }

  if (commandName === "snake") {
    const game = new SnakeGame(interaction);
    game.start();
  }
});

client.login(process.env.DISCORD_TOKEN);

// ==== SnakeGame class omitted for brevity ====
