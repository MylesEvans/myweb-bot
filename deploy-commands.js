require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'search',
    description: 'Search something',
    options: [
      {
        name: 'query',
        type: 3, // STRING
        description: 'What to search for',
        required: true,
      }
    ]
  },
  {
    name: 'summarise',
    description: 'Summarise some text (premium only)',
    options: [
      {
        name: 'query',
        type: 3, // STRING
        description: 'Text to summarise',
        required: true,
      }
    ]
  },
  {
    name: 'unban',
    description: 'Unban the last banned user',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (slash) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Successfully reloaded application (slash) commands.');
  } catch (error) {
    console.error(error);
  }
})();
