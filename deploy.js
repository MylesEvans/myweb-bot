// deploy.js
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Searches the web for a query")
    .addStringOption((option) =>
      option.setName("query").setDescription("Search query").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("summarise")
    .setDescription("Summarises a topic (Premium only)")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Text to summarise")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unbans the last banned user"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🚀 Deploying slash commands to guild...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      { body: commands },
    );
    console.log("✅ Successfully deployed guild slash commands!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
