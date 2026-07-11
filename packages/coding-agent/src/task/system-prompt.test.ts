import { describe, expect, it } from "bun:test";
import "../config/prompt-templates";
import { parseAgent } from "./agents";
import { buildSubagentSystemPrompt, type SubagentSystemPromptData } from "./system-prompt";

const promptData = {
	agent: "You are the fixture executor.",
	context: "Use the supplied fixture context.",
	planReference: "1. Inspect the fixture.\n2. Return the result.",
	planReferencePath: "/tmp/fixture-plan.md",
	worktree: "/tmp/fixture-worktree",
	outputSchema: { properties: { result: { type: "string" } } },
	outputSchemaOverridesAgent: true,
	ircPeers: "- fixture-peer: checking a sibling fixture",
	ircSelfId: "fixture-self",
} satisfies SubagentSystemPromptData;

describe("subagent system prompt presets", () => {
	it("preserves default prompt assembly exactly", () => {
		const inherited = ["SYSTEM_SENTINEL", "PROJECT_RULE_SKILL_SENTINEL", "DYNAMIC_SENTINEL"];
		const expectedContract = buildSubagentSystemPrompt([], undefined, promptData)[0];

		expect(buildSubagentSystemPrompt(inherited, undefined, promptData)).toEqual([
			inherited[0],
			inherited[1],
			expectedContract,
			inherited[2],
		]);
	});

	it("keeps only the task contract for minimal-task", () => {
		const result = buildSubagentSystemPrompt(
			["SYSTEM_SENTINEL", "PROJECT_RULE_SKILL_SENTINEL", "DYNAMIC_SENTINEL"],
			"minimal-task",
			promptData,
		);

		expect(result).toHaveLength(1);
		const rendered = result[0];
		expect(rendered).toContain(promptData.agent);
		expect(rendered).toContain(promptData.context);
		expect(rendered).toContain(promptData.planReference);
		expect(rendered).toContain(promptData.worktree);
		expect(rendered).toContain(promptData.ircPeers);
		expect(rendered).toContain(promptData.ircSelfId);
		expect(rendered).toContain("Yield protocol:");
		expect(rendered).toContain("result: string;");
		expect(rendered).not.toContain("SENTINEL");
	});

	it("parses minimal-task and rejects unknown presets", () => {
		const valid = parseAgent(
			"fixture.md",
			"---\nname: fixture\ndescription: fixture agent\nsystemPreset: minimal-task\n---\nDo the fixture.",
			"project",
		);
		expect(valid.systemPreset).toBe("minimal-task");

		expect(() =>
			parseAgent(
				"fixture.md",
				"---\nname: fixture\ndescription: fixture agent\nsystemPreset: unknown\n---\nDo the fixture.",
				"project",
			),
		).toThrow('Invalid systemPreset: unknown. Expected "minimal-task".');
	});
});
