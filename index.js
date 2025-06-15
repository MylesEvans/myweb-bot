require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  Collection,
} = require("discord.js");
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search the web for something")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Your search query")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("snake")
    .setDescription("Play a game of Snake!"),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering slash commands globally...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Commands registered globally.");
  } catch (err) {
    console.error("Error registering commands:", err);
  }
})();

const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function getBoardString(snake, food, size = 8) {
  let board = Array(size * size).fill("⬛");
  for (let segment of snake) {
    board[segment.y * size + segment.x] = "🟩";
  }
  board[snake[0].y * size + snake[0].x] = "🟢";
  board[food.y * size + food.x] = "🍎";
  return board
    .reduce((rows, cell, idx) => {
      const rowIdx = Math.floor(idx / size);
      rows[rowIdx] = (rows[rowIdx] || "") + cell;
      return rows;
    }, [])
    .join("\n");
}

function generateFood(size, snake) {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * size),
      y: Math.floor(Math.random() * size),
    };
  } while (snake.some((p) => p.x === pos.x && p.y === pos.y));
  return pos;
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "search") {
    const query = interaction.options.getString("query");
    try {
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      );
      const data = await response.json();

      const embed = new EmbedBuilder()
        .setTitle(`Search results for: ${query}`)
        .setColor("Blue")
        .setDescription("Here are the top 10 related links:");

      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        const links = data.RelatedTopics.filter((t) => t.FirstURL).slice(0, 10);
        links.forEach((item, index) => {
          embed.addFields({
            name: `Result ${index + 1}`,
            value: `[${item.Text}](${item.FirstURL})`,
          });
        });
      } else {
        embed.setDescription("No results found.");
      }

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "An error occurred while searching.",
        ephemeral: true,
      });
    }
  }

  if (interaction.commandName === "snake") {
    const size = 8;
    let snake = [{ x: 4, y: 4 }];
    let direction = directions.right;
    let food = generateFood(size, snake);
    let gameOver = false;

    const move = () => {
      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

      if (
        head.x < 0 ||
        head.x >= size ||
        head.y < 0 ||
        head.y >= size ||
        snake.some((seg) => seg.x === head.x && seg.y === head.y)
      )
        return (gameOver = true);

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        food = generateFood(size, snake);
      } else {
        snake.pop();
      }
    };

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("up")
        .setLabel("⬆")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("left")
        .setLabel("⬅")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("down")
        .setLabel("⬇")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("right")
        .setLabel("➡")
        .setStyle(ButtonStyle.Secondary),
    );

    let frameMsg = await interaction.reply({
      content: getBoardString(snake, food, size),
      components: [controls],
      fetchReply: true,
    });

    const collector = frameMsg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", (btn) => {
      if (btn.user.id !== interaction.user.id)
        return btn.reply({ content: "This isn’t your game!", ephemeral: true });
      direction = directions[btn.customId];
      btn.deferUpdate();
    });

    const interval = setInterval(() => {
      if (gameOver) {
        clearInterval(interval);
        frameMsg.edit({
          content: `💀 Game Over! Final length: ${snake.length}`,
          components: [],
        });
        return;
      }
      move();
      frameMsg.edit({
        content: getBoardString(snake, food, size),
        components: [controls],
      });
    }, 500);
  }
});

client.login(process.env.DISCORD_TOKEN);
