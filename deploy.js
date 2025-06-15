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
    console.log("🚀 Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
