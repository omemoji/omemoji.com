import { Picture } from "@/components/Image";

/** アイコンの表示サイズ。CSS の 10rem と揃える */
const ICON_SIZE = 160;

type Props = {
  title: string;
  description: string;
};

/** ページ先頭の見出し。アイコン・タイトル・説明 */
export default function Top({ title, description }: Props) {
  return (
    <div className="top">
      <Picture
        className="top-icon"
        src="/omemoji.png"
        alt="omemoji"
        width={ICON_SIZE}
        height={ICON_SIZE}
      />
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
