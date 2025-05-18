#!/usr/bin/env node

// src/index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/mcp.ts
import {
  McpServer
} from "@modelcontextprotocol/sdk/server/mcp.js";
import Arweave from "arweave";
import { createSigner, message as message3, spawn, result as result3 } from "@permaweb/aoconnect";
import { z } from "zod";

// src/lib/runLua.ts
import { result, message } from "@permaweb/aoconnect";

// src/lib/utils.ts
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/lib/runLua.ts
async function runLuaCode(code, processId, signer, tags) {
  const messageId = await message({
    process: processId,
    signer,
    data: code,
    tags: [{ name: "Action", value: "Eval" }, ...tags || []]
  });
  await sleep(100);
  const outputResult = await result({
    message: messageId,
    process: processId
  });
  if (outputResult.Error) {
    return JSON.stringify(outputResult.Error);
  }
  return JSON.stringify(outputResult.Output.data);
}

// src/helpers/apm.ts
async function installPackage(packageName, processId, signer) {
  const code = `apm.install("${packageName}")`;
  const result4 = await runLuaCode(code, processId, signer);
  return result4;
}

// src/helpers/blueprint.ts
async function fetchBlueprintCode(url) {
  const response = await fetch(url);
  const code = await response.text();
  return code;
}
async function addBlueprint(blueprintName, processId, signer) {
  const url = `https://raw.githubusercontent.com/permaweb/aos/refs/heads/main/blueprints/${blueprintName}.lua`;
  const code = await fetchBlueprintCode(url);
  const result4 = await runLuaCode(code, processId, signer);
  return result4;
}

// src/helpers/handlers.ts
import { result as result2, message as message2 } from "@permaweb/aoconnect";
async function listHandlers(processId, signer) {
  const messageId = await message2({
    process: processId,
    signer,
    data: `
        local handlers = Handlers.list
        local result = {}
        for i, handler in ipairs(handlers) do
          table.insert(result, {
            name = handler.name,
            type = type(handler.pattern),
          })
        end
        return result
      `,
    tags: [{ name: "Action", value: "Eval" }]
  });
  const outputResult = await result2({
    message: messageId,
    process: processId
  });
  if (outputResult.Error) {
    return outputResult.Error;
  }
  return outputResult.Output.data;
}
async function addHandler(processId, handlerCode, signer) {
  const messageId = await message2({
    process: processId,
    signer,
    data: handlerCode,
    tags: [{ name: "Action", value: "Eval" }]
  });
  await sleep(100);
  const outputResult = await result2({
    message: messageId,
    process: processId
  });
  return outputResult.Output ? outputResult.Output.data : outputResult.Messages[0].Data;
}
async function runHandler(processId, handlerName, data, signer) {
  const messageId = await message2({
    process: processId,
    signer,
    data,
    tags: [{ name: "Action", value: handlerName }]
  });
  await sleep(100);
  const outputResult = await result2({
    message: messageId,
    process: processId
  });
  return outputResult;
}

// src/mcp.ts
function cleanOutput(result4) {
  if (!result4) return "";
  return JSON.stringify(result4, null, 2).replace(/\\u001b\[\d+m/g, "").replace(/\\n/g, "\n");
}
var FluxServer = class {
  constructor() {
    this.initialized = false;
    this.server = new McpServer(
      {
        name: "flux",
        version: "1.0.0"
      },
      {
        capabilities: {}
      }
    );
  }
  async initialize() {
    if (this.initialized) return;
    const arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https"
    });
    const wallet = await arweave.wallets.generate();
    this.signer = createSigner(wallet);
    await this.registerTools();
    this.initialized = true;
  }
  async registerTools() {
    this.server.tool(
      "spawn",
      "spawn a new AO process",
      {
        tags: z.array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        ),
        needsSqlite: z.boolean().optional()
      },
      async ({ tags, needsSqlite }) => {
        const processId = await spawn({
          module: needsSqlite ? "33d-3X8mpv6xYBlVB-eXMrPfH5Kzf6Hiwhcv0UA10sw" : "JArYBF-D8q2OmZ4Mok00sD2Y_6SYEQ7Hjx-6VZ_jl3g",
          signer: this.signer,
          scheduler: "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
          tags
        });
        return {
          content: [{ type: "text", text: processId }]
        };
      }
    );
    this.server.tool(
      "send-message-to-process",
      "send a message to an existing AO process",
      {
        processId: z.string(),
        data: z.string(),
        tags: z.array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        ).optional()
      },
      async ({ processId, data, tags }) => {
        const messageId = await message3({
          process: processId,
          signer: this.signer,
          data,
          tags
        });
        await sleep(100);
        const output = await result3({
          message: messageId,
          process: processId
        });
        if (output.Error) {
          return {
            content: [{ type: "text", text: cleanOutput(output.Error) }]
          };
        }
        return {
          content: [
            { type: "text", text: cleanOutput(output.Messages[0].Data) }
          ]
        };
      }
    );
    this.server.tool(
      "apm-install",
      "install a package in an existing AO process",
      { packageName: z.string(), processId: z.string() },
      async ({ packageName, processId }) => {
        const result4 = await installPackage(
          packageName,
          processId,
          this.signer
        );
        return {
          content: [{ type: "text", text: cleanOutput(result4) }]
        };
      }
    );
    this.server.tool(
      "load-token-blueprint",
      "load the token blueprint in an existing AO process",
      { processId: z.string() },
      async ({ processId }) => {
        const result4 = await addBlueprint("token", processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result4) }]
        };
      }
    );
    this.server.tool(
      "create-sqlite-based-handler",
      "create a new sqlite based handler in an existing AO process",
      { processId: z.string(), handlerCode: z.string() },
      async ({ processId, handlerCode }) => {
        const code = `local sqlite = require('lsqlite3')
Db = sqlite.open_memory()
${handlerCode}`;
        const result4 = await runLuaCode(code, processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result4) }]
        };
      }
    );
    this.server.tool(
      "run-lua-in-process",
      "run a lua script in an existing AO process",
      {
        code: z.string(),
        processId: z.string(),
        tags: z.array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        ).optional()
      },
      async ({ code, processId, tags }) => {
        const result4 = await runLuaCode(code, processId, this.signer, tags);
        return {
          content: [{ type: "text", text: cleanOutput(result4) }]
        };
      }
    );
    this.server.tool(
      "load-blueprint",
      "load a blueprint in an existing AO process",
      { url: z.string(), processId: z.string() },
      async ({ url, processId }) => {
        const code = await fetchBlueprintCode(url);
        const result4 = await runLuaCode(code, processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result4) }]
        };
      }
    );
    this.server.tool(
      "load-local-blueprint",
      "load a local blueprint in an existing AO process",
      { blueprintCode: z.string(), processId: z.string() },
      async ({ blueprintCode, processId }) => {
        const result4 = await runLuaCode(blueprintCode, processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result4) }]
        };
      }
    );
    this.server.tool(
      "load-official-blueprint",
      "load an official blueprint in an existing AO process",
      { blueprintName: z.string(), processId: z.string() },
      async ({ blueprintName, processId }) => {
        const result4 = await addBlueprint(
          blueprintName,
          processId,
          this.signer
        );
        return {
          content: [{ type: "text", text: cleanOutput(result4) }]
        };
      }
    );
    this.server.tool(
      "list-available-handlers",
      "list all available handlers in an existing AO process",
      { processId: z.string() },
      async ({ processId }) => {
        const handlers = await listHandlers(processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(handlers) }]
        };
      }
    );
    this.server.tool(
      "create-handler",
      "create a new handler in an existing AO process",
      { processId: z.string(), handlerCode: z.string() },
      async ({ processId, handlerCode }) => {
        const result4 = await addHandler(processId, handlerCode, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result4) }]
        };
      }
    );
    this.server.tool(
      "run-handler-using-handler-name",
      "run a handler using its name in an existing AO process",
      { processId: z.string(), handlerName: z.string(), data: z.string() },
      async ({ processId, handlerName, data }) => {
        const result4 = await runHandler(
          processId,
          handlerName,
          data,
          this.signer
        );
        if (result4.Error) {
          return {
            content: [{ type: "text", text: cleanOutput(result4.Error) }]
          };
        }
        return {
          content: [
            { type: "text", text: cleanOutput(result4.Messages[0].Data) }
          ]
        };
      }
    );
  }
};
var mcp_default = FluxServer;

// src/index.ts
var server = new mcp_default();
async function runServer() {
  await server.initialize();
  const transport = new StdioServerTransport();
  await server.server.connect(transport);
  console.error("Flux MCP Server running on stdio");
}
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
