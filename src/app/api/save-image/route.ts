import { NextResponse } from "next/server";
import { base64ToFile } from "../../../lib/fs";

export async function POST(req: Request, res: NextResponse) {
  if (req.method === "POST") {
    const { base64, path } = await req.json();
    try {
      await base64ToFile(base64, path);
      return NextResponse.json(
        { message: "Image saved successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error saving image:", error);
      return NextResponse.json(
        { message: "Error saving image" },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json(
      { message: "Method Not Allowed" },
      { status: 405 }
    );
  }
}
