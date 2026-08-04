import React, { useState } from 'react';
import { EcosystemEntity, ScraperLog, ActiveTab, IssueReport, GitHubConfig } from './types';
import { INITIAL_ENTITIES, INITIAL_SCRAPER_LOGS } from './data/mockData';
import { fetchEntitiesFromGitHub, commitEntitiesToGitHub, DEFAULT_GITHUB_CONFIG } from './lib/githubSync';
import { deduplicateAndNormalizeEntities } from './utils/categoryHelper';
import { Navbar } from './components/Navbar';
import { DirectoryView } from './components/DirectoryView';
import { AdminView } from './components/AdminView';
import { ScraperSyncView } from './components/ScraperSyncView';
import { NewsFeedView } from './components/NewsFeedView';
import { TurkeyMapView } from './components/TurkeyMapView';
import { PublicSubmissionModal } from './components/PublicSubmissionModal';
import { ArrowLeft, Sparkles, Trash2 } from 'lucide-react';

export default function App() {
  const [entities, setEntities] = useState<EcosystemEntity[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mamuthub_entities');
        if (saved) {
          const parsed = JSON.parse(saved);
          return deduplicateAndNormalizeEntities(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load entities from localStorage:', e);
    }
    return deduplicateAndNormalizeEntities(INITIAL_ENTITIES);
  });

  const [pendingEntities, setPendingEntities] = useState<EcosystemEntity[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mamuthub_pending_entities');
        if (saved) {
          const parsed = JSON.parse(saved);
          return deduplicateAndNormalizeEntities(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load pendingEntities from localStorage:', e);
    }
    return deduplicateAndNormalizeEntities([
      {
        id: 'pending-demo-1',
        name: 'Synthetix AI',
        titleOrCompany: 'Yapay Zeka Tıbbi Tanı Yazılımı',
        type: 'Startup',
        category: 'Sağlık & Biyo',
        city: 'İzmir',
        description: 'Radyoloji görüntülerinden AI destekli erken teşhis koyan tıbbi yazılım çözümü.',
        website: 'https://synthetixhealth.ai',
        avatarUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=300',
        lastUpdated: '2026-08-03 11:20',
        status: 'pending',
        submittedAt: '2026-08-03 11:20',
        submitterEmail: 'kurucu@synthetixhealth.ai'
      }
    ]);
  });

  const [issueReports, setIssueReports] = useState<IssueReport[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mamuthub_issue_reports');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load issueReports from localStorage:', e);
    }
    return [
      {
        id: 'issue-demo-1',
        entityId: '1',
        entityName: 'Getir',
        reportType: 'Güncelleme İsteği',
        description: 'Getir yeni küresel finansman yatırım turunu tamamladı, ekip büyüklüğü güncellenebilir.',
        createdAt: '2026-08-02 14:15',
        status: 'pending',
        reporterEmail: 'analist@mamuthub.com'
      }
    ];
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

  const [githubConfig, setGithubConfig] = useState<GitHubConfig>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mamuthub_github_config');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load githubConfig from localStorage:', e);
    }
    return DEFAULT_GITHUB_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = (params.get('view') || params.get('tab') || '').toLowerCase();
      if (view === 'map' || view === 'harita') return 'map';
      if (view === 'news' || view === 'haberler') return 'news';
      if (view === 'admin') return 'admin';
      if (view === 'scraper') return 'scraper';
    }
    return 'directory';
  });
  const [isScraping, setIsScraping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPublicSubmissionOpen, setIsPublicSubmissionOpen] = useState(false);

  // Sync githubConfig to localStorage
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mamuthub_github_config', JSON.stringify(githubConfig));
      }
    } catch (e) {
      console.error('Failed to save githubConfig to localStorage:', e);
    }
  }, [githubConfig]);

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

  // Sync pending entities to localStorage
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mamuthub_pending_entities', JSON.stringify(pendingEntities));
      }
    } catch (e) {
      console.error('Failed to save pendingEntities to localStorage:', e);
    }
  }, [pendingEntities]);

  // Sync issue reports to localStorage
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mamuthub_issue_reports', JSON.stringify(issueReports));
      }
    } catch (e) {
      console.error('Failed to save issueReports to localStorage:', e);
    }
  }, [issueReports]);

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

  // Check if URL search parameters explicitly ask for embed mode (e.g. ?embed=true)
  const [isTestEmbedMode, setIsTestEmbedMode] = useState<boolean>(false);

  const isEmbedMode = isTestEmbedMode || (() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('embed') === 'true' || params.get('embed') === '1' || params.get('mode') === 'embed';
    }
    return false;
  })();

  // Automatically broadcast content height to parent window (WordPress/Vercel) for seamless auto-resizing iframe
  const lastSentHeightRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastWindowWidth = window.innerWidth;

    const sendHeight = () => {
      const rootEl = document.getElementById('root');
      if (!rootEl) return;
      const container = (rootEl.firstElementChild as HTMLElement) || rootEl;
      
      // Calculate exact bounding height of content box without viewport feedback loop
      const contentHeight = Math.ceil(container.getBoundingClientRect().height);

      if (
        window.parent && 
        window.parent !== window && 
        contentHeight > 0 && 
        Math.abs(lastSentHeightRef.current - contentHeight) >= 5
      ) {
        lastSentHeightRef.current = contentHeight;
        window.parent.postMessage({ type: 'MAMUTHUB_RESIZE', height: contentHeight }, '*');
      }
    };

    sendHeight();
    const t1 = setTimeout(sendHeight, 150);
    const t2 = setTimeout(sendHeight, 500);

    let resizeObserver: ResizeObserver | null = null;
    const rootEl = document.getElementById('root');
    if (typeof ResizeObserver !== 'undefined' && rootEl) {
      const container = (rootEl.firstElementChild as HTMLElement) || rootEl;
      resizeObserver = new ResizeObserver(() => sendHeight());
      resizeObserver.observe(container);
    }

    const handleWindowResize = () => {
      // Ignore height-only window resizes caused by parent setting iframe style height
      if (window.innerWidth !== lastWindowWidth) {
        lastWindowWidth = window.innerWidth;
        sendHeight();
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [entities, activeTab, isEmbedMode, isTestEmbedMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const generateUniqueId = (prefix = 'ent') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const handleCleanDuplicates = () => {
    setEntities(prev => deduplicateAndNormalizeEntities(prev));
    setPendingEntities(prev => deduplicateAndNormalizeEntities(prev));
    showToast('Tüm tekrarlar temizlendi ve kategoriler standartlaştırıldı!');
  };

  const handleAddEntity = (newEntityData: Omit<EcosystemEntity, 'id' | 'lastUpdated'>) => {
    const cleanName = (newEntityData.name || '').trim();
    if (!cleanName) return;

    setEntities(prev => {
      const updatedEntity: EcosystemEntity = {
        ...newEntityData,
        name: cleanName,
        id: generateUniqueId('ent'),
        status: 'active',
        lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      return deduplicateAndNormalizeEntities([updatedEntity, ...prev]);
    });
    showToast(`"${cleanName}" başarıyla canlı dizine eklendi!`);
  };

  const handleAddPendingEntity = (newEntityData: Omit<EcosystemEntity, 'id' | 'lastUpdated'>) => {
    const cleanName = (newEntityData.name || '').trim();
    if (!cleanName) return;

    setPendingEntities(prev => {
      const newPending: EcosystemEntity = {
        ...newEntityData,
        name: cleanName,
        id: generateUniqueId('pending'),
        status: 'pending',
        lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      return deduplicateAndNormalizeEntities([newPending, ...prev]);
    });
    showToast(`"${cleanName}" moderasyon kutusuna gönderildi.`);
  };

  const handleApprovePending = (pendingId: string) => {
    const target = pendingEntities.find(p => p.id === pendingId);
    if (!target) return;

    const approved: EcosystemEntity = {
      ...target,
      id: generateUniqueId('pub'),
      status: 'active',
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    let updatedList: EcosystemEntity[] = [];
    setEntities(prev => {
      updatedList = deduplicateAndNormalizeEntities([approved, ...prev]);
      return updatedList;
    });
    setPendingEntities(prev => prev.filter(p => p.id !== pendingId));
    showToast(`"${target.name}" onaylandı ve canlı dizinde yayınlandı! 🎉`);

    // Auto-sync to GitHub if PAT token is configured
    if (githubConfig.token && githubConfig.owner && githubConfig.repo && githubConfig.autoSyncOnApprove !== false) {
      setTimeout(() => {
        commitEntitiesToGitHub(githubConfig, updatedList, `Onaylandı: ${target.name}`).then(res => {
          if (res.success) {
            showToast(`"${target.name}" GitHub'a otomatik commit edildi! 🚀`);
          }
        });
      }, 300);
    }
  };

  const handleRejectPending = (pendingId: string) => {
    const target = pendingEntities.find(p => p.id === pendingId);
    setPendingEntities(prev => prev.filter(p => p.id !== pendingId));
    if (target) {
      showToast(`"${target.name}" kaydı reddedildi.`);
    }
  };

  const handleSubmitIssueReport = (reportData: Omit<IssueReport, 'id' | 'createdAt' | 'status'>) => {
    const newReport: IssueReport = {
      ...reportData,
      id: `report-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending'
    };
    setIssueReports(prev => [newReport, ...prev]);
    showToast(`Düzeltme bildiriminiz alındı, admin paneline iletildi.`);
  };

  const handleResolveIssue = (issueId: string) => {
    setIssueReports(prev => prev.map(i => i.id === issueId ? { ...i, status: 'resolved' } : i));
    showToast('Bildirim çözüldü olarak işaretlendi.');
  };

  const handleDismissIssue = (issueId: string) => {
    setIssueReports(prev => prev.map(i => i.id === issueId ? { ...i, status: 'dismissed' } : i));
    showToast('Bildirim kapatıldı.');
  };

  const handleSyncWithGithubUrl = async (githubRawUrl: string): Promise<boolean> => {
    try {
      const res = await fetch(githubRawUrl);
      if (!res.ok) return false;
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        setEntities(json);
        showToast(`GitHub Raw veritabanından ${json.length} kayıt başarıyla yüklendi!`);
        return true;
      }
      return false;
    } catch (e) {
      console.error('GitHub Raw fetch error:', e);
      return false;
    }
  };

  const handlePullFromGithub = async (overrideConfig?: GitHubConfig): Promise<{ success: boolean; message: string }> => {
    const cfg = overrideConfig || githubConfig;
    const result = await fetchEntitiesFromGitHub(cfg);
    if (result.success && result.data) {
      setEntities(result.data);
      const updatedCfg = {
        ...cfg,
        lastSyncedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        lastCommitSha: result.sha
      };
      setGithubConfig(updatedCfg);
      showToast(`GitHub reposundan ${result.data.length} kayıt canlı veritabanına aktarıldı!`);
      return { success: true, message: `${result.data.length} kayıt GitHub'dan başarıyla yüklendi.` };
    } else {
      return { success: false, message: result.error || 'GitHub verisi çekilemedi.' };
    }
  };

  const handlePushToGithub = async (
    overrideConfig?: GitHubConfig,
    commitMsg: string = 'Update entities.json & ecosystem.json via Mamuthub Admin'
  ): Promise<{ success: boolean; message: string }> => {
    const cfg = overrideConfig || githubConfig;
    const result = await commitEntitiesToGitHub(cfg, entities, commitMsg);
    if (result.success) {
      const updatedCfg = {
        ...cfg,
        lastSyncedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        lastCommitSha: result.sha
      };
      setGithubConfig(updatedCfg);
      const filesInfo = result.updatedFiles ? result.updatedFiles.join(', ') : 'entities.json, ecosystem.json';
      showToast(`GitHub reponuza commit atıldı! Güncellenen dosyalar: ${filesInfo} 🚀`);
      return {
        success: true,
        message: `Commit Başarılı! [${filesInfo}] (SHA: ${result.sha?.substring(0, 7) || 'OK'})`
      };
    } else {
      return { success: false, message: result.error || 'GitHub Commit başarısız oldu.' };
    }
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
    <div className={`${isEmbedMode ? (activeTab === 'map' ? 'bg-slate-950 text-white h-auto min-h-0' : 'bg-slate-50 text-slate-900 h-auto min-h-0') : 'min-h-screen flex flex-col bg-slate-50 text-slate-900'} font-sans antialiased`}>
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
          pendingCount={pendingEntities.length}
          issueCount={issueReports.length}
          isEmbedMode={isEmbedMode}
          onToggleEmbedMode={() => setIsTestEmbedMode(true)}
          onOpenPublicSubmissionModal={() => setIsPublicSubmissionOpen(true)}
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
      <main className={`max-w-7xl w-full mx-auto ${isEmbedMode ? 'px-1 sm:px-3 py-2 pb-6 h-auto' : 'px-4 sm:px-6 lg:px-8 py-8 flex-1'}`}>
        {activeTab === 'directory' && (
          <DirectoryView
            entities={entities}
            isEmbedMode={isEmbedMode}
            onOpenPublicSubmissionModal={() => setIsPublicSubmissionOpen(true)}
            onSubmitIssueReport={handleSubmitIssueReport}
          />
        )}

        {activeTab === 'map' && (
          <TurkeyMapView
            entities={entities}
            isEmbedMode={isEmbedMode}
          />
        )}

        {!isEmbedMode && activeTab === 'news' && (
          <NewsFeedView
            onAddPendingEntity={handleAddPendingEntity}
            pendingEntityIds={pendingEntities.map(p => p.id)}
          />
        )}

        {!isEmbedMode && activeTab === 'scraper' && (
          <ScraperSyncView
            logs={logs}
            onTriggerScrape={handleTriggerScrape}
            isScraping={isScraping}
            onAddEntity={handleAddEntity}
            onAddPendingEntity={handleAddPendingEntity}
          />
        )}

        {!isEmbedMode && activeTab === 'admin' && (
          <AdminView
            entities={entities}
            pendingEntities={pendingEntities}
            issueReports={issueReports}
            githubConfig={githubConfig}
            onSaveGithubConfig={setGithubConfig}
            onPullFromGithub={handlePullFromGithub}
            onPushToGithub={handlePushToGithub}
            onAddEntity={handleAddEntity}
            onUpdateEntity={handleUpdateEntity}
            onDeleteEntity={handleDeleteEntity}
            onApprovePending={handleApprovePending}
            onRejectPending={handleRejectPending}
            onResolveIssue={handleResolveIssue}
            onDismissIssue={handleDismissIssue}
            onResetDefault={handleResetDefault}
            onSyncWithRepo={handleSyncWithRepo}
            onSyncWithGithubUrl={handleSyncWithGithubUrl}
            onCleanDuplicates={handleCleanDuplicates}
          />
        )}
      </main>

      {/* Public Submission Modal (Community Submissions go to Moderation Queue) */}
      <PublicSubmissionModal
        isOpen={isPublicSubmissionOpen}
        onClose={() => setIsPublicSubmissionOpen(false)}
        onSubmit={handleAddPendingEntity}
      />

      {/* Footer (Hidden in Embed Mode) */}
      {!isEmbedMode && (
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-slate-800">mamuthub.com Girişimcilik & Yatırımcı Portalı</span>
              <span>•</span>
              <button
                onClick={() => setActiveTab('admin')}
                className="text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center space-x-1 underline transition-colors"
              >
                <span>🔒 Yönetici Paneli (Admin)</span>
              </button>
            </div>
            <p>© 2026 - Türkiye Teknoloji Ekosistem Veritabanı</p>
          </div>
        </footer>
      )}
    </div>
  );
}
