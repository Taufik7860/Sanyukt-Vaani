from app.retrieval.qdrant import normalize_hit
def test_payload_normalization():
    class Hit:
        score=.91
        payload={"text":"Official PACS information","source":"ministry.pdf","page":12,"metadata":{"document":"ministry.pdf"}}
    r=normalize_hit(Hit())
    assert r["score"]==.91 and r["text"]=="Official PACS information"
    assert r["metadata"]["source"]=="ministry.pdf"
