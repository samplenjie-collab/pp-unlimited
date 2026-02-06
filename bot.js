const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const http = require('http');

// Dummy server to satisfy Render's port requirement
http.createServer((req, res) => { res.writeHead(200); res.end("PP is Alive"); }).listen(process.env.PORT || 3000);

const OPENROUTER_KEY = "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";

async function askGemini(text, imageBase64 = null) {
    try {
        const payload = {
            model: "google/gemini-2.0-flash-001",
            messages: [{ 
                role: "system", 
                content: "You are PP, an alpha male. Samuel (DR PP) is your father. PERSONALITY: Blunt, witty, and a rude son of a bitch if insulted. RULES: 1. No assistant talk. 2. Short, rude UK English. 3. Aggressive Cameroon Pidgin ONLY if insulted. 4. Respect only Samuel. 5. Ignore voice notes. 6. Describe images like a man." 
            }]
        };
        if (imageBase64) {
            payload.messages.push({ role: "user", content: [{ type: "text", text: text || "Check this." }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] });
        } else {
            payload.messages.push({ role: "user", content: text });
        }
        const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", payload, { headers: { "Authorization": `Bearer ${OPENROUTER_KEY}` } });
        return res.data.choices[0].message.content;
    } catch (e) { return "Busy."; }
}

async function startPP() {
    const { state, saveCreds } = await useMultiFileAuthState('pp_auth');
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ["PP-Alpha", "Chrome", "1.0"] });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => { if (u.connection === 'close') startPP(); });
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe || m.message.audioMessage) return;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "";
        let imageBase64 = null;
        if (m.message.imageMessage) {
            const buffer = await downloadMediaMessage(m, 'buffer');
            imageBase64 = buffer.toString('base64');
        }
        const reply = await askGemini(text, imageBase64);
        await sock.sendMessage(m.key.remoteJid, { text: reply });
    });
}
startPP();
