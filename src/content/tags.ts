/**
 * サイト全体で使えるタグの一覧。記事・作品の両方がここから引く。
 * 新しいタグを使うときはこの配列に追加する（追加を忘れると検証で落ちる）。
 * タグ名は URL になる（/artworks/tag/<tag>）ため、変更はリダイレクトの要否を伴う。
 */
export const TAGS = [
  "Acryl",
  "Adobe_Illustrator",
  "Analog",
  "Android",
  "Apple",
  "AsahiLinux",
  "Asoblock",
  "Bird",
  "Bun",
  "Dragon",
  "Game",
  "Illustration",
  "Inkscape",
  "Krita",
  "Life",
  "Linux",
  "Minecraft",
  "Music",
  "Nextjs",
  "New_Year",
  "OriginalCharacter",
  "Tech",
  "Test",
  "TypeScript",
  "Ubuntu",
  "VoidLinux",
  "Web",
  "インターン",
  "ゴールデンカムイ",
  "就活",
  "感想",
  "旅行",
  "日記",
  "図画団",
  "東方",
  "漫画",
  "漫画研究会",
] as const;

export type Tag = (typeof TAGS)[number];

/**
 * 日本語表現を持つタグだけの対応表。ハッシュタグ生成に使う。
 * 全タグを埋める必要はないが、TAGS に無いキーは書けない。
 */
export const tagLabels: Partial<Record<Tag, string>> = {
  Analog: "アナログ",
  Illustration: "イラスト",
  New_Year: "年賀状",
  OriginalCharacter: "オリキャラ",
};

/** ハッシュタグ表記。日本語表現があればそれを、無ければタグ名をそのまま使う。 */
export const toHashtag = (tag: Tag): string => `#${tagLabels[tag] ?? tag}`;
