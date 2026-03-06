"""Tests for doc_parser utility."""
import io
import pytest
from app.utils.doc_parser import detect_file_type, extract_text, DocParseError, MAX_FILE_SIZE


class TestDetectFileType:
    def test_pdf_by_extension(self):
        assert detect_file_type("plan.pdf", "application/octet-stream") == "pdf"

    def test_docx_by_extension(self):
        assert detect_file_type("plan.docx", "") == "docx"

    def test_md_by_extension(self):
        assert detect_file_type("plan.md", "") == "md"

    def test_txt_by_extension(self):
        assert detect_file_type("readme.txt", "") == "txt"

    def test_pdf_by_content_type(self):
        assert detect_file_type("", "application/pdf") == "pdf"

    def test_docx_by_content_type(self):
        ct = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert detect_file_type("", ct) == "docx"

    def test_unsupported_raises(self):
        with pytest.raises(DocParseError):
            detect_file_type("file.exe", "application/exe")


class TestExtractText:
    def test_txt_utf8(self):
        content = "안녕하세요 사업계획서입니다."
        result = extract_text(content.encode("utf-8"), "txt")
        assert "사업계획서" in result

    def test_md_content(self):
        content = "# 사업계획서\n\n## 개요\n우리 서비스는..."
        result = extract_text(content.encode("utf-8"), "md")
        assert "사업계획서" in result

    def test_empty_raises(self):
        with pytest.raises(DocParseError):
            extract_text(b"   ", "txt")

    def test_oversized_raises(self):
        big = b"x" * (MAX_FILE_SIZE + 1)
        with pytest.raises(DocParseError):
            extract_text(big, "txt")

    def test_truncates_at_50k(self):
        long_text = "a" * 60000
        result = extract_text(long_text.encode("utf-8"), "txt")
        assert len(result) == 50000