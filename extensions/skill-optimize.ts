import { homedir } from "node:os";
import { join } from "node:path";
import {
	BorderedLoader,
	truncateTail,
	type ExecResult,
	type ExtensionAPI,
	type ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

const WRAPPER = join(homedir(), ".pi", "agent", "bin", "pi-skill-optimize");
const SUBCOMMANDS = ["doctor", "lint", "preview-fix", "harvest", "run", "candidate", "adopt", "status", "help"];
const LONG_TIMEOUT_MS = 60 * 60 * 1000;

const HELP = `Usage:
  /skill-optimize doctor
  /skill-optimize lint <SKILL.md>
  /skill-optimize preview-fix <SKILL.md>
  /skill-optimize harvest <SKILL.md> [project]
  /skill-optimize run <SKILL.md> <reviewed-tasks.json> [project]
  /skill-optimize candidate <SKILL.md> [project]
  /skill-optimize adopt <SKILL.md> [project]
  /skill-optimize status [project]

run sends reviewed task content to the model configured in Pi and may incur provider cost.
adopt validates and displays the staged candidate before asking for confirmation.`;

type RunOutcome =
	| { kind: "result"; result: ExecResult }
	| { kind: "error"; message: string }
	| null;

function tokenize(input: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: "'" | '"' | null = null;
	let escaping = false;

	for (const char of input.trim()) {
		if (escaping) {
			current += char;
			escaping = false;
			continue;
		}
		if (char === "\\" && quote !== "'") {
			escaping = true;
			continue;
		}
		if (quote) {
			if (char === quote) quote = null;
			else current += char;
			continue;
		}
		if (char === "'" || char === '"') {
			quote = char;
			continue;
		}
		if (/\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}
		current += char;
	}

	if (escaping) current += "\\";
	if (quote) throw new Error("Unterminated quoted argument");
	if (current) tokens.push(current);
	return tokens;
}

function expandHome(value: string): string {
	if (value === "~") return homedir();
	if (value.startsWith("~/")) return join(homedir(), value.slice(2));
	return value;
}

function commandSpec(args: string[], assumeYes: boolean): { command: string; args: string[] } {
	if (assumeYes) {
		return {
			command: "/usr/bin/env",
			args: ["PI_SKILL_OPTIMIZE_ASSUME_YES=1", WRAPPER, ...args],
		};
	}
	return { command: WRAPPER, args };
}

async function runWrapper(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	args: string[],
	label: string,
	assumeYes = false,
): Promise<RunOutcome> {
	const spec = commandSpec(args, assumeYes);

	if (ctx.mode !== "tui") {
		try {
			const result = await pi.exec(spec.command, spec.args, { cwd: ctx.cwd, timeout: LONG_TIMEOUT_MS });
			return { kind: "result", result };
		} catch (error) {
			return { kind: "error", message: error instanceof Error ? error.message : String(error) };
		}
	}

	return ctx.ui.custom<RunOutcome>((tui, theme, _keybindings, done) => {
		const loader = new BorderedLoader(tui, theme, label);
		let settled = false;
		const finish = (outcome: RunOutcome) => {
			if (settled) return;
			settled = true;
			done(outcome);
		};
		loader.onAbort = () => finish(null);

		pi.exec(spec.command, spec.args, {
			cwd: ctx.cwd,
			timeout: LONG_TIMEOUT_MS,
			signal: loader.signal,
		})
			.then((result) => finish({ kind: "result", result }))
			.catch((error) =>
				finish({ kind: "error", message: error instanceof Error ? error.message : String(error) }),
			);

		return loader;
	});
}

function outputText(result: ExecResult): string {
	const combined = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
	return combined || `(no output; exit ${result.code})`;
}

function present(ctx: ExtensionCommandContext, text: string, level: "info" | "warning" | "error" = "info"): void {
	const truncated = truncateTail(text, { maxLines: 300, maxBytes: 16_000 });
	const shown = truncated.truncated
		? `[Output truncated to the final ${truncated.outputLines} lines / ${truncated.outputBytes} bytes]\n${truncated.content}`
		: truncated.content;

	if (ctx.hasUI) ctx.ui.notify(shown, level);
	else process.stdout.write(`${shown}\n`);
}

function presentOutcome(ctx: ExtensionCommandContext, outcome: RunOutcome): boolean {
	if (outcome === null) {
		present(ctx, "Cancelled", "warning");
		return false;
	}
	if (outcome.kind === "error") {
		present(ctx, outcome.message, "error");
		return false;
	}
	const ok = outcome.result.code === 0;
	present(ctx, outputText(outcome.result), ok ? "info" : "error");
	return ok;
}

function argumentError(ctx: ExtensionCommandContext, message: string): void {
	present(ctx, `${message}\n\n${HELP}`, "error");
}

export default function skillOptimizeExtension(pi: ExtensionAPI) {
	pi.registerCommand("skill-optimize", {
		description: "Lint and behaviorally optimize Agent Skills with agnix + SkillOpt",
		getArgumentCompletions: (prefix) => {
			if (prefix.includes(" ")) return null;
			const matches = SUBCOMMANDS.filter((item) => item.startsWith(prefix));
			return matches.length ? matches.map((value) => ({ value, label: value })) : null;
		},
		handler: async (rawArgs, ctx) => {
			let tokens: string[];
			try {
				tokens = tokenize(rawArgs).map(expandHome);
			} catch (error) {
				argumentError(ctx, error instanceof Error ? error.message : String(error));
				return;
			}

			const [subcommand = "help", ...args] = tokens;
			if (subcommand === "help" || subcommand === "-h" || subcommand === "--help") {
				present(ctx, HELP);
				return;
			}
			if (!SUBCOMMANDS.includes(subcommand)) {
				argumentError(ctx, `Unknown subcommand: ${subcommand}`);
				return;
			}

			const requiredArgs: Record<string, number> = {
				doctor: 0,
				lint: 1,
				"preview-fix": 1,
				harvest: 1,
				run: 2,
				candidate: 1,
				adopt: 1,
				status: 0,
			};
			if (args.length < requiredArgs[subcommand]!) {
				argumentError(ctx, `Missing argument for ${subcommand}`);
				return;
			}

			if (subcommand === "run") {
				if (!ctx.hasUI) {
					argumentError(ctx, "run requires interactive confirmation in Pi TUI/RPC mode");
					return;
				}
				const confirmed = await ctx.ui.confirm(
					"Run SkillOpt?",
					`Reviewed tasks: ${args[1]}\n\nTheir content will be sent to the model configured in Pi and may incur provider cost. The candidate will be staged, not adopted.`,
				);
				if (!confirmed) {
					ctx.ui.notify("Cancelled", "info");
					return;
				}
				const outcome = await runWrapper(pi, ctx, [subcommand, ...args], "Running SkillOpt...", true);
				presentOutcome(ctx, outcome);
				return;
			}

			if (subcommand === "adopt") {
				const preview = await runWrapper(pi, ctx, ["candidate", ...args], "Validating staged candidate...");
				if (!presentOutcome(ctx, preview)) return;
				if (!ctx.hasUI) {
					argumentError(ctx, "adopt requires interactive confirmation in Pi TUI/RPC mode");
					return;
				}
				const confirmed = await ctx.ui.confirm(
					"Adopt staged Skill?",
					"The candidate passed agnix. SkillOpt will back up and replace the live SKILL.md, then agnix will validate it again.",
				);
				if (!confirmed) {
					ctx.ui.notify("Cancelled; the staged candidate was not adopted", "info");
					return;
				}
				const outcome = await runWrapper(pi, ctx, [subcommand, ...args], "Adopting candidate...", true);
				presentOutcome(ctx, outcome);
				return;
			}

			const labels: Record<string, string> = {
				doctor: "Checking SkillOpt environment...",
				lint: "Linting Skill...",
				"preview-fix": "Preparing safe-fix preview...",
				harvest: "Harvesting bounded Pi tasks locally...",
				candidate: "Validating staged candidate...",
				status: "Reading SkillOpt status...",
			};
			const outcome = await runWrapper(pi, ctx, [subcommand, ...args], labels[subcommand] ?? "Running...");
			presentOutcome(ctx, outcome);
		},
	});
}
