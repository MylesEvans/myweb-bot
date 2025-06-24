require("dotenv").config();
import("node-fetch").then(({ default: fetch }) => fetch(...args));
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Collection,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_, res) => {
  res.send("MyWeb Bot is running!");
});
app.listen(PORT, () => {
  console.log(`✅ Web server listening on port ${PORT}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

client.commands = new Collection();

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === "search") {
    const query = options.getString("query");
    await interaction.deferReply();

    try {
      const res = await fetch(
        `https://ddg-api.herokuapp.com/search?query=${encodeURIComponent(query)}`,
      );
      const data = await res.json();

      if (!data || !data.results || data.results.length === 0) {
        return interaction.editReply("No results found.");
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Results for "${query}"`)
        .setColor("Blue")
        .setDescription(
          data.results
            .slice(0, 10)
            .map((r, i) => `**${i + 1}. [${r.title}](${r.href})**\n${r.body}`)
            .join("\n\n"),
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Search error:", err);
      interaction.editReply("Something went wrong while searching.");
    }
  }

  if (commandName === "snake") {
    const game = new SnakeGame(interaction);
    game.start();
  }
});

client.login(process.env.DISCORD_TOKEN);

// ======================= SLASH COMMAND DEPLOY =========================
const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search the web using DuckDuckGo.")
    .addStringOption((option) =>
      option.setName("query").setDescription("Search query").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("snake")
    .setDescription("Play a simple button-based Snake game."),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🚀 Deploying slash commands globally...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Slash commands deployed!");
  } catch (error) {
    console.error("❌ Deployment error:", error);
  }
})();

// ====================== SNAKE GAME ===========================
class SnakeGame {
  constructor(interaction) {
    this.interaction = interaction;
    this.boardSize = 5;
    this.snake = [[2, 2]];
    this.apple = this.spawnApple();
    this.direction = "right";
    this.interval = null;
    this.alive = true;
  }

  start() {
    this.sendGameMessage();
    this.interval = setInterval(() => {
      this.moveSnake();
    }, 1000); // 1 FPS
  }

  async sendGameMessage() {
    const board = this.renderBoard();
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("up")
        .setLabel("⬆️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("down")
        .setLabel("⬇️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("left")
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("right")
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary),
    );

    const embed = new EmbedBuilder()
      .setTitle("🐍 Snake Game")
      .setDescription("```\n" + board + "\n```")
      .setColor("Green");

    this.message = await this.interaction.reply({
      embeds: [embed],
      components: [buttons],
      fetchReply: true,
    });

    const collector = this.message.createMessageComponentCollector({
      time: 600_000,
    });

    collector.on("collect", (i) => {
      if (i.user.id !== this.interaction.user.id) {
        return i.reply({ content: "This isn't your game!", ephemeral: true });
      }

      const choice = i.customId;
      if (["up", "down", "left", "right"].includes(choice)) {
        this.direction = choice;
        i.deferUpdate();
      }
    });

    collector.on("end", () => {
      if (this.alive) {
        this.stop("⏹️ Game ended due to inactivity.");
      }
    });
  }

  renderBoard() {
    let board = Array.from({ length: this.boardSize }, () =>
      Array(this.boardSize).fill("⬛"),
    );
    this.snake.forEach(([x, y]) => {
      board[y][x] = "🟩";
    });
    const [ax, ay] = this.apple;
    board[ay][ax] = "🍎";
    return board.map((row) => row.join("")).join("\n");
  }

  spawnApple() {
    let x, y;
    do {
      x = Math.floor(Math.random() * this.boardSize);
      y = Math.floor(Math.random() * this.boardSize);
    } while (this.snake.some(([sx, sy]) => sx === x && sy === y));
    return [x, y];
  }

  moveSnake() {
    if (!this.alive) return;

    const head = [...this.snake[0]];
    switch (this.direction) {
      case "up":
        head[1]--;
        break;
      case "down":
        head[1]++;
        break;
      case "left":
        head[0]--;
        break;
      case "right":
        head[0]++;
        break;
    }

    if (
      head[0] < 0 ||
      head[0] >= this.boardSize ||
      head[1] < 0 ||
      head[1] >= this.boardSize ||
      this.snake.some(([x, y]) => x === head[0] && y === head[1])
    ) {
      return this.stop("💀 You lost!");
    }

    this.snake.unshift(head);

    if (head[0] === this.apple[0] && head[1] === this.apple[1]) {
      this.apple = this.spawnApple();
    } else {
      this.snake.pop();
    }

    this.updateBoard();
  }

  async updateBoard() {
    const embed = new EmbedBuilder()
      .setTitle("🐍 Snake Game")
      .setDescription("```\n" + this.renderBoard() + "\n```")
      .setColor("Green");

    await this.message.edit({
      embeds: [embed],
      components: this.message.components,
    });
  }

  stop(reason) {
    this.alive = false;
    clearInterval(this.interval);

    const embed = new EmbedBuilder()
      .setTitle("🐍 Snake Game Over")
      .setDescription(reason)
      .setColor("Red");

    this.message.edit({ embeds: [embed], components: [] });
  }
}
