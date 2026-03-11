import { LineChange } from "./types";

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseDiff(diffOutput: string): LineChange[] {
	const changes: LineChange[] = [];
	const lines = diffOutput.split("\n");

	let newLine = 0;

	for (const line of lines) {
		const hunkMatch = line.match(HUNK_HEADER);
		if (hunkMatch) {
			const oldStart = parseInt(hunkMatch[1], 10);
			const oldCount = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
			newLine = parseInt(hunkMatch[3], 10);
			const newCount = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1;

			// Pure deletion: new side has 0 lines for this hunk
			if (newCount === 0) {
				changes.push({
					type: "deleted",
					// Show the delete marker at the line before the deletion,
					// or line 1 if deleted at the very top
					startLine: Math.max(newLine, 1),
					endLine: Math.max(newLine, 1),
				});
			}

			continue;
		}

		if (line.startsWith("---") || line.startsWith("+++")) {
			continue;
		}
		if (line.startsWith("diff ") || line.startsWith("index ")) {
			continue;
		}

		if (line.startsWith("-")) {
			// Deleted line in old file -- we handle pure-deletion hunks above.
			// Mixed hunks (modify) are detected by consecutive -/+ lines.
			// We'll handle this by post-processing: if a region has both
			// deletions and additions at the same position, it's a modification.
			continue;
		}

		if (line.startsWith("+")) {
			changes.push({
				type: "added",
				startLine: newLine,
				endLine: newLine,
			});
			newLine++;
			continue;
		}

		if (line.startsWith(" ") || line === "") {
			newLine++;
			continue;
		}
	}

	return mergeAndClassify(changes, diffOutput);
}

/**
 * Post-process: merge consecutive added lines into ranges,
 * and reclassify as "modified" when the hunk also has deletions.
 */
function mergeAndClassify(changes: LineChange[], diffOutput: string): LineChange[] {
	if (changes.length === 0) return changes;

	// Parse hunks to know which ones have deletions
	const hunksWithDeletions = new Set<number>();
	const hunkStartLines: number[] = [];
	const lines = diffOutput.split("\n");
	let currentHunkNewStart = 0;
	let hasDeletionInHunk = false;

	for (const line of lines) {
		const hunkMatch = line.match(HUNK_HEADER);
		if (hunkMatch) {
			if (hasDeletionInHunk && currentHunkNewStart > 0) {
				hunksWithDeletions.add(currentHunkNewStart);
			}
			currentHunkNewStart = parseInt(hunkMatch[3], 10);
			hunkStartLines.push(currentHunkNewStart);
			hasDeletionInHunk = false;
			continue;
		}
		if (line.startsWith("-") && !line.startsWith("---")) {
			hasDeletionInHunk = true;
		}
	}
	if (hasDeletionInHunk && currentHunkNewStart > 0) {
		hunksWithDeletions.add(currentHunkNewStart);
	}

	// Merge consecutive same-type changes
	const merged: LineChange[] = [];
	let current = { ...changes[0] };

	for (let i = 1; i < changes.length; i++) {
		const c = changes[i];
		if (c.type === current.type && c.startLine === current.endLine + 1) {
			current.endLine = c.endLine;
		} else {
			merged.push(current);
			current = { ...c };
		}
	}
	merged.push(current);

	// Reclassify added regions as modified if their hunk had deletions
	// Find which hunk each change belongs to
	for (const change of merged) {
		if (change.type !== "added") continue;

		// Find the hunk this change belongs to (largest hunkStart <= change.startLine)
		let belongsToHunk = 0;
		for (const hs of hunkStartLines) {
			if (hs <= change.startLine) {
				belongsToHunk = hs;
			}
		}

		if (hunksWithDeletions.has(belongsToHunk)) {
			change.type = "modified";
		}
	}

	return merged;
}
