import json
import re
from typing import Optional, Dict, Any, List
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout


async def fetch_page_content(url: str, timeout: int = 15000) -> Optional[Dict[str, Any]]:
    """웹페이지 콘텐츠 수집"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
            })
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)

            title = await page.title()
            html = await page.content()

            headings = await page.evaluate("""() => {
                const tags = [...document.querySelectorAll('h1, h2, h3')];
                return tags.map(t => ({ tag: t.tagName, text: t.innerText.trim() }));
            }""")

            meta = await page.evaluate("""() => ({
                description: document.querySelector('meta[name="description"]')?.content || null,
                keywords: document.querySelector('meta[name="keywords"]')?.content || null,
            })""")

            return {
                "url": url,
                "title": title,
                "html": html,
                "headings": headings[:50],
                "meta": meta,
            }
        except PlaywrightTimeout:
            return None
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
            return None
        finally:
            await browser.close()


def extract_schema_markup(html: str) -> List[Dict]:
    """JSON-LD 스키마 마크업 추출"""
    schemas = []
    pattern = r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
    matches = re.findall(pattern, html, re.DOTALL | re.IGNORECASE)
    for match in matches:
        try:
            schema = json.loads(match.strip())
            schemas.append(schema)
        except json.JSONDecodeError:
            continue
    return schemas


async def search_google(query: str, num_results: int = 10) -> List[str]:
    """Google 검색 결과 URL 추출 (Playwright 기반)"""
    import urllib.parse
    encoded_query = urllib.parse.quote(query)
    search_url = f"https://www.google.com/search?q={encoded_query}&num={num_results}&hl=ko"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "ko-KR,ko;q=0.9",
            })
            await page.goto(search_url, wait_until="domcontentloaded", timeout=15000)

            urls = await page.evaluate("""() => {
                const links = [...document.querySelectorAll('a[href]')];
                return links
                    .map(a => a.href)
                    .filter(href =>
                        href.startsWith('http') &&
                        !href.includes('google.com') &&
                        !href.includes('youtube.com') &&
                        !href.includes('accounts.google')
                    );
            }""")

            # Deduplicate
            seen = set()
            unique_urls = []
            for url in urls:
                if url not in seen:
                    seen.add(url)
                    unique_urls.append(url)

            return unique_urls[:num_results]
        except Exception as e:
            print(f"Google search failed for '{query}': {e}")
            return []
        finally:
            await browser.close()
