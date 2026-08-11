import type { Heading } from "@/features/markdown/headings";

type Props = {
  headings: Heading[];
};

/**
 * 目次。深さの絞り込み（h3 まで）は collectHeadings が済ませている。
 * 見出しが 1 つも無い記事では何も描かない。
 */
export default function ArticleToc({ headings }: Props) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <details className="toc">
      <summary>
        <h2>目次</h2>
      </summary>
      <ol>
        {headings.map((heading) => (
          <li key={heading.slug} className="toc-item" data-depth={heading.depth}>
            <a href={`#${heading.slug}`}>{heading.text}</a>
          </li>
        ))}
      </ol>
    </details>
  );
}
