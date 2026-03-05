import re
from typing import Dict, Any, Optional


def extract_executive_summary(markdown_content: str) -> str:
    """Extract Executive Summary section from report markdown."""
    if not markdown_content:
        return "보고서를 생성 중입니다..."

    # Try to find Executive Summary section
    patterns = [
        r"(?:#+\s*)?(?:Executive\s+Summary|요약|핵심\s*요약|경영\s*요약)[^\n]*\n+([\s\S]*?)(?=\n#+|\Z)",
        r"(?:#+\s*)?(?:Overview|개요|서론)[^\n]*\n+([\s\S]*?)(?=\n#+|\Z)",
    ]

    for pattern in patterns:
        match = re.search(pattern, markdown_content, re.IGNORECASE)
        if match:
            summary = match.group(1).strip()
            # Limit to 800 chars
            if len(summary) > 800:
                summary = summary[:800] + "..."
            return summary

    # Fallback: first 500 chars of content after any H1 title
    after_title = re.sub(r"^#+[^\n]*\n", "", markdown_content, count=1).strip()
    if after_title:
        return after_title[:500] + ("..." if len(after_title) > 500 else "")

    return markdown_content[:500] + ("..." if len(markdown_content) > 500 else "")


def calculate_validation_score(markdown_content: str) -> Dict[str, Any]:
    """
    Calculate a validation score based on report content.
    Returns score (0-100) with breakdown by category.
    """
    if not markdown_content:
        return {"total": 0, "breakdown": {}}

    scores = {}

    # 1. Competitor analysis (25 points max)
    competitor_mentions = len(re.findall(r"(?:경쟁사|competitor|rival)", markdown_content, re.IGNORECASE))
    scores["competitor_analysis"] = min(25, competitor_mentions * 5)

    # 2. SEO recommendations (20 points max)
    seo_mentions = len(re.findall(r"(?:SEO|스키마|schema|검색\s*최적화|meta)", markdown_content, re.IGNORECASE))
    scores["seo_recommendations"] = min(20, seo_mentions * 4)

    # 3. Keyword coverage (20 points max)
    keyword_mentions = len(re.findall(r"(?:키워드|keyword|검색어)", markdown_content, re.IGNORECASE))
    scores["keyword_coverage"] = min(20, keyword_mentions * 4)

    # 4. Market analysis (20 points max)
    market_mentions = len(re.findall(r"(?:시장|TAM|SAM|SOM|market|규모)", markdown_content, re.IGNORECASE))
    scores["market_analysis"] = min(20, market_mentions * 4)

    # 5. Actionability (15 points max) - bullet points + numbered lists
    action_items = len(re.findall(r"(?:^[\s]*[-*•]\s|^\s*\d+\.\s)", markdown_content, re.MULTILINE))
    scores["actionability"] = min(15, action_items)

    total = sum(scores.values())

    return {
        "total": total,
        "grade": _score_to_grade(total),
        "breakdown": scores,
        "summary_text": _score_summary(total),
    }


def _score_to_grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


def _score_summary(score: int) -> str:
    if score >= 80:
        return "우수한 분석 보고서입니다."
    if score >= 60:
        return "양호한 분석이지만 일부 영역 보완이 필요합니다."
    if score >= 40:
        return "기본 분석이 완료되었습니다. 추가 검토를 권장합니다."
    return "분석 데이터가 충분하지 않습니다."
