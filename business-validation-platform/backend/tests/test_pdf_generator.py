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


def test_generate_pdf_bytes_calls_weasyprint():
    mock_html_instance = MagicMock()
    mock_html_instance.write_pdf.return_value = b"%PDF-1.4 test"
    mock_html_cls = MagicMock(return_value=mock_html_instance)

    mock_weasyprint = MagicMock()
    mock_weasyprint.HTML = mock_html_cls

    with patch.dict(sys.modules, {"weasyprint": mock_weasyprint}):
        # Re-import to pick up the mock
        from app.utils import pdf_generator
        import importlib
        importlib.reload(pdf_generator)
        result = pdf_generator.generate_pdf_bytes("# Test")
        mock_html_cls.assert_called_once()
        assert result == b"%PDF-1.4 test"
