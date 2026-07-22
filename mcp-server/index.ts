#!/usr/bin/env node
/**
 * KaamKaro MCP Server
 * --------------------
 * Exposes KaamKaro as a set of MCP tools so any AI agent (Claude Desktop,
 * a custom LLM app, etc.) can post real-world tasks for Pakistani providers
 * to complete — the same "AI hires human" pattern RentAHuman.ai uses.
 *
 * Config (env vars):
 *   KAAMKARO_API_URL  — base URL of the running KaamKaro app (default: http://localhost:3000)
 *   KAAMKARO_API_KEY  — an API key generated from /settings in the web app
 *
 * Run:
 *   npx tsx mcp-server/index.ts
 *
 * Claude Desktop config (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "kaamkaro": {
 *         "command": "npx",
 *         "args": ["tsx", "/absolute/path/to/kaamkaro/mcp-server/index.ts"],
 *         "env": {
 *           "KAAMKARO_API_URL": "http://localhost:3000",
 *           "KAAMKARO_API_KEY": "kk_live_..."
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = process.env.KAAMKARO_API_URL || "http://localhost:3000";
const API_KEY = process.env.KAAMKARO_API_KEY;

if (!API_KEY) {
  console.error(
    "KAAMKARO_API_KEY env var zaroori hai. /settings page se ek key generate karein."
  );
  process.exit(1);
}

async function apiCall(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

const server = new Server(
  { name: "kaamkaro", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "post_task",
      description:
        "Pakistan mein kisi real-world kaam ko post karein taake koi verified human provider use complete kare. Delivery, verification, on-site checks, ya koi bhi physical task ke liye.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Kaam ka chota title" },
          description: { type: "string", description: "Kaam ki poori tafseel" },
          category: {
            type: "string",
            enum: ["delivery", "design", "coding", "writing", "home", "verification", "other"],
          },
          budget: { type: "number", description: "Budget in PKR" },
          city: { type: "string", description: "Shehar (optional)" },
        },
        required: ["title", "description", "category", "budget"],
      },
    },
    {
      name: "list_my_tasks",
      description: "Is agent ke posted kiye hue sab tasks list karein.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_task_status",
      description: "Ek specific task ki current status aur applications dekhein.",
      inputSchema: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
    },
    {
      name: "accept_provider",
      description: "Kisi provider ki application accept karein taake wo kaam shuru kar sake.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          applicationId: { type: "string" },
        },
        required: ["taskId", "applicationId"],
      },
    },
    {
      name: "fund_escrow",
      description: "Accepted provider ke liye budget escrow mein hold karein.",
      inputSchema: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
    },
    {
      name: "confirm_completion",
      description:
        "Provider ke submit kiye hue proof ko confirm karein aur escrow payment release karein.",
      inputSchema: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "post_task": {
        const data = await apiCall("/api/agent/tasks", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return {
          content: [
            { type: "text", text: `Task post ho gaya. Task ID: ${data.taskId}` },
          ],
        };
      }
      case "list_my_tasks": {
        const data = await apiCall("/api/agent/tasks?scope=mine");
        return { content: [{ type: "text", text: JSON.stringify(data.tasks, null, 2) }] };
      }
      case "get_task_status": {
        const { taskId } = args as { taskId: string };
        const data = await apiCall(`/api/agent/tasks/${taskId}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      case "accept_provider": {
        const { taskId, applicationId } = args as { taskId: string; applicationId: string };
        await apiCall(`/api/agent/tasks/${taskId}`, {
          method: "POST",
          body: JSON.stringify({ action: "accept", applicationId }),
        });
        return { content: [{ type: "text", text: "Provider accept ho gaya." }] };
      }
      case "fund_escrow": {
        const { taskId } = args as { taskId: string };
        await apiCall(`/api/agent/tasks/${taskId}`, {
          method: "POST",
          body: JSON.stringify({ action: "pay" }),
        });
        return { content: [{ type: "text", text: "Escrow payment hold ho gayi." }] };
      }
      case "confirm_completion": {
        const { taskId } = args as { taskId: string };
        await apiCall(`/api/agent/tasks/${taskId}`, {
          method: "POST",
          body: JSON.stringify({ action: "complete" }),
        });
        return { content: [{ type: "text", text: "Kaam confirm ho gaya, payment release ho gayi." }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KaamKaro MCP server chal raha hai (stdio)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
