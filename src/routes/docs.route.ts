// src/routes/docs.route.ts
import { Hono } from "hono";
import { openapiSpec } from "../../openapispec";
import type { Env } from "../db";

const docsRoute = new Hono<{ Bindings: Env }>();

docsRoute.get("/openapi.json", (c) => {
  return c.json(openapiSpec);
});

docsRoute.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation - Attendance Management System</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
        <style>
          body {
            margin: 0;
            padding: 0;
          }
          .swagger-ui .topbar {
            background-color: #1a1a1a;
          }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: "docs/openapi.json",
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              layout: "BaseLayout",
              deepLinking: true,
              showExtensions: true,
              showCommonExtensions: true,
              docExpansion: 'list',
              filter: true,
              syntaxHighlight: {
                activated: true,
                theme: "agate"
              }
            });
          };
        </script>
      </body>
    </html>
  `);
});

export { docsRoute };
