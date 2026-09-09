from google import genai
from app.config import GEMINI_API_KEY,LLM_MODEL
client=genai.Client(api_key=GEMINI_API_KEY)
SYSTEM="""You are Sanyukt Vaani, a multilingual cooperative governance and legal assistance assistant.
Answer ONLY from supplied official document context. Never invent laws, eligibility, amounts, deadlines or procedures.
If context is insufficient, say the available official documents do not contain enough information.
Prefer clear step-by-step answers and reply in the user's language when practical."""
def answer(query,analysis,contexts):
    context="\n\n---\n\n".join(c["text"] for c in contexts if c.get("text"))
    prompt=f"{SYSTEM}\nUser language: {analysis['language']}\nIntent: {analysis['intent']}\nContext:\n{context}\n\nQuestion: {query}"
    r=client.models.generate_content(model=LLM_MODEL,contents=prompt)
    return r.text or "I could not generate an answer from the available official context."
