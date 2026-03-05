import asyncio
from typing import List, Dict, Any
from app.scrapers.playwright_utils import fetch_page_content


def _extract_topics_from_content(content: Dict[str, Any]) -> List[str]:
    """Extract topics from page headings and title"""
    topics = []
    if content.get("title"):
        topics.append(content["title"].lower().strip())
    for h in content.get("headings", []):
        text = h.get("text", "").strip()
        if text and len(text) > 3:
            topics.append(text.lower())
    return list(set(topics))


async def analyze_content_gap(
    our_url: str,
    competitor_urls: List[str],
) -> List[Dict[str, Any]]:
    """Find topics competitors cover that we don't"""
    # Fetch our site
    our_content = await fetch_page_content(our_url)
    our_topics = _extract_topics_from_content(our_content) if our_content else []

    # Fetch competitors in parallel (up to 5)
    tasks = [fetch_page_content(url) for url in competitor_urls[:5]]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    competitor_topics: set = set()
    for result in results:
        if isinstance(result, dict):
            competitor_topics.update(_extract_topics_from_content(result))

    # Find gaps (topics competitors have but we don't)
    our_set = set(our_topics)
    gaps = []
    for topic in sorted(competitor_topics - our_set):
        if len(topic) > 5:  # Filter noise
            priority = "HIGH" if any(
                kw in topic for kw in ["가격", "비용", "후기", "추천", "비교", "방법"]
            ) else "MEDIUM"
            gaps.append({
                "topic": topic,
                "priority": priority,
                "search_volume": None,  # To be enriched by LLM in report
            })

    return gaps[:10]
