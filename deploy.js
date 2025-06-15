require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search DuckDuckGo for something.")
    .addStringOption((opt) =>
      opt.setName("query").setDescription("Search term").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unbans the last banned user."),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🚀 Deploying global commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Commands deployed globally!");
  } catch (err) {
    console.error("❌ Deployment failed:", err);
  }
})();
