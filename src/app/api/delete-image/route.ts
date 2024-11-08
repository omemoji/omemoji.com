import { NextResponse } from "next/server";
import { deleteFile } from "../../../lib/fs";

export async function POST(req: Request) {
  if (req.method === "POST") {
    const { path } = await req.json();
    try {
      await deleteFile(path);
      return NextResponse.json(
        { message: "Image deleted successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error saving image:", error);
      return NextResponse.json(
        { message: "Error deleting image" },
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
