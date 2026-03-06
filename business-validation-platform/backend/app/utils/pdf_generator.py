import markdown as md_lib


def markdown_to_html(md_content: str) -> str:
    """Convert markdown to McKinsey-style professional HTML."""
    html_body = md_lib.markdown(
        md_content,
        extensions=["tables", "fenced_code", "toc"]
    )
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  /* ── Google Fonts ── */
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700&display=swap');

  /* ── Reset & Base ── */
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

  :root {{
    --navy:   #0D2137;
    --blue:   #1A3F6F;
    --mid:    #2563A8;
    --gold:   #C9A96E;
    --gold-lt:#E8D09A;
    --gray-d: #1F2937;
    --gray-m: #6B7280;
    --gray-l: #E5E7EB;
    --gray-xl:#F9FAFB;
    --white:  #FFFFFF;
    --red:    #DC2626;
    --green:  #16A34A;
  }}

  /* ── Page Setup ── */
  @page {{
    size: A4;
    margin: 0;
  }}

  html, body {{
    width: 210mm;
    min-height: 297mm;
    font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
    font-size: 9.5pt;
    line-height: 1.65;
    color: var(--gray-d);
    background: var(--white);
  }}

  /* ── Cover Header Band ── */
  .cover-band {{
    background: var(--navy);
    color: var(--white);
    padding: 28px 40px 20px;
    border-bottom: 3px solid var(--gold);
  }}
  .cover-band .firm {{ font-size: 8pt; letter-spacing: .18em; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; }}
  .cover-band .doc-type {{ font-size: 7.5pt; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.55); margin-top: 4px; }}

  /* ── Main Content Wrapper ── */
  .content-wrapper {{
    padding: 32px 40px 40px;
  }}

  /* ── Typography ── */
  h1 {{
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22pt;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.2;
    margin: 0 0 6px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--navy);
  }}

  h2 {{
    font-size: 13pt;
    font-weight: 700;
    color: var(--blue);
    margin: 28px 0 8px;
    padding: 6px 12px;
    background: linear-gradient(90deg, rgba(37,99,168,.08), transparent);
    border-left: 3px solid var(--gold);
    page-break-after: avoid;
  }}

  h3 {{
    font-size: 10.5pt;
    font-weight: 600;
    color: var(--gray-d);
    margin: 18px 0 6px;
    padding-bottom: 3px;
    border-bottom: 1px solid var(--gray-l);
    page-break-after: avoid;
  }}

  h4 {{
    font-size: 9.5pt;
    font-weight: 600;
    color: var(--mid);
    margin: 14px 0 4px;
    text-transform: uppercase;
    letter-spacing: .05em;
    font-size: 8.5pt;
  }}

  p {{
    margin: 5px 0;
  }}

  strong {{ font-weight: 600; color: var(--gray-d); }}
  em {{ font-style: italic; color: var(--gray-m); }}

  /* ── Lists ── */
  ul, ol {{ padding-left: 18px; margin: 6px 0; }}
  li {{ margin: 3px 0; }}
  ul li::marker {{ color: var(--gold); }}

  /* ── Tables — McKinsey style ── */
  table {{
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0 16px;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }}

  thead tr {{
    background: var(--navy);
    color: var(--white);
  }}

  thead th {{
    padding: 7px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 8pt;
    letter-spacing: .04em;
    border: none;
  }}

  tbody tr {{
    border-bottom: 1px solid var(--gray-l);
  }}

  tbody tr:nth-child(even) {{
    background: var(--gray-xl);
  }}

  tbody tr:hover {{
    background: rgba(37,99,168,.05);
  }}

  td {{
    padding: 6px 10px;
    vertical-align: top;
    border: none;
    border-right: 1px solid var(--gray-l);
  }}

  td:last-child, th:last-child {{ border-right: none; }}

  /* First column accent */
  tbody td:first-child {{
    font-weight: 500;
    color: var(--blue);
  }}

  /* ── Blockquote — Key Insight Box ── */
  blockquote {{
    border-left: 3px solid var(--gold);
    margin: 12px 0;
    padding: 10px 16px;
    background: rgba(201,169,110,.07);
    color: var(--gray-d);
    font-style: normal;
  }}
  blockquote p {{ margin: 0; }}

  /* ── Code blocks ── */
  pre {{
    background: var(--gray-xl);
    border: 1px solid var(--gray-l);
    border-left: 3px solid var(--mid);
    padding: 10px 14px;
    margin: 10px 0;
    font-size: 8pt;
    font-family: 'Courier New', monospace;
    overflow-x: auto;
    page-break-inside: avoid;
  }}
  code {{
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    background: var(--gray-xl);
    padding: 1px 4px;
    border-radius: 2px;
    color: var(--blue);
  }}
  pre code {{ background: none; padding: 0; color: inherit; }}

  /* ── HR divider ── */
  hr {{
    border: none;
    border-top: 1px solid var(--gray-l);
    margin: 20px 0;
  }}

  /* ── Executive Summary special styling ── */
  h2:first-of-type + p, h2:first-of-type ~ p:first-of-type {{
    font-size: 10pt;
  }}

  /* ── Score badge (appears inside Executive Summary) ── */
  .score-badge {{
    display: inline-block;
    padding: 2px 8px;
    background: var(--gold);
    color: var(--navy);
    font-weight: 700;
    font-size: 8pt;
    letter-spacing: .06em;
  }}

  /* ── Section number pill ── */
  h2 .sec-num {{
    display: inline-block;
    background: var(--gold);
    color: var(--navy);
    font-size: 7pt;
    font-weight: 700;
    padding: 1px 5px;
    margin-right: 6px;
    vertical-align: middle;
  }}

  /* ── Footer ── */
  .report-footer {{
    margin-top: 40px;
    padding: 12px 40px;
    background: var(--gray-xl);
    border-top: 2px solid var(--navy);
    font-size: 7.5pt;
    color: var(--gray-m);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .report-footer .firm-mark {{
    font-weight: 700;
    color: var(--navy);
    font-size: 8pt;
    letter-spacing: .08em;
    text-transform: uppercase;
  }}

  /* ── Print optimizations ── */
  @media print {{
    h2 {{ page-break-before: auto; }}
    table {{ page-break-inside: avoid; }}
    .report-footer {{ position: fixed; bottom: 0; width: 100%; }}
  }}
</style>
</head>
<body>

<div class="cover-band">
  <div class="firm">Business Validation Report</div>
  <div class="doc-type">Confidential — Strategic Intelligence</div>
</div>

<div class="content-wrapper">
{html_body}
</div>

<div class="report-footer">
  <span class="firm-mark">Business Validator</span>
  <span>Generated by AI · Data-Driven Analysis · For Strategic Use Only</span>
</div>

</body>
</html>"""


async def generate_pdf_bytes(md_content: str) -> bytes:
    """Convert markdown to PDF bytes using Playwright (headless Chrome)."""
    from playwright.async_api import async_playwright
    html = markdown_to_html(md_content)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_content(html, wait_until="domcontentloaded")
        pdf_bytes = await page.pdf(
            format="A4",
            margin={"top": "0mm", "bottom": "0mm", "left": "0mm", "right": "0mm"},
            print_background=True,
        )
        await browser.close()
        return pdf_bytes
