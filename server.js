const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV === 'development';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: '/socket.io' });

  io.use(async (socket, authorize) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;

      // Tanpa token → boleh masuk, tapi hanya room publik (payload tanpa data petugas).
      if (!token) {
        socket.join('public');
        return authorize();
      }

      const { jwtVerify } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
      await jwtVerify(token, secret);
      socket.join('library');
      authorize();
    } catch {
      authorize(new Error('Unauthorized'));
    }
  });

  // Dibagikan ke route handler lewat globalThis (satu proses dengan Next custom server)
  globalThis.io = io;

  httpServer.listen(port, hostname, () => {
    console.log(`> Perpus siap di http://${hostname}:${port} (${dev ? 'dev' : 'production'})`);
  });
});
