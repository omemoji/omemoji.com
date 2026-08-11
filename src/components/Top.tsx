type Props = {
  title: string;
  description: string;
};

/** ページ先頭の見出し。アイコン・タイトル・説明 */
export default function Top({ title, description }: Props) {
  return (
    <div className="top">
      <img className="top-icon" src="/omemoji.png" alt="omemoji" width={160} height={160} />
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
