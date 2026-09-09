from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY,EMBEDDING_MODEL,EMBEDDING_DIM
client=genai.Client(api_key=GEMINI_API_KEY)
def embed_query(text):
    r=client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=f"Task: retrieve official cooperative governance, scheme and legal information. Query: {text}",
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM))
    return r.embeddings[0].values
