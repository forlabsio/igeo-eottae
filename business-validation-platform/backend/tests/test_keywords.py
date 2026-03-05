from app.agents.keywords import generate_intent_keywords


def test_generates_near_me_keywords():
    result = generate_intent_keywords("법률 서비스", "서울")
    keywords = [k["keyword"] for k in result]
    assert any("near me" in k or "근처" in k for k in keywords)


def test_generates_price_keywords():
    result = generate_intent_keywords("치과", "강남")
    keywords = [k["keyword"] for k in result]
    assert any("가격" in k or "비용" in k for k in keywords)


def test_returns_20_keywords():
    result = generate_intent_keywords("헬스장", "부산")
    assert len(result) == 20


def test_keyword_has_required_fields():
    result = generate_intent_keywords("카페", "홍대")
    for kw in result:
        assert "keyword" in kw
        assert "intent" in kw
        assert "pattern_type" in kw
        assert "search_volume" in kw


def test_no_duplicate_keywords():
    result = generate_intent_keywords("병원", "대구")
    keywords = [k["keyword"] for k in result]
    assert len(keywords) == len(set(keywords))


def test_intent_values_are_valid():
    result = generate_intent_keywords("식당", "강남")
    valid_intents = {"transactional", "commercial", "informational"}
    for kw in result:
        assert kw["intent"] in valid_intents
