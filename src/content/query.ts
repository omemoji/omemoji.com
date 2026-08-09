export const filterByTag = <T extends { tags: readonly string[] }>(
  contents: T[],
  tag: string
): T[] => {
  return contents.filter((content) => content.tags.includes(tag));
};

export const collectTags = <T extends { tags: readonly string[] }>(contents: T[]): string[] => [
  ...new Set(contents.flatMap((c) => c.tags)),
];

export const sortByDate = <T extends { date: string }>(contents: T[]): T[] => {
  // 配列に破壊的変更を加えるため、スプレッド構文で新しい配列を作成してからソートする
  return [...contents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
