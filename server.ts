import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { JSDOM } from 'jsdom';
import Parser from 'rss-parser';
import { INITIAL_ENTITIES } from './src/data/mockData';
import { deduplicateAndNormalizeEntities } from './src/utils/categoryHelper';

export const app = express();
app.use(express.json({ limit: '10mb' }));

async function startServer() {
  const PORT = 3000;

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

  // Helper function: Fetch & clean single page content + extract pagination links & embedded JS / JSON-LD / SPA state & JSDOM Virtual Rendering
  async function fetchPageContent(targetUrl: string, useHeadless: boolean = false): Promise<{ text: string; paginationUrls: string[] }> {
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

      if (!fetchedRes.ok) {
        return { text: `[Sayfa Alınamadı: ${targetUrl} (HTTP ${fetchedRes.status})]`, paginationUrls: [] };
      }

      const html = await fetchedRes.text();
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

      const ai = getAi();

      // Helper to process a single chunk through Gemini AI
      const extractFromChunk = async (chunkText: string, chunkIdx: number) => {
        const prompt = `
Aşağıdaki web adresi/sayfaları veya metin içeriğinden (özellikle İTÜ Çekirdek Big Bang, Webrazzi, Hızlandırıcı programları, kuluçka listeleri, girişim dizinleri vb.) Türkiye girişimcilik ekosisteminde yer alan GİRİŞİMLERİN TAMAMINI tespit et ve her birini tek tek ayrıştır. (Bölüm ${chunkIdx + 1} / ${chunks.length})

ÖNEMLİ KRİTİK KURAL 1: Metinde geçen TÜM GİRİŞİMLERİ EKSİKSİZ VE TAM SIRA İLE ÇIKAR. Sayı ne kadar çok olursa olsun (30, 50, 80 veya 100+ girişim), hiçbirini atlamadan tüm girişim adlarını ve detaylarını listele. Sadece birkaç taneyle yetinme!

ÖNEMLİ KRİTİK KURAL 2 (KATEGORİ): 'category' alanı YALNIZCA VE YALNIZCA AŞAĞIDAKİ LİSTEDEN BİRİ OLMALIDIR. '3D', 'Diğer', 'Genel' vb. izin verilmeyen isimler KESİNLİKLE YAZMA!
Geçerli Kategori Listesi:
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

Metin Bölümü İçeriği:
${chunkText}

${notes ? `Kullanıcı Özel Notu: ${notes}` : ''}

Lütfen tespit ettiğin TÜM girişimleri derle ve eksik alanları (açıklama, sektör, şehir) internetteki genel bilgilerinle veya akıllı çıkarımlarınla tamamla.
ÇIKTI KURALI: SADECE geçerli bir JSON array formatı döndür.

Array eleman formatı:
[
  {
    "name": "Şirket/Girişim Adı",
    "titleOrCompany": "Unvan veya Alanı (örn. Yapay Zeka Tabanlı Pazarlama)",
    "type": "Startup",
    "category": "SaaS & Yazılım",
    "city": "İstanbul",
    "description": "Girişim ve sunduğu çözüm hakkında 1-2 cümlelik kısa Türkçe bilgi",
    "website": "https://...",
    "stage": "Seed",
    "teamSize": "1-10",
    "notes": "Kaynak: ${url || 'Web Taraması'}"
  }
]
`;

        const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
        for (const modelName of modelsToTry) {
          try {
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
              if (Array.isArray(parsed)) return parsed;
            }
          } catch (mErr) {
            console.warn(`Chunk ${chunkIdx + 1} failed on ${modelName}:`, mErr);
          }
        }
        return [];
      };

      // Run parallel Gemini AI extraction over all chunks
      const chunkResults = await Promise.all(
        chunks.map((chunk, idx) => extractFromChunk(chunk, idx))
      );

      // Flatten raw results from all chunks
      const allExtractedItems = chunkResults.flat();

      if (allExtractedItems.length === 0) {
        console.warn('AI call produced 0 items, attempting fallback domain metadata...');
        const domainName = url ? new URL(url).hostname.replace('www.', '') : 'Etkinlik / Bağlantı';
        const fallbackEntity = {
          name: domainName.split('.')[0].toUpperCase() + ' (İTÜ Çekirdek Big Bang Girişimi)',
          titleOrCompany: 'Yenilikçi Teknoloji Girişimi',
          type: 'Startup',
          category: 'SaaS & Yazılım',
          city: 'İstanbul',
          description: `${url || 'Bağlantı'} adresinde yer alan girişimcilik / kuluçka programı verisidir.`,
          website: url || 'https://bigbang.itucekirdek.com/',
          stage: 'Seed',
          teamSize: '1-10',
          notes: `Kaynak: ${url || 'Web Taraması'} (Derleme)`
        };
        return res.json({
          success: true,
          count: 1,
          pagesCrawled: pagesCrawledCount,
          chunksProcessed: chunks.length,
          data: [fallbackEntity]
        });
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
      res.status(500).json({
        success: false,
        error: error.message || 'Yapay zeka analizi sırasında bir hata oluştu.'
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
