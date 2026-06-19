import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generates vector embedding vector for a given text input using OpenAI text-embedding-3-small
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.replace(/\n/g, " ")
    });
    return response.data[0].embedding;
  } catch (err: any) {
    console.error("❌ Failed to generate embedding from OpenAI:", err.message);
    throw err;
  }
}

/**
 * Splits text content into chunks of specified maximum length with overlap
 */
export function chunkText(text: string, maxLength: number = 800, overlap: number = 100): string[] {
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxLength;
    if (endIndex < text.length) {
      // Find last whitespace to avoid splitting words
      const lastSpace = text.substring(startIndex, endIndex).lastIndexOf(" ");
      if (lastSpace > maxLength * 0.8) {
        endIndex = startIndex + lastSpace;
      }
    }
    chunks.push(text.substring(startIndex, endIndex).trim());
    startIndex = endIndex - overlap;
    if (startIndex >= text.length - overlap) break;
  }

  return chunks;
}
