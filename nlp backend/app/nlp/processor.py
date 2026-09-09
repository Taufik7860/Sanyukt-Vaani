import re
INTENTS={
"PACS_LOAN":["loan","कर्ज","कर्ज़","पीक कर्ज","crop loan","ऋण","karj"],
"PACS_MEMBERSHIP":["member","membership","सभासद","सदस्य"],
"PACS_SERVICES":["pacs","सेवा","services","cooperative","सहकारी"],
"SCHEME":["scheme","योजना","योजने","yojana"],
"PMFBY":["pmfby","crop insurance","पीक विमा","फसल बीमा"],
"GRIEVANCE":["complaint","grievance","तक्रार","शिकायत"],
"COOPERATIVE_LAW":["law","act","कायदा","कानून","अधिनियम"],
"BYLAWS":["bye-law","bylaws","उपविधी","उपनियम"],
"FINANCIAL_LITERACY":["interest","ब्याज","व्याज","savings"]
}
def detect_language(q):
    if re.search(r"[\u0900-\u097F]",q):
        return "mr" if any(x in q for x in ["माझ्या","कसे","कसं","आहे","मध्ये","पीक","विमा","मिळेल"]) else "hi"
    x=q.lower()
    if re.search(r"\b(kasa|kashi|mala|majha|aahe|karaycha|madhun|pik|karj)\b",x): return "mr-Latn"
    if re.search(r"\b(hai|kaise|mujhe|mera|karna|milega)\b",x): return "hi-Latn"
    return "en"
def classify_intent(q):
    x=q.lower()
    for intent,keys in INTENTS.items():
        if any(k.lower() in x for k in keys): return intent
    return "GENERAL"
def extract_entities(q):
    x=q.lower(); e={}
    if any(k in x for k in ["pacs","पॅक्स","सहकारी"]): e["organization"]="PACS/cooperative"
    if any(k in x for k in ["loan","कर्ज","कर्ज़","ऋण","karj"]): e["service"]="loan"
    if any(k in x for k in ["crop","पीक","फसल","pik"]): e["topic"]="crop"
    if any(k in x for k in ["insurance","विमा","बीमा"]): e["service"]="crop insurance"
    return e
def analyze(q):
    i=classify_intent(q)
    return {"language":detect_language(q),"intent":i,"entities":extract_entities(q),
            "normalized_query":f"{i.replace('_',' ').lower()}: {q}"}
