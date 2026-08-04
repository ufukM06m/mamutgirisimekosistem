import React, { useState, useMemo } from 'react';
import { EcosystemEntity } from '../types';
import { Building2, Award, Zap, ExternalLink, MapPin, CheckCircle2, Globe, Shield, Search } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface InfrastructureRadarViewProps {
  entities: EcosystemEntity[];
}

interface TechnoparkHub {
  name: string;
  city: string;
  established: number;
  capacity: string;
  specialization: string;
  incubatorProgram: string;
  website: string;
  activeCount: number;
}

const PRESET_TECHNOPARKS: TechnoparkHub[] = [
  {
    name: 'İTÜ ARI Teknokent & İTÜ Çekirdek',
    city: 'İstanbul',
    established: 2002,
    capacity: '300+ Şirket',
    specialization: 'AI, SaaS, Derin Teknoloji, FinTech',
    incubatorProgram: 'İTÜ Çekirdek (Dünyanın Top 5 Kuluçkası)',
    website: 'https://ariteknokent.com.tr',
    activeCount: 45,
  },
  {
    name: 'ODTÜ TEKNOKENT & Telekom Garaj',
    city: 'Ankara',
    established: 2001,
    capacity: '400+ Şirket',
    specialization: 'Savunma, AI, Oyun, Yazılım',
    incubatorProgram: 'Yeni Fikirler Yeni İşler (YFYİ)',
    website: 'https://odtuteknokent.com.tr',
    activeCount: 38,
  },
  {
    name: 'Yıldız Teknopark & Yıldız Kuluçka',
    city: 'İstanbul',
    established: 2003,
    capacity: '450+ Şirket',
    specialization: 'Yazılım, Oyun, BiyoTeknoloji',
    incubatorProgram: 'Yıldız Kuluçka Center',
    website: 'https://yildizteknopark.com.tr',
    activeCount: 32,
  },
  {
    name: 'Bilişim Vadisi (Türkiye Teknoloji Geliştirme Bölgesi)',
    city: 'Kocaeli',
    established: 2015,
    capacity: '500+ Şirket',
    specialization: 'Otomotiv, Mobility, Derin Teknoloji, AI',
    incubatorProgram: 'Kuluçka İşletme Merkezi (KİM)',
    website: 'https://bilisimvadisi.com.tr',
    activeCount: 28,
  },
  {
    name: 'Bilkent CYBERPARK',
    city: 'Ankara',
    established: 2002,
    capacity: '240+ Şirket',
    specialization: 'Telekom, Bilişim, Siber Güvenlik',
    incubatorProgram: 'CYBERPARK Kuluçka',
    website: 'https://cyberpark.com.tr',
    activeCount: 22,
  },
  {
    name: 'BTM (Bilgiyi Ticarileştirme Merkezi)',
    city: 'İstanbul',
    established: 2017,
    capacity: '200+ Girişim',
    specialization: 'E-Ticaret, FinTech, Dijital Dönüşüm',
    incubatorProgram: 'BTM Ön Kuluçka & Kuluçka',
    website: 'https://btm.istanbul',
    activeCount: 26,
  },
  {
    name: 'Ege Teknopark & DEÜ DEPARK',
    city: 'İzmir',
    established: 2014,
    capacity: '150+ Şirket',
    specialization: 'BiyoSağlık, TarımTek, Yazılım',
    incubatorProgram: 'nuKA Kuluçka Merkezi',
    website: 'https://egeteknopark.com.tr',
    activeCount: 18,
  },
];

export const InfrastructureRadarView: React.FC<InfrastructureRadarViewProps> = ({ entities }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('Tümü');

  // Filter all Incubators, Accelerators & Technoparks directly from user database
  const incubatorsFromData = useMemo(() => {
    return entities.filter(e => e.type === 'Hızlandırıcı & Kuluçka' || e.category === 'Hızlandırıcı & Kuluçka');
  }, [entities]);

  // Unique list of cities in the registered technoparks data
  const availableCities = useMemo(() => {
    const citiesSet = new Set<string>();
    incubatorsFromData.forEach(e => {
      if (e.city) citiesSet.add(e.city);
    });
    return Array.from(citiesSet).sort();
  }, [incubatorsFromData]);

  // Filtered incubators based on selected city & search query
  const filteredIncubators = useMemo(() => {
    return incubatorsFromData.filter(inc => {
      const matchCity = selectedCityFilter === 'Tümü' || inc.city === selectedCityFilter;
      const matchSearch = !searchQuery.trim() ||
        inc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inc.description && inc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inc.titleOrCompany && inc.titleOrCompany.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCity && matchSearch;
    });
  }, [incubatorsFromData, selectedCityFilter, searchQuery]);

  // Chart data for Teknopark distribution by City
  const capacityChartData = useMemo(() => {
    const cityMap: Record<string, number> = {};
    incubatorsFromData.forEach(tp => {
      const c = tp.city || 'Diğer';
      cityMap[c] = (cityMap[c] || 0) + 1;
    });
    return Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  }, [incubatorsFromData]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>İnovasyon Altyapı & Kuluçka Radarı</span>
          </div>
          <h2 className="text-xl font-black text-white">Teknoparklar & Hızlandırıcı Merkezleri</h2>
          <p className="text-xs text-slate-400">
            Sisteminizdeki tüm akredite Teknoloji Geliştirme Bölgeleri (TGB), kuluçka merkezleri ve hızlandırıcılar.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center min-w-[120px]">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Kayıtlı Merkez</div>
            <div className="text-xl font-black text-emerald-400">{incubatorsFromData.length} TGB & Kuluçka</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center min-w-[120px]">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Kapsanan Şehir</div>
            <div className="text-xl font-black text-indigo-400">{availableCities.length} Şehir</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-200 font-bold">Tüm Ekosistem Rehberi ({filteredIncubators.length})</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-semibold">Şehir:</span>
            <select
              value={selectedCityFilter}
              onChange={e => setSelectedCityFilter(e.target.value)}
              className="bg-slate-800 text-white font-medium border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Tümü">Tüm Şehirler ({availableCities.length})</option>
              {availableCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Teknopark veya uzmanlık ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Technoparks & Incubators Grid */}
      <div className="space-y-4">
        {filteredIncubators.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-white font-bold text-sm">Filtreye Uygun Teknopark veya Kuluçka Bulunamadı</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Arama kriterlerinizi değiştirebilir veya Ekle butonunu kullanarak veritabanına yeni kuluçka merkezleri tanımlayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIncubators.map((inc) => (
              <div key={inc.id} className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition-all rounded-3xl p-5 space-y-3 shadow-xl flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-white leading-snug">{inc.name}</h3>
                    <span className="bg-slate-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0">
                      {inc.city}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 flex items-center space-x-2">
                    <span className="text-indigo-400 font-bold">{inc.titleOrCompany || inc.category}</span>
                  </div>

                  {inc.teamSize && (
                    <div className="text-[11px] text-slate-400 flex items-center space-x-2 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80 w-fit">
                      <Building2 className="w-3 h-3 text-emerald-400" />
                      <span>Kapasite / Ölçek: <strong className="text-white">{inc.teamSize}</strong></span>
                    </div>
                  )}

                  {inc.description && (
                    <p className="text-xs text-slate-400 line-clamp-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                      {inc.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Akredite Veri Kaydı</span>
                  </span>

                  {inc.website && (
                    <a
                      href={inc.website.startsWith('http') ? inc.website : `https://${inc.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-3 py-1 rounded-xl text-[10px] flex items-center space-x-1 transition-all"
                    >
                      <span>Web Sitesi</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart: Teknopark Density by City */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Şehirlere Göre Teknopark İnovasyon Gücü Dağılımı</span>
        </h3>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={capacityChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <XAxis dataKey="city" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
              <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
