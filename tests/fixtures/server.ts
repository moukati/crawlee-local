import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "site");
let server: ReturnType<typeof createServer> | null = null;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
};

export async function startFixtureServer(port = 0): Promise<{ port: number; baseUrl: string; close: () => Promise<void> }> {
  server = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://fixture.local").pathname;
    if (pathname === "/slow") {
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Slow page</h1><p>Loaded after delay.</p></body></html>");
      }, 1500);
      return;
    }

    const filePath = join(root, pathname === "/" ? "index.html" : pathname.replace(/^\//, ""));
    if (!existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
      return;
    }

    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(readFileSync(filePath));
  });

  await new Promise<void>((resolve) => server!.listen(port, "127.0.0.1", resolve));
  const address = server!.address();
  if (!address || typeof address === "string") throw new Error("Failed to bind fixture server");
  const boundPort = address.port;
  return {
    port: boundPort,
    baseUrl: `http://127.0.0.1:${boundPort}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server?.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("server.ts")) {
  const port = Number(process.env.FIXTURE_PORT ?? 4173);
  startFixtureServer(port).then(({ baseUrl }) => {
    console.log(`Fixture server running at ${baseUrl}`);
  });
}
