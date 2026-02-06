const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// Dummy server for Render
http.createServer((req, res) => { res.writeHead(200); res.end("PP Pairing Mode"); }).listen(process.env.PORT || 3000);

async function startPP() {
    const { state, saveCreds } = await useMultiFileAuthState('pp_auth');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        await delay(5000); // Give it a few seconds to boot
        const code = await sock.requestPairingCode("237693417826");
        console.log(`\n\n==============================\nYOUR PAIRING CODE: ${code}\n==============================\n\n`);
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => { if (u.connection === 'close') startPP(); });
}
startPP();
