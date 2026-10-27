#!/usr/bin/env node
// Source-checkout wrapper. The same CLI is copied into the portable agent kit.
import { runWorkspaceCli } from './infrastructure/workspace-cli.mjs';
process.exitCode = await runWorkspaceCli(process.argv.slice(2));
