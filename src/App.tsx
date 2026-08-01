import React, { useState } from 'react';
import { EcosystemEntity, ScraperLog, ActiveTab } from './types';
import { INITIAL_ENTITIES, INITIAL_SCRAPER_LOGS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { DirectoryView } from './components/DirectoryView';
import { AdminView } from './components/AdminView';
import { ScraperSyncView } from './components/ScraperSyncView';
import { ArrowLeft } from 'lucide-react';

export default function App() {
  const [entities, setEntities] = useState<EcosystemEntity[]>(INITIAL_ENTITIES);
  const [logs, setLogs] = useState<ScraperLog[]>(INITIAL_SCRAPER_LOGS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
  const [isScraping, setIsScraping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      const h = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'MAMUTHUB_RESIZE', height: h }, '*');
      }
    };

    sendHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      resizeObserver = new ResizeObserver(() => sendHeight());
      resizeObserver.observe(document.body);
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
    showToast(`"${newEntity.name}" başarıyla ekledi!`);
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
    setEntities(INITIAL_ENTITIES);
    showToast('Varsayılan girişimci ve yatırımcı verileri yüklendi.');
  };

  const handleTriggerScrape = () => {
    setIsScraping(true);
    setTimeout(() => {
      const newItems: EcosystemEntity[] = [
        {
          id: `scraped-${Date.now()}-1`,
          name: 'Colendi - FinTech Ekibi',
          titleOrCompany: 'Bülent Tekmen - Kurucu',
          type: 'Girişimci',
          category: 'FinTech',
          city: 'İstanbul',
          description: 'Mikro finansman ve skorlama çözümleri sunan unicorn aday adayı yeni nesil finansal teknoloji şirketi.',
          website: 'https://colendi.com',
          avatarUrl: 'https://images.unsplash.com/photo-1556742049-0a67daf4005a?auto=format&fit=crop&q=80&w=300',
          stage: 'Growth / Scale-up',
          foundedYear: 2021,
          teamSize: '150+',
          lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
        },
        {
          id: `scraped-${Date.now()}-2`,
          name: 'DCP (Diffusion Capital Partners)',
          titleOrCompany: 'Derin Teknoloji Fonu',
          type: 'Yatırımcı (VC)',
          category: 'Derin Teknoloji',
          city: 'Ankara',
          description: 'Üniversitelerin ve araştırma merkezlerinin geliştirdiği ileri teknoloji buluşlarına erken aşamada yatırım yapan fon.',
          website: 'https://dcp.vc',
          avatarUrl: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&q=80&w=300',
          investmentFocus: ['DeepTech', 'Biotech', 'Nanotech'],
          portfolioCount: 22,
          lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
        }
      ];

      setEntities(prev => [...newItems, ...prev]);

      const newLog: ScraperLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        source: 'Simüle Edilmiş Otomatik Web Scraper',
        status: 'Başarılı',
        itemsFetched: 2,
        durationMs: 780,
        memoryUsageMb: 3.2
      };

      setLogs(prev => [newLog, ...prev]);
      setIsScraping(false);
      showToast('Otomatik tarama tamamlandı! 2 yeni kayıt veritabanına eklendi.');
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
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
