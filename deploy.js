require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

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
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🚀 Clearing all global commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: [],
    });
    console.log("✅ Cleared global commands.");

    console.log("🚀 Deploying commands globally...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Successfully deployed global commands!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
