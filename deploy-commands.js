require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search something on Google")
    .addStringOption((opt) =>
      opt.setName("query").setDescription("Search query").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("summarise")
    .setDescription("Summarise a topic (Premium only)")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Topic to summarise")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unbans the last banned user"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      { body: commands },
    );
    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error(err);
  }
})();
