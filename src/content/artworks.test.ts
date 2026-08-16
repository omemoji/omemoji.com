import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { artworkSchema, loadArtworks } from "@/content/artworks";

// 実データ（content/artworks）の検査は artworks.integration.test.ts にある

// 以下は落ちたらコードを直す
describe("artworkSchema", () => {
  test("一覧に無いタグは受け付けない", () => {
    const valid = {
      title: "Test",
      date: "2026-01-01",
      src: "test.webp",
    };
    expect(artworkSchema.safeParse({ ...valid, tags: ["Illustration"] }).success).toBe(true);
    expect(artworkSchema.safeParse({ ...valid, tags: ["NotARegisteredTag"] }).success).toBe(false);
  });
});

const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

const validMeta = {
  title: "サンプル",
  date: "2026-01-15",
  src: "sample.webp",
  tags: ["Illustration"],
};

/** 既定の meta を上書き（null で削除）して meta.json の中身を組み立てる */
const meta = (overrides: Partial<Record<keyof typeof validMeta, unknown>> = {}) =>
  Object.fromEntries(
    Object.entries({ ...validMeta, ...overrides }).filter(([, value]) => value !== null)
  );

/**
 * 作品ディレクトリ群を含む一時ディレクトリを作り、その baseDir を返す。
 * 値が文字列ならそのまま meta.json に書き、null ならディレクトリだけ作る。
 */
const fixture = (artworks: Record<string, unknown>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "artworks-"));
  tempDirs.push(dir);

  for (const [id, content] of Object.entries(artworks)) {
    fs.mkdirSync(path.join(dir, id), { recursive: true });
    if (content === null) continue;
    const raw = typeof content === "string" ? content : JSON.stringify(content);
    fs.writeFileSync(path.join(dir, id, "meta.json"), raw);
  }

  return dir;
};

describe("loadArtworks", () => {
  test("フィクスチャ自体は正常に読める", () => {
    // 以下の異常系が「常に throw する作り」になっていないことの対照実験
    const loaded = loadArtworks(fixture({ sample: meta() }));

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe("sample");
    // date はスキーマ上は文字列だが、ドメイン型では Date で持つ
    expect(loaded[0]?.date).toEqual(new Date("2026-01-15"));
  });

  test("ディレクトリ以外は読まない", () => {
    // content/artworks には _schema.json が同居している
    const dir = fixture({ sample: meta() });
    fs.writeFileSync(path.join(dir, "_schema.json"), "{}");

    expect(loadArtworks(dir).map((artwork) => artwork.id)).toEqual(["sample"]);
  });
});

describe("loadArtworks の並び", () => {
  test("日付の降順に並ぶ", () => {
    const loaded = loadArtworks(
      fixture({
        old: meta({ date: "2024-01-01" }),
        new: meta({ date: "2026-01-01" }),
        mid: meta({ date: "2025-01-01" }),
      })
    );

    expect(loaded.map((artwork) => artwork.id)).toEqual(["new", "mid", "old"]);
  });

  test("日付が同じ作品は id の昇順に並ぶ", () => {
    // readdirSync の順序に依存せず並びが確定することを、実データに頼らず固定する
    const same = { date: "2025-05-05" };
    const loaded = loadArtworks(fixture({ c: meta(same), a: meta(same), b: meta(same) }));

    expect(loaded.map((artwork) => artwork.id)).toEqual(["a", "b", "c"]);
  });
});

describe("loadArtworks の異常系", () => {
  test("meta.json が無いと throw する", () => {
    expect(() => loadArtworks(fixture({ sample: null }))).toThrow(/meta\.json/);
  });

  test("meta.json が JSON として壊れていると throw する", () => {
    expect(() => loadArtworks(fixture({ sample: "{ not json" }))).toThrow(/Invalid JSON/);
  });

  test.each([
    ["未登録のタグ", { tags: ["NotARegisteredTag"] }],
    ["日付の書式違反", { date: "2026/01/15" }],
    ["存在しない日付", { date: "2026-02-30" }],
    ["必須フィールドの欠落", { title: null }],
    ["型の不一致", { src: 42 }],
  ])("%s は throw する", (_label, overrides) => {
    expect(() => loadArtworks(fixture({ sample: meta(overrides) }))).toThrow(/Invalid meta/);
  });

  test("エラーメッセージに該当ファイルのパスが含まれる", () => {
    // 作品が増えたときに、どの meta.json が原因か特定できる必要がある
    expect(() => loadArtworks(fixture({ sample: meta({ title: null }) }))).toThrow(
      path.join("sample", "meta.json")
    );
  });
});
