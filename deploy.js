require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search something on the web.")
    .addStringOption((opt) =>
      opt.setName("query").setDescription("Your search").setRequired(true),
    ),
  new SlashCommandBuilder().setName("snake").setDescription("Play snake!"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Deploying commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Commands deployed!");
  } catch (err) {
    console.error("Failed to deploy commands:", err);
  }
})();
