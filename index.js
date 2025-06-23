require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} = require("discord.js");
const { request } = require("undici");
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the Apple-style frontend
app.use(express.static("public"));

// Route '/' to index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// DuckDuckGo search endpoint
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    const response = await request(url);
    const data = await response.body.json();

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

    res.json({ results });
  } catch (err) {
    console.error("DuckDuckGo error:", err);
    res.status(500).json({ error: "DuckDuckGo failed" });
  }
});

app.listen(PORT, () => console.log(`🌐 Web running on port ${PORT}`));

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
  if (!message.content.startsWith("!search")) return;

  const query = message.content.slice("!search".length).trim();
  if (!query) return message.reply("Please provide a search query.");

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    const response = await request(url);
    const data = await response.body.json();

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
      .setTitle("🔍 MyWeb Search")
      .setColor("Blue")
      .addFields(
        results.map((r) => ({
          name: r.title,
          value: `[Visit](${r.link})\n${r.snippet}`,
        })),
      )
      .setFooter({ text: "DuckDuckGo Powered" });

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Search failed:", err);
    message.reply("Error while searching.");
  }
});

client.login(process.env.DISCORD_TOKEN);
