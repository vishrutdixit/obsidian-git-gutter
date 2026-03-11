import { exec } from "child_process";

function run(cmd: string, cwd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(cmd, { cwd, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
			if (err) {
				// git diff returns exit code 1 when there are differences
				if (err.code === 1 && stdout) {
					resolve(stdout);
				} else {
					reject(new Error(stderr || err.message));
				}
			} else {
				resolve(stdout);
			}
		});
	});
}

export async function isGitRepo(vaultPath: string): Promise<boolean> {
	try {
		await run("git rev-parse --is-inside-work-tree", vaultPath);
		return true;
	} catch {
		return false;
	}
}

export async function getGitRoot(vaultPath: string): Promise<string> {
	const root = await run("git rev-parse --show-toplevel", vaultPath);
	return root.trim();
}

export async function getDiff(
	filePath: string,
	cwd: string
): Promise<string> {
	try {
		return await run(
			`git diff HEAD -- "${filePath}"`,
			cwd
		);
	} catch {
		// File might be untracked
		try {
			return await run(
				`git diff --no-index /dev/null "${filePath}"`,
				cwd
			);
		} catch (e) {
			// --no-index returns exit 1 on diff; stdout captured above
			if (e instanceof Error && e.message) {
				return "";
			}
			return "";
		}
	}
}

export async function isTracked(
	filePath: string,
	cwd: string
): Promise<boolean> {
	try {
		await run(`git ls-files --error-unmatch "${filePath}"`, cwd);
		return true;
	} catch {
		return false;
	}
}

export async function getUntrackedContent(
	filePath: string,
	cwd: string
): Promise<number | null> {
	try {
		const result = await run(`wc -l < "${filePath}"`, cwd);
		return parseInt(result.trim(), 10);
	} catch {
		return null;
	}
}
