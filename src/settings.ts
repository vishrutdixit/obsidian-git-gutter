import { App, PluginSettingTab, Setting } from "obsidian";
import type GitGutterPlugin from "./main";
import { THEMES } from "./types";

export class GitGutterSettingTab extends PluginSettingTab {
	plugin: GitGutterPlugin;

	constructor(app: App, plugin: GitGutterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const themeOptions: Record<string, string> = {};
		for (const name of Object.keys(THEMES)) {
			themeOptions[name] = name;
		}

		new Setting(containerEl)
			.setName("Theme")
			.setDesc("Color theme for gutter indicators")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(themeOptions)
					.setValue(this.plugin.settings.theme)
					.onChange(async (value) => {
						this.plugin.settings.theme = value;
						if (value !== "Custom") {
							const colors = THEMES[value];
							this.plugin.settings.addedColor = colors.added;
							this.plugin.settings.modifiedColor = colors.modified;
							this.plugin.settings.deletedColor = colors.deleted;
						}
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.theme === "Custom") {
			new Setting(containerEl)
				.setName("Added line color")
				.setDesc("Color for newly added lines")
				.addColorPicker((picker) =>
					picker
						.setValue(this.plugin.settings.addedColor)
						.onChange(async (value) => {
							this.plugin.settings.addedColor = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Modified line color")
				.setDesc("Color for modified lines")
				.addColorPicker((picker) =>
					picker
						.setValue(this.plugin.settings.modifiedColor)
						.onChange(async (value) => {
							this.plugin.settings.modifiedColor = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Deleted line color")
				.setDesc("Color for deleted line indicators")
				.addColorPicker((picker) =>
					picker
						.setValue(this.plugin.settings.deletedColor)
						.onChange(async (value) => {
							this.plugin.settings.deletedColor = value;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName("Gutter width")
			.setDesc("Width of the gutter indicator in pixels")
			.addSlider((slider) =>
				slider
					.setLimits(1, 6, 1)
					.setValue(this.plugin.settings.gutterWidth)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.gutterWidth = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Refresh on save")
			.setDesc("Update gutter indicators when a file is saved")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.refreshOnSave)
					.onChange(async (value) => {
						this.plugin.settings.refreshOnSave = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-refresh interval (seconds)")
			.setDesc("Periodically refresh indicators. Set to 0 to disable.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.refreshInterval))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 0) {
							this.plugin.settings.refreshInterval = num;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
