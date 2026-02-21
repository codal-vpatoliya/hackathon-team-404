import { NextResponse } from "next/server";
import schema from "../../../sanity/schema.json";

export async function GET() {
  return NextResponse.json(schema);
}
