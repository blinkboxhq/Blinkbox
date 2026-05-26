import axios from "axios";

export default {
  async run(config, input) {
    const body = input?.body ?? input;

    let attachments = [];
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (rawAttachments.length > 0) {
      const results = await Promise.allSettled(
        rawAttachments.slice(0, 5).map(async (a) => {
          const { data: buf } = await axios.get(a.url, { responseType: "arraybuffer", timeout: 20000 });
          const mimeType = a.content_type || "application/octet-stream";
          return { dataUrl: `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType, name: a.filename || "file" };
        })
      );
      attachments = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    }

    return {
      content:   body.content ?? "",
      author:    body.author  ?? {},
      username:  body.author?.username ?? "",
      userId:    body.author?.id       ?? "",
      channelId: body.channel_id ?? "",
      guildId:   body.guild_id   ?? "",
      messageId: body.id         ?? "",
      hasMedia:  attachments.length > 0,
      attachments,
      embeds:    body.embeds ?? [],
      message:   body,
    };
  },
};
