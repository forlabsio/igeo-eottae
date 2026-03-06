"""Document parser for business plan uploads (PDF, DOCX, MD, TXT)."""
import io
from typing import Tuple

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_TEXT_LENGTH = 50_000  # characters


class DocParseError(ValueError):
    pass


ALLOWED_EXTENSIONS = {"pdf", "docx", "md", "txt"}
CONTENT_TYPE_MAP = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/markdown": "md",
    "text/plain": "txt",
    "text/x-markdown": "md",
}


def detect_file_type(filename: str, content_type: str) -> str:
    """Detect file type from filename extension or content-type.

    Returns: "pdf", "docx", "md", or "txt"
    Raises DocParseError for unsupported types.
    """
    if filename:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext in ALLOWED_EXTENSIONS:
            return ext

    mapped = CONTENT_TYPE_MAP.get(content_type or "")
    if mapped:
        return mapped

    raise DocParseError(
        f"지원하지 않는 파일 형식입니다. PDF, DOCX, MD, TXT만 허용됩니다. (받은 형식: {content_type})"
    )


def extract_text(raw_bytes: bytes, file_type: str) -> str:
    """Extract plain text from raw bytes of given file type.

    Returns: extracted text (max 50,000 chars)
    Raises DocParseError on empty or unreadable documents.
    """
    if len(raw_bytes) > MAX_FILE_SIZE:
        raise DocParseError(
            f"파일 크기가 너무 큽니다. 최대 10MB까지 허용됩니다. (현재: {len(raw_bytes) / 1024 / 1024:.1f}MB)"
        )

    if file_type == "pdf":
        text = _extract_pdf(raw_bytes)
    elif file_type == "docx":
        text = _extract_docx(raw_bytes)
    elif file_type in ("md", "txt"):
        try:
            text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = raw_bytes.decode("latin-1", errors="replace")
    else:
        raise DocParseError(f"알 수 없는 파일 타입: {file_type}")

    text = text.strip()
    if not text:
        raise DocParseError("문서에서 텍스트를 추출할 수 없습니다. 빈 문서이거나 스캔된 이미지일 수 있습니다.")

    return text[:MAX_TEXT_LENGTH]


def _extract_pdf(raw_bytes: bytes) -> str:
    """Extract text from PDF bytes using pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise DocParseError("PDF 파싱 라이브러리(pypdf)가 설치되지 않았습니다.")

    reader = PdfReader(io.BytesIO(raw_bytes))
    parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            parts.append(page_text)
    return "\n".join(parts)


def _extract_docx(raw_bytes: bytes) -> str:
    """Extract text from DOCX bytes using python-docx."""
    try:
        import docx
    except ImportError:
        raise DocParseError("DOCX 파싱 라이브러리(python-docx)가 설치되지 않았습니다.")

    doc = docx.Document(io.BytesIO(raw_bytes))
    parts = [para.text for para in doc.paragraphs if para.text.strip()]
    return "\n".join(parts)