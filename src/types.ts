export type ChangeType = "added" | "modified" | "deleted";

export interface LineChange {
	type: ChangeType;
	startLine: number;
	endLine: number;
}

export interface ThemeColors {
	added: string;
	modified: string;
	deleted: string;
}

export const THEMES: Record<string, ThemeColors> = {
	"VSCode Dark": {
		added: "#2ea043",
		modified: "#0078d4",
		deleted: "#f85149",
	},
	"VSCode Light": {
		added: "#2ea043",
		modified: "#0078d4",
		deleted: "#cb2431",
	},
	"GitHub": {
		added: "#3fb950",
		modified: "#d29922",
		deleted: "#f85149",
	},
	"Monokai": {
		added: "#a6e22e",
		modified: "#e6db74",
		deleted: "#f92672",
	},
	"Dracula": {
		added: "#50fa7b",
		modified: "#8be9fd",
		deleted: "#ff5555",
	},
	"Solarized": {
		added: "#859900",
		modified: "#268bd2",
		deleted: "#dc322f",
	},
	"Nord": {
		added: "#a3be8c",
		modified: "#81a1c1",
		deleted: "#bf616a",
	},
	"Catppuccin": {
		added: "#a6e3a1",
		modified: "#89b4fa",
		deleted: "#f38ba8",
	},
	"Custom": {
		added: "#2ea043",
		modified: "#0078d4",
		deleted: "#f85149",
	},
};

export interface GitGutterSettings {
	theme: string;
	addedColor: string;
	modifiedColor: string;
	deletedColor: string;
	gutterWidth: number;
	refreshOnSave: boolean;
	refreshInterval: number;
}

export const DEFAULT_SETTINGS: GitGutterSettings = {
	theme: "VSCode Dark",
	addedColor: "#2ea043",
	modifiedColor: "#0078d4",
	deletedColor: "#f85149",
	gutterWidth: 3,
	refreshOnSave: true,
	refreshInterval: 0,
};
