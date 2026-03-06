"""
키워드 리서치 에이전트 — 패턴 기반 + Google 자동완성 확장
"""
import asyncio
from typing import List, Dict
from urllib.parse import quote_plus

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
    ("{industry} 서비스", "commercial", "service"),
    ("{industry} 업체", "commercial", "service"),
    ("{region} {industry} 업체", "transactional", "local_service"),
    ("{industry} 전문", "commercial", "expert"),
    ("{region} {industry} 전문", "commercial", "local_expert"),
    ("{industry} 인기", "commercial", "popularity"),
    ("{industry} 랭킹", "commercial", "ranking"),
    ("{industry} 할인", "transactional", "discount"),
    ("{industry} 프로모션", "transactional", "promotion"),
    ("{industry} 방법", "informational", "howto"),
]

_COMMERCIAL_SIGNALS = {"가격", "비용", "요금", "견적", "추천", "비교", "후기", "평점", "랭킹"}
_TRANSACTIONAL_SIGNALS = {"near me", "근처", "예약", "신청", "구매", "주문", "긴급", "당일", "무료"}


def _classify_intent(keyword: str) -> str:
    if any(sig in keyword for sig in _TRANSACTIONAL_SIGNALS):
        return "transactional"
    if any(sig in keyword for sig in _COMMERCIAL_SIGNALS):
        return "commercial"
    return "informational"


async def _fetch_google_suggestions(seed: str) -> List[str]:
    """Google Suggest API (JSON)로 자동완성 키워드 수집."""
    try:
        import httpx
        import json
        encoded = quote_plus(seed)
        url = (
            f"https://suggestqueries.google.com/complete/search"
            f"?client=firefox&q={encoded}&hl=ko"
        )
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, headers={"Accept-Language": "ko-KR,ko;q=0.9"})
            if resp.status_code == 200:
                data = json.loads(resp.text)
                if isinstance(data, list) and len(data) > 1:
                    return [s for s in data[1] if isinstance(s, str)]
    except Exception:
        pass
    return []


def generate_intent_keywords(industry: str, region: str) -> List[Dict]:
    """패턴 기반 고의도 키워드 목록 생성 (동기, 폴백용)."""
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


async def generate_keywords_with_suggestions(
    industry: str,
    region: str,
    target_count: int = 50,
) -> List[Dict]:
    """
    패턴 기반 + Google 자동완성 키워드 확장.
    자동완성 실패 시 패턴 기반으로 폴백.
    """
    base_keywords = generate_intent_keywords(industry, region)
    seen = {kw["keyword"] for kw in base_keywords}

    seed_terms = [
        industry,
        f"{industry} {region}",
        f"{region} {industry}",
        f"{industry} 추천",
        f"{industry} 가격",
    ]

    try:
        results = await asyncio.gather(
            *[_fetch_google_suggestions(seed) for seed in seed_terms],
            return_exceptions=True,
        )
        for result in results:
            if isinstance(result, list):
                for suggestion in result:
                    if suggestion not in seen and len(base_keywords) < target_count * 2:
                        seen.add(suggestion)
                        base_keywords.append({
                            "keyword": suggestion,
                            "intent": _classify_intent(suggestion),
                            "pattern_type": "autocomplete",
                            "search_volume": None,
                            "difficulty": None,
                            "cpc": None,
                        })
    except Exception:
        pass  # Fallback to base keywords only

    return base_keywords[:target_count]
