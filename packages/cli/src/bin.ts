#!/usr/bin/env node
import { run } from "./index";

process.exitCode = run(process.argv.slice(2));
