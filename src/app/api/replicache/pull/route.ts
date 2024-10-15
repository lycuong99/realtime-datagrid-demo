import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({ message: "This is a post request" }, { status: 200 });
}
