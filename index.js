require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const SERP_API_KEY = process.env.SERPAPI_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const LOG_CHANNEL_ID = "1383529361088446526"; // channel to log searches for ban/premium buttons

const bannedUsers = new Set();
const premiumUsers = new Set();
let lastBannedUserId = null;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Register slash commands to your guild for instant update (use your GUILD_ID in env)
  const guildId = process.env.GUILD_ID;
  if (!guildId) {
    console.error("GUILD_ID not set in environment!");
    return;
  }
  const guild = await client.guilds.fetch(guildId);

  const commands = [
    {
      name: "search",
      description: "Search for something",
      options: [
        {
          name: "query",
          description: "What do you want to search for?",
          type: 3, // STRING
          required: true,
        },
      ],
    },
    {
      name: "summarise",
      description: "Get a summary of a query (Premium users only)",
      options: [
        {
          name: "query",
          description: "What do you want summarised?",
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: "unban",
      description: "Unban the last banned user",
    },
  ];

  await guild.commands.set(commands);
  console.log("Slash commands registered.");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user, guild } = interaction;

  if (commandName === "search") {
    if (bannedUsers.has(user.id)) {
      return interaction.reply({
        content: "You are banned from using this bot.",
        ephemeral: true,
      });
    }

    const query = options.getString("query");

    await interaction.deferReply();

    // Call SerpAPI
    let searchResult = "No results found.";
    try {
      const res = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`,
      );
      const data = await res.json();

      if (data.error || !data.organic_results) {
        searchResult = "Monthly Limit Reached or no results.";
      } else {
        const results = data.organic_results.slice(0, 3);
        searchResult =
          results
            .map((r) => `**[${r.title}](${r.link})**\n${r.snippet || ""}`)
            .join("\n\n") || "No results found.";
      }
    } catch (err) {
      searchResult = "Search failed.";
    }

    const embed = new EmbedBuilder()
      .setTitle(`Search results for: "${query}"`)
      .setDescription(searchResult)
      .setColor("Blue")
      .setFooter({ text: "Powered by SerpAPI" });

    await interaction.editReply({ embeds: [embed] });

    // Send log message with Ban / Premium buttons
    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel.isTextBased()) {
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

        await logChannel.send({
          content: `User **${user.tag}** searched: \`${query}\``,
          components: [row],
        });
      }
    } catch (err) {
      console.error("Error sending log message:", err);
    }
  } else if (commandName === "summarise") {
    if (bannedUsers.has(user.id)) {
      return interaction.reply({
        content: "You are banned from using this bot.",
        ephemeral: true,
      });
    }
    if (!premiumUsers.has(user.id)) {
      return interaction.reply({
        content: "You must be a Premium user to use this command.",
        ephemeral: true,
      });
    }

    const query = options.getString("query");

    await interaction.deferReply();

    // Call Hugging Face summarisation
    let summary = "Summary not available.";
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: query,
          }),
        },
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.summary_text) {
        summary = data[0].summary_text;
      } else if (data.summary_text) {
        summary = data.summary_text;
      }
    } catch (err) {
      summary = "Failed to get summary.";
    }

    const embed = new EmbedBuilder()
      .setTitle(`Summary for: "${query}"`)
      .setDescription(summary)
      .setColor("Purple")
      .setFooter({ text: "Powered by Hugging Face" });

    await interaction.editReply({ embeds: [embed] });

    // Send log message with Ban / Premium buttons
    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel.isTextBased()) {
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

        await logChannel.send({
          content: `User **${user.tag}** used summarise: \`${query}\``,
          components: [row],
        });
      }
    } catch (err) {
      console.error("Error sending log message:", err);
    }
  } else if (commandName === "unban") {
    if (!guild.members.cache.get(user.id).permissions.has("BanMembers")) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }
    if (!lastBannedUserId) {
      return interaction.reply({
        content: "No user to unban.",
        ephemeral: true,
      });
    }

    try {
      await guild.members.unban(lastBannedUserId);
      bannedUsers.delete(lastBannedUserId);
      await interaction.reply({
        content: `Unbanned user with ID ${lastBannedUserId}.`,
        ephemeral: true,
      });
      lastBannedUserId = null;
    } catch (err) {
      await interaction.reply({
        content:
          "Failed to unban user. They might not be banned or I lack permissions.",
        ephemeral: true,
      });
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, targetUserId] = interaction.customId.split("_");
  const member = await interaction.guild.members
    .fetch(targetUserId)
    .catch(() => null);

  if (
    interaction.user.id !== interaction.message.mentions?.users?.first()?.id &&
    !interaction.member.permissions.has("Administrator")
  ) {
    // Only allow admins to click buttons
    await interaction.reply({
      content: "You do not have permission to press this button.",
      ephemeral: true,
    });
    return;
  }

  if (!member) {
    await interaction.reply({
      content: "User not found in this server.",
      ephemeral: true,
    });
    return;
  }

  if (action === "ban") {
    try {
      await interaction.guild.members.ban(targetUserId, {
        reason: "Banned via MyWeb Bot",
      });
      bannedUsers.add(targetUserId);
      lastBannedUserId = targetUserId;
      await interaction.reply({
        content: `Banned user ${member.user.tag}.`,
        ephemeral: true,
      });
    } catch (err) {
      await interaction.reply({
        content: "Failed to ban user.",
        ephemeral: true,
      });
    }
  } else if (action === "premium") {
    premiumUsers.add(targetUserId);
    try {
      await member.send(
        "Welcome to MyWeb Premium! You now have access to premium commands like `/summarise`.",
      );
    } catch {
      // User may have DMs closed
    }
    await interaction.reply({
      content: `Granted premium to ${member.user.tag}.`,
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
