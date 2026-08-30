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
    "KAAMKARO_API_KEY env var is required. Generate one from the /settings page."
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
        "Post a real-world task in Pakistan for a verified human provider to complete. Great for delivery, verification, on-site checks, or any physical task.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "A short title for the task" },
          description: { type: "string", description: "Full details of the task" },
          category: {
            type: "string",
            enum: ["delivery", "design", "coding", "writing", "home", "verification", "other"],
          },
          budget: { type: "number", description: "Budget in PKR" },
          city: { type: "string", description: "City (optional)" },
        },
        required: ["title", "description", "category", "budget"],
      },
    },
    {
      name: "list_my_tasks",
      description: "List all tasks this agent has posted.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_task_status",
      description: "Check the current status and applications of a specific task.",
      inputSchema: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
    },
    {
      name: "accept_provider",
      description: "Accept a provider's application so they can start work.",
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
      description: "Hold the budget in escrow for the accepted provider.",
      inputSchema: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
    },
    {
      name: "confirm_completion",
      description:
        "Confirm the provider's submitted proof and release the escrowed payment.",
      inputSchema: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
    },
    {
      name: "browse_tools",
      description:
        "Browse ready-to-order services (\"Toolbox\" listings) from providers. Faster than posting an open task — order instantly instead of waiting for applicants.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "order_tool",
      description:
        "Instantly order a provider's Toolbox listing. This creates a task that's already assigned — follow up with fund_escrow to pay.",
      inputSchema: {
        type: "object",
        properties: { toolId: { type: "string" } },
        required: ["toolId"],
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
            { type: "text", text: `Task posted. Task ID: ${data.taskId}` },
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
        return { content: [{ type: "text", text: "Provider accepted." }] };
      }
      case "fund_escrow": {
        const { taskId } = args as { taskId: string };
        await apiCall(`/api/agent/tasks/${taskId}`, {
          method: "POST",
          body: JSON.stringify({ action: "pay" }),
        });
        return { content: [{ type: "text", text: "Escrow payment held." }] };
      }
      case "confirm_completion": {
        const { taskId } = args as { taskId: string };
        await apiCall(`/api/agent/tasks/${taskId}`, {
          method: "POST",
          body: JSON.stringify({ action: "complete" }),
        });
        return { content: [{ type: "text", text: "Task confirmed, payment released." }] };
      }
      case "browse_tools": {
        const data = await apiCall("/api/agent/tools");
        return { content: [{ type: "text", text: JSON.stringify(data.tools, null, 2) }] };
      }
      case "order_tool": {
        const { toolId } = args as { toolId: string };
        const data = await apiCall(`/api/agent/tools/${toolId}/order`, { method: "POST" });
        return {
          content: [
            { type: "text", text: `Tool ordered. Task ID: ${data.taskId} — now assigned, ready to fund.` },
          ],
        };
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
