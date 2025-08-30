import dotenv from "dotenv";
import { run as runOAuthServer } from "./pieces/server.ts";
import parseArgs from "minimist";
// Load environment variables
dotenv.config();

const argv = parseArgs(process.argv.slice(2));
const command = argv.run;

switch (command) {
  case "oauth-server": {
    runOAuthServer();
    break;
  }
  default: {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}
