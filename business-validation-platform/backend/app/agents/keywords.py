from typing import List, Dict

KEYWORD_PATTERNS = [
    ("{industry} near me", "transactional", "near_me"),
    ("{industry} 근처", "transactional", "near_me"),
    ("{region} {industry}", "transactional", "local"),
    ("{industry} {region}", "transactional", "local"),
    ("긴급 {industry}", "transactional", "emergency"),
    ("당일 {industry}", "transactional", "emergency"),
    ("{industry} 24시간", "transactional", "emergency"),
    ("{industry} 가격", "commercial", "price"),
    ("{industry} 비용", "commercial", "price"),
    ("{industry} 요금", "commercial", "price"),
    ("{industry} 견적", "commercial", "price"),
    ("{industry} 추천", "commercial", "review"),
    ("{industry} 후기", "commercial", "review"),
    ("{region} {industry} 추천", "commercial", "review"),
    ("{industry} 비교", "commercial", "comparison"),
    ("{industry} 잘하는 곳", "commercial", "comparison"),
    ("{industry} 상담", "informational", "consultation"),
    ("{industry} 무료 상담", "transactional", "consultation"),
    ("{industry} 예약", "transactional", "booking"),
    ("{industry} 문의", "transactional", "inquiry"),
]


def generate_intent_keywords(industry: str, region: str) -> List[Dict]:
    """고의도 키워드 목록 생성"""
    keywords = []
    seen: set = set()

    for pattern, intent, pattern_type in KEYWORD_PATTERNS:
        keyword = pattern.format(industry=industry, region=region)
        if keyword not in seen:
            seen.add(keyword)
            keywords.append({
                "keyword": keyword,
                "intent": intent,
                "pattern_type": pattern_type,
                "search_volume": None,
                "difficulty": None,
                "cpc": None,
            })

    return keywords
