import { Router, type IRouter } from "express";
import { appRouter } from "../trpc/router.js";

/**
 * Serves API documentation at /api/docs.
 * Generates an OpenAPI-style JSON from the tRPC router procedures and
 * renders a simple HTML explorer UI.
 */
export const apiDocsRouter: IRouter = Router();

interface ProcedureInfo {
  path: string;
  type: "query" | "mutation" | "subscription";
}

/** Walk the tRPC router to extract procedure paths and types. */
function extractProcedures(routerDef: Record<string, unknown>, prefix = ""): ProcedureInfo[] {
  const procedures: ProcedureInfo[] = [];

  for (const [key, value] of Object.entries(routerDef)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const val = value as Record<string, unknown>;

    if (val["_def"] && typeof val["_def"] === "object") {
      const def = val["_def"] as Record<string, unknown>;
      if (def["query"]) {
        procedures.push({ path, type: "query" });
      } else if (def["mutation"]) {
        procedures.push({ path, type: "mutation" });
      } else if (def["subscription"]) {
        procedures.push({ path, type: "subscription" });
      } else if (def["procedures"]) {
        procedures.push(...extractProcedures(def["procedures"] as Record<string, unknown>, path));
      }
    }
  }

  return procedures;
}

/** Build a simplified OpenAPI-compatible JSON document. */
function buildOpenApiDoc(): Record<string, unknown> {
  const routerDef = (appRouter as unknown as Record<string, unknown>)["_def"] as Record<
    string,
    unknown
  >;
  const procedures = extractProcedures(
    (routerDef["procedures"] ?? routerDef["record"] ?? {}) as Record<string, unknown>,
  );

  const paths: Record<string, unknown> = {};

  for (const proc of procedures) {
    const method = proc.type === "query" ? "get" : "post";
    paths[`/api/trpc/${proc.path}`] = {
      [method]: {
        summary: proc.path,
        tags: [proc.path.split(".")[0] ?? "default"],
        operationId: proc.path,
        parameters:
          proc.type === "query"
            ? [
                {
                  name: "input",
                  in: "query",
                  required: false,
                  schema: { type: "string", description: "JSON-encoded input" },
                },
              ]
            : undefined,
        requestBody:
          proc.type === "mutation"
            ? {
                content: {
                  "application/json": {
                    schema: { type: "object", description: "Procedure input" },
                  },
                },
              }
            : undefined,
        responses: {
          "200": { description: "Successful response" },
          "400": { description: "Bad request" },
          "401": { description: "Unauthorized" },
          "429": { description: "Rate limited" },
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Dialectical Engine API",
      version: "0.1.0",
      description: "tRPC API for the Dialectical Engine structured debate platform",
    },
    servers: [
      {
        url: process.env["BACKEND_URL"] ?? "http://localhost:4000",
        description: "Backend server",
      },
    ],
    paths,
  };
}

/** OpenAPI JSON endpoint. */
apiDocsRouter.get("/api/docs/openapi.json", (_req, res) => {
  res.json(buildOpenApiDoc());
});

/** HTML API explorer. */
apiDocsRouter.get("/api/docs", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dialectical Engine API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; }
    .procedure { border: 1px solid #334155; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem; }
    .badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
    .query { background: #1e40af; color: #93c5fd; }
    .mutation { background: #166534; color: #86efac; }
    .path { font-family: monospace; font-size: 0.9rem; }
    .tag { color: #94a3b8; font-size: 0.75rem; }
    a { color: #60a5fa; }
  </style>
</head>
<body>
  <h1>Dialectical Engine API</h1>
  <p class="subtitle">tRPC procedures — <a href="/api/docs/openapi.json">OpenAPI JSON</a></p>
  <div id="procedures"></div>
  <script>
    fetch('/api/docs/openapi.json')
      .then(r => r.json())
      .then(doc => {
        const container = document.getElementById('procedures');
        for (const [path, methods] of Object.entries(doc.paths)) {
          for (const [method, info] of Object.entries(methods)) {
            const div = document.createElement('div');
            div.className = 'procedure';
            const type = method === 'get' ? 'query' : 'mutation';
            div.innerHTML = '<span class="badge ' + type + '">' + type + '</span>' +
              '<span class="path">' + info.summary + '</span>' +
              '<span class="tag">' + (info.tags?.[0] || '') + '</span>';
            container.appendChild(div);
          }
        }
      });
  </script>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});
