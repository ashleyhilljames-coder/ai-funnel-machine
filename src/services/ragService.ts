import { generateEmbedding } from './embeddingService.js';
import { LeadGuard } from '../outbound/leadGuard.js';

const leadGuard = new LeadGuard();

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export interface RAGMatchResult {
  content: string;
  score: number;
}

/**
 * Searches the client's knowledge base using vector cosine similarity (dot product)
 */
export async function queryRAG(clientId: string, query: string, limit: number = 3): Promise<RAGMatchResult[]> {
  try {
    const queryVector = await generateEmbedding(query);
    const kb = leadGuard.getKnowledgeBase(clientId);

    if (!kb || kb.length === 0) {
      return [];
    }

    const matches: RAGMatchResult[] = kb.map(chunk => {
      const score = dotProduct(queryVector, chunk.embedding);
      return {
        content: chunk.content,
        score
      };
    });

    // Sort by descending score (highest similarity first)
    matches.sort((a, b) => b.score - a.score);

    // Return top matching chunks within limit
    return matches.slice(0, limit);
  } catch (err: any) {
    console.error("❌ RAG retrieval failure:", err.message);
    return [];
  }
}

/**
 * Retrieves matching context for LLM prompt insertion
 */
export async function retrieveContext(clientId: string, query: string, limit: number = 3): Promise<string> {
  const matches = await queryRAG(clientId, query, limit);
  if (matches.length === 0) return "";

  console.log(`🔍 [RAG Retrieval] Found ${matches.length} matching knowledge chunk(s) for client "${clientId}"`);
  return matches.map(m => `[Fact (Similarity: ${(m.score * 100).toFixed(1)}%)]:\n${m.content}`).join("\n\n");
}
