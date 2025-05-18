#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import FluxServer from "./mcp.js";

const server = new FluxServer();

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
