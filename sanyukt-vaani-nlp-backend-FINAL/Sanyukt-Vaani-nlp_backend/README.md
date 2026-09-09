# Sanyukt Vaani — NLP Backend

Upload this whole folder as `nlp_backend/` at the repository root.

Do NOT replace the team's existing `backend/` or `rag/` folders.

Flow:
User Query → Language Detection → Intent/Entities → Gemini Embedding 2 → Qdrant → Official Context → Gemini → Answer + Sources

## Run
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001

## Test
pytest -q

## API
POST /api/nlp/process
Example body:
{"query":"माझ्या PACS मधून पीक कर्ज कसं मिळेल?","top_k":5}

The Qdrant collection defaults to `kb_docs` and expects a `text` payload. Existing vectors made with a different embedding model must not be mixed with Gemini Embedding 2 vectors.
