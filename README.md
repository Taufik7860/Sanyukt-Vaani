# Sanyukt Vaani

Project scaffold for the Sanyukt Vaani frontend, backend, RAG pipeline, and hardware integrations.

## Structure

- `frontend/` - User interface and client services
- `backend/` - API entry point, routes, models, and integrations
- `rag/` - Documents, ingestion, embeddings, and prompts
- `hardware/` - ESP32 and Raspberry Pi code
- `tests/` - Automated tests
- `docker/` - Container-related files

## Officer Portal

The backend exposes a protected officer portal for yearly knowledge updates. Officers can submit and approve updates for policies, crop insurance, government schemes, laws/bylaws, farmer loans, and circulars.

For local development, the default officer login is:

- Email: `officer@sanyuktvaani.gov.in`
- Password: `Sanyukt@2026!`

Override these values with `OFFICER_EMAIL`, `OFFICER_PASSWORD`, and `OFFICER_SESSION_SECRET` in `.env` before deployment. Start the backend with `uvicorn backend.main:app --reload` from the repository root, then start the frontend from `frontend/`.



```mermaid
graph TD
    %% Define Styles and Colors
    classDef user fill:#E8EAF6,stroke:#3F51B5,stroke-width:2px,color:#000;
    classDef core fill:#E1F5FE,stroke:#0288D1,stroke-width:2px,color:#000;
    classDef qdrant fill:#FCE4EC,stroke:#EC407A,stroke-width:2px,color:#000;
    classDef note fill:#E0F2F1,stroke:#009688,stroke-dasharray: 5 5,color:#000;
    classDef side fill:#F3E5F5,stroke:#8E24AA,stroke-width:2px,color:#000;
    classDef output fill:#FCE4EC,stroke:#EC407A,stroke-dasharray: 5 5,color:#000;
    classDef llm fill:#E8EAF6,stroke:#3F51B5,stroke-width:2px,color:#000;

    %% Central Flow
    User[USER <br> Text / Voice Input]:::user
    LD[Language Detection + STT <br> Detects user language, text, intent]:::core
    QE[Query Embedding <br> Converts text to vector embedding]:::core
    QD[(Qdrant <br> Vector Database)]:::qdrant
    RODC[Relevant Official <br> Document Chunks]:::core
    RAG[RAG Pipeline <br> Retrieval + Generation]:::core
    PE[Prompt Engineering <br> Rules + Context + Query]:::core
    Gemini[Gemini <br> LLM Generation]:::llm
    Ans[Answer + Sources + Steps]:::core
    Out[TTS / Text Output <br> Voice or Text Response]:::core

    %% Connection Arrows for Main Flow
    User --> LD
    LD --> QE
    QE --> QD
    QD --> RODC
    RODC --> RAG
    RAG --> PE
    PE --> Gemini
    Gemini --> Ans
    Ans --> Out

    %% Side Panels & External Links
    KB[Official Documents <br> Knowledge Base <br><br> • Government Schemes<br>• Cooperative Rules<br>• PACS Guidelines<br>• Legal Documents<br>• Insurance Policies<br>• Financial Literacy Docs<br>• FAQs & Circulars]:::side
    KB -->|Feeds Data| QD

    SS[Supporting Services <br><br> • Supabase <br> • FastAPI <br> • React <br> • Deployment]:::side
    SS -->|Powers Backend & Data| RAG

    %% Output Info Cards (Right Side)
    NoteLD[Output:<br>• Detected Language: Marathi<br>• Text Query: PACS se loan ke liye...]:::note
    NoteQE[Output:<br>• Query Vector<br>[0.21, -0.14, 0.73...]]:::note
    NoteQD[Stores:<br>• Vector Embeddings<br>• Text Chunks<br>• Metadata]:::output
    NoteRODC[Top-K Results:<br>• Most relevant chunks<br>• With metadata<br>• Based on similarity]:::note
    NoteRAG[Works as:<br>• Retrieves context<br>• Feeds to LLM<br>• Reduces hallucination]:::note
    NotePE[Includes:<br>• Role definition<br>• Instructions & safety<br>• Language control]:::note
    NoteGemini[Generates:<br>• Accurate answer<br>• In user language<br>• Source citations]:::note
    NoteAns[Example Output:<br>• Direct Answer<br>• Practical Steps<br>• Source Info]:::output
    NoteOut[Output Mode:<br>• Voice TTS<br>• Text UI]:::note

    %% Dashed Links to Side Info Cards
    LD -.-> NoteLD
    QE -.-> NoteQE
    QD -.-> NoteQD
    RODC -.-> NoteRODC
    RAG -.-> NoteRAG
    PE -.-> NotePE
    Gemini -.-> NoteGemini
    Ans -.-> NoteAns
    Out -.-> NoteOut
```
