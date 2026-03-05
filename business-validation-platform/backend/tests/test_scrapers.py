import pytest
from app.scrapers.playwright_utils import extract_schema_markup

def test_extract_schema_returns_list():
    html = '<script type="application/ld+json">{"@type": "Organization", "@context": "https://schema.org"}</script>'
    schemas = extract_schema_markup(html)
    assert len(schemas) == 1
    assert schemas[0]["@type"] == "Organization"

def test_extract_multiple_schemas():
    html = '''
    <script type="application/ld+json">{"@type": "LocalBusiness"}</script>
    <script type="application/ld+json">{"@type": "FAQ"}</script>
    '''
    schemas = extract_schema_markup(html)
    assert len(schemas) == 2
    types = [s["@type"] for s in schemas]
    assert "LocalBusiness" in types
    assert "FAQ" in types

def test_extract_schema_handles_invalid_json():
    html = '<script type="application/ld+json">INVALID JSON {{{</script>'
    schemas = extract_schema_markup(html)
    assert schemas == []

def test_extract_schema_empty_html():
    schemas = extract_schema_markup("")
    assert schemas == []

def test_extract_schema_case_insensitive():
    html = '<script TYPE="Application/LD+JSON">{"@type": "Product"}</script>'
    schemas = extract_schema_markup(html)
    assert len(schemas) == 1
