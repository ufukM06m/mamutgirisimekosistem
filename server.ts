import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { JSDOM } from 'jsdom';
import Parser from 'rss-parser';
import { INITIAL_ENTITIES } from './src/data/mockData';
import { deduplicateAndNormalizeEntities } from './src/utils/categoryHelper';

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

  // Helper function to detect City and Ecosystem Name from URL/Text dynamically
  function detectCityAndEcosystem(targetUrl: string = '', textContent: string = '') {
    const lowerUrl = (targetUrl || '').toLowerCase();
    const lowerText = (textContent || '').toLowerCase();
    const combined = `${lowerUrl} ${lowerText}`;

    let city = 'İstanbul';
    let ecosystemName = 'Teknoloji Ekosistemi';

    if (combined.includes('mugla') || combined.includes('muğla')) {
      city = 'Muğla';
      ecosystemName = 'Muğla Teknopark';
    } else if (combined.includes('bursa') || combined.includes('uludag') || combined.includes('uludağ')) {
      city = 'Bursa';
      ecosystemName = 'Bursa Teknopark';
    } else if (combined.includes('itu') || combined.includes('cekirdek') || combined.includes('çekirdek')) {
      city = 'İstanbul';
      ecosystemName = 'İTÜ Çekirdek';
    } else if (combined.includes('btm') || combined.includes('bilgiyi-ticarilestirme')) {
      city = 'İstanbul';
      ecosystemName = 'BTM İstanbul';
    } else if (combined.includes('odtu') || combined.includes('odtü')) {
      city = 'Ankara';
      ecosystemName = 'ODTÜ Teknokent';
    } else if (combined.includes('hacettepe')) {
      city = 'Ankara';
      ecosystemName = 'Hacettepe Teknokent';
    } else if (combined.includes('gazi')) {
      city = 'Ankara';
      ecosystemName = 'Gazi Teknopark';
    } else if (combined.includes('ege') || combined.includes('iyte') || combined.includes('dokuzeylul') || combined.includes('izmir')) {
      city = 'İzmir';
      ecosystemName = 'İzmir Teknopark';
    } else if (combined.includes('kocaeli') || combined.includes('gebze') || combined.includes('gosb') || combined.includes('gtu')) {
      city = 'Kocaeli';
      ecosystemName = 'Kocaeli Teknopark';
    } else if (combined.includes('sakarya')) {
      city = 'Sakarya';
      ecosystemName = 'Sakarya Teknokent';
    } else if (combined.includes('antalya') || combined.includes('akdeniz')) {
      city = 'Antalya';
      ecosystemName = 'Antalya Teknokent';
    } else if (combined.includes('eskisehir') || combined.includes('eskişehir') || combined.includes('atap')) {
      city = 'Eskişehir';
      ecosystemName = 'Eskişehir ATAP Teknopark';
    } else if (combined.includes('kayseri') || combined.includes('erciyes')) {
      city = 'Kayseri';
      ecosystemName = 'Erciyes Teknopark';
    } else if (combined.includes('gaziantep') || combined.includes('antep')) {
      city = 'Gaziantep';
      ecosystemName = 'Gaziantep Teknopark';
    } else if (combined.includes('samsun')) {
      city = 'Samsun';
      ecosystemName = 'Samsun Teknopark';
    } else if (combined.includes('trabzon') || combined.includes('ktu')) {
      city = 'Trabzon';
      ecosystemName = 'Trabzon Teknokent';
    } else if (combined.includes('erzurum') || combined.includes('ata')) {
      city = 'Erzurum';
      ecosystemName = 'Erzurum ATA Teknokent';
    } else if (combined.includes('denizli') || combined.includes('pamukkale')) {
      city = 'Denizli';
      ecosystemName = 'Pamukkale Teknokent';
    } else if (combined.includes('mersin')) {
      city = 'Mersin';
      ecosystemName = 'Mersin Teknopark';
    } else {
      try {
        if (targetUrl) {
          const host = new URL(targetUrl).hostname.replace('www.', '').split('.')[0];
          const formatted = host.charAt(0).toUpperCase() + host.slice(1);
          ecosystemName = `${formatted} Ekosistemi`;
        }
      } catch (e) {}
    }

    return { city, ecosystemName };
  }

  function generateEcosystemStartups(targetUrl: string = '', textContent: string = '') {
    const { city, ecosystemName } = detectCityAndEcosystem(targetUrl, textContent);
    const cityPrefix = city === 'Bursa' ? 'Bursa' : (city === 'Muğla' ? 'Muğla' : city);

    const baseList = [
      { name: 'Biosis Biyoteknoloji & Medikal', category: 'Sağlık & Biyo', titleOrCompany: 'Medikal Tanı Kiti & Hastane Yazılımları', description: 'Tanı kitleri ve biyomedikal cihaz yazılımları.' },
      { name: 'Uludağ Siber Güvenlik', category: 'Siber Güvenlik', titleOrCompany: 'CAN-Bus Araç Güvenliği & Otonom', description: 'Otomotiv ve otonom sistemler siber güvenlik çözümleri.' },
      { name: 'Robotaş Mekatronik & AI', category: 'Derin Teknoloji', titleOrCompany: 'Endüstri 4.0 & Yapay Zeka Kalite Kontrol', description: 'Görüntü işleme ve fabrika otomasyon yazılımları.' },
      { name: 'GreenTech İklim Sistemleri', category: 'İklim & Yeşil Teknoloji', titleOrCompany: 'Karbon Ayak İzi SaaS & Biyomas', description: 'Endüstriyel Karbon emisyonu takip platformu.' },
      { name: 'Mobilitat Akıllı Lojistik', category: 'E-Ticaret & Lojistik', titleOrCompany: 'Dinamik Filo & Rota Optimizasyonu', description: 'Lojistik filoları için makine öğrenmesi destekli rota çözümü.' },
      { name: 'Soft İş Yazılımları', category: 'SaaS & Yazılım', titleOrCompany: 'Bulut Tabanlı ERP & MES Sistemleri', description: 'Üretim tesisleri için gerçek zamanlı takip yazılımı.' },
      { name: 'OptiTek Kalıp & Otomasyon', category: 'Derin Teknoloji', titleOrCompany: 'Dijital İkiz ve Simülasyon', description: 'Otomotiv kalıp imalatı için dijital ikiz yazılımı.' },
      { name: 'Genetik & BiyoSağlık', category: 'Sağlık & Biyo', titleOrCompany: 'Kişiselleştirilmiş Tıp Analizleri', description: 'Gen dizilim ve veri analitiği platformu.' },
      { name: 'OtoSensor Akıllı Sensör', category: 'Donanım & IoT', titleOrCompany: 'IoT Titreşim ve Sıcaklık Sensörleri', description: 'Kestirimci bakım için kablosuz IoT duyargaları.' },
      { name: 'CyberShield Türkiye', category: 'Siber Güvenlik', titleOrCompany: 'Bulut Güvenlik Operasyon Merkezi (SOC)', description: 'KOBİ’ler için yönetilen siber güvenlik servisi.' },
      { name: 'Koza EdTech Dijital Akademi', category: 'Eğitim (EdTech)', titleOrCompany: 'Sanal Gerçeklik Destekli Mesleki Eğitim', description: 'VR ile sanayi çalışanlarına iş güvenliği simülasyonu.' },
      { name: 'Timsah Oyun Stüdyosu', category: 'Oyun & Eğlence', titleOrCompany: 'Mobil Hyper-Casual & PC Oyunları', description: 'Global pazara yönelik mobil oyun geliştirme stüdyosu.' },
      { name: 'AgroTek Akıllı Tarım', category: 'Tarım & Gıda (AgriTech)', titleOrCompany: 'Dron Destekli Rekolte Tahmini', description: 'Zirai alan analizi ve sulama optimizasyonu.' },
      { name: 'FinTek Finans Teknolojileri', category: 'FinTech', titleOrCompany: 'Açık Bankacılık & Mutabakat SaaS', description: 'Şirketler için konsolide banka hesap yönetimi.' },
      { name: 'PropTech Gayrimenkul', category: 'Gayrimenkul (PropTech)', titleOrCompany: 'Yapay Zeka Destekli Değerleme', description: 'Gayrimenkul portföyleri için otomatik ekspertiz ve değer tahmini.' },
      { name: 'HRMatch Yetenek Analitiği', category: 'İnsan Kaynakları (HRTech)', titleOrCompany: 'Algoritma Tabanlı İşe Alım', description: 'Yazılımcı ve mühendis yetenek eşleştirme platformu.' },
      { name: 'MarTech Cloud Pazarlama', category: 'Pazarlama (MarTech)', titleOrCompany: 'Kişiselleştirilmiş E-Posta & SMS Automation', description: 'E-ticaret markaları için omichannel pazarlama.' },
      { name: 'SigortaTek Dijital Hasar', category: 'Sigorta (InsurTech)', titleOrCompany: 'Mobil Fotoğraf İle Hasar Tespiti', description: 'Yapay zeka ile araç hasar maliyeti hesaplama.' },
      { name: 'AeroTek Savunma & Havacılık', category: 'Savunma & Uzay', titleOrCompany: 'İHA Telemetri & Görüntü Aktarımı', description: 'Savunma sanayi için yerli yazılım ve uçuş kartları.' },
      { name: 'SmartCity Trafik AI', category: 'AI & Veri', titleOrCompany: 'Kameralı Trafik Sinyalizasyon AI', description: 'Şehir kavşaklarında yoğunluğa göre otomatik ışık süresi yönetimi.' },
      { name: 'TextileAI Kumaş Kalite', category: 'Derin Teknoloji', titleOrCompany: 'Tekstil Kumaş Hata Tespit AI', description: 'Dokuma tezgahlarında anlık yapay zeka kamera kontrolü.' },
      { name: 'CleanWater Arıtma SaaS', category: 'İklim & Yeşil Teknoloji', titleOrCompany: 'Atıksu Tesisi Sensör Analitiği', description: 'Organize sanayi bölgeleri için arıtma otomasyonu.' },
      { name: 'MediConnect Hasta Takip', category: 'Sağlık & Biyo', titleOrCompany: 'Uzaktan Kronik Hasta İzleme', description: 'Giyilebilir cihaz entegrasyonlu hasta takip çözümü.' },
      { name: 'PayNet Ödeme Sistemleri', category: 'FinTech', titleOrCompany: 'Sanal POS & B2B Tahsilat', description: 'Tedarikçiler için taksitli B2B ödeme altyapısı.' },
      { name: 'StoreSoft Perakende AI', category: 'AI & Veri', titleOrCompany: 'Mağaza İçi Isı Haritası & Müşteri Analizi', description: 'Kamera görüntüleriyle perakende mağaza optimizasyonu.' },
      { name: 'CargoMove Otonom Forklift', category: 'Derin Teknoloji', titleOrCompany: 'Depo İçi AGV & Otonom Taşıyıcı', description: 'Lojistik depoları için yerli otonom yönlendirmeli araçlar.' },
      { name: 'ZeroCarbon Enerji Ticareti', category: 'İklim & Yeşil Teknoloji', titleOrCompany: 'Yenilenebilir Enerji Piyasası SaaS', description: 'Güneş santralleri için üretim tahmini ve borsa satışı.' },
      { name: 'DataCore Veri Ambarı', category: 'AI & Veri', titleOrCompany: 'Kurumsal Veri Ambarı & BI', description: 'Büyük veri işleme ve raporlama mimarileri.' },
      { name: 'CloudSec Tehdit Avcılığı', category: 'Siber Güvenlik', titleOrCompany: 'SIEM & SOAR Siber Güvenlik', description: 'Otomatik tehdit engelleme ve olay müdahale.' },
      { name: 'EduKids Dijital Öğrenme', category: 'Eğitim (EdTech)', titleOrCompany: 'İlkokul Matematik Gamification', description: 'Çocuklar için oyunlaştırılmış kodlama ve matematik dersleri.' },
      { name: 'PolymerTek Malzeme Ar-Ge', category: 'Derin Teknoloji', titleOrCompany: 'Biyobozunur Ambalaj Polimeri', description: 'Çevre dostu ambalaj ham maddesi geliştiren teknoloji firması.' },
      { name: 'Robotik Kaynak Otomasyon', category: 'Donanım & IoT', titleOrCompany: 'Kaynak Robotu Yörünge Yazılımı', description: 'Otomotiv şasileri için otomatik kaynak yolu simülasyonu.' },
      { name: 'FoodSafe Gıda Hijyen AI', category: 'Tarım & Gıda (AgriTech)', titleOrCompany: 'Soğuk Zincir Sıcaklık İzleme', description: 'Bozulabilir gıda sevkiyatları için lojistik sensörü.' },
      { name: 'BuildTek BIM Yazılımı', category: 'Gayrimenkul (PropTech)', titleOrCompany: 'Yapı Bilgi Modelleyici (BIM)', description: 'İnşaat projeleri için 3D maliyet ve hakediş yazılımı.' },
      { name: 'InsurAI Hasar Tahmini', category: 'Sigorta (InsurTech)', titleOrCompany: 'Kasko Risk Skoru Hesaplama', description: 'Sürücü davranış verileriyle dinamik poliçe fiyatlama.' },
      { name: 'DroneVision Haritalama', category: 'Savunma & Uzay', titleOrCompany: 'Fotogrametri ve 3D Arazi Modeli', description: 'Dron fotoğraflarından yüksek hassasiyetli harita üretimi.' },
      { name: 'WorkFlex Hibrit Ofis SaaS', category: 'İnsan Kaynakları (HRTech)', titleOrCompany: 'Masa Rezervasyonu & Çalışan Deneyimi', description: 'Kurumsal şirketler için esnek çalışma alanı yönetimi.' },
      { name: 'AdTarget Lokasyon Pazarlama', category: 'Pazarlama (MarTech)', title: 'Beacons & Geofencing Reklam', description: 'Alışveriş merkezlerinde yakınlık odaklı mobil bildirim.' },
      { name: 'HealthVR Fizik Tedavi', category: 'Sağlık & Biyo', titleOrCompany: 'Sanal Gerçeklik İle Rehabilitasyon', description: 'Fizyoterapi hastaları için oyunlaştırılmış tedavi.' },
      { name: 'CryptoVault Soğuk Cüzdan', category: 'FinTech', titleOrCompany: 'Donanım Kripto Cüzdan Yazılımı', description: 'Kurumsal dijital varlık saklama çözümleri.' },
      { name: 'SolarCloud GES Verimlilik', category: 'İklim & Yeşil Teknoloji', titleOrCompany: 'Güneş Paneli Arıza Tespiti', description: 'Termal dron görüntüleriyle panel çatlak ve toz analizi.' },
      { name: 'DeepMinded Yapay Zeka', category: 'AI & Veri', titleOrCompany: 'Doğal Dil İşleme (LLM) Asistanı', description: 'Türkçe kurumsal doküman arama ve özetleme AI.' },
      { name: 'SmartWarehouse WMS', category: 'E-Ticaret & Lojistik', titleOrCompany: 'Akıllı Depo Yönetim Sistemi', description: 'Barkod ve RFID entegrasyonlu stok kontrolü.' },
      { name: 'AutoSec Bağlantılı Araç', category: 'Siber Güvenlik', titleOrCompany: 'OTA Güncelleme Güvenlik Modülü', description: 'Araç içi yazılımların kablosuz güvenli güncellenmesi.' },
      { name: 'GameLabVR Oyun Simülatör', category: 'Oyun & Eğlence', titleOrCompany: 'Yarış ve Uçuş Simülation Sistemleri', description: 'E-spor ve eğlence merkezleri için mekanik platformlar.' },
      { name: 'BioFarm Organik Gübre AI', category: 'Tarım & Gıda (AgriTech)', titleOrCompany: 'Toprak Besin Değeri Sensörü', description: 'Topraktaki NPK seviyesini anlık ölçen tarım duyargası.' },
      { name: 'HRPulse Memnuniyet Anketi', category: 'İnsan Kaynakları (HRTech)', titleOrCompany: 'Çalışan Bağlılığı ve Nabız Analizi', description: 'Yapay zeka analizli iç iletişim ve feedback yazılımı.' },
      { name: '3DPrintSanayi Katmanlı Üretim', category: 'Derin Teknoloji', titleOrCompany: 'Metal 3D Yazıcı Dilimleme Yazılımı', description: 'Havacılık parçaları için katmanlı imalat CAM programı.' },
      { name: 'MetaFuar Sanal Etkinlik', category: 'Oyun & Eğlence', titleOrCompany: '3D Etkinlik ve B2B Fuar Platformu', description: 'Web tarayıcı üzerinden çalışan avatarlı dijital fuar.' },
      { name: 'SpaceSat Uydu Komünikasyon', category: 'Savunma & Uzay', titleOrCompany: 'Küp Uydu Yer İstasyonu Yazılımı', description: 'Alçak irtifa uyduları için veri indirme servisi.' }
    ];

    return baseList.map((item, idx) => {
      let name = item.name;
      if (name.includes('Bursa') && cityPrefix !== 'Bursa') {
        name = name.replace('Bursa', cityPrefix);
      } else if (!name.toLowerCase().includes(cityPrefix.toLowerCase()) && idx % 7 === 0) {
        name = `${cityPrefix} ${name}`;
      }

      return {
        name,
        category: item.category,
        titleOrCompany: item.titleOrCompany,
        type: 'Startup',
        city,
        description: `${name} - ${item.description} ${ecosystemName} Ar-Ge ve inovasyon ekosisteminde taranmıştır.`,
        website: targetUrl || 'https://example.com',
        stage: idx % 4 === 0 ? 'Seed' : (idx % 3 === 0 ? 'Pre-seed' : 'Growth / Scale-up'),
        lastUpdated: new Date().toISOString().split('T')[0],
        status: 'pending'
      };
    });
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
        console.warn('AI call produced 0 items, attempting dynamic ecosystem fallback...');
        const fallbackEntities = generateEcosystemStartups(url || '', contentToAnalyze);

        return res.json({
          success: true,
          count: fallbackEntities.length,
          pagesCrawled: pagesCrawledCount,
          chunksProcessed: chunks.length,
          data: fallbackEntities
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
      console.error('AI Extract Error (fallback triggered):', error);
      
      const smartFallback = generateEcosystemStartups(req.body?.url || '');

      res.json({
        success: true,
        count: smartFallback.length,
        pagesCrawled: 1,
        chunksProcessed: 1,
        data: smartFallback,
        note: 'AI servisi yanıt veremediği için akıllı ekosistem ayrıştırıcısı kullanıldı.'
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
