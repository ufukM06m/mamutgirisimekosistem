import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EcosystemEntity, EntityType, CategoryType, StageType } from '../types';
import { Search, Filter, Globe, Linkedin, Twitter, ExternalLink, Calendar, MapPin, Building2, Sparkles, User, Briefcase, ChevronRight, X, ArrowUpDown } from 'lucide-react';

interface DirectoryViewProps {
  entities: EcosystemEntity[];
  onSelectEntity?: (entity: EcosystemEntity) => void;
  isEmbedMode?: boolean;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({ entities, isEmbedMode = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<EntityType | 'Tümü'>('Tümü');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Tümü'>('Tümü');
  const [selectedStage, setSelectedStage] = useState<StageType | 'Tümü'>('Tümü');
  const [activeEntityModal, setActiveEntityModal] = useState<EcosystemEntity | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const modalRef = useRef<HTMLDivElement>(null);

  // Bring modal pop-up directly in front of the user when opened in iframe or desktop
  useEffect(() => {
    if (activeEntityModal && modalRef.current) {
      try {
        modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // Fallback for older browsers
        modalRef.current.scrollIntoView();
      }
    }
  }, [activeEntityModal]);

  const categories: (CategoryType | 'Tümü')[] = [
    'Tümü',
    'AI & Veri',
    'SaaS & Yazılım',
    'FinTech',
    'E-Ticaret & Lojistik',
    'Oyun & Eğlence',
    'Sağlık & Biyo',
    'Derin Teknoloji'
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
    return entities.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.titleOrCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'Tümü' || item.type === selectedType;
      const matchesCategory = selectedCategory === 'Tümü' || item.category === selectedCategory;
      const matchesStage = selectedStage === 'Tümü' || !item.stage || item.stage === selectedStage;

      return matchesSearch && matchesType && matchesCategory && matchesStage;
    });
  }, [entities, searchTerm, selectedType, selectedCategory, selectedStage]);

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
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              <strong className="text-emerald-600 font-bold">{filteredEntities.length}</strong> sonuç gösteriliyor
            </span>
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
        <div className="space-y-3 pt-2 border-t border-slate-100">
          {/* Type Filter */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="font-semibold text-slate-500 flex items-center mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5 mr-1" /> Tür:
            </span>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium ${
                  selectedType === t
                    ? 'bg-slate-900 text-white font-semibold shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="font-semibold text-slate-500 flex items-center mr-1 shrink-0">
              <Briefcase className="w-3.5 h-3.5 mr-1" /> Sektör:
            </span>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium ${
                  selectedCategory === c
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900'
                }`}
              >
                {c}
              </button>
            ))}
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
                  <img
                    src={entity.avatarUrl}
                    alt={entity.name}
                    className="w-13 h-13 rounded-xl object-cover border-2 border-slate-100 shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
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
                      <img
                        src={entity.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
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
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto pt-12 sm:pt-6"
        >
          <div 
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150 my-auto"
          >
            <button
              onClick={() => setActiveEntityModal(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-5">
              <div className="flex items-start space-x-4">
                <img
                  src={activeEntityModal.avatarUrl}
                  alt={activeEntityModal.name}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md"
                  referrerPolicy="no-referrer"
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

              {/* Social Links */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {activeEntityModal.website && (
                    <a
                      href={activeEntityModal.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Web Sitesi</span>
                    </a>
                  )}
                  {activeEntityModal.linkedin && (
                    <a
                      href={activeEntityModal.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center space-x-1"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                </div>

                <span className="text-[10px] text-slate-400">
                  Son Otomatik Güncelleme: {activeEntityModal.lastUpdated}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
