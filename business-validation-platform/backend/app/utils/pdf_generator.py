import markdown
import tempfile
import os
from pathlib import Path
from typing import Optional

def markdown_to_html(md_content: str) -> str:
    """Convert markdown to styled HTML."""
    html_body = markdown.markdown(
        md_content,
        extensions=["tables", "fenced_code", "toc"]
    )
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  body {{ font-family: 'Noto Sans KR', sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }}
  h1 {{ color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }}
  h2 {{ color: #2d5a8e; margin-top: 2em; }}
  h3 {{ color: #4a7ab5; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1em 0; }}
  th, td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; }}
  th {{ background: #f0f4f8; font-weight: 600; }}
  tr:nth-child(even) {{ background: #f9fafb; }}
  code {{ background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }}
  pre {{ background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }}
  blockquote {{ border-left: 4px solid #1e3a5f; margin: 0; padding: 8px 16px; background: #f0f4f8; }}
  .page-break {{ page-break-after: always; }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

def generate_pdf(md_content: str, output_path: str) -> str:
    """Convert markdown to PDF, save to output_path, return path."""
    from weasyprint import HTML
    html = markdown_to_html(md_content)
    HTML(string=html).write_pdf(output_path)
    return output_path

def generate_pdf_bytes(md_content: str) -> bytes:
    """Convert markdown to PDF bytes (for streaming)."""
    from weasyprint import HTML
    html = markdown_to_html(md_content)
    return HTML(string=html).write_pdf()
