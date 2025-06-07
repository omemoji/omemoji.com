import fs from "fs/promises";
import path from "path";

export async function POST({
  request,
}: {
  request: Request;
}): Promise<Response> {
  try {
    // AstroのRequestからFormDataを取得
    const formData = await request.formData();
    const file = formData.get("image");
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ message: "No file uploaded or invalid file" }),
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ message: "Only image files are allowed!" }),
        { status: 400 }
      );
    }

    // ファイルサイズチェック (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          message: "File size too large. Maximum 10MB allowed.",
        }),
        { status: 400 }
      );
    }

    // アップロードディレクトリを作成
    const uploadDir = path.join(process.cwd(), "public/images/artworks");
    await fs.mkdir(uploadDir, { recursive: true });

    // ファイルを保存
    const filePath = path.join(uploadDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);

    console.log("File uploaded:", file.name);

    const publicPath = `/public/images/artworks/${file.name}`;

    return new Response(
      JSON.stringify({
        message: "File uploaded successfully",
        path: publicPath,
        filename: file.name,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({
        message: "Upload failed",
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
