from __future__ import annotations

from typing import Any

from backend.config import settings
from backend.services.embeddings import embed_text
from backend.services.llm import generate_response
from backend.services.qdrant import qdrant_service


async def answer_with_context(
    query: str,
    language: str = "en",
    collection_name: str | None = None,
) -> dict[str, Any]:
    collection = collection_name or settings.QDRANT_COLLECTION

    # If Qdrant is configured and has documents, retrieve them.
    docs = qdrant_service.search(query, collection)

    if docs:
        context = "\n\n".join(
            f"[Source {i+1}]\n{d['text']}" for i, d in enumerate(docs)
        )
        sources = [
            {
                "title": d.get("title", "Official document"),
                "source": d.get("source", ""),
                "page": d.get("page"),
                "section": d.get("section"),
                "score": d.get("score"),
            }
            for d in docs
        ]
    else:
        context = (
            "No verified document chunk is currently available in the knowledge "
            "base. Do not invent a government scheme, legal rule, amount, deadline, "
            "or eligibility condition."
        )
        sources = []

    prompt = f"""
You are Sanyukt Vaani AI, a multilingual assistant for cooperative governance,
government schemes, PACS services, farmer support, insurance and legal information.

Language for the answer: {language}

IMPORTANT:
- Use ONLY the verified context below for factual claims.
- If the context does not contain the answer, clearly say that the verified
  knowledge base does not contain enough information.
- Never invent scheme names, eligibility, amounts, deadlines, legal sections,
  phone numbers or URLs.
- Give a short direct answer first.
- Then give practical steps when the source supports them.
- Mention source/document information when available.

VERIFIED CONTEXT:
{context}

USER QUESTION:
{query}
"""

    answer = await generate_response(prompt)
    return {
        "query": query,
        "language": language,
        "answer": answer,
        "sources": sources,
    }
