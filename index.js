require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  PermissionsBitField,
} = require("discord.js");
const fetch = require("node-fetch");
const express = require("express");

// --- Express Port Binding (keep alive)
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// --- Bot Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const SERP_API_KEY = process.env.SERP_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // e.g., 1383529361088446526

const bannedUsers = new Set();
const premiumUsers = new Set();
let lastBannedUserId = null;

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName, options, user, guild } = interaction;

    // --- /search command
    if (commandName === "search") {
      if (bannedUsers.has(user.id))
        return interaction.reply({
          content: "🚫 You are banned from using search.",
          ephemeral: true,
        });

      const query = options.getString("query");
      await interaction.deferReply();

      let resultText;
      try {
        const res = await fetch(
          `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`,
        );
        const data = await res.json();
        if (data.error || !data.organic_results) {
          resultText = "⚠️ Monthly limit reached.";
        } else {
          const results = data.organic_results.slice(0, 3);
          resultText =
            results
              .map((r) => `**[${r.title}](${r.link})**\n${r.snippet || ""}`)
              .join("\n\n") || "No results.";
        }
      } catch {
        resultText = "⚠️ Search failed.";
      }

      const embed = new EmbedBuilder()
        .setTitle(`Search: ${query}`)
        .setColor("Blue")
        .setDescription(resultText)
        .setFooter({ text: "Powered by SerpAPI" });

      await interaction.editReply({ embeds: [embed] });

      // Log with ban/premium buttons
      const logChannel = await client.channels
        .fetch(LOG_CHANNEL_ID)
        .catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ban_${user.id}`)
            .setLabel("Ban User")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`premium_${user.id}`)
            .setLabel("Give Premium")
            .setStyle(ButtonStyle.Success),
        );
        logChannel.send({
          content: `🔎 **${user.tag}** searched for: \`${query}\``,
          components: [row],
        });
      }
    }

    // --- /summarise command
    else if (commandName === "summarise") {
      if (bannedUsers.has(user.id))
        return interaction.reply({
          content: "🚫 You are banned from using summarise.",
          ephemeral: true,
        });
      if (!premiumUsers.has(user.id))
        return interaction.reply({
          content: "🔒 Premium only feature.",
          ephemeral: true,
        });

      const query = options.getString("query");
      await interaction.deferReply();

      let summary;
      try {
        const res = await fetch(
          "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: query }),
          },
        );
        const data = await res.json();
        summary =
          Array.isArray(data) && data[0]?.summary_text
            ? data[0].summary_text
            : "No summary available.";
      } catch {
        summary = "⚠️ Summarisation failed.";
      }

      const embed = new EmbedBuilder()
        .setTitle(`Summary: ${query}`)
        .setColor("Green")
        .setDescription(summary);

      await interaction.editReply({ embeds: [embed] });

      const logChannel = await client.channels
        .fetch(LOG_CHANNEL_ID)
        .catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ban_${user.id}`)
            .setLabel("Ban User")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`premium_${user.id}`)
            .setLabel("Give Premium")
            .setStyle(ButtonStyle.Success),
        );
        logChannel.send({
          content: `🧠 **${user.tag}** summarised: \`${query}\``,
          components: [row],
        });
      }
    }

    // --- /unban command
    else if (commandName === "unban") {
      if (
        !guild.members.cache
          .get(interaction.user.id)
          .permissions.has(PermissionsBitField.Flags.BanMembers)
      ) {
        return interaction.reply({
          content: "❌ You lack permission.",
          ephemeral: true,
        });
      }
      if (!lastBannedUserId) {
        return interaction.reply({
          content: "⚠️ No user to unban.",
          ephemeral: true,
        });
      }
      bannedUsers.delete(lastBannedUserId);
      await interaction.reply({
        content: `✅ Unbanned <@${lastBannedUserId}>.`,
        ephemeral: false,
      });
      lastBannedUserId = null;
    }
  }

  // --- Button Handler for Ban/Premium
  else if (interaction.isButton()) {
    const [action, targetId] = interaction.customId.split("_");
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)
    ) {
      return interaction.reply({
        content: "❌ No permission.",
        ephemeral: true,
      });
    }
    if (action === "ban") {
      bannedUsers.add(targetId);
      lastBannedUserId = targetId;
      await interaction.reply({
        content: `🚫 Banned <@${targetId}> from bot.`,
        ephemeral: true,
      });
    } else if (action === "premium") {
      premiumUsers.add(targetId);
      await interaction.reply({
        content: `🌟 Granted premium to <@${targetId}>.`,
        ephemeral: true,
      });
      try {
        (await client.users.fetch(targetId)).send(
          "🎉 You now have MyWeb Premium!",
        );
      } catch {}
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
