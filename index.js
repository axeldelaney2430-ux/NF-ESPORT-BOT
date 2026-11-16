
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID || "";
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || "";
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID || "";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName("reglement")
    .setDescription("Publier le règlement NF E-SPORT"),

  new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Publier le panneau de tickets NF"),

  new SlashCommandBuilder()
    .setName("annonce")
    .setDescription("Publier une annonce")
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Contenu de l'annonce")
        .setRequired(true)
    )
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log(`NF E-SPORT connecté : ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Commandes slash enregistrées !");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (!interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageGuild
      )) {
        return interaction.reply({
          content: "Tu n'as pas la permission.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "reglement") {
        const embed = new EmbedBuilder()
          .setColor("#C00020")
          .setTitle("📜 RÈGLEMENT NF E-SPORT")
          .setDescription(
            "**Bienvenue chez NF E-SPORT !**\n\n" +
            "1. Respect obligatoire entre les membres.\n" +
            "2. Aucune insulte ou discrimination.\n" +
            "3. Aucun spam ou publicité non autorisée.\n" +
            "4. Respect des joueurs et du staff.\n" +
            "5. Respect des décisions du staff.\n" +
            "6. Bonne ambiance et fair-play obligatoires.\n\n" +
            "Clique ci-dessous pour accepter."
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("nf_accept_rules")
            .setLabel("J'accepte le règlement")
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row]
        });
      }

      if (interaction.commandName === "tickets") {
        const embed = new EmbedBuilder()
          .setColor("#C00020")
          .setTitle("🎫 SUPPORT NF E-SPORT")
          .setDescription(
            "Choisis la catégorie correspondant à ta demande."
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("nf_ticket_recrutement")
            .setLabel("Recrutement")
            .setEmoji("🎮")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("nf_ticket_support")
            .setLabel("Support")
            .setEmoji("🛠️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("nf_ticket_partenariat")
            .setLabel("Partenariat")
            .setEmoji("🤝")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("nf_ticket_reclamation")
            .setLabel("Réclamation")
            .setEmoji("⚠️")
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row]
        });
      }

      if (interaction.commandName === "annonce") {
        const message = interaction.options.getString("message", true);

        const embed = new EmbedBuilder()
          .setColor("#C00020")
          .setTitle("📢 ANNONCE NF E-SPORT")
          .setDescription(message)
          .setFooter({ text: "NF E-SPORT" })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "nf_accept_rules") {
        if (!MEMBER_ROLE_ID) {
          return interaction.reply({
            content: "Le rôle membre n'est pas configuré.",
            ephemeral: true
          });
        }

        const member = await interaction.guild.members.fetch(
          interaction.user.id
        );

        await member.roles.add(MEMBER_ROLE_ID);

        return interaction.reply({
          content: "✅ Règlement accepté ! Bienvenue chez NF E-SPORT.",
          ephemeral: true
        });
      }

      if (interaction.customId.startsWith("nf_ticket_")) {
        const type = interaction.customId.replace("nf_ticket_", "");

        const existing = interaction.guild.channels.cache.find(
          channel =>
            channel.type === ChannelType.GuildText &&
            channel.topic === `NF-TICKET-${interaction.user.id}`
        );

        if (existing) {
          return interaction.reply({
            content: `Tu as déjà un ticket : ${existing}`,
            ephemeral: true
          });
        }

        const permissions = [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles
            ]
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ];

        if (STAFF_ROLE_ID) {
          permissions.push({
            id: STAFF_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }

        const channel = await interaction.guild.channels.create({
          name: `ticket-${type}-${interaction.user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .slice(0, 90),
          type: ChannelType.GuildText,
          topic: `NF-TICKET-${interaction.user.id}`,
          parent: TICKET_CATEGORY_ID || undefined,
          permissionOverwrites: permissions
        });

        const embed = new EmbedBuilder()
          .setColor("#C00020")
          .setTitle(`🎫 Ticket ${type}`)
          .setDescription(
            `Bonjour ${interaction.user} !\n\n` +
            "Explique ta demande, un membre du staff va te répondre."
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("nf_close_ticket")
            .setLabel("Fermer le ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
          content: STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}>` : "",
          embeds: [embed],
          components: [row]
        });

        return interaction.reply({
          content: `Ton ticket a été créé : ${channel}`,
          ephemeral: true
        });
      }

      if (interaction.customId === "nf_close_ticket") {
        const member = await interaction.guild.members.fetch(
          interaction.user.id
        );

        const isStaff = STAFF_ROLE_ID &&
          member.roles.cache.has(STAFF_ROLE_ID);

        const isOwner = interaction.channel.topic ===
          `NF-TICKET-${interaction.user.id}`;

        if (!isStaff && !isOwner) {
          return interaction.reply({
            content: "Tu ne peux pas fermer ce ticket.",
            ephemeral: true
          });
        }

        await interaction.reply({
          content: "🔒 Fermeture du ticket dans 5 secondes."
        });

        setTimeout(() => {
          interaction.channel.delete().catch(console.error);
        }, 5000);
      }
    }
  } catch (error) {
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Une erreur est survenue. Contacte le staff.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error(
    "Variables BOT_TOKEN, CLIENT_ID ou GUILD_ID manquantes."
  );
}

client.login(TOKEN);

