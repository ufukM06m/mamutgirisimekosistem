import React, { useState, useEffect } from 'react';
import { NewsArticleItem, RssFeedSource, EcosystemEntity } from '../types';
import { Newspaper, Rss, RefreshCw, ExternalLink, Sparkles, Check, Plus, AlertCircle, Building2, TrendingUp, Filter, Tag } from 'lucide-react';

interface NewsFeedViewProps {
  onAddPendingEntity: (entity: EcosystemEntity) => void;
  pendingEntityIds: string[];
}

const DEFAULT_SOURCES: RssFeedSource[] = [
  { id: 'webrazzi', name: 'Webrazzi', url: 'https://webrazzi.com/feed/', category: 'Girişim & Yatırım', active: true },
  { id: 'egirisim', name: 'Egirişim', url: 'https://egirisim.com/feed/', category: 'Startup Haberleri', active: true },
  { id: 'techinside', name: 'TechInside', url: 'https://www.techinside.com/feed/', category: 'Teknoloji & İş Dünyası', active: true }
];

export const NewsFeedView: React.FC<NewsFeedViewProps> = ({ onAddPendingEntity, pendingEntityIds }) => {
  const [sources, setSources] = useState<RssFeedSource[]>(() => {
    try {
      const saved = localStorage.getItem('mamuthub_rss_sources');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SOURCES;
  });

  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [analyzingArticleId, setAnalyzingArticleId] = useState<string | null>(null);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);
  const [addedStartupKeys, setAddedStartupKeys] = useState<string[]>([]);

  // Add Custom Feed Modal state
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');

  const saveSources = (updated: RssFeedSource[]) => {
    setSources(updated);
    try {
      localStorage.setItem('mamuthub_rss_sources', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRssNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeFeeds = sources.filter(s => s.active);
      const res = await fetch('/api/rss-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: activeFeeds })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'RSS akışı alınamadı.');
      }
      setArticles(data.articles || []);
    } catch (err: any) {
      setError(err.message || 'RSS haberleri yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRssNews();
  }, []);

  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;

    const newSource: RssFeedSource = {
      id: `custom-${Date.now()}`,
      name: newFeedName.trim(),
      url: newFeedUrl.trim(),
      category: 'Özel RSS',
      active: true
    };
    const updated = [...sources, newSource];
    saveSources(updated);
    setNewFeedName('');
    setNewFeedUrl('');
    setShowAddFeedModal(false);
    fetchRssNews();
  };

  const toggleSourceActive = (sourceId: string) => {
    const updated = sources.map(s => s.id === sourceId ? { ...s, active: !s.active } : s);
    saveSources(updated);
  };

  const handleAnalyzeArticle = async (article: NewsArticleItem) => {
    setAnalyzingArticleId(article.id);
    try {
      const res = await fetch('/api/ai-analyze-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          contentSnippet: article.contentSnippet,
          link: article.link,
          sourceName: article.sourceName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setArticles(prev => prev.map(a => {
          if (a.id === article.id) {
            return {
              ...a,
              detectedStartups: data.detectedStartups || [],
              aiProcessed: true
            };
          }
          return a;
        }));
      }
    } catch (err) {
      console.error('Failed to analyze news item:', err);
    } finally {
      setAnalyzingArticleId(null);
    }
  };

  const handleBatchAnalyze = async () => {
    setIsBatchAnalyzing(true);
    const unanalyzed = articles.filter(a => !a.aiProcessed).slice(0, 6);
    for (const art of unanalyzed) {
      await handleAnalyzeArticle(art);
    }
    setIsBatchAnalyzing(false);
  };

  const handleAddStartupToPending = (startup: any, article: NewsArticleItem) => {
    const key = `${startup.name}-${article.id}`;
    if (addedStartupKeys.includes(key)) return;

    const newEntity: EcosystemEntity = {
      id: `news-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: startup.name,
      titleOrCompany: startup.titleOrCompany || `${startup.category || 'Teknoloji'} Girişimi`,
      type: 'Startup',
      category: startup.category || 'SaaS & Yazılım',
      city: startup.city || 'İstanbul',
      description: startup.summary || `${article.title} başlıklı haberde yer alan teknoloji girişimi.`,
      website: startup.website || article.link,
      avatarUrl: `https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=300`,
      stage: startup.stage || 'Seed',
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      submitterEmail: `rss@mamuthub.com`,
      notes: `Kaynak Haber: ${article.sourceName} - ${article.title} (${startup.investmentAmount ? `Yatırım: ${startup.investmentAmount}` : 'Haber Taraması'})`
    };

    onAddPendingEntity(newEntity);
    setAddedStartupKeys(prev => [...prev, key]);
  };

  const filteredArticles = selectedSourceId === 'all'
    ? articles
    : articles.filter(a => {
        const matchingSource = sources.find(s => s.id === selectedSourceId);
        return matchingSource ? a.sourceName.toLowerCase().includes(matchingSource.name.toLowerCase()) : true;
      });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Rss className="w-4 h-4" />
            <span>Canlı Haber & RSS Besleme Motoru</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Türkiye Girişimcilik Ekosistem Haberleri
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Webrazzi, Egirişim ve teknoloji yayınlarından canlı RSS haber akışı. Yapay zeka ile haberdeki yeni girişimleri ve yatırım turlarını 1-tıkla tespit edip dizine ekleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchRssNews}
            disabled={isLoading}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'RSS Akışı Çekiliyor...' : 'Yenile / Canlı Veri Çek'}</span>
          </button>

          <button
            onClick={handleBatchAnalyze}
            disabled={isBatchAnalyzing || articles.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Sparkles className={`w-4 h-4 ${isBatchAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isBatchAnalyzing ? 'AI Taraması Sürüyor...' : 'Tüm Akışı AI ile Tara'}</span>
          </button>
        </div>
      </div>

      {/* Sources & Filter Controls */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
          <span className="text-xs text-slate-400 font-semibold flex items-center space-x-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Kaynaklar:</span>
          </span>

          <button
            onClick={() => setSelectedSourceId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedSourceId === 'all'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Tüm Kaynaklar ({articles.length})
          </button>

          {sources.map(src => (
            <button
              key={src.id}
              onClick={() => setSelectedSourceId(src.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedSourceId === src.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{src.name}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddFeedModal(true)}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Özel RSS Kaynağı Ekle</span>
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-4 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Articles Grid */}
      {isLoading && articles.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800/80">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-slate-300 font-semibold text-sm">Webrazzi & Egirişim RSS Beslemeleri Çekiliyor...</p>
          <p className="text-slate-500 text-xs">Teknoloji haberleri ve girişim duyuruları derleniyor.</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800/80">
          <Newspaper className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-semibold text-sm">Haber Bulunamadı</p>
          <p className="text-slate-500 text-xs">Lütfen kaynakları veya RSS bağlantılarını kontrol edin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArticles.map(article => {
            const isAnalyzing = analyzingArticleId === article.id;
            return (
              <div
                key={article.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl group"
              >
                <div className="space-y-3">
                  {/* Top Meta */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="bg-slate-800 text-indigo-300 font-bold px-2.5 py-1 rounded-md border border-slate-700">
                      {article.sourceName}
                    </span>
                    <span>
                      {new Date(article.pubDate).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5">
                      <span>{article.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </h3>

                  {/* Snippet */}
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {article.contentSnippet}
                  </p>
                </div>

                {/* AI Detection Result Box or Action */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
                  {article.detectedStartups && article.detectedStartups.length > 0 ? (
                    <div className="bg-emerald-950/60 border border-emerald-800/80 p-3 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                        <span className="flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Tespit Edilen Girişim ({article.detectedStartups.length})</span>
                        </span>
                        <span className="bg-emerald-900/80 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">AI Doğrulandı</span>
                      </div>

                      {article.detectedStartups.map((st, sIdx) => {
                        const key = `${st.name}-${article.id}`;
                        const isAdded = addedStartupKeys.includes(key);
                        return (
                          <div key={sIdx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-white">{st.name}</span>
                              <span className="text-[10px] text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded font-medium">
                                {st.category || 'Startup'}
                              </span>
                            </div>

                            {st.investmentAmount && (
                              <div className="text-[11px] text-emerald-300 font-semibold flex items-center space-x-1">
                                <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>Yatırım: {st.investmentAmount}</span>
                              </div>
                            )}

                            <p className="text-[11px] text-slate-300 line-clamp-2">{st.summary}</p>

                            <button
                              type="button"
                              onClick={() => handleAddStartupToPending(st, article)}
                              disabled={isAdded}
                              className={`w-full mt-1.5 py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                                isAdded
                                  ? 'bg-slate-800 text-slate-400 cursor-default'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Dizin Bekleyenlerine Eklendi</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>1-Tıkla Dizine/Onaya Ekle</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : article.aiProcessed ? (
                    <div className="bg-slate-950 p-2.5 rounded-lg text-center text-[11px] text-slate-400 border border-slate-800">
                      Haberde yeni bir girişim veya yatırım turu ismi tespit edilemedi.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAnalyzeArticle(article)}
                      disabled={isAnalyzing}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2 px-3 rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>{isAnalyzing ? 'Girişim Taraması Yapılıyor...' : 'Yapay Zeka ile Girişim Tara'}</span>
                    </button>
                  )}

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    Haberi Orijinal Kaynakta Oku →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom RSS Feed Modal */}
      {showAddFeedModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Rss className="w-5 h-5 text-indigo-400" />
              <span>Özel RSS Kaynağı Ekle</span>
            </h3>

            <form onSubmit={handleAddFeed} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kaynak İsmi</label>
                <input
                  type="text"
                  placeholder="Örn. TechCrunch TR / Medium Blog"
                  value={newFeedName}
                  onChange={e => setNewFeedName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">RSS Besleme Bağlantısı (URL)</label>
                <input
                  type="url"
                  placeholder="https://example.com/feed/"
                  value={newFeedUrl}
                  onChange={e => setNewFeedUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFeedModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400"
                >
                  Kaynağı Kaydet & Çek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
