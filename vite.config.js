import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import http from "http";

/**
 * Plugin que cria uma ponte/servidor proxy reverso na porta 2515 (Mobile)
 * permitindo que ambas as portas 5173 (Desktop) e 2515 (Mobile)
 * fiquem disponíveis simultaneamente no mesmo comando dev e na rede local (192.168.40.67).
 */
function mobileBridgePlugin(mobilePort = 2515) {
  return {
    name: "mobile-port-bridge",
    configureServer(server) {
      const bridge = http.createServer((req, res) => {
        const targetPort = server.httpServer?.address()?.port || 5173;

        const options = {
          hostname: "127.0.0.1",
          port: targetPort,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: `127.0.0.1:${targetPort}`,
            "x-forwarded-for": req.socket.remoteAddress,
            "x-forwarded-port": String(mobilePort),
            "x-forwarded-proto": "http",
          },
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on("error", (err) => {
          try {
            server.middlewares(req, res);
          } catch (e) {
            res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
            res.end(`[JSA Mobile Bridge] Aguardando servidor Vite: ${err.message}`);
          }
        });

        req.pipe(proxyReq, { end: true });
      });

      bridge.on("upgrade", (req, socket, head) => {
        const targetPort = server.httpServer?.address()?.port || 5173;

        const proxySocketReq = http.request({
          hostname: "127.0.0.1",
          port: targetPort,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: `127.0.0.1:${targetPort}`,
          },
        });

        proxySocketReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
          socket.write(
            `HTTP/1.1 101 Switching Protocols\r\n` +
            Object.entries(proxyRes.headers)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\r\n") +
            `\r\n\r\n`
          );
          if (proxyHead && proxyHead.length) {
            socket.write(proxyHead);
          }
          proxySocket.pipe(socket);
          socket.pipe(proxySocket);
        });

        proxySocketReq.on("error", () => {
          socket.destroy();
        });

        proxySocketReq.end();
      });

      bridge.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.warn(`⚠️ [JSA Mobile Bridge] Porta ${mobilePort} já está em uso.`);
        } else {
          console.warn(`⚠️ [JSA Mobile Bridge] Aviso na porta ${mobilePort}:`, err.message);
        }
      });

      bridge.listen(mobilePort, "0.0.0.0", () => {
        console.log(`\n  📱 [JSA Mobile] Porta 2515 ativa em: http://192.168.40.67:${mobilePort}/\n`);
      });

      server.httpServer?.on("close", () => {
        try {
          bridge.close();
        } catch (e) {}
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mobileBridgePlugin(2515)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0", // acessível via LAN (192.168.40.67) e localhost
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});