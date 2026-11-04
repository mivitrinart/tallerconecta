/**
 * Proxy HTTPS local para pruebas E2E.
 *
 * Taller Conecta usa cookies __Host-* con el atributo Secure (como en
 * producción sobre Cloudflare HTTPS). En desarrollo local corremos Next.js
 * sobre HTTP (puerto 3000); este proxy termina HTTPS (puerto 3443) con un
 * certificado autofirmado para que las cookies Secure viajen como en
 * producción, sin modificar el código de la aplicación.
 *
 * Uso: node scripts/local-https-proxy.js   (requiere que `next dev` ya esté
 * corriendo en el puerto 3000)
 */
const http = require("http");
const https = require("https");
const { generate } = require("selfsigned");

const TARGET = "http://localhost:3000";
const PORT = 3443;

(async () => {
  const pems = await generate(
    [{ name: "commonName", value: "localhost" }],
    { days: 365, keySize: 2048 },
  );

  const server = https.createServer(
    { key: pems.private, cert: pems.cert },
    (req, res) => {
      const options = {
        hostname: "localhost",
        port: 3000,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: "localhost:3000" },
        rejectUnauthorized: false,
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on("error", (e) => {
        res.writeHead(502, { "content-type": "text/plain" });
        res.end("proxy error: " + e.message);
      });

      if (req.method !== "GET" && req.method !== "HEAD") {
        req.pipe(proxyReq, { end: true });
      } else {
        proxyReq.end();
      }
    },
  );

  server.listen(PORT, () => {
    console.log(`[local-https-proxy] escuchando en https://localhost:${PORT} -> ${TARGET}`);
  });

  server.on("error", (e) => {
    console.error("[local-https-proxy] error:", e.message);
    process.exit(1);
  });
})();
