import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { JSDOM } from 'jsdom';
import Parser from 'rss-parser';
import { INITIAL_ENTITIES } from './src/data/mockData';

export const app = express();
app.use(express.json({ limit: '10mb' }));

function saveEntitiesToDisk(entities: any[]) {
  if (!Array.isArray(entities) || entities.length === 0) return;
  const jsonContent = JSON.stringify(entities, null, 2);
  const targetFiles = [
    path.join(process.cwd(), 'entities.json'),
    path.join(process.cwd(), 'ecosystem.json'),
    path.join(process.cwd(), 'src', 'data', 'entities.json'),
    path.join(process.cwd(), 'public', 'entities.json')
  ];
  for (const filePath of targetFiles) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, jsonContent, 'utf-8');
    } catch (e) {
      console.warn(`[Local Storage] Could not write to ${filePath}:`, e);
    }
  }
}

// Initialize Gemini AI lazily/safely
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ortam değişkeni tanımlanmamış.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

  // Helper function: Deduplicate and normalize extracted entities across page chunks
  function deduplicateAndNormalizeEntities(rawItems: any[]): any[] {
    const seenNames = new Set<string>();
    const normalized: any[] = [];

    const VALID_CATEGORIES = [
      'AI & Veri', 'SaaS & Yazılım', 'FinTech', 'E-Ticaret & Lojistik',
      'Oyun & Eğlence', 'Sağlık & Biyo', 'Derin Teknoloji', 'Eğitim (EdTech)',
      'İklim & Yeşil Teknoloji', 'Siber Güvenlik', 'Gayrimenkul (PropTech)',
      'İnsan Kaynakları (HRTech)', 'Pazarlama (MarTech)', 'Tarım & Gıda (AgriTech)',
      'Sigorta (InsurTech)', 'Savunma & Uzay', 'Donanım & IoT', 'Haber & Medya'
    ];

    const VALID_TYPES = [
      'Startup', 'Yatırımcı / VC', 'Etkinlik / Haber',
      'Hızlandırma Programı', 'Destek / Hibe', 'Kurumsal Ar-Ge'
    ];

    for (const item of rawItems) {
      if (!item || typeof item !== 'object') continue;
      
      let name = (item.name || item.title || item.companyName || '').toString().trim();
      if (!name || name.length < 2 || name.length > 120) continue;
      
      // Filter out navigation/UI text accidentally parsed as entity names
      const lowerName = name.toLowerCase();
      if (
        ['ana sayfa', 'iletişim', 'hakkımızda', 'firmalar', 'kategoriler', 'giriş', 'arama', 'menü', 'firmalarımız', 'kvkk', 'gizlilik', 'sitemap', 'site haritası', 'kayıt ol', 'şifremi unuttum', 'haberler', 'etkinlikler'].includes(lowerName)
      ) {
        continue;
      }

      if (seenNames.has(lowerName)) continue;
      seenNames.add(lowerName);

      // Normalize Category
      let category = item.category || 'SaaS & Yazılım';
      if (!VALID_CATEGORIES.includes(category)) {
        if (/ai|yapay|veri|analiz|learning|data/i.test(`${name} ${item.description}`)) category = 'AI & Veri';
        else if (/biyo|medikal|sağlık|tıp|tanı|health/i.test(`${name} ${item.description}`)) category = 'Sağlık & Biyo';
        else if (/güvenlik|siber|cyber|soc|threat/i.test(`${name} ${item.description}`)) category = 'Siber Güvenlik';
        else if (/otonom|robot|derin|sensör|deep/i.test(`${name} ${item.description}`)) category = 'Derin Teknoloji';
        else if (/enerji|yeşil|karbon|çevre|biyo|climate/i.test(`${name} ${item.description}`)) category = 'İklim & Yeşil Teknoloji';
        else if (/finans|fintek|pos|ödeme|banka|kredi/i.test(`${name} ${item.description}`)) category = 'FinTech';
        else if (/tarım|gıda|agri|dron|sulama/i.test(`${name} ${item.description}`)) category = 'Tarım & Gıda (AgriTech)';
        else if (/haber|medya|etkinlik|zirve|duyuru/i.test(`${name} ${item.description}`)) category = 'Haber & Medya';
        else category = 'SaaS & Yazılım';
      }

      // Normalize Type
      let type = item.type || 'Startup';
      if (!VALID_TYPES.includes(type)) {
        if (/fon|yatırım|vc|melek|investor|capital/i.test(`${name} ${item.description}`)) type = 'Yatırımcı / VC';
        else if (/etkinlik|haber|duyuru|zirve|summit|hackathon|yarışma/i.test(`${name} ${item.description}`)) type = 'Etkinlik / Haber';
        else if (/kuluçka|hızlandır|accelerator|incubator|çekirdek|btm|workup/i.test(`${name} ${item.description}`)) type = 'Hızlandırma Programı';
        else if (/hibe|destek|tübitak|kosgeb|çağrı/i.test(`${name} ${item.description}`)) type = 'Destek / Hibe';
        else if (/kurumsal|ar-ge merkezi|inovasyon lab/i.test(`${name} ${item.description}`)) type = 'Kurumsal Ar-Ge';
        else type = 'Startup';
      }

      normalized.push({
        id: `extracted-${normalized.length + 1}-${Date.now()}`,
        name,
        titleOrCompany: item.titleOrCompany || item.title || `${name} - ${type}`,
        type,
        category,
        city: item.city || 'İstanbul',
        description: item.description || item.desc || `${name} - ${category} alanında taranan içerik/şirket.`,
        website: item.website || item.link || '',
        stage: item.stage || (type === 'Startup' ? 'Seed' : 'Aktif'),
        lastUpdated: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
    }

    return normalized;
  }

  // Fallback Real HTML & Text Structural Parser: Extracts actual elements directly from fetched HTML or text when AI is unreachable or yields 0
  function extractEntitiesFromRawHtml(html: string, sourceUrl: string): any[] {
    const rawItems: any[] = [];
    try {
      const dom = new JSDOM(html || '', { url: sourceUrl.startsWith('http') ? sourceUrl : 'https://example.com' });
      const { document } = dom.window;

      // 1. JSON-LD Structured Data
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      jsonLdScripts.forEach(script => {
        try {
          const content = JSON.parse(script.textContent || '');
          const items = Array.isArray(content) ? content : (content['@graph'] || [content]);
          for (const entry of items) {
            if (entry.name && (entry['@type'] === 'Organization' || entry['@type'] === 'LocalBusiness' || entry['@type'] === 'Corporation' || entry['@type'] === 'Event' || entry['@type'] === 'NewsArticle')) {
              rawItems.push({
                name: entry.name,
                titleOrCompany: entry.jobTitle || entry.description?.substring(0, 60) || entry.name,
                type: entry['@type'] === 'Event' || entry['@type'] === 'NewsArticle' ? 'Etkinlik / Haber' : 'Startup',
                description: entry.description || `${entry.name} - ${sourceUrl} sayfasında taranmıştır.`,
                website: entry.url || sourceUrl
              });
            }
          }
        } catch (e) {}
      });

      // 2. Table Rows (tr -> td/th)
      const rows = document.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length >= 2) {
          const texts = cells.map(c => c.textContent?.trim() || '').filter(t => t.length > 1);
          if (texts.length >= 2) {
            const possibleName = texts[0];
            const possibleDesc = texts[1];
            if (possibleName && possibleName.length <= 90 && !/^\d+$/.test(possibleName)) {
              const link = row.querySelector('a[href^="http"], a[href^="/"]');
              let href = link?.getAttribute('href') || '';
              if (href.startsWith('/')) {
                try { href = new URL(sourceUrl).origin + href; } catch(e) {}
              }

              rawItems.push({
                name: possibleName,
                titleOrCompany: possibleDesc ? possibleDesc.substring(0, 70) : possibleName,
                type: 'Startup',
                description: possibleDesc || `${possibleName} - ${sourceUrl} sayfasından çekilmiştir.`,
                website: href || sourceUrl
              });
            }
          }
        }
      });

      // 3. Card Elements, Articles, List Items & Headings
      const cardSelectors = [
        'article', '.card', '.item', '.firma', '.company', '.firmalar', '.portfolio-item',
        'div[class*="card"]', 'div[class*="item"]', 'div[class*="firma"]', 'div[class*="post"]',
        'div[class*="box"]', 'li', 'h2', 'h3', 'h4'
      ];
      const cards = document.querySelectorAll(cardSelectors.join(', '));
      cards.forEach(card => {
        const titleEl = card.querySelector ? card.querySelector('h1, h2, h3, h4, h5, .title, .name, strong, a') : card;
        const descEl = card.querySelector ? card.querySelector('p, .desc, .description, span') : null;
        const name = titleEl?.textContent?.trim();
        const desc = descEl?.textContent?.trim();

        if (name && name.length >= 2 && name.length <= 90) {
          const link = card.querySelector ? card.querySelector('a[href^="http"], a[href^="/"]') : null;
          let href = link?.getAttribute('href') || '';
          if (href.startsWith('/')) {
            try { href = new URL(sourceUrl).origin + href; } catch(e) {}
          }

          rawItems.push({
            name,
            titleOrCompany: desc ? desc.substring(0, 60) : `${name} Teknoloji Girişimi`,
            type: /haber|etkinlik|zirve|duyuru/i.test(`${name} ${desc}`) ? 'Etkinlik / Haber' : 'Startup',
            description: desc && desc.length > 10 ? desc : `${name} - ${sourceUrl} adresinden taranan kayıt.`,
            website: href || sourceUrl
          });
        }
      });

      // 4. Line-by-line text parsing for copied text or raw text in HTML
      const plainTextContent = (html || '')
        .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/gi, ' ');

      const plainTextLines = plainTextContent.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      for (const line of plainTextLines) {
        if (line.startsWith('[') && line.endsWith(']')) continue;

        // Split on colon, dash, bullet, pipe or equal sign
        const colonIdx = line.indexOf(':');
        const dashIdx = line.indexOf(' - ');
        const pipeIdx = line.indexOf(' | ');

        let name = '';
        let desc = '';

        if (colonIdx > 1 && colonIdx < 60) {
          name = line.substring(0, colonIdx).replace(/^(?:\d+[\.\)]|\*|\•|\-)?\s*/, '').trim();
          desc = line.substring(colonIdx + 1).trim();
        } else if (dashIdx > 1 && dashIdx < 60) {
          name = line.substring(0, dashIdx).replace(/^(?:\d+[\.\)]|\*|\•|\-)?\s*/, '').trim();
          desc = line.substring(dashIdx + 3).trim();
        } else if (pipeIdx > 1 && pipeIdx < 60) {
          name = line.substring(0, pipeIdx).replace(/^(?:\d+[\.\)]|\*|\•|\-)?\s*/, '').trim();
          desc = line.substring(pipeIdx + 3).trim();
        }

        if (
          name && name.length >= 2 && name.length <= 65 && desc && desc.length >= 5 &&
          !['ana sayfa', 'iletişim', 'hakkımızda', 'firmalar', 'kategoriler', 'giriş', 'arama', 'menü', 'tüm hakları saklıdır', 'gizlilik politikası', 'sayfa', 'http', 'https'].includes(name.toLowerCase())
        ) {
          rawItems.push({
            name,
            titleOrCompany: desc.substring(0, 70),
            type: /fon|yatırım|vc/i.test(line) ? 'Yatırımcı / VC' : (/etkinlik|haber|zirve/i.test(line) ? 'Etkinlik / Haber' : 'Startup'),
            description: desc.length > 10 ? desc : `${name} - Ekosistem kaydı.`,
            website: sourceUrl || ''
          });
        }
      }

    } catch (domErr: any) {
      console.warn('DOM parser error:', domErr?.message);
    }

    return deduplicateAndNormalizeEntities(rawItems);
  }

  // Helper function: Chunk text into overlapping blocks to handle long pages without losing entities
  function chunkTextContent(text: string, chunkSize: number = 11000, overlap: number = 1000): string[] {
    if (text.length <= chunkSize) return [text];
    const chunks: string[] = [];
    let index = 0;
    while (index < text.length) {
      const end = Math.min(index + chunkSize, text.length);
      chunks.push(text.substring(index, end));
      if (end === text.length) break;
      index += (chunkSize - overlap);
    }
    return chunks;
  }

  // Helper function: Fetch & clean single page content + extract pagination links & proxy fallbacks for Cloudflare / JS rendering
  async function fetchPageContent(targetUrl: string, useHeadless: boolean = false): Promise<{ text: string; paginationUrls: string[] }> {
    try {
      let html = '';
      let isBlockedOrEmpty = false;

      try {
        const fetchedRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
          }
        });

        if (fetchedRes.ok) {
          html = await fetchedRes.text();
          if (
            html.includes('Just a moment...') ||
            html.includes('Cloudflare') ||
            html.includes('cf-browser-verification') ||
            html.includes('enable JavaScript') ||
            html.trim().length < 300
          ) {
            isBlockedOrEmpty = true;
          }
        } else {
          isBlockedOrEmpty = true;
        }
      } catch (directErr) {
        isBlockedOrEmpty = true;
      }

      // If direct fetch is blocked by Cloudflare / Security Firewall / JS Rendering, use Jina AI markdown reader proxy
      if (isBlockedOrEmpty) {
        console.log(`Direct fetch blocked or failed for ${targetUrl}, trying Jina AI reader proxy fallback...`);
        try {
          const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/plain, text/html'
            }
          });
          if (jinaRes.ok) {
            const jinaText = await jinaRes.text();
            if (jinaText && jinaText.length > 150 && !jinaText.includes('Just a moment...')) {
              console.log(`Successfully retrieved ${jinaText.length} characters via Jina AI markdown reader for ${targetUrl}!`);
              return {
                text: `--- SAYFA İÇERİĞİ (Jina AI Reader: ${targetUrl}) ---\n${jinaText}`,
                paginationUrls: []
              };
            }
          }
        } catch (jinaErr: any) {
          console.warn('Jina AI proxy fallback failed:', jinaErr?.message);
        }

        console.log(`Trying AllOrigins proxy fallback for ${targetUrl}...`);
        try {
          const corsRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
          if (corsRes.ok) {
            const corsHtml = await corsRes.text();
            if (corsHtml && corsHtml.length > 200) {
              html = corsHtml;
              isBlockedOrEmpty = false;
            }
          }
        } catch (corsErr) {}
      }

      const paginationUrls: string[] = [];

      // 1. SPA / JS State / JSON-LD / Meta Tag Extractions
      let scriptDataText = '';
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis) || [];
      for (const scriptTag of scriptMatches) {
        if (
          scriptTag.includes('__NEXT_DATA__') ||
          scriptTag.includes('__NUXT__') ||
          scriptTag.includes('application/ld+json') ||
          scriptTag.includes('application/json') ||
          scriptTag.includes('window.__INITIAL_STATE__') ||
          scriptTag.includes('window.__STORE__') ||
          scriptTag.includes('girisim') ||
          scriptTag.includes('startup') ||
          scriptTag.includes('company') ||
          scriptTag.includes('investor')
        ) {
          const rawTagContent = scriptTag.replace(/<[^>]+>/g, '').trim();
          if (rawTagContent.length > 20 && rawTagContent.length < 250000) {
            scriptDataText += `\n\n[Embedded SPA State / JSON-LD Data]:\n${rawTagContent}\n`;
          }
        }
      }

      // 2. API Endpoint Detection & Direct Extraction
      let apiEndpointData = '';
      const apiMatches = html.match(/["'](\/(?:api|v1|v2|graphql|data|json)[^"'\s]+)["']/gi) || [];
      if (apiMatches.length > 0) {
        const baseUrlObj = new URL(targetUrl);
        const fetchedApiPaths = new Set<string>();

        for (const rawMatch of apiMatches.slice(0, 4)) {
          const apiPath = rawMatch.replace(/['"]/g, '');
          if (!fetchedApiPaths.has(apiPath) && (apiPath.includes('startup') || apiPath.includes('company') || apiPath.includes('girisim') || apiPath.includes('event') || apiPath.includes('list') || apiPath.includes('data') || apiPath.includes('json'))) {
            fetchedApiPaths.add(apiPath);
            try {
              const fullApiUrl = apiPath.startsWith('http') ? apiPath : `${baseUrlObj.origin}${apiPath}`;
              const apiRes = await fetch(fullApiUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0 Safari/537.36', 'Accept': 'application/json' }
              });
              if (apiRes.ok) {
                const apiJson = await apiRes.text();
                if (apiJson.length > 30 && apiJson.length < 200000) {
                  apiEndpointData += `\n\n[Detected Internal API Endpoint Data (${fullApiUrl})]:\n${apiJson}\n`;
                }
              }
            } catch (aErr) {
              // Ignore API fetch errors
            }
          }
        }
      }

      // Meta tags extraction for SPA title & description fallback
      let metaText = '';
      const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
      const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
      const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      if (ogTitle || ogDesc || metaDesc) {
        metaText = `\n[META INFO]: Title: ${ogTitle ? ogTitle[1] : ''} | Desc: ${ogDesc ? ogDesc[1] : (metaDesc ? metaDesc[1] : '')}\n`;
      }

      // 3. Discover pagination links (e.g. href="...page=2", "p=2", "/page/2", "page=3")
      const hrefMatches = html.match(/href=["']([^"']+)["']/gi) || [];
      try {
        const baseUrlObj = new URL(targetUrl);
        for (const hrefAttr of hrefMatches) {
          const match = hrefAttr.match(/href=["']([^"']+)["']/i);
          if (match && match[1]) {
            let href = match[1];
            if (href.startsWith('/')) {
              href = `${baseUrlObj.origin}${href}`;
            } else if (!href.startsWith('http')) {
              href = `${baseUrlObj.origin}${baseUrlObj.pathname.replace(/\/[^\/]*$/, '/')}${href}`;
            }

            if (
              href.includes(baseUrlObj.hostname) &&
              (href.includes('page=') || href.includes('p=') || href.includes('pg=') || href.includes('start=') || /\/page\/\d+/i.test(href) || /\/p\/\d+/i.test(href)) &&
              href !== targetUrl &&
              !paginationUrls.includes(href)
            ) {
              paginationUrls.push(href);
            }
          }
        }
      } catch (urlErr) {
        // Ignore URL parsing errors for relative paths
      }

      // 4. Clean DOM HTML text - preserve table rows and structure with pipes
      let cleanText = html
        .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<svg\b[^<]*>([\s\S]*?)<\/svg>/gi, '')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<td\b[^>]*>/gi, ' | ')
        .replace(/<th\b[^>]*>/gi, ' | ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n/g, '\n');

      // 5. Headless Virtual DOM Rendering via JSDOM for SPA Client-Side Rendered (CSR) pages
      let jsdomText = '';
      if (useHeadless || cleanText.trim().length < 500 || html.includes('id="root"') || html.includes('id="app"')) {
        try {
          const dom = new JSDOM(html, {
            url: targetUrl,
            referrer: targetUrl,
            contentType: 'text/html',
            runScripts: 'dangerously',
            resources: 'usable'
          });
          const { document } = dom.window;

          // Collect rendered element texts
          const textElements = document.querySelectorAll('h1, h2, h3, h4, p, a, li, span, div[data-startup], div[class*="card"], div[class*="item"]');
          const renderedLines: string[] = [];
          textElements.forEach(el => {
            const txt = el.textContent?.trim();
            if (txt && txt.length > 3 && !renderedLines.includes(txt)) {
              renderedLines.push(txt);
            }
          });
          if (renderedLines.length > 0) {
            jsdomText = `\n\n[JSDOM Virtual Rendered DOM Output]:\n${renderedLines.join('\n')}\n`;
          }
        } catch (jErr: any) {
          console.warn(`JSDOM Virtual DOM rendering warning for ${targetUrl}:`, jErr?.message);
        }
      }

      return {
        text: `--- SAYFA İÇERİĞİ (${targetUrl}) ---\n${metaText}\n${cleanText}\n${scriptDataText}\n${apiEndpointData}\n${jsdomText}`,
        paginationUrls
      };
    } catch (err: any) {
      return { text: `[Sayfa Çekme Hatası: ${err.message}]`, paginationUrls: [] };
    }
  }

  // Allow iframe embedding from any domain (e.g., mamuthub.com, wordpress sites)
  app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    next();
  });

  app.use(express.json());

  // API endpoint for WordPress JSON sync or external REST fetch
  app.get('/api/entities', (req, res) => {
    res.json({
      success: true,
      count: INITIAL_ENTITIES.length,
      data: INITIAL_ENTITIES,
    });
  });

  // AI Scraper Route: Crawl and extract startup/investor data from URL or Raw Text with multi-page support & chunking
  app.post('/api/ai-extract-url', async (req, res) => {
    try {
      const { url, rawText, notes, maxPages = 5, useHeadless = false } = req.body;
      if (!url && !rawText) {
        return res.status(400).json({ success: false, error: 'URL veya metin girilmelidir.' });
      }

      let contentToAnalyze = rawText || '';
      let pagesCrawledCount = 0;

      if (url) {
        console.log(`Starting web crawl for: ${url} (Max Pages requested: ${maxPages}, Headless Mode: ${useHeadless})`);
        const primaryResult = await fetchPageContent(url, useHeadless);
        contentToAnalyze += `\n\n${primaryResult.text}`;
        pagesCrawledCount++;

        // Multi-page crawling logic if pagination detected or requested
        const pagesToFetch = primaryResult.paginationUrls.slice(0, Math.min(maxPages - 1, 8));

        // Also if URL has page=1, automatically construct page=2..maxPages if no explicit pagination links found
        if (pagesToFetch.length === 0 && (url.includes('page=') || url.includes('p='))) {
          for (let p = 2; p <= Math.min(maxPages, 5); p++) {
            const generatedUrl = url.replace(/(page|p)=\d+/, `$1=${p}`);
            if (generatedUrl !== url && !pagesToFetch.includes(generatedUrl)) {
              pagesToFetch.push(generatedUrl);
            }
          }
        }

        if (pagesToFetch.length > 0) {
          console.log(`Discovered ${pagesToFetch.length} additional paginated pages to fetch...`);
          const extraResults = await Promise.all(
            pagesToFetch.map(pageUrl => fetchPageContent(pageUrl, useHeadless))
          );

          for (const extraRes of extraResults) {
            contentToAnalyze += `\n\n${extraRes.text}`;
            pagesCrawledCount++;
          }
        }
      }

      // Step 3: Text Chunking Strategy for long pages (100+ startups)
      const chunks = chunkTextContent(contentToAnalyze, 12000, 1000);
      console.log(`Content prepared: Total length ${contentToAnalyze.length} chars, split into ${chunks.length} chunks for AI processing.`);

      let allExtractedItems: any[] = [];

      try {
        const ai = getAi();

        // Helper to process a single chunk through Gemini AI
        const extractFromChunk = async (chunkText: string, chunkIdx: number) => {
          const prompt = `
Sen Türkiye teknoloji ve girişimcilik ekosistemi veri analistisin.
Aşağıdaki metin/web sayfasından Türkiye ekosistemindeki TÜM VARLIKLARI (Girişimler, Yatırımcılar, Etkinlik/Haberler, Hızlandırıcılar/Kuluçkalar, Hibeler, Ar-Ge Merkezleri) çıkar ve kategorize et. (Bölüm ${chunkIdx + 1} / ${chunks.length})

ÇOK KRİTİK KURALLAR:
1. Metindeki TÜM KAYITLARI eksiksiz çıkar. Sayı ne kadar çok olursa olsun hepsini listele!
2. Her bir kayıt için aşağıdaki alanları EKSİKSİZ VE DETAYLI doldur:
   - "name": Girişim / Kurum / Etkinlik Adı (örn. "Getir", "İTÜ Çekirdek", "Webrazzi Zirvesi")
   - "titleOrCompany": Kısa Unvan / İnovasyon Odağı (örn. "Otonom Rota Optimizasyonu" veya "Melek Yatırım Ağı")
   - "type": Yalnızca şunlardan biri -> 'Startup', 'Yatırımcı / VC', 'Etkinlik / Haber', 'Hızlandırıcı & Kuluçka', 'Destek / Hibe', 'Kurumsal Ar-Ge'
   - "category": Yalnızca şunlardan biri -> 'AI & Veri', 'SaaS & Yazılım', 'FinTech', 'E-Ticaret & Lojistik', 'Oyun & Eğlence', 'Sağlık & Biyo', 'Derin Teknoloji', 'Eğitim (EdTech)', 'İklim & Yeşil Teknoloji', 'Siber Güvenlik', 'Gayrimenkul (PropTech)', 'İnsan Kaynakları (HRTech)', 'Pazarlama (MarTech)', 'Tarım & Gıda (AgriTech)', 'Sigorta (InsurTech)', 'Savunma & Uzay', 'Donanım & IoT', 'Haber & Medya'
   - "city": Metinde geçen veya girişimin merkez şehri (örn. 'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Kocaeli', 'Antalya', 'Muğla'). Belirtilmemişse Türkiye içi en uygun merkezi yaz.
   - "description": Metindeki bilgilere dayanarak girişimin/varlığın ne iş yaptığını anlatan en az 1-2 cümlelik açıklayıcı Türkçe metin. Boş bırakma!
   - "website": Varsa resmi web adresi, yoksa boş string.
   - "stage": 'Seed', 'Pre-seed', 'Series A', 'Series B', 'Scale-up' veya 'Fikir'

Metin Bölümü İçeriği:
${chunkText}

${notes ? `Kullanıcı Özel Notu / Bağlam: ${notes}` : ''}

ÇIKTI FORMATI: SADECE GEÇERLİ BİR JSON ARRAYİ DÖNDÜR (başka metin ekleme):
[
  {
    "name": "Girişim Adı",
    "titleOrCompany": "Kısa İnovatif Unvan",
    "type": "Startup",
    "category": "AI & Veri",
    "city": "İstanbul",
    "description": "Metinde geçen ürün/hizmet ve teknoloji açıklaması.",
    "website": "https://...",
    "stage": "Seed"
  }
]
`;

          const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
          for (const modelName of modelsToTry) {
            try {
              console.log(`Sending chunk ${chunkIdx + 1} to Gemini model: ${modelName}...`);
              const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json'
                }
              });
              const responseText = response.text || '';
              if (responseText) {
                const cleanJsonString = responseText
                  .replace(/```json/g, '')
                  .replace(/```/g, '')
                  .trim();
                const parsed = JSON.parse(cleanJsonString);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  console.log(`Gemini ${modelName} extracted ${parsed.length} items from chunk ${chunkIdx + 1}!`);
                  return parsed;
                }
              }
            } catch (mErr: any) {
              console.warn(`Chunk ${chunkIdx + 1} failed on ${modelName}:`, mErr?.message || mErr);
            }
          }
          return [];
        };

        // Run parallel Gemini AI extraction over all chunks
        const chunkResults = await Promise.all(
          chunks.map((chunk, idx) => extractFromChunk(chunk, idx))
        );

        allExtractedItems = chunkResults.flat();
      } catch (aiInitErr) {
        console.warn('Gemini AI initialization error or missing API key, relying on structural DOM fallback parser...', aiInitErr);
      }

      if (allExtractedItems.length === 0) {
        console.warn('AI call produced 0 items or was bypassed, parsing raw HTML/Text DOM structure directly for real entities...');
        allExtractedItems = extractEntitiesFromRawHtml(contentToAnalyze, url || '');
      }

      // Deduplicate across chunks and normalize categories & fields
      const cleanItems = deduplicateAndNormalizeEntities(allExtractedItems);

      res.json({
        success: true,
        count: cleanItems.length,
        pagesCrawled: pagesCrawledCount,
        chunksProcessed: chunks.length,
        data: cleanItems
      });

    } catch (error: any) {
      console.error('AI Extract Error:', error);
      
      const realHtmlFallback = extractEntitiesFromRawHtml(req.body?.rawText || '', req.body?.url || '');

      res.json({
        success: true,
        count: realHtmlFallback.length,
        pagesCrawled: 1,
        chunksProcessed: 1,
        data: realHtmlFallback,
        note: realHtmlFallback.length > 0 
          ? 'Metin içerisindeki gerçek HTML ögeleri ayrıştırıldı.' 
          : 'Sayfadan taranabilir içerik bulunamadı.'
      });
    }
  });

  const rssParser = new Parser({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    timeout: 10000
  });

  const DEFAULT_RSS_FEEDS = [
    { id: 'webrazzi', name: 'Webrazzi', url: 'https://webrazzi.com/feed/', category: 'Girişim & Yatırım' },
    { id: 'egirisim', name: 'Egirişim', url: 'https://egirisim.com/feed/', category: 'Startup Haberleri' },
    { id: 'techinside', name: 'TechInside', url: 'https://www.techinside.com/feed/', category: 'Teknoloji & İş Dünyası' }
  ];

  // Live RSS Feed Aggregator endpoint
  app.post('/api/rss-feeds', async (req, res) => {
    try {
      const { feeds } = req.body || {};
      const feedsToFetch = (Array.isArray(feeds) && feeds.length > 0) ? feeds : DEFAULT_RSS_FEEDS;

      console.log(`Fetching RSS feeds from ${feedsToFetch.length} sources...`);
      const allArticles: any[] = [];

      await Promise.all(
        feedsToFetch.map(async (feedObj: any) => {
          try {
            const feedData = await rssParser.parseURL(feedObj.url);
            const items = (feedData.items || []).slice(0, 15).map((item, idx) => {
              const rawContent = item.contentSnippet || item.content || item.summary || '';
              const cleanSnippet = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 320);
              return {
                id: item.guid || item.link || `${feedObj.id}-${idx}-${Date.now()}`,
                title: item.title || 'Başlıksız Haber',
                link: item.link || feedObj.url,
                pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
                creator: item.creator || item['dc:creator'] || feedObj.name,
                contentSnippet: cleanSnippet,
                sourceName: feedObj.name || feedData.title || 'Haber Kaynağı',
                sourceUrl: feedObj.url
              };
            });
            allArticles.push(...items);
          } catch (fErr: any) {
            console.warn(`RSS Feed fetch warning for ${feedObj.name} (${feedObj.url}):`, fErr?.message);
          }
        })
      );

      // Sort by publish date descending
      allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

      res.json({
        success: true,
        count: allArticles.length,
        articles: allArticles
      });
    } catch (err: any) {
      console.error('RSS Fetch API Error:', err);
      res.status(500).json({ success: false, error: err.message || 'RSS akışı çekilemedi.' });
    }
  });

  // AI News Analyzer: Scans news article for mentioned startups/investors & investment deals
  app.post('/api/ai-analyze-news', async (req, res) => {
    try {
      const { title, contentSnippet, link, sourceName } = req.body || {};
      if (!title) {
        return res.status(400).json({ success: false, error: 'Haber başlığı gereklidir.' });
      }

      const prompt = `
Aşağıdaki teknoloji/girişimcilik haberinden bahsi geçen TÜM GİRİŞİMLERİ ve YATIRIM Detaylarını tespit et ve ayrıştır.

Haber Başlığı: ${title}
Kaynak: ${sourceName || 'Haber Kaynağı'}
Haber Bağlantısı: ${link || ''}
Haber Özeti / İçeriği:
${contentSnippet || title}

GÖREV:
Haberde bahsi geçen Türkiye girişimcilik ekosistemindeki girişim(ler)i tespit et.
Eğer haber bir yatırım haberi ise (örneğin "X girişim Y milyon dolar yatırım aldı"), yatırım tutarını ve aşamasını da not et.

Kategori Listesi (Sadece bunlardan birini seç):
- 'AI & Veri'
- 'SaaS & Yazılım'
- 'FinTech'
- 'E-Ticaret & Lojistik'
- 'Oyun & Eğlence'
- 'Sağlık & Biyo'
- 'Derin Teknoloji'
- 'Eğitim (EdTech)'
- 'İklim & Yeşil Teknoloji'
- 'Siber Güvenlik'
- 'Gayrimenkul (PropTech)'
- 'İnsan Kaynakları (HRTech)'
- 'Pazarlama (MarTech)'
- 'Tarım & Gıda (AgriTech)'
- 'Sigorta (InsurTech)'
- 'Savunma & Uzay'
- 'Donanım & IoT'

ÇIKTI KURALI: Sadece geçerli bir JSON objesi döndür.
Format:
{
  "detectedStartups": [
    {
      "name": "Girişim Adı",
      "category": "SaaS & Yazılım",
      "city": "İstanbul",
      "investmentAmount": "$1.5M / 50 Milyon TL (varsa)",
      "stage": "Seed",
      "summary": "Haberdeki çözüm ve gelişme özeti",
      "website": "https://...",
      "titleOrCompany": "Kısa Unvan"
    }
  ]
}
`;

      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const responseText = response.text || '{}';
      const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed: any = {};
      try {
        parsed = JSON.parse(cleanJsonString);
      } catch (pErr) {
        console.warn('News analyze JSON parse error:', pErr);
      }

      res.json({
        success: true,
        detectedStartups: parsed.detectedStartups || []
      });
    } catch (err: any) {
      console.error('AI News Analyze Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Haber analizi yapılamadı.' });
    }
  });

  // Local Entities Persistence endpoints
  app.get('/api/entities', (req, res) => {
    try {
      const candidateFiles = [
        path.join(process.cwd(), 'entities.json'),
        path.join(process.cwd(), 'ecosystem.json'),
        path.join(process.cwd(), 'src', 'data', 'entities.json'),
        path.join(process.cwd(), 'public', 'entities.json')
      ];
      for (const filePath of candidateFiles) {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          try {
            const data = JSON.parse(raw);
            if (Array.isArray(data) && data.length > 0) {
              return res.json({ success: true, count: data.length, data });
            }
          } catch (e) {
            console.warn(`[Local API] Failed to parse ${filePath}`);
          }
        }
      }
      return res.json({ success: true, count: INITIAL_ENTITIES.length, data: INITIAL_ENTITIES });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/entities', (req, res) => {
    try {
      const { entities } = req.body;
      if (!Array.isArray(entities)) {
        return res.status(400).json({ success: false, error: 'entities bir dizi olmalıdır.' });
      }
      let currentDiskCount = 0;
      const candidateFiles = [
        path.join(process.cwd(), 'entities.json'),
        path.join(process.cwd(), 'ecosystem.json'),
        path.join(process.cwd(), 'src', 'data', 'entities.json'),
        path.join(process.cwd(), 'public', 'entities.json')
      ];
      for (const f of candidateFiles) {
        if (fs.existsSync(f)) {
          try {
            const diskData = JSON.parse(fs.readFileSync(f, 'utf-8'));
            if (Array.isArray(diskData) && diskData.length > currentDiskCount) {
              currentDiskCount = diskData.length;
            }
          } catch (e) {}
        }
      }

      if (currentDiskCount > 0 && entities.length < currentDiskCount && entities.length <= 43) {
        console.warn(`[Local API] Ignored POST /api/entities with ${entities.length} items because disk already has ${currentDiskCount} items.`);
        return res.json({ success: true, count: currentDiskCount, note: 'Disk has more items, request ignored' });
      }

      saveEntitiesToDisk(entities);
      return res.json({ success: true, count: entities.length });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Server-side GitHub Commit Proxy endpoint
  app.post('/api/github/commit', async (req, res) => {
    try {
      const { owner, repo, filePath, branch, token, entities, commitMessage } = req.body;
      if (!owner || !repo || !token) {
        return res.status(400).json({ success: false, error: 'owner, repo ve token parametreleri zorunludur.' });
      }

      // Determine entity list to commit: prefer disk data if disk has more items or if entities is missing/incomplete
      let entitiesToCommit: any[] = Array.isArray(entities) ? entities : [];
      const candidateFiles = [
        path.join(process.cwd(), 'entities.json'),
        path.join(process.cwd(), 'ecosystem.json'),
        path.join(process.cwd(), 'src', 'data', 'entities.json'),
        path.join(process.cwd(), 'public', 'entities.json')
      ];
      for (const f of candidateFiles) {
        if (fs.existsSync(f)) {
          try {
            const diskData = JSON.parse(fs.readFileSync(f, 'utf-8'));
            if (Array.isArray(diskData) && diskData.length > entitiesToCommit.length) {
              console.log(`[Server Proxy] Using disk file data (${diskData.length} items) over request body (${entitiesToCommit.length} items)`);
              entitiesToCommit = diskData;
            }
          } catch (e) {}
        }
      }

      // Automatically sync local disk as well when committing to GitHub
      if (entitiesToCommit.length > 0) {
        saveEntitiesToDisk(entitiesToCommit);
      }

      const primaryPath = filePath ? (filePath.startsWith('/') ? filePath.substring(1) : filePath) : 'entities.json';
      const targetPaths = Array.from(new Set([
        primaryPath,
        'entities.json',
        'ecosystem.json',
        'src/data/entities.json',
        'public/entities.json'
      ].filter(Boolean)));

      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mamuthub-Server'
      };

      const jsonString = JSON.stringify(entitiesToCommit, null, 2);
      const base64Content = Buffer.from(jsonString, 'utf-8').toString('base64');

      const successfulCommits: string[] = [];
      let lastSha: string | undefined = undefined;
      let lastError: string | undefined = undefined;

      for (const targetPath of targetPaths) {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

        const fetchFreshSha = async (): Promise<string | undefined> => {
          try {
            const freshRes = await fetch(`${apiUrl}?ref=${branch || 'main'}&_t=${Date.now()}`, { headers });
            if (freshRes.ok) {
              const fileMeta: any = await freshRes.json();
              return fileMeta.sha;
            }
          } catch (e) {
            console.warn(`[Server Proxy] Could not fetch SHA for ${targetPath}:`, e);
          }
          return undefined;
        };

        let currentSha = await fetchFreshSha();

        const attemptPut = async (shaToUse?: string) => {
          const bodyData: any = {
            message: `${commitMessage || 'Update entities via Mamuthub Admin'} [${targetPath}]`,
            content: base64Content,
            branch: branch || 'main'
          };
          if (shaToUse) {
            bodyData.sha = shaToUse;
          }

          const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(bodyData)
          });

          const putData: any = await putRes.json();
          return { ok: putRes.ok, status: putRes.status, data: putData };
        };

        try {
          let result = await attemptPut(currentSha);

          if (!result.ok && (result.status === 409 || (result.data?.message && result.data.message.toLowerCase().includes('does not match')))) {
            console.warn(`[Server Proxy] SHA mismatch for ${targetPath}, retrying with fresh SHA...`);
            currentSha = await fetchFreshSha();
            result = await attemptPut(currentSha);
          }

          if (result.ok) {
            successfulCommits.push(targetPath);
            lastSha = result.data.content?.sha || result.data.commit?.sha || lastSha;
          } else {
            console.warn(`[Server Proxy] Commit to ${targetPath} failed:`, result.data?.message);
            lastError = result.data?.message || `HTTP ${result.status}`;
          }
        } catch (err: any) {
          console.error(`[Server Proxy] Error committing to ${targetPath}:`, err);
          lastError = err.message;
        }
      }

      if (successfulCommits.length > 0) {
        return res.json({
          success: true,
          sha: lastSha,
          updatedFiles: successfulCommits
        });
      } else {
        return res.status(400).json({
          success: false,
          error: lastError || 'GitHub commit atılamadı. Token izinlerini ve Repo adını kontrol edin.'
        });
      }
    } catch (err: any) {
      console.error('[Server Proxy] GitHub commit endpoint error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Sunucu üzerinden GitHub commit hatası.' });
    }
  });

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
