require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the HTML frontend
app.use(express.static("public"));

app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing query." });

  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`,
    );
    const ddgData = await ddgRes.json();

    const results = [];

    if (ddgData.AbstractText) {
      results.push({
        title: ddgData.Heading || "Definition",
        link: ddgData.AbstractURL || "#",
        snippet: ddgData.AbstractText,
      });
    }

    if (Array.isArray(ddgData.RelatedTopics)) {
      ddgData.RelatedTopics.slice(0, 5).forEach((item) => {
        if (item.Text && item.FirstURL) {
          results.push({
            title: item.Text.split(" - ")[0],
            link: item.FirstURL,
            snippet: item.Text,
          });
        }
      });
    }

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch search results." });
  }
});

app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

/* -------- DISCORD BOT -------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  if (content.startsWith("!search")) {
    const query = content.slice("!search".length).trim();
    if (!query) return message.reply("Please provide a search query.");

    try {
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`,
      );
      const data = await response.json();

      const results = [];

      if (data.AbstractText) {
        results.push({
          title: data.Heading || "Definition",
          link: data.AbstractURL || "#",
          snippet: data.AbstractText,
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.slice(0, 5).forEach((item) => {
          if (item.Text && item.FirstURL) {
            results.push({
              title: item.Text.split(" - ")[0],
              link: item.FirstURL,
              snippet: item.Text,
            });
          }
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("🔍 MyWeb Results")
        .setColor("Blue")
        .addFields(
          results.map((r) => ({
            name: r.title,
            value: `[Visit](${r.link})\n${r.snippet}`,
          })),
        )
        .setFooter({ text: "Powered by DuckDuckGo" });

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Search failed:", err);
      return message.reply("An error occurred while searching.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
