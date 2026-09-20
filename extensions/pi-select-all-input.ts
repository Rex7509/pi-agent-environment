/**
 * pi prompt select-all for Ghostty on macOS.
 *
 * Reversible: delete this file after copying it into ~/.pi/agent/extensions/.
 * This is an extension; pi's installed source is not modified.
 *
 * Cmd+A selects the current prompt, with inverse-video feedback. Typing or
 * pasting replaces it; Backspace/Delete/Ctrl+C/Ctrl+D clears it; navigation
 * collapses the selection and continues with normal pi behavior.
 */

import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	matchesKey,
	type EditorTheme,
	type TUI,
} from "@earendil-works/pi-tui";

type KeybindingsLike = {
	matches(data: string, action: string): boolean;
};

const SELECT_ALL = "super+a" as const;
// Ghostty sends this explicit sequence so Cmd+A cannot be swallowed by the
// macOS application menu or depend on Kitty keyboard-protocol negotiation.
const SELECT_ALL_SEQUENCE = "\x1b[999~";

function highlightLine(line: string): string {
	// The base editor resets SGR around its hardware cursor. Re-open inverse
	// video after each reset so the whole rendered input line stays selected.
	const keptHighlighted = line.replace(/\x1b\[0m/g, "\x1b[0m\x1b[7m");
	return `\x1b[7m${keptHighlighted}\x1b[0m`;
}

function stripAnsi(line: string): string {
	return line.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

function isKittyPrintable(data: string): boolean {
	const match = data.match(/^\x1b\[(\d+)(?:;(\d+))?u$/);
	if (!match) return false;
	const modifier = Number(match[2] ?? "1");
	return modifier === 1 || modifier === 2;
}

class SelectAllEditor extends CustomEditor {
	private allSelected = false;
	private readonly keybindings: KeybindingsLike;

	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsLike) {
		super(tui, theme, keybindings as never);
		this.keybindings = keybindings;
	}

	private selectAll(): void {
		this.allSelected = this.getText().length > 0;
		this.tui.requestRender();
	}

	private collapseSelection(): void {
		if (!this.allSelected) return;

		this.allSelected = false;
		// Keep the text and place the cursor at the end, matching common editor
		// behavior when a whole-document selection is collapsed.
		this.setText(this.getText());
	}

	private deleteSelection(): void {
		if (!this.allSelected) return;

		this.allSelected = false;
		this.setText("");
		this.tui.requestRender();
	}

	private isAction(data: string, action: string): boolean {
		return this.keybindings.matches(data, action);
	}

	private isDeletion(data: string): boolean {
		return [
			"tui.editor.deleteCharBackward",
			"tui.editor.deleteCharForward",
			"tui.editor.deleteWordBackward",
			"tui.editor.deleteWordForward",
			"tui.editor.deleteToLineStart",
			"tui.editor.deleteToLineEnd",
			"app.clear",
			"app.exit",
		].some((action) => this.isAction(data, action));
	}

	private isInsertion(data: string): boolean {
		if (data.includes("\x1b[200~")) return true; // bracketed paste
		if (this.isAction(data, "tui.input.newLine")) return true;
		if (isKittyPrintable(data)) return true;
		return data.length > 0 && data.charCodeAt(0) >= 32;
	}

	handleInput(data: string): void {
		if (data === SELECT_ALL_SEQUENCE || matchesKey(data, SELECT_ALL)) {
			this.selectAll();
			return;
		}

		if (!this.allSelected) {
			super.handleInput(data);
			return;
		}

		// Prevent CustomEditor app-level Ctrl+C/Ctrl+D behavior while text is
		// selected: these keys clear the selected prompt instead.
		if (this.isDeletion(data)) {
			this.deleteSelection();
			return;
		}

		if (this.isInsertion(data)) {
			this.allSelected = false;
			this.setText("");
			super.handleInput(data);
			return;
		}

		this.collapseSelection();
		super.handleInput(data);
	}

	render(width: number): string[] {
		const lines = super.render(width);
		if (!this.allSelected || this.getText().length === 0) return lines;

		// Base editor output is: top border, editor lines, bottom border,
		// optional autocomplete lines. Highlight only editor lines.
		const bottomBorder = lines.findIndex(
			(line, index) => index > 0 && stripAnsi(line).includes("─"),
		);
		if (bottomBorder <= 1) return lines;

		for (let index = 1; index < bottomBorder; index++) {
			lines[index] = highlightLine(lines[index]!);
		}
		return lines;
	}
}

export default function piSelectAllInput(pi: ExtensionAPI): void {
	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;

		// pi-open-tui also installs a custom editor during session_start. Defer
		// one tick so our editor is installed after it. This uses pi's public
		// CustomEditor API and does not depend on pi-open-tui internals.
		setTimeout(() => {
			if (!ctx.hasUI) return;
			ctx.ui.setEditorComponent((tui, theme, keybindings) =>
				new SelectAllEditor(tui, theme, keybindings),
			);
		}, 0);
	});
}
