#! /usr/bin/env node

import * as path from "path";
import * as fs from "fs";
import { JSDOM } from "jsdom";

const HTML_FILE_PATH = "out";

const FileType = {
  File: "file",
  Directory: "directory",
  Unknown: "unknown",
};

/**
 * ファイルの種類を取得する
 * @param {string} path パス
 * @return {FileType} ファイルの種類
 */

const getFileType = (path) => {
  try {
    const stat = fs.statSync(path);

    switch (true) {
      case stat.isFile():
        return FileType.File;

      case stat.isDirectory():
        return FileType.Directory;

      default:
        return FileType.Unknown;
    }
  } catch (e) {
    return FileType.Unknown;
  }
};

/**
 * 指定したディレクトリ配下のすべてのファイルをリストアップする
 * @param {string} dirPath 検索するディレクトリのパス
 * @return {string[]}
 */
const getHtmlFilePaths = (dirPath) => {
  const result = [];
  const paths = fs.readdirSync(dirPath);

  paths.forEach((a) => {
    const path = `${dirPath}/${a}`;

    switch (getFileType(path)) {
      case FileType.File:
        if (/^.+.html$/.test(path)) result.push(path);
        break;

      case FileType.Directory:
        result.push(...getHtmlFilePaths(path));
        break;

      default:
    }
  });

  return result;
};

const dirPath = path.join(process.cwd(), HTML_FILE_PATH);
const htmlFilePaths = getHtmlFilePaths(dirPath);

htmlFilePaths.forEach((htmlFilePath) => {
  const html = fs.readFileSync(htmlFilePath, "utf-8");
  const document = new JSDOM(html).window.document;

  // scriptタグの削除（外部から読み込んでいるものを除く）
  document.querySelectorAll("script").forEach((script) => {
    if (!script.src || script.src.startsWith("/_next")) {
      script.remove();
    }
  });
  // as=scriptのlinkタグの削除
  document.querySelectorAll('link[as="script"]').forEach((link) => {
    link.remove();
  });

  fs.writeFileSync(htmlFilePath, document.documentElement.outerHTML);
});

// ディレクトリの削除

fs.rmdirSync(path.join(dirPath, "/admin"), { recursive: true });
fs.rmdirSync(path.join(dirPath, "/articles/tag/undefined"), {
  recursive: true,
});
