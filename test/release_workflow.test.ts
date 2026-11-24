/**
 * The npm release workflow (AGENTS-12, task R1 of the Stats design): the job
 * that builds and tests holds no publishing identity, the job that holds it
 * waits for the npm-publish environment and installs, builds and tests
 * nothing, and every action is pinned by commit.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const text = readFileSync(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
const lines = text.split("\n").filter((line) => !line.trim().startsWith("#"));

/** The lines of one job: from its header to the next job header. */
function job(name: string): string[] {
  const start = lines.findIndex((line) => line === `  ${name}:`);
  assert.ok(start >= 0, `job ${name}`);
  const end = lines.findIndex((line, i) => i > start && /^ {2}[a-z][a-z0-9_-]*:\s*$/.test(line));
  return lines.slice(start, end < 0 ? undefined : end);
}

describe("the npm release workflow", () => {
  it("has two jobs: build, then publish", () => {
    const jobs = lines
      .slice(lines.indexOf("jobs:"))
      .filter((line) => /^ {2}[a-z][a-z0-9_-]*:\s*$/.test(line))
      .map((line) => line.trim());
    assert.deepEqual(jobs, ["build:", "publish:"]);
    assert.ok(job("publish").includes("    needs: build"));
  });

  it("the build job, which installs and tests, holds no publishing identity", () => {
    const build = job("build").join("\n");
    assert.ok(!build.includes("id-token"));
    assert.ok(build.includes("npm ci --ignore-scripts"));
    assert.ok(build.includes("npm test"));
    assert.ok(build.includes("npm pack"));
    const top = lines.slice(0, lines.indexOf("jobs:")).join("\n");
    assert.ok(!top.includes("id-token"), "no workflow-wide identity");
  });

  it("the publish job waits for npm-publish and installs, builds and tests nothing", () => {
    const publish = job("publish");
    assert.ok(publish.includes("    environment: npm-publish"));
    assert.ok(publish.includes("      id-token: write"));
    for (const line of publish) {
      assert.ok(!/\b(npm (ci|install|i|test|run|exec|rebuild)|npx|yarn|pnpm)\b/.test(line), line);
    }
    assert.ok(publish.some((line) => line.includes('npm publish "./package/$TARBALL"') && line.includes("--ignore-scripts")));
    assert.ok(publish.some((line) => line.includes("sha256sum --check")));
  });

  it("every action is pinned by commit", () => {
    const uses = lines.filter((line) => /^\s*-?\s*uses:/.test(line));
    assert.ok(uses.length >= 4);
    for (const line of uses) assert.match(line, /uses: [A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}\b/, line);
  });
});
