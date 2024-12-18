import fs from "fs";
import { join } from "path";
import compiler from "lib/compiler";
import { mdInfo } from "lib/parser";

export const getArticleDir = (path: string) => join(process.cwd(), "src", path);

const getPaths = (path: string) => {
  const files = fs.readdirSync(getArticleDir(path), {
    withFileTypes: true,
    recursive: true,
  });
  return files.flatMap((file) =>
    file.isFile() && file.name.endsWith(".md") ? join(file.path, file.name) : []
  );
};

export const getArticlesData = async (path: string) => {
  const files = getPaths(path);
  const posts = await Promise.all(
    files.map(async (file) => {
      const content = fs.readFileSync(file, "utf-8");
      const res = await mdInfo(content);
      if (res.published === true || process.env.NODE_ENV === "development") {
        return res;
      } else {
        return {
          emoji: "",
          slug: "",
          title: "Not Found",
          tags: [],
          date: "1970-01-01",
          description: "",
          published: false,
        };
      }
    })
  );

  return posts.sort((a, b) => {
    const dateA = Number(a?.date?.replace(/-/g, ""));
    const dateB = Number(b?.date?.replace(/-/g, ""));
    return dateB - dateA;
  });
};

export const getTaggedArticlesData = async (path: string, tag: string) => {
  const articlesData = await getArticlesData(path);
  return articlesData.filter((article) => article?.tags?.includes(tag));
};

export const getArticleContent = async (path: string) => {
  const p =
    getPaths("content/articles").find((file) => file.endsWith(`${path}.md`)) ??
    "";
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
    new Set((await getArticlesData(path)).flatMap((meta) => meta?.tags ?? []))
  ).sort();
  return taglists;
};

export const pageIdGen = (stop: number) => {
  return [...Array(stop)].map((_, i) => (i + 1).toString()).slice(1);
};

export async function base64ToFile(base64: string, filePath: string) {
  // Base64文字列からデータ部分のみを取得し、プレフィックス（データURI）を削除
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // 画像ファイルを生成
  fs.writeFileSync(filePath, buffer);
  console.log(`File has been saved to ${filePath}`);
}

export async function deleteFile(filePath: string) {
  try {
    fs.unlinkSync("./public/" + filePath);
  } catch (err) {
    console.error(err);
  }
}
