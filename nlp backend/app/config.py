import os
from dotenv import load_dotenv
load_dotenv()
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY","")
QDRANT_URL=os.getenv("QDRANT_URL","http://localhost:6333")
QDRANT_API_KEY=os.getenv("QDRANT_API_KEY","")
EMBEDDING_MODEL="gemini-embedding-2"
EMBEDDING_DIM=768
LLM_MODEL=os.getenv("LLM_MODEL","gemini-2.5-flash")
COLLECTION_NAME=os.getenv("COLLECTION_NAME","kb_docs")
