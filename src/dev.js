const http = require("node:http");
const { CONFIG_FILE_NAME } = require("./init");
const { loadConfig, validateConfig } = require("./config");
const { renderHtml } = require("./build");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parsePort(args, env = process.env) {
  let portValue;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--port" || arg === "-p") {
      const nextValue = args[index + 1];
      if (nextValue === undefined) {
        throw new Error("missing value for --port");
      }

      portValue = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  const rawPort = portValue ?? env.PORT ?? "3000";

  if (!/^\d+$/.test(rawPort)) {
    throw new Error("port must be an integer between 0 and 65535");
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("port must be an integer between 0 and 65535");
  }

  return port;
}

async function readPreviewState(cwd) {
  let loadedConfig;

  try {
    loadedConfig = await loadConfig(cwd);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        ok: false,
        statusCode: 404,
        title: `${CONFIG_FILE_NAME} was not found`,
        messages: ["Run `opentree init` first to create a starter config."]
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        statusCode: 500,
        title: `${CONFIG_FILE_NAME} is not valid JSON`,
        messages: [error.message]
      };
    }

    throw error;
  }

  const errors = validateConfig(loadedConfig.config);
  if (errors.length > 0) {
    return {
      ok: false,
      statusCode: 500,
      title: `${CONFIG_FILE_NAME} has validation issues`,
      messages: errors
    };
  }

  return {
    ok: true,
    statusCode: 200,
    html: renderHtml(loadedConfig.config)
  };
}

function renderProblemPage(title, messages) {
  const list = messages
    .map((message) => `<li>${escapeHtml(message)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        background: #fff7ed;
        color: #7c2d12;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      main {
        width: min(100%, 720px);
        background: white;
        border: 1px solid #fdba74;
        border-radius: 24px;
        box-shadow: 0 20px 40px rgba(124, 45, 18, 0.12);
        padding: 28px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 2rem;
        line-height: 1.05;
      }

      p {
        margin: 0 0 18px;
        line-height: 1.6;
      }

      ul {
        margin: 0;
        padding-left: 20px;
        line-height: 1.7;
      }

      code {
        font-family: "SFMono-Regular", "Consolas", monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>The preview server is running, but the current config cannot be rendered.</p>
      <ul>${list}</ul>
    </main>
  </body>
</html>
`;
}

async function handleRequest(req, res, cwd) {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

  if (req.method !== "GET" || url.pathname !== "/") {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const state = await readPreviewState(cwd);

  if (!state.ok) {
    res.writeHead(state.statusCode, { "content-type": "text/html; charset=utf-8" });
    res.end(renderProblemPage(state.title, state.messages));
    return;
  }

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(state.html);
}

async function runDev(io, args = []) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;

  let port;
  try {
    port = parsePort(args, io.env ?? process.env);
  } catch (error) {
    stderr.write(`[opentree] ${error.message}\n`);
    return 1;
  }

  const initialState = await readPreviewState(cwd);
  if (!initialState.ok) {
    stderr.write(`[opentree] cannot start dev server\n`);
    stderr.write(`[opentree] ${initialState.title}\n`);
    initialState.messages.forEach((message) => {
      stderr.write(`- ${message}\n`);
    });
    return 1;
  }

  return await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handleRequest(req, res, cwd).catch((error) => {
        stderr.write("[opentree] failed to render preview\n");
        stderr.write(`${error.stack ?? error}\n`);
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("Internal Server Error");
      });
    });

    const onSignal = () => {
      stdout.write("\n[opentree] stopping dev server\n");
      server.close(() => {
        process.off("SIGINT", onSignal);
        process.off("SIGTERM", onSignal);
        resolve(0);
      });
    };

    server.on("error", (error) => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);

      if (error && error.code === "EADDRINUSE") {
        stderr.write(`[opentree] port ${port} is already in use\n`);
        resolve(1);
        return;
      }

      reject(error);
    });

    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const activePort =
        address && typeof address === "object" ? address.port : port;

      stdout.write(`[opentree] dev server running at http://127.0.0.1:${activePort}\n`);
      stdout.write(`[opentree] reload the page after editing ${CONFIG_FILE_NAME}\n`);

      process.on("SIGINT", onSignal);
      process.on("SIGTERM", onSignal);
    });
  });
}

module.exports = {
  handleRequest,
  parsePort,
  readPreviewState,
  runDev
};
