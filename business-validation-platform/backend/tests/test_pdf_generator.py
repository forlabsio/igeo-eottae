import pytest
import sys
from unittest.mock import patch, MagicMock
from app.utils.pdf_generator import markdown_to_html


def test_markdown_to_html_contains_body():
    md = "# Test\n\nHello world"
    html = markdown_to_html(md)
    assert "<h1" in html
    assert "Hello world" in html
    assert "<!DOCTYPE html>" in html


def test_markdown_to_html_table():
    md = "| A | B |\n|---|---|\n| 1 | 2 |"
    html = markdown_to_html(md)
    assert "<table>" in html


def test_generate_pdf_bytes_is_async():
    """PDF generation uses Playwright (async), not WeasyPrint."""
    import inspect
    from app.utils.pdf_generator import generate_pdf_bytes
    assert inspect.iscoroutinefunction(generate_pdf_bytes)
