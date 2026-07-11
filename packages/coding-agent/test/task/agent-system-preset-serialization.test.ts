import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { runAgentsCommand } from "@oh-my-pi/pi-coding-agent/cli/agents-cli";
import * as agentsModule from "@oh-my-pi/pi-coding-agent/task/agents";
import { parseAgent } from "@oh-my-pi/pi-coding-agent/task/agents";
import type { AgentDefinition } from "@oh-my-pi/pi-coding-agent/task/types";
import { prompt } from "@oh-my-pi/pi-utils";
import "../../src/config/prompt-templates";
import agentFrontmatterTemplate from "../../src/prompts/agents/frontmatter.md" with { type: "text" };

describe("agent system preset serialization", () => {
	let tempDir: string | undefined;

	afterEach(async () => {
		vi.restoreAllMocks();
		if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
		tempDir = undefined;
	});

	it("round-trips systemPreset through the bundled frontmatter template", () => {
		const content = prompt.render(agentFrontmatterTemplate, {
			name: "fixture",
			description: "fixture agent",
			systemPreset: "minimal-task",
			body: "Do the fixture.",
		});

		const parsed = parseAgent("embedded:fixture.md", content, "bundled");
		expect(parsed.systemPreset).toBe("minimal-task");
		expect(parsed.systemPrompt.trim()).toBe("Do the fixture.");
	});

	it("preserves systemPreset when unpacking a bundled agent", async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-agent-unpack-"));
		const agent: AgentDefinition = {
			name: "fixture",
			description: "fixture agent",
			systemPrompt: "Do the fixture.",
			systemPreset: "minimal-task",
			source: "bundled",
		};
		vi.spyOn(agentsModule, "loadBundledAgents").mockReturnValue([agent]);
		vi.spyOn(process.stdout, "write").mockReturnValue(true);

		await runAgentsCommand({ action: "unpack", flags: { dir: tempDir, force: true, json: true } });

		const content = await fs.readFile(path.join(tempDir, "fixture.md"), "utf8");
		const parsed = parseAgent("fixture.md", content, "project");
		expect(parsed.systemPreset).toBe("minimal-task");
		expect(parsed.systemPrompt.trim()).toBe(agent.systemPrompt);
	});
});
