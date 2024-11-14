#! /usr/bin/env node

const path = require("path");
const fs = require("fs");
const { JSDOM } = require("jsdom");

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
    if (
      script.id !== "myscript" &&
      (!script.src || script.src.startsWith("/_next"))
    ) {
      script.remove();
    } else {
      script.innerHTML = decodeHTML(script.innerHTML);
    }
  });
  // as=scriptのlinkタグの削除
  document.querySelectorAll('link[as="script"]').forEach((link) => {
    link.remove();
  });

  // DOCTYPEの追加
  let modifiedHtml = document.documentElement.outerHTML;
  if (!document.documentElement.outerHTML.startsWith("<!DOCTYPE html>")) {
    modifiedHtml = "<!DOCTYPE html>" + document.documentElement.outerHTML;
  }
  // google tag managerの追加
  modifiedHtml = modifiedHtml.replace(
    "</body>",
    `  
    <!-- Google Analytics with setTimeOut -->
    <script async>
    let MEASUREMENT_ID="G-XXCZ8KW3CC";

    $(function() {
      setgtag();
    });

    function setgtag() {
      setTimeout(function() {

        let gtc = document.createElement("script");
        gtc.innerHTML='window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config", MEASUREMENT_ID);';

        document.body.appendChild(gtc);

        let gt=document.createElement("script");
        gt.src='https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
        document.body.appendChild(gt);
      }, 2500);
      
    }
    </script>
    </body>  
    `
  );
  fs.writeFileSync(htmlFilePath, modifiedHtml);
});

// ディレクトリの削除

fs.rmSync(path.join(dirPath, "/admin"), { recursive: true });
fs.rmSync(path.join(dirPath, "/articles/tag/undefined"), {
  recursive: true,
});

// decode HTML

function decodeHTML(str) {
  return str.replace(/&(?:([a-z]+?)|#(\d+?));/g, function (m, c, d) {
    return c
      ? {
          amp: "&",
          lt: "<",
          gt: ">",
          quot: '"',
          nbsp: " ",
        }[c] || m
      : d
      ? String.fromCharCode(d)
      : m;
  });
}
