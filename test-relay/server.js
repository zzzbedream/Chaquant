import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// Obtener la IP local de red (Priorizando Wi-Fi / WLAN real)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    // Evitar adaptadores virtuales WSL / Hyper-V
    if (/vEthernet|WSL|virtual|loopback/i.test(name)) continue;
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (/wi-?fi|wlan/i.test(name) || iface.address.startsWith('192.168.')) {
          return iface.address; // Mejor coincidencia
        }
        candidates.push(iface.address);
      }
    }
  }
  return candidates[0] || 'localhost';
}

const LAN_IP = getLocalIpAddress();
const LOCAL_URL = process.env.RENDER_EXTERNAL_URL || `http://${LAN_IP}:${PORT}`;

// Servidor de Archivos Estáticos y Endpoints de API
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  // Endpoint de Código QR Estándar ISO/IEC 18004 con Nivel H (30% Tolerancia a Reflejos y Daños)
  if (req.url.startsWith('/api/qr')) {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      const text = parsedUrl.searchParams.get('text') || LOCAL_URL;
      const pngBuffer = await QRCode.toBuffer(text, {
        errorCorrectionLevel: 'H', // Nivel H: 30% de redundancia Reed-Solomon (máxima legibilidad)
        margin: 4,               // Margen ISO Quiet Zone de 4 módulos
        scale: 10,              // Alta resolución nítida
        color: {
          dark: '#000000',      // Negro puro de alto contraste
          light: '#FFFFFF',     // Blanco puro sin tintes
        },
      });
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(pngBuffer);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Error generating QR: ' + err.message);
    }
  }

  // Endpoint de Salas Ejecutivas (Channels)
  if (req.url === '/api/channels') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    const list = Array.from(channels.values()).map(r => ({
      id: r.id,
      title: r.title,
      maxMembers: r.maxMembers,
      currentMembers: r.allowedMembers.length,
      connectedCount: r.sockets ? r.sockets.size : 0,
      status: r.status,
      expiresAt: r.expiresAt,
      messageCount: r.messages.length,
      documentCount: r.documents.length,
    }));
    return res.end(JSON.stringify(list));
  }

  // Endpoint de Historial Cifrado de una Sala Específica
  if (req.url.startsWith('/api/channels/')) {
    const roomId = req.url.split('/')[3]?.split('?')[0];
    const room = channels.get(roomId);
    if (!room) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Channel not found' }));
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({
      id: room.id,
      title: room.title,
      status: room.status,
      allowedMembers: room.allowedMembers,
      messages: room.messages,
      documents: room.documents,
      expiresAt: room.expiresAt,
    }));
  }

  // Endpoint de Información del Servidor y Sesión Activa
  if (req.url === '/api/info') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({
      publicUrl: LOCAL_URL,
      lanIp: LAN_IP,
      port: PORT,
      contract: '0x27f1c99a8b947c61e892d1b0987f65a4e32d109b',
      activeSessions: Array.from(sessions.keys()),
    }));
  }

  // Endpoint para detectar automáticamente la última sesión creada en la red local
  if (req.url === '/api/latest-session') {
    const activeKeys = Array.from(sessions.keys());
    const latest = activeKeys.length > 0 ? activeKeys[activeKeys.length - 1] : null;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({
      sessionId: latest,
      code: latest ? latest.replace('chq_', '') : null,
    }));
  }

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(__dirname, 'public', reqPath);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found - Chaquant Mobile Relay');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    }
  });
});

// Servidor WebSocket Zero-Knowledge para retransmisión de sobres cifrados
const wss = new WebSocketServer({ server, path: '/ws' });

// Almacenamiento de sesiones efímeras: sessionId -> Set de sockets
const sessions = new Map();

// Almacenamiento de Salas Ejecutivas Persistentes (Executive Channels)
const channels = new Map();

// Semilla inicial: Sala Corporativa M&A de Demostración para Ejecutivos
channels.set('chan_araucaria', {
  id: 'chan_araucaria',
  title: 'Operación Araucaria • M&A Serie B ($14.5M USD)',
  maxMembers: 10,
  createdAt: Date.now() - 2 * 24 * 3600 * 1000, // Iniciada hace 2 días
  expiresAt: Date.now() + 5 * 24 * 3600 * 1000,  // Restan 5 días de negociación
  allowedMembers: [
    { id: 'usr_ceo', name: 'Rodrigo M. (CEO)', role: 'Comprador Principal', keyHash: '0x3f9a91c0e488b1' },
    { id: 'usr_legal_lead', name: 'Dra. Patricia S.', role: 'Abogada Líder M&A', keyHash: '0x7e21a8b904c9' },
    { id: 'usr_cfo', name: 'Matías V. (CFO)', role: 'Auditor Financiero', keyHash: '0x11d87f6590fe' },
    { id: 'usr_target_ceo', name: 'Elena B.', role: 'CEO Empresa Adquirida', keyHash: '0x55ca8b33a2' },
    { id: 'usr_external_counsel', name: 'Estudio Carey & Cía', role: 'Consejo Legal Externo', keyHash: '0x88f4c012e0' },
  ],
  messages: [
    {
      id: 'msg_init',
      senderKeyId: '0x3f9a91c0e488b1',
      senderName: 'Rodrigo M. (CEO)',
      senderRole: 'Comprador Principal',
      text: 'Estimado directorio y equipo legal: damos inicio formal a la diligencia debida del Proyecto Araucaria bajo canal soberano Chaquant.',
      packetType: 'TEXT',
      timestamp: Date.now() - 48 * 3600 * 1000,
    },
    {
      id: 'msg_legal',
      senderKeyId: '0x7e21a8b904c9',
      senderName: 'Dra. Patricia S.',
      senderRole: 'Abogada Líder M&A',
      text: 'Adjunto el borrador definitivo del Acuerdo Bilateral de Compraventa y el Pacto de Accionistas. Las cláusulas de confidencialidad están selladas con hash SHA-256 inmutable.',
      packetType: 'TEXT',
      timestamp: Date.now() - 24 * 3600 * 1000,
    }
  ],
  documents: [
    {
      id: 'doc_1',
      filename: 'Acuerdo_Bilateral_Compraventa_v3.pdf',
      filesize: '2.4 MB',
      sha256: '9f8e4a7b1c3d5e2f8a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f',
      uploaderName: 'Dra. Patricia S. (Abogada Líder)',
      timestamp: Date.now() - 24 * 3600 * 1000,
      classification: 'ESTRICTAMENTE CONFIDENCIAL • M&A',
    },
    {
      id: 'doc_2',
      filename: 'Auditoria_Financiera_EBITDA_Q3.pdf',
      filesize: '5.1 MB',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uploaderName: 'Matías V. (CFO)',
      timestamp: Date.now() - 12 * 3600 * 1000,
      classification: 'SECRETO CORPORATIVO',
    }
  ],
  sockets: new Set(),
  status: 'ACTIVE',
});

wss.on('connection', (ws) => {
  let currentSessionId = null;
  let currentchannelId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        // --- 1. MODO PAIRWISE (MÓVIL DIRECTO 1-A-1) ---
        case 'REGISTER_SESSION': {
          currentSessionId = message.sessionId;
          if (!sessions.has(currentSessionId)) {
            sessions.set(currentSessionId, new Set());
          }
          sessions.get(currentSessionId).add(ws);

          console.log(`[Relay ZK] Dispositivo conectado a sesión 1-a-1: ${currentSessionId.substring(0, 12)}... (Total: ${sessions.get(currentSessionId).size})`);

          const peers = sessions.get(currentSessionId);
          for (const peer of peers) {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'SESSION_PEER_COUNT',
                count: peers.size,
                sessionId: currentSessionId,
              }));
            }
          }
          break;
        }

        case 'RELAY_ENCRYPTED_PACKET': {
          if (!currentSessionId || !sessions.has(currentSessionId)) return;
          const peers = sessions.get(currentSessionId);
          for (const peer of peers) {
            if (peer !== ws && peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'INCOMING_ENCRYPTED_PACKET',
                senderEphemeralId: message.senderEphemeralId,
                packetLength: message.ciphertext ? message.ciphertext.length : 0,
                ciphertext: message.ciphertext,
                iv: message.iv,
                aad: message.aad,
                timestamp: Date.now(),
              }));
            }
          }
          break;
        }

        case 'REVOKE_SESSION': {
          if (!currentSessionId || !sessions.has(currentSessionId)) return;
          console.log(`[Relay ZK] ¡ALERTA! Sesión 1-a-1 revocada con nulificador Aztec: ${message.nullifierHash?.substring(0, 16)}...`);
          const peers = sessions.get(currentSessionId);
          for (const peer of peers) {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'SESSION_REVOKED_ON_CHAIN',
                nullifierHash: message.nullifierHash,
                contract: '0x27f1c99a8b947c61e892d1b0987f65a4e32d109b',
              }));
            }
          }
          sessions.delete(currentSessionId);
          break;
        }

        // --- 2. MODO EXECUTIVE CHANNEL (GRUPOS, DOCUMENTOS M&A Y AUDITORÍA) ---
        case 'JOIN_CHANNEL': {
          currentchannelId = message.roomId || 'chan_araucaria';
          let room = channels.get(currentchannelId);
          if (!room) {
            // Crear nueva sala si no existe
            room = {
              id: currentchannelId,
              title: message.title || 'Nueva Sala de Negociación Ejecutiva',
              maxMembers: message.maxMembers || 10,
              createdAt: Date.now(),
              expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
              allowedMembers: message.allowedMembers || [
                { id: 'usr_me', name: message.senderName || 'Ejecutivo Activo', role: 'Abogado / CEO', keyHash: message.keyHash || '0x3f9a91c0e4' }
              ],
              messages: [],
              documents: [],
              sockets: new Set(),
              status: 'ACTIVE',
            };
            channels.set(currentchannelId, room);
          }

          room.sockets.add(ws);
          console.log(`[Channel ZK] Ejecutivo conectado a sala ${currentchannelId}. Conectados: ${room.sockets.size}/${room.allowedMembers.length}`);

          // Enviar sincronización completa al cliente
          ws.send(JSON.stringify({
            type: 'CHANNEL_SYNC',
            room: {
              id: room.id,
              title: room.title,
              status: room.status,
              maxMembers: room.maxMembers,
              allowedMembers: room.allowedMembers,
              messages: room.messages,
              documents: room.documents,
              expiresAt: room.expiresAt,
            },
            connectedCount: room.sockets.size,
          }));

          // Notificar a todos en la sala del nuevo participante
          for (const peer of room.sockets) {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'CHANNEL_MEMBERS_UPDATE',
                connectedCount: room.sockets.size,
                allowedMembers: room.allowedMembers,
              }));
            }
          }
          break;
        }

        case 'CHANNEL_SEND_MESSAGE': {
          if (!currentchannelId || !channels.has(currentchannelId)) return;
          const room = channels.get(currentchannelId);

          const newMsg = {
            id: 'msg_' + Math.random().toString(36).substring(2, 9),
            senderKeyId: message.senderKeyId,
            senderName: message.senderName || 'Ejecutivo',
            senderRole: message.senderRole || 'Miembro',
            text: message.text,
            packetType: message.packetType || 'TEXT',
            timestamp: Date.now(),
          };

          room.messages.push(newMsg);

          // Retransmitir a todos los miembros de la sala
          for (const peer of room.sockets) {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'CHANNEL_NEW_MESSAGE',
                message: newMsg,
              }));
            }
          }
          break;
        }

        case 'CHANNEL_SEND_DOCUMENT': {
          if (!currentchannelId || !channels.has(currentchannelId)) return;
          const room = channels.get(currentchannelId);

          const newDoc = {
            id: 'doc_' + Math.random().toString(36).substring(2, 9),
            filename: message.filename,
            filesize: message.filesize,
            sha256: message.sha256,
            uploaderName: message.uploaderName,
            classification: message.classification || 'ESTRICTAMENTE CONFIDENCIAL',
            timestamp: Date.now(),
          };

          room.documents.push(newDoc);

          // Retransmitir a todos los miembros
          for (const peer of room.sockets) {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'CHANNEL_NEW_DOCUMENT',
                document: newDoc,
              }));
            }
          }
          break;
        }

        // SIMULACIÓN DE INTRUSO (DEMO AUDITORÍA CISO / VENTURE CAPITAL)
        case 'CHANNEL_SIMULATE_INTRUSION': {
          if (!currentchannelId || !channels.has(currentchannelId)) return;
          const room = channels.get(currentchannelId);
          console.warn(`[Channel ZK] 🚨 SIMULACIÓN: Infiltración no autorizada detectada en sala ${currentchannelId}`);

          for (const peer of room.sockets) {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'INTRUSION_ALERT',
                suspiciousKey: '0xDEAD8F01C9A4B2',
                originIp: '198.51.100.44 (Desconocido)',
                message: 'Dispositivo no autorizado intentó inyectar paquete en el canal.',
                action: 'CANAL_CONGELADO_ZERO_TRUST',
                timestamp: Date.now(),
              }));
            }
          }
          break;
        }

        // SELLAR ACUERDO EN AZTEC L2
        case 'CHANNEL_SEAL_AGREEMENT': {
          if (!currentchannelId || !channels.has(currentchannelId)) return;
          const room = channels.get(currentchannelId);
          room.status = 'SEALED';
          const sealNullifier = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

          for (const peer of room.sockets) {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'CHANNEL_SEALED',
                contract: '0x27f1c99a8b947c61e892d1b0987f65a4e32d109b',
                sealNullifier,
                timestamp: Date.now(),
              }));
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('[Relay ZK] Error procesando mensaje:', e);
    }
  });

  ws.on('close', () => {
    if (currentSessionId && sessions.has(currentSessionId)) {
      sessions.get(currentSessionId).delete(ws);
      if (sessions.get(currentSessionId).size === 0) {
        sessions.delete(currentSessionId);
      }
    }
    if (currentchannelId && channels.has(currentchannelId)) {
      const room = channels.get(currentchannelId);
      room.sockets.delete(ws);
      for (const peer of room.sockets) {
        if (peer.readyState === WebSocket.OPEN) {
          peer.send(JSON.stringify({
            type: 'CHANNEL_MEMBERS_UPDATE',
            connectedCount: room.sockets.size,
            allowedMembers: room.allowedMembers,
          }));
        }
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n================================================================');
  console.log('       CHAQUANT PROTOCOL • SERVIDOR DE PRUEBA MÓVIL (WA TEST)  ');
  console.log('================================================================');
  console.log(`• Interfaz Web Móvil:  ${LOCAL_URL}`);
  console.log(`• WebSocket Relay ZK:  ws://${LAN_IP}:${PORT}/ws`);
  console.log(`• Contrato Aztec L2:   0x27f1c99a8b947c61e892d1b0987f65a4e32d109b`);
  console.log('----------------------------------------------------------------');
  console.log('ESCANEÉ ESTE CÓDIGO QR CON LA CÁMARA DE CADA TELÉFONO PARA ABRIR LA APP:');
  console.log('');
  
  try {
    qrcodeTerminal.generate(LOCAL_URL, { small: true });
  } catch (e) {
    console.log(`(Abre manualmente en el navegador del teléfono: ${LOCAL_URL})`);
  }

  console.log('----------------------------------------------------------------');
  console.log('Instrucciones para la prueba:');
  console.log('1. Abre la URL en el Teléfono A y presiona "Crear Nueva Sesión".');
  console.log('2. Abre la URL en el Teléfono B y presiona "Escanear / Unirse".');
  console.log('3. ¡Envía mensajes en tiempo real con cifrado E2EE y padding Sphinx!');
  console.log('================================================================\n');
});
