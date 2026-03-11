import { Plugin, TFile, MarkdownView, EventRef } from "obsidian";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getDiff, getGitRoot, isGitRepo, isTracked, getUntrackedContent } from "./git";
import { parseDiff } from "./diff-parser";
import { createGutterExtension, setChangesEffect, applySettingsToCSS, removeSettingsCSS } from "./gutter";
import { GitGutterSettingTab } from "./settings";
import { GitGutterSettings, DEFAULT_SETTINGS, LineChange } from "./types";
import * as path from "path";

export default class GitGutterPlugin extends Plugin {
	settings: GitGutterSettings = DEFAULT_SETTINGS;
	private gitRoot: string | null = null;
	private editorExtension: Extension[] = [];
	private modifyRef: EventRef | null = null;
	private refreshTimer: ReturnType<typeof setInterval> | null = null;

	async onload() {
		await this.loadSettings();

		const adapter = this.app.vault.adapter;
		if (!("getBasePath" in adapter)) return;

		const vaultPath = (adapter as any).getBasePath() as string;

		if (!(await isGitRepo(vaultPath))) {
			console.log("Git Gutter: vault is not a git repository, disabling.");
			return;
		}

		this.gitRoot = await getGitRoot(vaultPath);

		// Create the CM6 extension
		this.editorExtension = createGutterExtension();
		this.registerEditorExtension(this.editorExtension);

		applySettingsToCSS(this.settings);

		// Refresh on active file change
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.refreshActiveFile();
			})
		);

		// Refresh on file modify (save)
		if (this.settings.refreshOnSave) {
			this.modifyRef = this.app.vault.on("modify", (file) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && file.path === activeFile.path) {
					this.refreshActiveFile();
				}
			});
			this.registerEvent(this.modifyRef);
		}

		// Periodic refresh
		this.setupRefreshTimer();

		// Command to manually refresh
		this.addCommand({
			id: "refresh-git-gutter",
			name: "Refresh git gutter indicators",
			callback: () => this.refreshActiveFile(),
		});

		this.addSettingTab(new GitGutterSettingTab(this.app, this));

		// Initial refresh
		this.app.workspace.onLayoutReady(() => {
			this.refreshActiveFile();
		});
	}

	onunload() {
		this.clearRefreshTimer();
		removeSettingsCSS();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		applySettingsToCSS(this.settings);
		this.setupRefreshTimer();
	}

	private setupRefreshTimer() {
		this.clearRefreshTimer();
		if (this.settings.refreshInterval > 0) {
			this.refreshTimer = setInterval(
				() => this.refreshActiveFile(),
				this.settings.refreshInterval * 1000
			);
		}
	}

	private clearRefreshTimer() {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	private async refreshActiveFile() {
		if (!this.gitRoot) return;

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.dispatchChanges([]);
			return;
		}

		const adapter = this.app.vault.adapter;
		if (!("getBasePath" in adapter)) return;
		const vaultPath = (adapter as any).getBasePath() as string;

		const absolutePath = path.join(vaultPath, activeFile.path);
		const relativePath = path.relative(this.gitRoot, absolutePath);

		let changes: LineChange[];
		const tracked = await isTracked(relativePath, this.gitRoot);

		if (!tracked) {
			const lineCount = await getUntrackedContent(absolutePath, this.gitRoot);
			if (lineCount && lineCount > 0) {
				changes = [{ type: "added", startLine: 1, endLine: lineCount }];
			} else {
				changes = [];
			}
		} else {
			const diff = await getDiff(relativePath, this.gitRoot);
			changes = diff ? parseDiff(diff) : [];
		}

		this.dispatchChanges(changes);
	}

	private dispatchChanges(changes: LineChange[]) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.editor) return;
		const cmEditor = (view.editor as any).cm as EditorView | undefined;
		if (cmEditor) {
			cmEditor.dispatch({
				effects: setChangesEffect.of(changes),
			});
		}
	}
}
