import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, normalize, resolve, sep } from "node:path";

const port = Number(process.env.PORT || 8080);
const publicDir = resolve("public");
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname === "/admin" ? "/admin.html" : pathname;
  const file = resolve(publicDir, `.${normalize(requested)}`);

  if (file !== publicDir && !file.startsWith(publicDir + sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const content = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`JM Fix disponible en http://localhost:${port}`);
});
