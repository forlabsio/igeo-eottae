import pytest
from app.utils.report_parser import extract_executive_summary, calculate_validation_score


def test_extract_executive_summary_finds_section():
    md = """# 비즈니스 보고서

## Executive Summary

이 보고서는 경쟁사 분석 결과를 담고 있습니다.

## 경쟁사 분석
..."""
    result = extract_executive_summary(md)
    assert "경쟁사 분석 결과" in result


def test_extract_executive_summary_korean_header():
    md = """# Report

## 요약

핵심 내용이 여기에 있습니다.

## 다음 섹션"""
    result = extract_executive_summary(md)
    assert "핵심 내용" in result


def test_extract_executive_summary_fallback():
    md = "# Title\n\nSome content here without any summary section."
    result = extract_executive_summary(md)
    assert len(result) > 0
    assert "Some content" in result


def test_extract_executive_summary_empty():
    result = extract_executive_summary("")
    assert "생성 중" in result


def test_calculate_validation_score_returns_dict():
    md = "# Report\n\n경쟁사 분석. competitor1. SEO 스키마. 키워드 keyword. 시장 TAM SAM. - 액션 1\n- 액션 2\n- 액션 3"
    result = calculate_validation_score(md)
    assert "total" in result
    assert "grade" in result
    assert "breakdown" in result
    assert 0 <= result["total"] <= 100


def test_calculate_validation_score_empty():
    result = calculate_validation_score("")
    assert result["total"] == 0


def test_calculate_validation_score_grade():
    # High score → good grade
    rich_md = " ".join(["경쟁사"] * 10 + ["SEO"] * 10 + ["키워드"] * 10 + ["시장"] * 10) + "\n" + "\n".join([f"- item {i}" for i in range(20)])
    result = calculate_validation_score(rich_md)
    assert result["grade"] in ["A", "B", "C", "D", "F"]
