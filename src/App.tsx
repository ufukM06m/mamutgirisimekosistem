import React, { useState } from 'react';
import { EcosystemEntity, ScraperLog, ActiveTab } from './types';
import { INITIAL_ENTITIES, INITIAL_SCRAPER_LOGS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { DirectoryView } from './components/DirectoryView';
import { AdminView } from './components/AdminView';
import { ScraperSyncView } from './components/ScraperSyncView';
import { ArrowLeft } from 'lucide-react';

export default function App() {
  const [entities, setEntities] = useState<EcosystemEntity[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mamuthub_entities');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load entities from localStorage:', e);
    }
    return INITIAL_ENTITIES;
  });

  const [logs, setLogs] = useState<ScraperLog[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mamuthub_logs');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load logs from localStorage:', e);
    }
    return INITIAL_SCRAPER_LOGS;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
  const [isScraping, setIsScraping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync entities to localStorage
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mamuthub_entities', JSON.stringify(entities));
      }
    } catch (e) {
      console.error('Failed to save entities to localStorage:', e);
    }
  }, [entities]);

  // Sync logs to localStorage
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mamuthub_logs', JSON.stringify(logs));
      }
    } catch (e) {
      console.error('Failed to save logs to localStorage:', e);
    }
  }, [logs]);

  // Check URL search parameters or window iframe context
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const [isTestEmbedMode, setIsTestEmbedMode] = useState<boolean>(false);

  const isEmbedMode = isInIframe || isTestEmbedMode || (() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('embed') === 'true' || params.get('embed') === '1';
    }
    return false;
  })();

  // Automatically broadcast content height to parent window (WordPress) for seamless auto-resizing iframe
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const sendHeight = () => {
      const rootEl = document.getElementById('root');
      if (!rootEl) return;
      const contentHeight = Math.ceil(rootEl.scrollHeight || rootEl.getBoundingClientRect().height);
      if (window.parent && window.parent !== window && contentHeight > 0) {
        window.parent.postMessage({ type: 'MAMUTHUB_RESIZE', height: contentHeight }, '*');
      }
    };

    sendHeight();

    let resizeObserver: ResizeObserver | null = null;
    const rootEl = document.getElementById('root');
    if (typeof ResizeObserver !== 'undefined' && rootEl) {
      resizeObserver = new ResizeObserver(() => sendHeight());
      resizeObserver.observe(rootEl);
    }

    window.addEventListener('resize', sendHeight);
    return () => {
      window.removeEventListener('resize', sendHeight);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [entities, isEmbedMode, isTestEmbedMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddEntity = (newEntityData: Omit<EcosystemEntity, 'id' | 'lastUpdated'>) => {
    const newEntity: EcosystemEntity = {
      ...newEntityData,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setEntities(prev => [newEntity, ...prev]);
    showToast(`"${newEntity.name}" başarıyla eklendi ve hafızaya kaydedildi!`);
  };

  const handleUpdateEntity = (updatedEntity: EcosystemEntity) => {
    setEntities(prev => prev.map(item => item.id === updatedEntity.id ? updatedEntity : item));
    showToast(`"${updatedEntity.name}" bilgileri güncellendi.`);
  };

  const handleDeleteEntity = (id: string) => {
    const target = entities.find(e => e.id === id);
    setEntities(prev => prev.filter(item => item.id !== id));
    if (target) {
      showToast(`"${target.name}" silindi.`);
    }
  };

  const handleResetDefault = () => {
    if (typeof window !== 'undefined' && !window.confirm('Tüm yerel eklemeleriniz silinecek ve sistem fabrika ayarlarına döndürülecektir. Emin misiniz?')) {
      return;
    }
    try {
      localStorage.removeItem('mamuthub_entities');
      localStorage.removeItem('mamuthub_logs');
    } catch (e) {
      console.error(e);
    }
    setEntities(INITIAL_ENTITIES);
    setLogs(INITIAL_SCRAPER_LOGS);
    showToast('Tüm veriler fabrika ayarlarına (Orijinal repo kod haline) sıfırlandı.');
  };

  const handleSyncWithRepo = () => {
    // Keep existing items, append any new entities from repo INITIAL_ENTITIES that aren't present by ID or Name
    const existingNames = new Set(entities.map(e => e.name.toLowerCase()));
    const newFromRepo = INITIAL_ENTITIES.filter(e => !existingNames.has(e.name.toLowerCase()));

    if (newFromRepo.length > 0) {
      setEntities(prev => [...prev, ...newFromRepo]);
      showToast(`GitHub/Repo'dan ${newFromRepo.length} yeni güncelleme alındı. Manuel verileriniz korundu!`);
    } else {
      showToast('Repodaki tüm güncellemeler zaten mevcut. Manuel eklemeleriniz korundu.');
    }
  };

  const handleTriggerScrape = () => {
    setIsScraping(true);
    setTimeout(() => {
      const pool: Omit<EcosystemEntity, 'id' | 'lastUpdated'>[] = [
        {
          name: 'Colendi FinTech',
          titleOrCompany: 'Bülent Tekmen - Kurucu',
          type: 'Startup',
          category: 'FinTech',
          city: 'İstanbul',
          description: 'Mikro finansman ve skorlama çözümleri sunan unicorn adayı yeni nesil finansal teknoloji şirketi.',
          website: 'https://colendi.com',
          avatarUrl: 'https://images.unsplash.com/photo-1556742049-0a67daf4005a?auto=format&fit=crop&q=80&w=300',
          stage: 'Growth / Scale-up',
          foundedYear: 2021,
          teamSize: '150+'
        },
        {
          name: 'DCP (Diffusion Capital Partners)',
          titleOrCompany: 'Derin Teknoloji Girişim Sermayesi',
          type: 'Yatırımcı (VC)',
          category: 'Derin Teknoloji',
          city: 'Ankara',
          description: 'Üniversitelerin ve araştırma merkezlerinin geliştirdiği ileri teknoloji buluşlarına erken aşamada yatırım yapan fon.',
          website: 'https://dcp.vc',
          avatarUrl: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&q=80&w=300',
          investmentFocus: ['DeepTech', 'Biotech', 'Nanotech'],
          portfolioCount: 22
        },
        {
          name: 'Midas',
          titleOrCompany: 'Yatırım & Finans Platformu',
          type: 'Startup',
          category: 'FinTech',
          city: 'İstanbul',
          description: 'Borsa İstanbul ve Amerikan borsalarına komisyonsuz, kolay yatırım imkanı sunan Türkiye\'nin önde gelen yatırım uygulaması.',
          website: 'https://getmidas.com',
          avatarUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=300',
          stage: 'Seri B+',
          foundedYear: 2021,
          teamSize: '120+'
        },
        {
          name: 'Craftgate',
          titleOrCompany: 'Ödeme Ağ Geçidi Orkestrasyonu',
          type: 'Startup',
          category: 'FinTech',
          city: 'İstanbul',
          description: 'E-ticaret şirketlerinin tüm sanal POS ve ödeme kuruluşlarını tek merkezden yönetmesini sağlayan akıllı ödeme orkestrasyonu platformu.',
          website: 'https://craftgate.io',
          avatarUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=300',
          stage: 'Seri A',
          foundedYear: 2020,
          teamSize: '45'
        },
        {
          name: 'Mindstone VC',
          titleOrCompany: 'Erken Aşama Teknoloji Fonu',
          type: 'Yatırımcı (VC)',
          category: 'AI & Veri',
          city: 'İstanbul',
          description: 'Yapay zeka, SaaS ve küresel ölçeklenme potansiyeline sahip Türk girişimcilere ilk aşama sermaye sağlayan yatırım şirketi.',
          website: 'https://mindstone.vc',
          avatarUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=300',
          investmentFocus: ['AI', 'SaaS', 'Web3'],
          portfolioCount: 14
        }
      ];

      // Select items that are not yet added or build unique ones
      const existingNames = new Set(entities.map(e => e.name.toLowerCase()));
      const available = pool.filter(p => !existingNames.has(p.name.toLowerCase()));
      
      const itemsToAdd = (available.length > 0 ? available : pool).slice(0, 3);

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const newItems: EcosystemEntity[] = itemsToAdd.map((item, idx) => ({
        ...item,
        id: `scraped-${Date.now()}-${idx}`,
        lastUpdated: nowStr
      }));

      setEntities(prev => [...newItems, ...prev]);

      const newLog: ScraperLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        source: 'Simüle Edilmiş Otomatik Web Scraper',
        status: 'Başarılı',
        itemsFetched: newItems.length,
        durationMs: 820,
        memoryUsageMb: 4.1
      };

      setLogs(prev => [newLog, ...prev]);
      setIsScraping(false);
      showToast(`Otomatik tarama tamamlandı! ${newItems.length} yeni girişim/yatırımcı veritabanına eklendi ve kaydedildi.`);
    }, 1200);
  };

  return (
    <div className={`${isEmbedMode ? 'bg-slate-50' : 'min-h-screen bg-slate-50'} text-slate-900 font-sans flex flex-col antialiased`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/30 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar (Hidden in Embed Mode) */}
      {!isEmbedMode && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          entityCount={entities.length}
          isEmbedMode={isEmbedMode}
          onToggleEmbedMode={() => setIsTestEmbedMode(true)}
        />
      )}

      {/* Floating Embed Mode Notification Bar (Only shown during manual preview testing) */}
      {isTestEmbedMode && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-50 border-b border-emerald-500/30 shadow-md">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-400">mamuthub.com Embed Modu Önizleme Testi</span>
            <span className="hidden md:inline text-slate-400">• Sitenizde gösterilecek temiz görünümü test ediyorsunuz.</span>
          </div>
          <button
            onClick={() => setIsTestEmbedMode(false)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded-lg font-semibold flex items-center space-x-1 border border-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Yönetim Moduna Dön</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${isEmbedMode ? 'py-4' : 'py-8'}`}>
        {(activeTab === 'directory' || isEmbedMode) && (
          <DirectoryView
            entities={entities}
            isEmbedMode={isEmbedMode}
          />
        )}

        {!isEmbedMode && activeTab === 'scraper' && (
          <ScraperSyncView
            logs={logs}
            onTriggerScrape={handleTriggerScrape}
            isScraping={isScraping}
          />
        )}

        {!isEmbedMode && activeTab === 'admin' && (
          <AdminView
            entities={entities}
            onAddEntity={handleAddEntity}
            onUpdateEntity={handleUpdateEntity}
            onDeleteEntity={handleDeleteEntity}
            onResetDefault={handleResetDefault}
          />
        )}
      </main>

      {/* Footer (Hidden in Embed Mode) */}
      {!isEmbedMode && (
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800">mamuthub.com Girişimcilik & Yatırımcı Portalı</span>
            </div>
            <p>© 2026 - Türkiye Teknoloji Ekosistem Veritabanı</p>
          </div>
        </footer>
      )}
    </div>
  );
}
