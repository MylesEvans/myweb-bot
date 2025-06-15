// deploy.js
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search the web for a query (DuckDuckGo).")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Your search query")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("summarise")
    .setDescription("Summarises a topic (Premium only).")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Text to summarise")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unbans the last banned user."),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🗑 Clearing all global commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: [],
    });
    console.log("✅ Cleared global commands.");

    console.log("🚀 Deploying new global slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Successfully deployed global slash commands!");
  } catch (err) {
    console.error("❌ Error deploying commands:", err);
  }
})();
