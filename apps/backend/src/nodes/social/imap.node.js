import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const host = config.host || input?.host;
    const user = config.user || config.email || input?.user;
    const password = config.password || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "IMAP"));
    if (!host || !user || !password) return { success: false, error: "imap: 'host', 'user', and 'password' are required.", skipped: true };

    let Imap;
    try { Imap = (await import("imap")).default; } catch { throw new Error("imap: 'imap' package not installed. Run: npm install imap"); }

    return new Promise((resolve, reject) => {
      const client = new Imap({ user, password, host, port: parseInt(config.port || 993), tls: config.tls !== false, tlsOptions: { rejectUnauthorized: false } });
      const messages = [];

      client.once("ready", () => {
        client.openBox(config.mailbox || "INBOX", true, (err) => {
          if (err) { client.end(); return reject(new Error(`imap: ${err.message}`)); }
          const criteria = config.unseen ? ["UNSEEN"] : ["ALL"];
          client.search(criteria, (err2, results) => {
            if (err2) { client.end(); return reject(new Error(`imap: ${err2.message}`)); }
            const ids = results.slice(-parseInt(config.limit || 10));
            if (!ids.length) { client.end(); return resolve({ messages: [], count: 0 }); }
            const f = client.fetch(ids, { bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"], struct: true });
            f.on("message", (msg) => {
              const mail = {};
              msg.on("body", (stream, info) => {
                let buf = "";
                stream.on("data", (chunk) => buf += chunk.toString());
                stream.once("end", () => {
                  if (info.which.includes("HEADER")) {
                    const lines = buf.split("\r\n");
                    for (const line of lines) {
                      if (line.startsWith("From:")) mail.from = line.slice(5).trim();
                      else if (line.startsWith("To:")) mail.to = line.slice(3).trim();
                      else if (line.startsWith("Subject:")) mail.subject = line.slice(8).trim();
                      else if (line.startsWith("Date:")) mail.date = line.slice(5).trim();
                    }
                  } else { mail.body = buf.substring(0, 2000); }
                });
              });
              msg.once("end", () => messages.push(mail));
            });
            f.once("end", () => { client.end(); resolve({ messages, count: messages.length }); });
          });
        });
      });
      client.once("error", (err) => reject(new Error(`imap: ${err.message}`)));
      client.connect();
    });
  },
};
