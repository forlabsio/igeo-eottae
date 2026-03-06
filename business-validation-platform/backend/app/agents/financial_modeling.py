"""
재무 시뮬레이션 에이전트 — 업종 벤치마크 기반 3가지 시나리오 생성
월별 36개월 시뮬레이션 (CAC / LTV / BEP / MRR)
"""
from typing import List, Dict, Optional


# 업종별 기본 벤치마크 (한국 시장 기준)
INDUSTRY_BENCHMARKS: Dict[str, Dict] = {
    "SaaS":           {"arpu": 80_000,  "churn": 0.05, "cac": 250_000},
    "이커머스":        {"arpu": 50_000,  "churn": 0.08, "cac": 100_000},
    "로컬비즈니스":    {"arpu": 30_000,  "churn": 0.06, "cac":  80_000},
    "헬스케어":        {"arpu": 120_000, "churn": 0.04, "cac": 300_000},
    "교육":            {"arpu": 60_000,  "churn": 0.07, "cac": 150_000},
    "부동산":          {"arpu": 200_000, "churn": 0.03, "cac": 500_000},
    "금융":            {"arpu": 100_000, "churn": 0.04, "cac": 350_000},
    "음식":            {"arpu": 25_000,  "churn": 0.10, "cac":  50_000},
    "뷰티":            {"arpu": 40_000,  "churn": 0.07, "cac":  90_000},
    "IT":              {"arpu": 90_000,  "churn": 0.05, "cac": 220_000},
    "물류":            {"arpu": 70_000,  "churn": 0.05, "cac": 180_000},
}

DEFAULT_BENCHMARK = {"arpu": 50_000, "churn": 0.06, "cac": 200_000}


def _get_benchmark(industry: str) -> Dict:
    """업종 키워드로 벤치마크 조회."""
    for key, val in INDUSTRY_BENCHMARKS.items():
        if key.lower() in (industry or "").lower():
            return val
    return DEFAULT_BENCHMARK


def _calculate_scenario(
    monthly_growth_rate: float,
    cac: int,
    conversion_rate: float,
    churn_rate: float,
    arpu: int,
    initial_budget: int = 3_000_000,
) -> Dict:
    """월별 36개월 재무 시뮬레이션."""
    monthly_data = []
    cumulative_users = 0.0
    fixed_cost = 15_000_000  # 월 인건비/운영비 고정

    for month in range(1, 37):
        # 마케팅 예산 (매월 growth_rate만큼 증가)
        marketing_budget = initial_budget * ((1 + monthly_growth_rate) ** month)

        # 방문자 수 (CPC ₩5,000 가정)
        visitors = marketing_budget / 5_000

        # 신규 유료 전환
        new_paid = visitors * conversion_rate

        # 이탈
        churned = cumulative_users * churn_rate
        cumulative_users = max(0.0, cumulative_users + new_paid - churned)

        mrr = cumulative_users * arpu
        total_costs = (
            marketing_budget
            + new_paid * cac
            + cumulative_users * 1_000  # 호스팅/인프라 per-user
            + fixed_cost
        )
        profit = mrr - total_costs

        monthly_data.append({
            "month": month,
            "visitors": int(visitors),
            "new_paid_users": int(new_paid),
            "cumulative_users": int(cumulative_users),
            "mrr": int(mrr),
            "costs": int(total_costs),
            "profit": int(profit),
        })

    # 연도별 집계
    yearly_summary = []
    for year in [1, 2, 3]:
        year_data = monthly_data[(year - 1) * 12: year * 12]
        yearly_summary.append({
            "year": year,
            "total_revenue": sum(m["mrr"] for m in year_data),
            "total_costs": sum(m["costs"] for m in year_data),
            "net_profit": sum(m["profit"] for m in year_data),
            "end_users": year_data[-1]["cumulative_users"],
        })

    # 손익분기 월
    bep_month = next(
        (m["month"] for m in monthly_data if m["profit"] >= 0),
        None,
    )

    # LTV (월 ARPU / 이탈률)
    ltv = int(arpu / max(churn_rate, 0.001))

    return {
        "monthly": monthly_data,
        "yearly": yearly_summary,
        "bep_month": bep_month,
        "ltv": ltv,
        "assumptions": {
            "monthly_growth_rate": monthly_growth_rate,
            "cac": cac,
            "conversion_rate": conversion_rate,
            "churn_rate": churn_rate,
            "arpu": arpu,
        },
    }


async def generate_financial_scenarios(
    industry: str,
    region: str,
    competitors: Optional[List[Dict]] = None,
) -> Dict:
    """
    업종/지역 기반 3가지 재무 시나리오 생성.
    실제 API 없이 업종별 벤치마크를 사용.
    """
    bm = _get_benchmark(industry)
    arpu = bm["arpu"]
    base_churn = bm["churn"]
    base_cac = bm["cac"]

    scenarios = {
        "conservative": _calculate_scenario(
            monthly_growth_rate=0.05,
            cac=int(base_cac * 1.3),
            conversion_rate=0.005,
            churn_rate=base_churn * 1.3,
            arpu=arpu,
        ),
        "realistic": _calculate_scenario(
            monthly_growth_rate=0.10,
            cac=base_cac,
            conversion_rate=0.010,
            churn_rate=base_churn,
            arpu=arpu,
        ),
        "optimistic": _calculate_scenario(
            monthly_growth_rate=0.15,
            cac=int(base_cac * 0.8),
            conversion_rate=0.015,
            churn_rate=base_churn * 0.8,
            arpu=arpu,
        ),
    }

    return scenarios
