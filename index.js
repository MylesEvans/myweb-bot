require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const axios = require("axios");
const express = require("express");

// --- EXPRESS for uptime
const app = express();
app.get("/", (_, res) => res.send("Bot is alive!"));
app.listen(process.env.PORT || 3000, () => console.log("Server running"));

// --- CLIENT
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- STATE
const banned = new Set();
const banStack = [];
const premium = new Set();

// --- CONFIG
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// --- HELPER: send mod log
async function modLog(interaction, user, action, query) {
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!ch?.isTextBased()) return;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ban_${user.id}`)
      .setLabel("Ban")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`unban_${user.id}`)
      .setLabel("Unban")
      .setStyle(ButtonStyle.Success),
  );
  const embed = new EmbedBuilder()
    .setTitle(action === "search" ? "Search Used" : "Summarise Used")
    .setDescription(`**User:** ${user.tag}\n**Query:** ${query}`)
    .setTimestamp();
  ch.send({ embeds: [embed], components: [row] });
}

// --- DUCKDUCKGO SEARCH
async function ddgSearch(query) {
  const url = "https://api.duckduckgo.com/";
  const { data } = await axios.get(url, {
    params: { q: query, format: "json", no_html: 1, skip_disambig: 1 },
  });
  // data.RelatedTopics can be an array of objects and subarrays
  const results = [];
  function extractTopics(topics) {
    for (const t of topics) {
      if (t.Text && t.FirstURL) {
        results.push({ text: t.Text, url: t.FirstURL });
      } else if (t.Topics) {
        extractTopics(t.Topics);
      }
      if (results.length >= 3) break;
    }
  }
  extractTopics(data.RelatedTopics || []);
  return results;
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // --- BUTTONS
  if (interaction.isButton()) {
    const [action, uid] = interaction.customId.split("_");
    if (action === "ban") {
      if (!banned.has(uid)) {
        banned.add(uid);
        banStack.push(uid);
        return interaction.reply({
          content: `🚫 Banned <@${uid}>.`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: "User already banned.",
        ephemeral: true,
      });
    }
    if (action === "unban") {
      if (banned.has(uid)) {
        banned.delete(uid);
        banStack.splice(banStack.indexOf(uid), 1);
        return interaction.reply({
          content: `✅ Unbanned <@${uid}>.`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: "User not banned.",
        ephemeral: true,
      });
    }
    return;
  }

  // --- SLASH COMMANDS
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, user } = interaction;

  // Check ban
  if (["search", "summarise"].includes(commandName) && banned.has(user.id)) {
    return interaction.reply({
      content: "🚫 You're banned from using this.",
      ephemeral: true,
    });
  }

  // /search
  if (commandName === "search") {
    const q = options.getString("query");
    await interaction.deferReply();

    // mod log
    await modLog(interaction, user, "search", q);

    // perform search
    let results;
    try {
      results = await ddgSearch(q);
    } catch (e) {
      console.error(e);
      return interaction.editReply("❌ Search failed.");
    }

    if (!results.length) {
      return interaction.editReply("No results found.");
    }

    const reply = results
      .map((r, i) => `**${i + 1}.** ${r.text}\n${r.url}`)
      .join("\n\n");
    return interaction.editReply(reply);
  }

  // /summarise
  if (commandName === "summarise") {
    const q = options.getString("query");
    if (!premium.has(user.id)) {
      return interaction.reply({
        content: "🔒 Premium only.",
        ephemeral: true,
      });
    }
    await interaction.deferReply();
    await modLog(interaction, user, "summarise", q);
    // placeholder summary
    return interaction.editReply(
      `📝 Summary for "${q}":\nThis is a placeholder.`,
    );
  }

  // /unban
  if (commandName === "unban") {
    if (!banStack.length) {
      return interaction.reply("⚠️ No one to unban.");
    }
    const last = banStack.pop();
    banned.delete(last);
    return interaction.reply(`✅ Unbanned <@${last}>.`);
  }
});

client.login(process.env.DISCORD_TOKEN);
