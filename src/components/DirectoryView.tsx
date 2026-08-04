import React, { useState, useMemo, useEffect } from 'react';
import { EcosystemEntity, EntityType, CategoryType, StageType, IssueReport } from '../types';
import { EntityAvatar } from './EntityAvatar';
import { Search, Filter, Globe, Linkedin, Twitter, ExternalLink, Calendar, MapPin, Building2, Sparkles, User, Briefcase, ChevronRight, X, ArrowUpDown, PlusCircle, Link, Copy, Check, AlertTriangle, Edit } from 'lucide-react';

interface DirectoryViewProps {
  entities: EcosystemEntity[];
  onSelectEntity?: (entity: EcosystemEntity) => void;
  isEmbedMode?: boolean;
  onOpenPublicSubmissionModal?: () => void;
  onSubmitIssueReport?: (report: Omit<IssueReport, 'id' | 'createdAt' | 'status'>) => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  entities,
  isEmbedMode = false,
  onOpenPublicSubmissionModal,
  onSubmitIssueReport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<EntityType | 'Tümü'>('Tümü');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Tümü'>('Tümü');
  const [selectedStage, setSelectedStage] = useState<StageType | 'Tümü'>('Tümü');
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'name'>('featured');
  const [activeEntityModal, setActiveEntityModal] = useState<EcosystemEntity | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Link copied state
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Issue reporting modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<IssueReport['reportType']>('Hatalı Bilgi');
  const [reportDescription, setReportDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Check URL query parameters for deep linking on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const profileId = params.get('profile') || params.get('entity') || params.get('id');
      if (profileId) {
        const found = entities.find(e => e.id === profileId || e.name.toLowerCase() === profileId.toLowerCase());
        if (found) {
          setActiveEntityModal(found);
        }
      }
    }
  }, [entities]);

  const handleCopyProfileLink = (entity: EcosystemEntity) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('profile', entity.id);
    navigator.clipboard.writeText(url.toString());
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const handleSendIssueReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntityModal || !reportDescription.trim()) return;

    if (onSubmitIssueReport) {
      onSubmitIssueReport({
        entityId: activeEntityModal.id,
        entityName: activeEntityModal.name,
        reportType,
        description: reportDescription.trim(),
        reporterEmail: reporterEmail.trim() || undefined
      });
    }

    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setIsReportModalOpen(false);
      setReportDescription('');
      setReporterEmail('');
    }, 1800);
  };

  const categories: (CategoryType | 'Tümü')[] = [
    'Tümü',
    'AI & Veri',
    'SaaS & Yazılım',
    'FinTech',
    'E-Ticaret & Lojistik',
    'Oyun & Eğlence',
    'Sağlık & Biyo',
    'Derin Teknoloji',
    'Eğitim (EdTech)',
    'İklim & Yeşil Teknoloji',
    'Siber Güvenlik',
    'Gayrimenkul (PropTech)',
    'İnsan Kaynakları (HRTech)',
    'Pazarlama (MarTech)',
    'Tarım & Gıda (AgriTech)',
    'Sigorta (InsurTech)',
    'Savunma & Uzay',
    'Donanım & IoT'
  ];

  const types: (EntityType | 'Tümü')[] = [
    'Tümü',
    'Girişimci',
    'Yatırımcı (VC)',
    'Melek Yatırımcı',
    'Startup',
    'Hızlandırıcı & Kuluçka'
  ];

  const filteredEntities = useMemo(() => {
    const q = searchTerm.trim().toLocaleLowerCase('tr-TR');
    const filtered = entities.filter(item => {
      const name = (item.name || '').toLocaleLowerCase('tr-TR');
      const title = (item.titleOrCompany || '').toLocaleLowerCase('tr-TR');
      const desc = (item.description || '').toLocaleLowerCase('tr-TR');
      const city = (item.city || '').toLocaleLowerCase('tr-TR');
      const cat = (item.category || '').toLocaleLowerCase('tr-TR');
      const type = (item.type || '').toLocaleLowerCase('tr-TR');
      const notes = (item.notes || '').toLocaleLowerCase('tr-TR');

      const matchesSearch =
        !q ||
        name.includes(q) ||
        title.includes(q) ||
        desc.includes(q) ||
        city.includes(q) ||
        cat.includes(q) ||
        type.includes(q) ||
        notes.includes(q);

      const matchesType = selectedType === 'Tümü' || item.type === selectedType;
      const matchesCategory = selectedCategory === 'Tümü' || item.category === selectedCategory;
      const matchesStage = selectedStage === 'Tümü' || !item.stage || item.stage === selectedStage;

      return matchesSearch && matchesType && matchesCategory && matchesStage;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'featured') {
        const featA = a.featured ? 1 : 0;
        const featB = b.featured ? 1 : 0;
        if (featA !== featB) return featB - featA; // Featured first
        return (b.lastUpdated || '').localeCompare(a.lastUpdated || '');
      }
      if (sortBy === 'newest') {
        return (b.lastUpdated || '').localeCompare(a.lastUpdated || '');
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'tr-TR');
      }
      return 0;
    });
  }, [entities, searchTerm, selectedType, selectedCategory, selectedStage, sortBy]);

  return (
    <div className="space-y-6">
      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Girişimci adı, şirket, şehir veya anahtar kelime ara..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400 text-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode & Count */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 text-xs text-slate-500">
            {onOpenPublicSubmissionModal && (
              <button
                onClick={onOpenPublicSubmissionModal}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Profil / Girişim Ekle</span>
              </button>
            )}
            <span className="font-medium text-slate-700">
              <strong className="text-emerald-600 font-bold">{filteredEntities.length}</strong> sonuç gösteriliyor
            </span>

            {/* Sort Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-0.5"
              >
                <option value="featured">🌟 Öne Çıkanlar Önce</option>
                <option value="newest">🕒 En Yeniler</option>
                <option value="name">🔤 Alfabetik (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kartlar
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Liste
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="space-y-3.5 pt-3 border-t border-slate-100">
          {/* Type Filter */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 flex items-center mr-1 shrink-0 py-1">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-600" /> Tür:
            </span>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all font-medium ${
                  selectedType === t
                    ? 'bg-slate-900 text-white font-semibold shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 flex items-center">
                <Briefcase className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Sektörler ({categories.length - 1}):
              </span>
              {selectedCategory !== 'Tümü' && (
                <button
                  onClick={() => setSelectedCategory('Tümü')}
                  className="text-[11px] font-medium text-emerald-600 hover:text-emerald-800 underline"
                >
                  Filtreyi Temizle
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                    selectedCategory === c
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm ring-2 ring-emerald-600/30'
                      : 'bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEntities.map(entity => (
            <div
              key={entity.id}
              onClick={() => setActiveEntityModal(entity)}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-500/50 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
            >
              {entity.featured && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-1 rounded-bl-xl shadow-sm">
                  Öne Çıkan
                </div>
              )}

              <div className="space-y-4">
                {/* Header Profile */}
                <div className="flex items-start space-x-3.5">
                  <EntityAvatar type={entity.type} className="w-12 h-12 rounded-xl" iconSize="w-6 h-6" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        entity.type.includes('Yatırımcı')
                          ? 'bg-purple-100 text-purple-800'
                          : entity.type === 'Girişimci'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {entity.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors text-base truncate mt-1">
                      {entity.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate">{entity.titleOrCompany}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                  {entity.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                    {entity.city}
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                    {entity.category}
                  </span>
                  {entity.stage && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold">
                      {entity.stage}
                    </span>
                  )}
                  {entity.portfolioCount && (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-md font-semibold">
                      {entity.portfolioCount} Yatırım
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Meta */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center text-[11px]">
                  <Calendar className="w-3 h-3 mr-1" />
                  Güncellenme: {entity.lastUpdated.split(' ')[0]}
                </span>
                <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                  Detaylar <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">İsim / Şirket</th>
                  <th className="py-3 px-4">Tür</th>
                  <th className="py-3 px-4">Sektör</th>
                  <th className="py-3 px-4">Şehir</th>
                  <th className="py-3 px-4">Aşama / Portföy</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntities.map(entity => (
                  <tr key={entity.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center space-x-3">
                      <EntityAvatar type={entity.type} className="w-8 h-8 rounded-lg" iconSize="w-4 h-4" />
                      <div>
                        <div className="font-bold text-slate-900">{entity.name}</div>
                        <div className="text-[11px] text-slate-400">{entity.titleOrCompany}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {entity.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{entity.category}</td>
                    <td className="py-3 px-4">{entity.city}</td>
                    <td className="py-3 px-4">
                      {entity.stage || (entity.portfolioCount ? `${entity.portfolioCount} Yatırım` : '-')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActiveEntityModal(entity)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold px-2.5 py-1 rounded hover:bg-emerald-50 transition-colors"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {activeEntityModal && (
        <div 
          onClick={() => setActiveEntityModal(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setActiveEntityModal(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-5">
              <div className="flex items-start space-x-4">
                <EntityAvatar 
                  type={activeEntityModal.type} 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl" 
                  iconSize="w-8 h-8 sm:w-10 sm:h-10" 
                />
                <div className="space-y-1 pt-1">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                    {activeEntityModal.type}
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900">{activeEntityModal.name}</h2>
                  <p className="text-xs text-slate-500 font-medium">{activeEntityModal.titleOrCompany}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs leading-relaxed text-slate-700">
                {activeEntityModal.description}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Şehir / Lokasyon</span>
                  <span className="font-semibold text-slate-800">{activeEntityModal.city}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sektör</span>
                  <span className="font-semibold text-slate-800">{activeEntityModal.category}</span>
                </div>
                {activeEntityModal.stage && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Yatırım Aşaması</span>
                    <span className="font-semibold text-emerald-700">{activeEntityModal.stage}</span>
                  </div>
                )}
                {activeEntityModal.portfolioCount && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Portföy Büyüklüğü</span>
                    <span className="font-semibold text-purple-700">{activeEntityModal.portfolioCount} Şirket</span>
                  </div>
                )}
              </div>

              {/* Social Links & Deep Link / Report Issue */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {activeEntityModal.website && (
                      <a
                        href={activeEntityModal.website.startsWith('http') ? activeEntityModal.website : `https://${activeEntityModal.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Web Sitesi</span>
                      </a>
                    )}
                    {activeEntityModal.linkedin && (
                      <a
                        href={activeEntityModal.linkedin.startsWith('http') ? activeEntityModal.linkedin : `https://${activeEntityModal.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyProfileLink(activeEntityModal)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                      title="Doğrudan Paylaşılabilir Profil Bağlantısını Kopyala"
                    >
                      {isLinkCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Link Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Link className="w-3.5 h-3.5 text-slate-500" />
                          <span>Profil Linki</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-medium flex items-center space-x-1 border border-amber-200/60 transition-colors"
                      title="Bilgi Güncelleme / Hata Bildir"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-600" />
                      <span>Bilgi Güncelle / Bildir</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>ID: {activeEntityModal.id}</span>
                  <span>Son Güncelleme: {activeEntityModal.lastUpdated}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue / Suggest Update Modal */}
      {isReportModalOpen && activeEntityModal && (
        <div 
          onClick={() => setIsReportModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative my-auto max-h-[90vh] overflow-y-auto space-y-4"
          >
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {reportSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Bildiriminiz Alındı!</h3>
                <p className="text-xs text-slate-600">
                  Teşekkürler, bilgi güncelleme talebiniz moderasyon ekibimize iletildi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendIssueReport} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Bilgi Güncelleme / Hata Bildir
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    "{activeEntityModal.name}" İçin Düzeltme Bildir
                  </h3>
                  <p className="text-slate-500">
                    Eksik veya hatalı bir bilgi tespit ettiyseniz doğru bilgiyi yönetime bildirin.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bildirim Türü *</label>
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none"
                  >
                    <option value="Hatalı Bilgi">Hatalı Bilgi (İsim, Şehir, Unvan vb.)</option>
                    <option value="Güncelleme İsteği">Yeni Bilgi / Yatırım Güncellemesi</option>
                    <option value="Kapanmış/Aktif Değil">Girişim/Kurum Artık Aktif Değil</option>
                    <option value="Diğer">Diğer Bildirim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Açıklama / Doğru Bilgi *</label>
                  <textarea
                    required
                    rows={4}
                    value={reportDescription}
                    onChange={e => setReportDescription(e.target.value)}
                    placeholder="Lütfen doğru veya güncel bilgileri kısaca açıklayın..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">E-Posta Adresiniz (Opsiyonel)</label>
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={e => setReporterEmail(e.target.value)}
                    placeholder="E-posta adresiniz..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
                  >
                    Bildirimi Gönder
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
