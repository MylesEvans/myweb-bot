// deploy.js
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Searches the web for a query.")
    .addStringOption((opt) =>
      opt.setName("query").setDescription("Search term").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("snake")
    .setDescription("Play the classic snake game with buttons!"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Registering global commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Slash commands registered globally.");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
})();
