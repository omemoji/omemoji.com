import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { artworkSchema } from "@/collections/artworks";
import { generateSchema, outPath } from "./gen-schema";

const rootDir = path.join(import.meta.dirname, "..");

/**
 * 書き出しは `import.meta.main` で守る。
 *
 * ガードが無いと **import しただけで `_schema.json` が上書きされる**。
 * 同じプロセスの中では import 時に既に書き終わっているため前後比較では捕まらない。
 * 別プロセスで import だけを行い、ファイルが触られないことを見る
 */
describe("実行ガード", () => {
  test("import しただけでは _schema.json を書き換えない", () => {
    const before = fs.readFileSync(outPath, "utf-8");
    const mtime = fs.statSync(outPath).mtimeMs;

    const imported = Bun.spawnSync(["bun", "-e", 'await import("./scripts/gen-schema.ts")'], {
      cwd: rootDir,
    });

    try {
      expect(imported.exitCode).toBe(0);
      expect(fs.statSync(outPath).mtimeMs).toBe(mtime);
    } finally {
      // 落ちたときは書き換えられているので戻す。テストが作業ツリーを汚さないため
      fs.writeFileSync(outPath, before, "utf-8");
    }
  });

  test("直接実行すれば書き出す", () => {
    const before = fs.readFileSync(outPath, "utf-8");

    const executed = Bun.spawnSync(["bun", "run", "scripts/gen-schema.ts"], { cwd: rootDir });

    try {
      expect(executed.exitCode).toBe(0);
      // 整形は package.json の generate:schema が biome で行うため、値で比べる
      expect(JSON.parse(fs.readFileSync(outPath, "utf-8"))).toEqual(JSON.parse(before));
    } finally {
      fs.writeFileSync(outPath, before, "utf-8");
    }
  });
});

describe("生成されるスキーマ", () => {
  const schema = generateSchema() as { required?: string[]; properties?: Record<string, unknown> };

  test("作品のスキーマから起こす", () => {
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual(
      Object.keys(artworkSchema.shape).sort()
    );
  });

  test("任意の項目は required に入らない", () => {
    // description・href・$schema は省ける。required に入ると全作品が検証に落ちる
    expect(schema.required).toEqual(["title", "date", "src", "tags"]);
  });

  test("コミットされた _schema.json が最新のスキーマと一致する", () => {
    // タグを足したのに再生成し忘れると、エディタの補完だけが古いままになる
    const onDisk = JSON.parse(fs.readFileSync(outPath, "utf-8"));

    expect(onDisk).toEqual(JSON.parse(JSON.stringify(generateSchema())));
  });
});
