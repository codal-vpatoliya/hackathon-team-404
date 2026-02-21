import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const { messages, schema } = await req.json();

    const systemInstruction = `
      You are SchemaMind, an expert Sanity CMS Content Architect.
      Below is the user's current Sanity Schema JSON. 
      Answer questions about this schema, write GROQ queries, or suggest content modeling improvements.
      Format your responses in clean Markdown.
      
      SCHEMA:
      ${JSON.stringify(schema)}
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedContents = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return NextResponse.json({ reply: response.text });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 },
    );
  }
}
