from app.nlp.processor import analyze
def test_marathi_romanized():
    r=analyze("Majhya PACS madhun pik karj kasa milel?")
    assert r["language"]=="mr-Latn" and r["intent"]=="PACS_LOAN"
def test_hindi():
    r=analyze("PACS से फसल ऋण कैसे मिलेगा?")
    assert r["language"]=="hi" and r["intent"]=="PACS_LOAN"
def test_marathi():
    r=analyze("माझ्या PACS मधून पीक कर्ज कसं मिळेल?")
    assert r["language"]=="mr" and r["intent"]=="PACS_LOAN"
