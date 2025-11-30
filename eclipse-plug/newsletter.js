export default {
  name: 'newsletter',
  description: 'Check WhatsApp channel information and metadata',
  category: 'Channel',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return await sock.sendMessage(from, {
        text: "⚠️ Please enter at least 1 channel link!"
      }, { quoted: msg });
    }

    const processMsg = await sock.sendMessage(from, {
      text: "Checking channel..."
    });

    const links = text.split(/\s+/).slice(0, 10);
    let captionArr = [];

    for (let link of links) {
      if (!link.includes("https://whatsapp.com/channel/")) {
        captionArr.push(`[  !  ] Invalid link: ${link}`);
        continue;
      }

      let idPart = link.split('https://whatsapp.com/channel/')[1];

      try {
        let res = await sock.newsletterMetadata("invite", idPart);
        
        // Extract state properly if it's an object
        let stateText = "–";
        if (res.state) {
          if (typeof res.state === 'object') {
            stateText = res.state.type || JSON.stringify(res.state);
          } else {
            stateText = res.state;
          }
        }

        // Get actual subscriber count
        const subscriberCount = res.subscribers || res.subscriber_count || 0;
        
        captionArr.push(
          `*${res.name || res.thread_metadata?.name?.text || "No Name"}*\n` +
          `* Channel ID: ${res.id}\n` +
          `* Followers: ${subscriberCount}\n` +
          `* Verification: ${res.verification || res.verified || "–"}\n` +
          `* State: ${stateText}\n` +
          `* Description: ${res.description || res.thread_metadata?.description?.text || "No description"}`
        );

      } catch (err) {
        console.error("❌ Error checking channel ID:", err);
        captionArr.push(`[  x  ] Failed to check channel: ${link}`);
      }
    }

    const caption = captionArr.join("\n\n") || "[  x  ] No valid channels to check.";

    await sock.sendMessage(
      from,
      {
        text: caption,
        edit: processMsg.key
      }
    );
  }
};
