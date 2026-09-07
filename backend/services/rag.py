# backend/services/rag.py
from qdrant_client import QdrantClient
from backend.config import settings
from backend.services.embeddings import get_query_embedding
from backend.services.llm import generate_response

qdrant_client = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY
)

SYSTEM_PROMPT_TEMPLATE = """You are "Sanyukt Vaani" (संयुक्त वाणी), an expert AI Legal & Scheme Assistant specializing in Indian Cooperative Governance, PACS services, government schemes, and legal bylaws for rural citizens and farmers.

STRICT RAG RULES:
1. Base your answer ONLY and EXCLUSIVELY on the provided "RETRIEVED CONTEXT" below.
2. Do NOT use any external knowledge, internal pre-training memory, or make assumptions.
3. If the answer cannot be found or deduced from the provided context, respond EXACTLY with:
   "Forgive me, but I do not have official information regarding this scheme/rule in my current repository."
4. Keep the tone polite, empathetic, clear, and easy to understand for rural users.

OUTPUT FORMATTING REQUIREMENTS:
- Direct Summary: Provide a 1-2 sentence direct summary at the top.
- Step-by-Step / Key Points: Use clear, numbered bullet points for procedures, eligibility criteria, or rules.
- Required Documents: Explicitly list any required documents (e.g., Aadhaar card, land records, bank passbook) if specified in the context.

--- RETRIEVED CONTEXT START ---
{context}
--- RETRIEVED CONTEXT END ---

User Question: {query}

Answer:"""

async def answer_with_context(query: str, collection_name: str = "kb_docs") -> str:
    # 1. Convert query to vector representation
    query_vector = get_query_embedding(query)
    
    # 2. Retrieve top-matching document chunks from Qdrant
    search_results = qdrant_client.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=3
    )
    
    # 3. Extract text content from vector payloads
    retrieved_texts = [
        hit.payload.get("text", "") 
        for hit in search_results 
        if hit.payload and "text" in hit.payload
    ]
    
    context = "\n---\n".join(retrieved_texts) if retrieved_texts else "NO CONTEXT FOUND IN DATABASE."
    
    # 4. Construct production-grade prompt with strict guardrails
    prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context, query=query)

    # 5. Generate final output using LLM service
    return await generate_response(prompt)