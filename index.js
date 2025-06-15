require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const fetch = require("node-fetch");
const express = require("express");
const fs = require("fs");
const app = express();

// --- Express for port binding
app.get("/", (_, res) => res.send("Bot is alive!"));
app.listen(process.env.PORT || 3000, () => console.log("Server running..."));

// --- In-memory storage
const bannedUsers = new Set();
const premiumUsers = new Set();
let lastBanned = null;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.commands = new Collection();

// --- /search
client.commands.set("search", {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search something on Google")
    .addStringOption((opt) =>
      opt.setName("query").setDescription("Search query").setRequired(true),
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    if (bannedUsers.has(userId))
      return interaction.reply({
        content: "❌ You are banned from using this command.",
        ephemeral: true,
      });

    const query = interaction.options.getString("query");
    let resultText = "No results found.";

    try {
      const res = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}`,
      );
      const data = await res.json();
      if (data.error || !data.organic_results) {
        resultText = "⚠️ Monthly Limit Reached";
      } else {
        const results = data.organic_results.slice(0, 3);
        resultText = results
          .map((r) => `**[${r.title}](${r.link})**\n${r.snippet || ""}`)
          .join("\n\n");
      }
    } catch {
      resultText = "⚠️ Monthly Limit Reached";
    }

    const embed = new EmbedBuilder()
      .setTitle("🔍 Search Results")
      .setColor("Blue")
      .setDescription(resultText || "No results.")
      .setFooter({ text: "Powered by SerpAPI" });

    interaction.reply({ embeds: [embed] });

    // Logging for moderation
    const logChannel = await client.channels.fetch("1383529361088446526");
    logChannel.send({
      content: `🔎 **${interaction.user.tag}** searched: \`${query}\``,
    });
  },
});

// --- /summarise
client.commands.set("summarise", {
  data: new SlashCommandBuilder()
    .setName("summarise")
    .setDescription("Summarise a topic (Premium only)")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Topic to summarise")
        .setRequired(true),
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    if (!premiumUsers.has(userId)) {
      return interaction.reply({
        content: "⚠️ You need MyWeb Premium to use this command.",
        ephemeral: true,
      });
    }

    const query = interaction.options.getString("query");
    let summary = "No summary available.";

    try {
      const hf = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: `Summarise: ${query}` }),
        },
      );
      const hfData = await hf.json();
      if (Array.isArray(hfData) && hfData[0]?.generated_text) {
        summary = hfData[0].generated_text;
      } else {
        summary = hfData.generated_text || summary;
      }
    } catch {
      summary = "⚠️ Failed to fetch summary.";
    }

    const embed = new EmbedBuilder()
      .setTitle("🧠 Summary")
      .setColor("Green")
      .setDescription(summary);

    interaction.reply({ embeds: [embed] });
  },
});

// --- /unban
client.commands.set("unban", {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unbans the last banned user"),
  async execute(interaction) {
    if (lastBanned) {
      bannedUsers.delete(lastBanned);
      interaction.reply(`✅ Unbanned <@${lastBanned}>.`);
      lastBanned = null;
    } else {
      interaction.reply("❌ No one to unban.");
    }
  },
});

// --- Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (e) {
    console.error(e);
    interaction.reply({ content: "❌ Command error.", ephemeral: true });
  }
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
