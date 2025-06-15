require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Events,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const bannedUsers = new Set();
let lastBannedUser = null;

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;

  if (bannedUsers.has(user.id)) {
    await interaction.reply({
      content: "🚫 You are banned from using search.",
      ephemeral: true,
    });
    return;
  }

  if (commandName === "search") {
    const query = interaction.options.getString("query");

    try {
      const res = await axios.get("https://api.duckduckgo.com/", {
        params: {
          q: query,
          format: "json",
          no_redirect: 1,
          no_html: 1,
        },
      });

      const data = res.data;
      const embed = new EmbedBuilder()
        .setTitle(`🔍 DuckDuckGo Search: ${query}`)
        .setColor("Blue")
        .setFooter({ text: "Results via DuckDuckGo Instant Answer API" });

      if (data.AbstractText) {
        embed.setDescription(data.AbstractText);
      }

      if (data.AbstractURL) {
        embed.addFields({
          name: "Top Link",
          value: `[${data.Heading}](${data.AbstractURL})`,
        });
      }

      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, 5).forEach((topic) => {
          if (topic.Text && topic.FirstURL) {
            embed.addFields({
              name: topic.Text,
              value: `[More info](${topic.FirstURL})`,
            });
          }
        });
      }

      await interaction.reply({ embeds: [embed] });

      // Log to moderation channel
      const logChannel = await client.channels
        .fetch(process.env.LOG_CHANNEL_ID)
        .catch(() => null);
      if (logChannel) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Ban User")
            .setCustomId(`ban_${user.id}`)
            .setStyle(ButtonStyle.Danger),
        );

        logChannel.send({
          content: `🔍 **${user.tag}** searched for: **${query}**`,
          components: [row],
        });
      }
    } catch (error) {
      console.error("Search Error:", error.message);
      interaction.reply("❌ Something went wrong with the search.");
    }
  }

  if (commandName === "unban") {
    if (lastBannedUser) {
      bannedUsers.delete(lastBannedUser);
      await interaction.reply(`✅ Unbanned <@${lastBannedUser}>`);
      lastBannedUser = null;
    } else {
      await interaction.reply("❌ No one to unban.");
    }
  }
});

// Handle ban button
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.customId.split("_")[1];
  bannedUsers.add(userId);
  lastBannedUser = userId;

  await interaction.reply({
    content: `🚫 <@${userId}> has been banned from using search.`,
    ephemeral: true,
  });
});

client.login(process.env.DISCORD_TOKEN);
