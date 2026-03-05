from typing import List, Optional
from urllib.parse import urlparse
from app.scrapers.playwright_utils import search_google

# Domains to exclude from competitor results
BLACKLIST_DOMAINS = {
    "google.com", "youtube.com", "facebook.com", "instagram.com",
    "naver.com", "kakao.com", "daum.net", "wikipedia.org",
    "namu.wiki", "yelp.com", "tripadvisor.com", "twitter.com",
    "linkedin.com", "amazon.com", "maps.google.com",
}


def _is_valid_competitor(url: str) -> bool:
    """Filter out ads, directories, and social media sites"""
    try:
        domain = urlparse(url).netloc.lower().replace("www.", "")
        return not any(blacklisted in domain for blacklisted in BLACKLIST_DOMAINS)
    except Exception:
        return False


async def discover_competitors(
    industry: str,
    region: str,
    manual_competitors: Optional[List[str]] = None,
    max_results: int = 10,
) -> List[str]:
    """Discover competitor URLs via Google search"""
    competitors = list(manual_competitors or [])

    additional_needed = max_results - len(competitors)
    if additional_needed > 0:
        queries = [
            f"{industry} {region}",
            f"{industry} 업체 {region}",
        ]
        found = []
        for query in queries:
            results = await search_google(query, num_results=15)
            found.extend(results)
            if len(found) >= additional_needed * 2:
                break

        valid = [url for url in found if _is_valid_competitor(url)]

        existing_domains = {urlparse(c).netloc for c in competitors}
        for url in valid:
            domain = urlparse(url).netloc
            if domain not in existing_domains:
                competitors.append(url)
                existing_domains.add(domain)
            if len(competitors) >= max_results:
                break

    return competitors[:max_results]
