import fs from "fs";
import { join } from "path";
import compiler from "lib/compiler";
import { mdInfo } from "lib/parser";

export const getArticleDir = (path: string) => join(process.cwd(), "src", path);

const getPaths = (path: string) => {
  const files = fs.readdirSync(getArticleDir(path), {
    withFileTypes: true,
  });
  return files.flatMap((file) =>
    file.isFile() && file.name.endsWith(".md")
      ? join(getArticleDir(path), file.name)
      : []
  );
};

export const getArticlesData = async (path: string) => {
  const files = getPaths(path);
  const posts = await Promise.all(
    files.map(async (file) => {
      const content = fs.readFileSync(file, "utf-8");
      const res = await mdInfo(content);
      return res;
    })
  );

  return posts.sort((a, b) => {
    const dateA = Number(a.date?.replace(/-/g, ""));
    const dateB = Number(b.date?.replace(/-/g, ""));
    return dateB - dateA;
  });
};

export const getTaggedArticlesData = async (path: string, tag: string) => {
  const articlesData = await getArticlesData(path);
  return articlesData.filter((article) => article.tags.includes(tag));
};

export const getArticleContent = async (path: string) => {
  const p = "./src/content/articles/" + path + ".md";
  const file = fs.readFileSync(p, "utf-8");
  const file_sliced = file
    .slice(4)
    .slice(file.slice(4).indexOf("---"))
    .slice(5);
  const { content } = await compiler(file_sliced);
  return content;
};

export const getTags = async (path: string) => {
  const taglists = Array.from(
    new Set((await getArticlesData(path)).flatMap((meta) => meta.tags ?? []))
  ).sort();
  return taglists;
};

export const pageIdGen = (stop: number) => {
  return [...Array(stop)].map((_, i) => (i + 1).toString()).slice(1);
};
