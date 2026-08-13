/**
 * 同時に走らせる本数を絞って map する。
 *
 * 全件を一斉に投げると、変換は CPU とメモリの取り合いで遅くなり、
 * 取得は相手のサイトへ一度に殺到する。画像とリンクカードの両方で使う。
 */
export async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      // 添字は index < items.length の範囲なので必ず存在する
      results[index] = await task(items[index] as T);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
