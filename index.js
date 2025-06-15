require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  MessageActionRow,
  MessageButton,
  EmbedBuilder,
} = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

const SERP_API_KEY = process.env.SERPAPI_KEY;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const bannedUsers = new Set();
const premiumUsers = new Set();
let lastBannedUserId = null;

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // Check if banned
  if (bannedUsers.has(message.author.id)) {
    if (content.startsWith("!search") || content.startsWith("!summarise")) {
      return message.reply("You are banned from using search commands.");
    }
  }

  if (content.startsWith("!search")) {
    const query = content.slice("!search".length).trim();
    if (!query) return message.reply("Please provide a search query.");

    // Log search
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("New Search")
        .setDescription(`**User:** ${message.author.tag}\n**Query:** ${query}`)
        .setColor("Blue")
        .setTimestamp();

      const row = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`ban_${message.author.id}`)
          .setLabel("Ban User (1 day)")
          .setStyle("DANGER"),
        new MessageButton()
          .setCustomId(`premium_${message.author.id}`)
          .setLabel("Give Premium")
          .setStyle("SUCCESS"),
      );

      await logChannel.send({ embeds: [embed], components: [row] });
    }

    // Fetch SerpAPI results
    try {
      const res = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`,
      );
      const data = await res.json();

      if (data.error)
        return message.reply("Monthly Limit Reached or error with SerpAPI.");

      const results = data.organic_results?.slice(0, 3);
      if (!results || results.length === 0)
        return message.reply("No results found.");

      let replyText = results
        .map((r) => `**[${r.title}](${r.link})**\n${r.snippet || ""}`)
        .join("\n\n");

      return message.reply(replyText);
    } catch {
      return message.reply("Failed to fetch search results.");
    }
  }

  if (content.startsWith("!summarise")) {
    if (!premiumUsers.has(message.author.id)) {
      return message.reply("This command is for premium users only.");
    }

    const query = content.slice("!summarise".length).trim();
    if (!query) return message.reply("Please provide a query to summarise.");

    // You can add a summarisation API call here
    // Placeholder:
    return message.reply(`Summary feature coming soon for: ${query}`);
  }

  if (content === "!unban") {
    if (!lastBannedUserId) return message.reply("No user to unban.");
    bannedUsers.delete(lastBannedUserId);
    message.reply(`Unbanned user <@${lastBannedUserId}> from search commands.`);
    lastBannedUserId = null;
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, userId] = interaction.customId.split("_");

  if (action === "ban") {
    bannedUsers.add(userId);
    lastBannedUserId = userId;
    await interaction.reply({
      content: `User <@${userId}> banned from search commands for 1 day.`,
      ephemeral: true,
    });
  } else if (action === "premium") {
    premiumUsers.add(userId);
    try {
      const user = await client.users.fetch(userId);
      await user.send(
        "Welcome To MyWeb Premium! You now have access to exclusive commands.",
      );
    } catch {}
    await interaction.reply({
      content: `User <@${userId}> given premium access.`,
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
