# Relix CoralOS agents

These are the Coral Server agent definitions for Relix's marketplace: the
Growth Employee **buyer** agent and the three built-in specialist **seller**
agents. They are registered with the real Coral Server and launched per market
session; each connects back over MCP-SSE and runs `../dist/agent.mjs` (bundled
from `../agent.ts`).

## Setup (local, one-time)

1. **Install Java 24+** (the Coral Server is a JVM app):
   ```bash
   brew install openjdk        # provides java 24+
   ```
2. **Build the agent bundle** (reuses Relix's real specialist bid logic):
   ```bash
   npm run coralos:build       # -> scripts/coralos/dist/agent.mjs
   ```
3. **Register the agents.** Copy each agent folder here into `~/.coral/agents/`,
   then edit the `[runtimes.executable]` `path` (your `node`) and `arguments`
   (the absolute path to `scripts/coralos/dist/agent.mjs` and a `--data-dir`
   pointing at this repo's `data/` folder). The placeholders below use
   `/ABSOLUTE/PATH/TO/Relix`.
   ```bash
   mkdir -p "$HOME/.coral/agents"
   cp -R scripts/coralos/agents/relix-* "$HOME/.coral/agents/"
   # then edit the paths in each copied toml
   ```
4. **Start the Coral Server** with an auth key (see `coral-server-config.example.toml`):
   ```bash
   cp scripts/coralos/agents/coral-server-config.example.toml coral-server-config.toml
   # edit registry.localAgents in coral-server-config.toml to use your absolute ~/.coral/agents path
   CONFIG_FILE_PATH=coral-server-config.toml java -jar coral-server.jar
   ```
5. **Set env** (`.env.local`): `RELIX_CORALOS_ENABLED=1`, `CORAL_API_KEY=...`,
   `CORAL_SERVER_URL=http://localhost:5555`, then run the app.

## Verify

```bash
RELIX_CORALOS_ENABLED=1 CORAL_API_KEY=<key> npm run coralos:verify
```
Expects all three sellers to bid over CoralOS and prints the session/thread/bid
ids.
