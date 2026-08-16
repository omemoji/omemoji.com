import { describe, expect, test } from "bun:test";

import { TAGS, tagLabels, toHashtag } from "@/collections/tags";

describe("TAGS", () => {
  test("重複が無い", () => {
    // 重複しても型は通るが、タグ一覧ページが二重に並ぶ
    expect(new Set(TAGS).size).toBe(TAGS.length);
  });

  test("URL に直接置けない文字を含まない", () => {
    // タグ名はそのまま /artworks/tag/<tag> になる
    const unusable = TAGS.filter((tag) => /[\s/?#%&=+]/.test(tag));

    expect(unusable).toEqual([]);
  });

  test("空文字を含まない", () => {
    expect(TAGS.filter((tag) => tag.length === 0)).toEqual([]);
  });
});

describe("tagLabels", () => {
  test("値が空文字ではない", () => {
    // キーが TAGS に無いことは型で防げるが、値の中身は防げない
    const empty = Object.entries(tagLabels).filter(([, label]) => !label);

    expect(empty).toEqual([]);
  });
});

describe("toHashtag", () => {
  // 特定のタグ名を書くと、そのタグを TAGS から消しただけでこのテストが落ちる。
  // 検証したいのは分岐の挙動なので、代表は一覧から選ぶ
  const labeled = TAGS.filter((tag) => tagLabels[tag] !== undefined);
  const unlabeled = TAGS.filter((tag) => tagLabels[tag] === undefined);

  test("日本語表現を持つタグと持たないタグが両方ある", () => {
    // 以下 2 つが空振りで通っていないことの対照実験
    expect(labeled.length).toBeGreaterThan(0);
    expect(unlabeled.length).toBeGreaterThan(0);
  });

  test("日本語表現があれば、タグ名ではなくそれを使う", () => {
    for (const tag of labeled) {
      expect(toHashtag(tag)).toBe(`#${tagLabels[tag]}`);
      expect(toHashtag(tag)).not.toBe(`#${tag}`);
    }
  });

  test("日本語表現が無ければタグ名をそのまま使う", () => {
    // 元から日本語のタグもこちらに含まれる
    for (const tag of unlabeled) {
      expect(toHashtag(tag)).toBe(`#${tag}`);
    }
  });

  test("ハッシュタグとして壊れる文字を含まない", () => {
    // 日本語表現側は型で検査されないため、ここで見る
    const broken = TAGS.filter((tag) => /[\s#]/.test(toHashtag(tag).slice(1)));

    expect(broken).toEqual([]);
  });
});
