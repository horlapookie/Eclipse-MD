export const menuButtonsConfig = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363420551846782@newsletter',
    newsletterName: 'Yøur★ Híghñéss 👑 coding Academy',
    serverMessageId: -1
  },
  externalAdReply: {
    title: '🌙 𝔼𝔠𝔩𝔦𝔭𝔰𝔢 𝔐𝔡',
    body: '🚀 500+ Commands & Aliases | 🤖 AI Powered | 🎨 Image Generator',
    thumbnailUrl: 'https://files.catbox.moe/vsxdpj.jpg',
    sourceUrl: 'https://github.com/horlapookie/Eclipse-MD',
    mediaType: 1,
    renderLargerThumbnail: true,
    showAdAttribution: false
  }
};

export const repoButtons = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363420551846782@newsletter',
    newsletterName: 'Yøur★ Híghñéss 👑 coding Academy',
    serverMessageId: -1
  },
  externalAdReply: {
    title: '🔗 𝔼𝕔𝕝𝕚𝕡𝕤𝕖 𝕄𝔻 REPOSITORY',
    body: 'View Source Code & Documentation',
    thumbnailUrl: 'https://files.catbox.moe/hjza1d.jpg',
    sourceUrl: 'https://github.com/horlapookie/Eclipse-MD',
    mediaType: 1,
    renderLargerThumbnail: false,
    showAdAttribution: false
  }
};
export const menuButtons = {
  // Main menu buttons
  mainButtons: [
    {
      buttonId: "menu_basic",
      buttonText: { displayText: "🛠️ Basic Tools" },
      type: 1
    },
    {
      buttonId: "menu_group",
      buttonText: { displayText: "👥 Group Management" },
      type: 1
    },
    {
      buttonId: "menu_ai",
      buttonText: { displayText: "🤖 AI Commands" },
      type: 1
    }
  ],

  // Repository and creator buttons
  repoButtons: [
    {
      buttonId: "repo_main",
      buttonText: { displayText: "📱 GitHub Repository" },
      type: 1
    },
    {
      buttonId: "creator_contact",
      buttonText: { displayText: "👨‍💻 Creator Contact" },
      type: 1
    },
    {
      buttonId: "contact_support",
      buttonText: { displayText: "🆘 Support Help" },
      type: 1
    }
  ],

  // Quick action buttons
  quickActions: [
    {
      buttonId: "status_bot",
      buttonText: { displayText: "📊 Bot Status" },
      type: 1
    },
    {
      buttonId: "help_support",
      buttonText: { displayText: "🆘 Support" },
      type: 1
    }
  ]
};

// Button responses
export const buttonResponses = {
  repo_main: {
    text: "📱 *𝔼𝕔𝕝𝕚𝕡𝕤𝕖 𝕄𝔻 - Main Repository*\n\n🔗 GitHub: https://github.com/horlapookie/Eclipse-MD\n⭐ Star the repo if you like it!\n🍴 Fork it to create your own version",
    url: "https://github.com/horlapookie/Eclipse-MD"
  },

  repo_web: {
    text: "🌐 *Web Dashboard*\n\n🔗 Dashboard: https://eclipse-md-deploy.onrender.com\n📊 Monitor your bot's performance\n⚙️ Configure settings remotely",
    url: "https://eclipse-md-deploy.onrender.com"
  },

  creator_contact: {
    text: "👨‍💻 *Creator Contact*\n\n📱 WhatsApp: +2349122222622\n🐙 GitHub: @horlapookie\n💬 Telegram: @horlapookie\n📧 Email: horlapookie@gmail.com",
    contact: {
      phone: "+2349122222622",
      name: "Eclipse MD - Bot Creator"
    }
  },

  status_bot: {
    text: "📊 *Bot Status*\n\n✅ Online and Active\n🔄 Auto-updates enabled\n🛡️ Security features active\n📱 WhatsApp API connected"
  },

  help_support: {
    text: "🆘 *Support & Help*\n\n📚 Use ?menu to see all commands\n💬 Join our support group\n🔧 Report issues on GitHub\n📖 Read documentation"
  },

  contact_support: {
    text: "🌐 *Contact Support*\n\n📞 Support Website: www.eclipse-support.zone.id\n💬 Telegram: t.me/horlapookie\n📱 WhatsApp Channel: https://whatsapp.com/channel/0029VaIiMsqJf05e4Y4b9u0z\n🔗 Get help and support now!",
    url: "http://www.eclipse-support.zone.id"
  }
};
  
