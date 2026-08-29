import { describe, expect, test } from "bun:test";

import { mapWithLimit } from "@/features/concurrency";

/** 呼ばれた順に解決を待たせられるタスク。同時に何本走ったかを記録する */
const tracked = () => {
  const state = { running: 0, peak: 0, order: [] as number[] };
  const task = async (item: number): Promise<string> => {
    state.running++;
    state.peak = Math.max(state.peak, state.running);
    state.order.push(item);
    // 1 本目が走り切る前に次が始まるよう、必ず 1 度は手放す
    await Bun.sleep(1);
    state.running--;
    return `#${item}`;
  };
  return { state, task };
};

describe("mapWithLimit", () => {
  test("結果は入力の順序で返る", async () => {
    // 添字で書き戻すため、終わった順ではなく元の並びになる。
    // 画像もリンクカードも、結果を入力と対にして扱っている
    const items = [30, 10, 20];
    const results = await mapWithLimit(items, 2, async (item) => {
      await Bun.sleep(item);
      return item;
    });

    expect(results).toEqual([30, 10, 20]);
  });

  test("同時に走る本数が limit を超えない", async () => {
    const { state, task } = tracked();

    await mapWithLimit(
      [...Array(20)].map((_, i) => i),
      3,
      task
    );

    expect(state.peak).toBe(3);
    expect(state.order).toHaveLength(20);
  });

  test("件数より大きい limit でも余分な worker を作らない", async () => {
    // Math.min を外すと、items が空でも limit 本の worker が立つ
    const { state, task } = tracked();

    const results = await mapWithLimit([1, 2], 8, task);

    expect(results).toEqual(["#1", "#2"]);
    expect(state.peak).toBe(2);
  });

  test("空の入力では task を呼ばない", async () => {
    let calls = 0;
    const results = await mapWithLimit([], 4, async () => {
      calls++;
      return 0;
    });

    expect(results).toEqual([]);
    expect(calls).toBe(0);
  });

  test("全件が 1 度ずつ渡る", async () => {
    // next++ の取り合いを誤ると、同じ添字を 2 本が処理したり飛ばしたりする
    const items = [...Array(50)].map((_, i) => i);

    const results = await mapWithLimit(items, 7, async (item) => {
      await Bun.sleep(item % 3);
      return item * 2;
    });

    expect(results).toEqual(items.map((item) => item * 2));
  });

  test("task の例外はそのまま伝わる", async () => {
    // 握り潰すと、変換や取得が黙って欠けたまま成功したように見える
    expect(
      mapWithLimit([1, 2, 3], 2, async (item) => {
        if (item === 2) throw new Error("boom");
        return item;
      })
    ).rejects.toThrow("boom");
  });
});
