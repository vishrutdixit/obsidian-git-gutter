import {
	EditorView,
	GutterMarker,
	gutter,
} from "@codemirror/view";
import { RangeSetBuilder, StateField, StateEffect, RangeSet } from "@codemirror/state";
import { LineChange, GitGutterSettings } from "./types";

class AddedMarker extends GutterMarker {
	toDOM() {
		const el = document.createElement("div");
		el.className = "git-gutter-added";
		return el;
	}
}

class ModifiedMarker extends GutterMarker {
	toDOM() {
		const el = document.createElement("div");
		el.className = "git-gutter-modified";
		return el;
	}
}

class DeletedMarker extends GutterMarker {
	toDOM() {
		const el = document.createElement("div");
		el.className = "git-gutter-deleted";
		return el;
	}
}

const addedMarker = new AddedMarker();
const modifiedMarker = new ModifiedMarker();
const deletedMarker = new DeletedMarker();

export const setChangesEffect = StateEffect.define<LineChange[]>();

function buildMarkers(
	doc: { lines: number; line(n: number): { from: number } },
	changes: LineChange[]
): RangeSet<GutterMarker> {
	const builder = new RangeSetBuilder<GutterMarker>();

	for (const change of changes) {
		const marker =
			change.type === "added"
				? addedMarker
				: change.type === "modified"
				? modifiedMarker
				: deletedMarker;

		if (change.type === "deleted") {
			const line = Math.min(change.startLine, doc.lines);
			if (line >= 1) {
				builder.add(doc.line(line).from, doc.line(line).from, marker);
			}
		} else {
			const start = Math.max(1, change.startLine);
			const end = Math.min(change.endLine, doc.lines);
			for (let i = start; i <= end; i++) {
				builder.add(doc.line(i).from, doc.line(i).from, marker);
			}
		}
	}

	return builder.finish();
}

const gutterMarkersField = StateField.define<RangeSet<GutterMarker>>({
	create() {
		return RangeSet.empty;
	},
	update(markers, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setChangesEffect)) {
				return buildMarkers(tr.state.doc, effect.value);
			}
		}
		if (tr.docChanged) {
			// Map existing markers through document changes so positions stay valid.
			// They'll be replaced on the next git diff refresh anyway.
			return markers.map(tr.changes);
		}
		return markers;
	},
});

export function createGutterExtension() {
	const gutterExtension = gutter({
		class: "git-gutter",
		markers: (view) => view.state.field(gutterMarkersField),
	});

	return [gutterMarkersField, gutterExtension];
}

export function applySettingsToCSS(settings: GitGutterSettings) {
	let styleEl = document.getElementById("git-gutter-dynamic-styles");
	if (!styleEl) {
		styleEl = document.createElement("style");
		styleEl.id = "git-gutter-dynamic-styles";
		document.head.appendChild(styleEl);
	}

	styleEl.textContent = `
		.git-gutter-added {
			border-left: ${settings.gutterWidth}px solid ${settings.addedColor};
			height: 100%;
		}
		.git-gutter-modified {
			border-left: ${settings.gutterWidth}px solid ${settings.modifiedColor};
			height: 100%;
		}
		.git-gutter-deleted {
			border-left: 0;
			width: 0;
			height: 0;
			border-top: 4px solid transparent;
			border-bottom: 4px solid transparent;
			border-right: 6px solid ${settings.deletedColor};
			margin-left: -1px;
		}
	`;
}

export function removeSettingsCSS() {
	const styleEl = document.getElementById("git-gutter-dynamic-styles");
	if (styleEl) styleEl.remove();
}
