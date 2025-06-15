require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// Web server for Uptime Robot
app.get("/", (req, res) => {
  res.send("MyWeb Discord bot is running!");
});
app.listen(PORT, () => console.log(`Uptime server running on port ${PORT}`));

// Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SERP_API_KEY = process.env.SERPAPI_KEY;
const LOG_CHANNEL_ID = "1383529361088446526";

const bannedUsers = new Set();
let lastBannedUser = null;

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // !search command
  if (content.startsWith("!search")) {
    if (bannedUsers.has(message.author.id)) {
      return message.reply("❌ You are banned from using the search command.");
    }

    const query = content.slice("!search".length).trim();
    if (!query) return message.reply("Please provide a search query.");

    let resultText = "No results found. Attempting to summarise...";

    try {
      const res = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`,
      );
      const data = await res.json();

      if (data.error || !data.organic_results) {
        throw new Error("Search failed");
      }

      const results = data.organic_results.slice(0, 3);
      resultText =
        results
          .map((r) => `**[${r.title}](${r.link})**\n${r.snippet || ""}`)
          .join("\n\n") || resultText;
    } catch (err) {
      console.warn("Search failed. Using summary fallback.");

      // Basic placeholder summary fallback
      resultText = `🧠 Summary of **${query}**:\nThis is a general explanation about "${query}" based on common knowledge and current information.`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🔍 MylesWeb Result")
      .setColor("Green")
      .addFields({ name: "Results", value: resultText })
      .setFooter({ text: `Query by ${message.author.tag}` });

    await message.reply({ embeds: [embed] });

    // Log the query
    const logChannel = await client.channels
      .fetch(LOG_CHANNEL_ID)
      .catch(() => null);
    if (logChannel) {
      const banButton = new ButtonBuilder()
        .setCustomId(`ban_${message.author.id}`)
        .setLabel("Ban")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(banButton);

      await logChannel.send({
        content: `🔎 **Search Query Logged**\n👤 User: ${message.author.tag} (${message.author.id})\n📄 Query: \`${query}\``,
        components: [row],
      });
    }
  }

  // !unban command
  if (content === "!unban") {
    if (!lastBannedUser) return message.reply("⚠️ No one is currently banned.");

    bannedUsers.delete(lastBannedUser);
    const unbannedUser = lastBannedUser;
    lastBannedUser = null;

    return message.reply(`✅ <@${unbannedUser}> has been unbanned.`);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, userId] = interaction.customId.split("_");
  if (action === "ban") {
    bannedUsers.add(userId);
    lastBannedUser = userId;

    await interaction.reply({
      content: `🚫 User <@${userId}> has been **banned** from using search.`,
      ephemeral: true,
    });
  }
});

client.login(DISCORD_TOKEN);
