require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  SlashCommandBuilder,
} = require("discord.js");
const { REST, Routes } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const COOLDOWN_SECONDS = 10; // cooldown time in seconds per user

// Cooldowns map: commandName => Map of userId => timestamp
const cooldowns = new Map();

// Commands array
const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Searches the web for a query.")
    .addStringOption((option) =>
      option.setName("query").setDescription("Search query").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("summarise")
    .setDescription("Summarises a topic (Premium only).")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Text to summarise")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unbans the last banned user."),
].map((cmd) => cmd.toJSON());

// Deploy commands (run this once or whenever commands change)
async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("Started refreshing application (/) commands.");

    // Clear all global commands first to avoid duplicates
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: [],
    });

    // Deploy new commands globally
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
}

// Handle cooldowns per user per command
function isOnCooldown(commandName, userId) {
  if (!cooldowns.has(commandName)) cooldowns.set(commandName, new Map());
  const timestamps = cooldowns.get(commandName);
  if (!timestamps.has(userId)) return false;

  const expirationTime = timestamps.get(userId) + COOLDOWN_SECONDS * 1000;
  if (Date.now() < expirationTime) return expirationTime - Date.now(); // remaining time in ms

  return false;
}

function setCooldown(commandName, userId) {
  if (!cooldowns.has(commandName)) cooldowns.set(commandName, new Map());
  cooldowns.get(commandName).set(userId, Date.now());
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  // Uncomment below to deploy commands on bot start
  // deployCommands();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user } = interaction;
  const userId = user.id;

  // Check cooldown for this user and command
  const cooldownRemaining = isOnCooldown(commandName, userId);
  if (cooldownRemaining) {
    return interaction.reply({
      content: `⏳ Please wait ${(cooldownRemaining / 1000).toFixed(1)} more second(s) before reusing the \`${commandName}\` command.`,
      ephemeral: true,
    });
  }

  setCooldown(commandName, userId);

  try {
    if (commandName === "search") {
      const query = interaction.options.getString("query");
      // Your search command logic here
      await interaction.reply(`Searching for: **${query}**`);
      // TODO: call your SerpAPI with query here, send results back
    } else if (commandName === "summarise") {
      const query = interaction.options.getString("query");
      // Your summarise command logic here (check premium etc)
      await interaction.reply(`Summarising: **${query}**`);
      // TODO: your summary logic here
    } else if (commandName === "unban") {
      // Your unban logic here
      await interaction.reply("Unbanning last banned user...");
      // TODO: unban logic here
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error executing that command.",
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
