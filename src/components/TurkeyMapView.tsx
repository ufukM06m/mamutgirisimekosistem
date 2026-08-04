import React, { useState, useMemo, useEffect } from 'react';
import { geoPath, geoMercator, geoCentroid } from 'd3-geo';
import { EcosystemEntity, EntityType, CategoryType } from '../types';
import { MapPin, Building2, TrendingUp, Filter, Search, Code, Copy, Check, ExternalLink, PieChart, ShieldCheck, Globe, Flame, Network, Layers } from 'lucide-react';
import { CityComparisonView } from './CityComparisonView';
import { RegionalHeatmapView } from './RegionalHeatmapView';
import { SectorRadarFlowView } from './SectorRadarFlowView';
import { InfrastructureRadarView } from './InfrastructureRadarView';

interface TurkeyMapViewProps {
  entities: EcosystemEntity[];
  isEmbedMode?: boolean;
}

interface CityData {
  total: number;
  startups: number;
  vcs: number;
  entities: EcosystemEntity[];
}

type VisualizationTab = 'map' | 'compare' | 'heatmap' | 'radar' | 'infrastructure';

// Normalize city name for accurate Turkish character matching
const normalizeCityName = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .replace(/I/g, 'ı')
    .replace(/İ/g, 'i')
    .toLowerCase();
};

export const TurkeyMapView: React.FC<TurkeyMapViewProps> = ({ entities, isEmbedMode = false }) => {
  const [activeTab, setActiveTab] = useState<VisualizationTab>('map');
  const [selectedType, setSelectedType] = useState<EntityType | 'Tümü'>('Tümü');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Tümü'>('Tümü');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string | null>('İstanbul');
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [showEmbedModal, setShowEmbedModal] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  // Real 81 Province GeoJSON data state
  const [geoData, setGeoData] = useState<any>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState<boolean>(true);

  // Load real Turkey GeoJSON map boundaries
  useEffect(() => {
    setIsLoadingGeo(true);
    fetch('/turkey-cities.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setIsLoadingGeo(false);
      })
      .catch(err => {
        console.error('Turkey GeoJSON load error:', err);
        setIsLoadingGeo(false);
      });
  }, []);

  // Filtered Entities based on selections
  const filteredEntities = useMemo(() => {
    return entities.filter(item => {
      const matchType = selectedType === 'Tümü' || item.type === selectedType;
      const matchCat = selectedCategory === 'Tümü' || item.category === selectedCategory;
      const matchSearch = !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchCat && matchSearch;
    });
  }, [entities, selectedType, selectedCategory, searchQuery]);

  // Group Entities by City
  const cityCounts = useMemo<Record<string, CityData>>(() => {
    const counts: Record<string, CityData> = {};
    
    filteredEntities.forEach(item => {
      const cityKey = item.city.trim();
      if (!counts[cityKey]) {
        counts[cityKey] = { total: 0, startups: 0, vcs: 0, entities: [] };
      }
      counts[cityKey].total += 1;
      if (item.type === 'Startup') counts[cityKey].startups += 1;
      if (item.type === 'Yatırımcı (VC)' || item.type === 'Melek Yatırımcı') counts[cityKey].vcs += 1;
      counts[cityKey].entities.push(item);
    });

    return counts;
  }, [filteredEntities]);

  // Normalized map for fast lookups
  const normalizedCityCounts = useMemo(() => {
    const map: Record<string, { rawName: string; data: CityData }> = {};
    (Object.entries(cityCounts) as [string, CityData][]).forEach(([cityName, data]) => {
      map[normalizeCityName(cityName)] = { rawName: cityName, data };
    });
    return map;
  }, [cityCounts]);

  // City Leaderboard
  const sortedCities = useMemo(() => {
    const entries = Object.entries(cityCounts) as [string, CityData][];
    return entries
      .map(([name, data]) => ({
        name,
        total: data.total,
        startups: data.startups,
        vcs: data.vcs,
        entities: data.entities
      }))
      .sort((a, b) => b.total - a.total);
  }, [cityCounts]);

  // Find max total count in any city for relative dynamic scaling
  const maxCityTotal = useMemo(() => {
    let maxVal = 1;
    (Object.values(normalizedCityCounts) as { rawName: string; data: CityData }[]).forEach(item => {
      if (item.data.total > maxVal) {
        maxVal = item.data.total;
      }
    });
    return maxVal;
  }, [normalizedCityCounts]);

  // Sector / Category Distribution
  const categoryStats = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredEntities.forEach(item => {
      catMap[item.category] = (catMap[item.category] || 0) + 1;
    });
    return Object.entries(catMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEntities]);

  // Active City entities
  const activeCityData = selectedCity ? cityCounts[selectedCity] : null;

  // D3 Projection and Path Generator
  const projection = useMemo(() => {
    if (!geoData) return null;
    return geoMercator().fitSize([1000, 480], geoData);
  }, [geoData]);

  const pathGenerator = useMemo(() => {
    if (!projection) return null;
    return geoPath().projection(projection);
  }, [projection]);

  // Generate Embed Code for WordPress
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://mamuthub.com';
  const iframeEmbedCode = `<iframe 
  src="${appOrigin}/?embed=true&view=map" 
  width="100%" 
  height="750" 
  style="border: 0; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 100%;" 
  allow="clipboard-write"
  loading="lazy"
  title="Türkiye Girişimcilik Ekosistem Haritası"
></iframe>
<script src="${appOrigin}/embed-autoresize.js" async></script>`;

  const handleCopyEmbedCode = () => {
    navigator.clipboard.writeText(iframeEmbedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`space-y-6 ${isEmbedMode ? 'p-2 sm:p-4 bg-slate-950 text-white min-h-screen' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
      
      {/* Header Banner */}
      {!isEmbedMode && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              <span>Gerçek İl Sınırlarıyla Etkileşimli Türkiye Görselleştirme</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Türkiye Girişimcilik & Yatırım Şehir Haritası
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              81 ilin gerçek coğrafi harita sınırları üzerinden girişim, VC fonu ve kuluçka merkezlerinin canlı görünümü. WordPress ve web sitenize iFrame olarak gömebilirsiniz.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setShowEmbedModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-3 rounded-2xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Code className="w-4 h-4" />
              <span>WordPress / Web Sitenize Göm (&lt;iFrame&gt;)</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Aktif Şehir Sayısı</span>
          </div>
          <p className="text-2xl font-black text-white">{sortedCities.length} <span className="text-xs text-slate-500 font-normal">/ 81 İl</span></p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Toplam Girişim (Startup)</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {filteredEntities.filter(e => e.type === 'Startup').length}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Yatırımcı & Fonlar</span>
          </div>
          <p className="text-2xl font-black text-amber-400">
            {filteredEntities.filter(e => e.type === 'Yatırımcı (VC)' || e.type === 'Melek Yatırımcı').length}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
            <Globe className="w-4 h-4 text-teal-400" />
            <span>En Büyük Merkez</span>
          </div>
          <p className="text-xl font-black text-white truncate">
            {sortedCities[0] ? `${sortedCities[0].name} (${sortedCities[0].total})` : '-'}
          </p>
        </div>
      </div>

      {/* Analytical Visualizer Navigation Tabs */}
      <div className="bg-slate-900/95 p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pb-2 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Analiz & Görünüm Modu Seçimi
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              5 Görünüm Modu
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Tıklayarak harita, şehir karşılaştırma, ısı haritası ve altyapı modları arasında geçiş yapabilirsiniz.
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {[
            {
              id: 'map' as VisualizationTab,
              label: '81 İl Haritası',
              desc: 'İl bazlı görünüm & liste',
              icon: Globe,
              iconColor: 'text-emerald-400',
            },
            {
              id: 'compare' as VisualizationTab,
              label: 'Şehir Karşılaştırma',
              desc: 'Yan yana 3 şehir analizi',
              icon: TrendingUp,
              iconColor: 'text-indigo-400',
            },
            {
              id: 'heatmap' as VisualizationTab,
              label: 'Bölgesel Isı Haritası',
              desc: '7 coğrafi bölge & katsayı',
              icon: Flame,
              iconColor: 'text-amber-400',
            },
            {
              id: 'radar' as VisualizationTab,
              label: 'Sektörel Radar & Akış',
              desc: 'Aşama aktarımı & küme',
              icon: Network,
              iconColor: 'text-teal-400',
            },
            {
              id: 'infrastructure' as VisualizationTab,
              label: 'Teknopark Radarı',
              desc: 'TGB & Kuluçka haritası',
              icon: Building2,
              iconColor: 'text-pink-400',
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                  isActive
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/40 translate-y-[-2px]'
                    : 'bg-slate-950/80 hover:bg-slate-800/90 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between space-x-2 mb-2">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : tab.iconColor}`} />
                  </div>
                  {isActive && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950 text-emerald-400 shadow-sm">
                      Aktif Mod
                    </span>
                  )}
                </div>
                <div>
                  <div className={`text-xs font-black ${isActive ? 'text-slate-950' : 'text-white'}`}>
                    {tab.label}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Analytical View */}
      {activeTab === 'compare' && (
        <CityComparisonView entities={entities} allCities={sortedCities.map(c => c.name)} />
      )}

      {activeTab === 'heatmap' && (
        <RegionalHeatmapView entities={entities} />
      )}

      {activeTab === 'radar' && (
        <SectorRadarFlowView entities={entities} />
      )}

      {activeTab === 'infrastructure' && (
        <InfrastructureRadarView entities={entities} />
      )}

      {activeTab === 'map' && (
        <>
          {/* Filter Bar */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold flex items-center mr-1">
            <Filter className="w-3.5 h-3.5 mr-1" /> Filtre:
          </span>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as any)}
            className="bg-slate-800 text-white font-medium border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="Tümü">Tüm Türler (Startup, VC...)</option>
            <option value="Startup">Startup / Girişim</option>
            <option value="Yatırımcı (VC)">Yatırımcı (VC)</option>
            <option value="Melek Yatırımcı">Melek Yatırımcı</option>
            <option value="Hızlandırıcı & Kuluçka">Hızlandırıcı & Kuluçka</option>
            <option value="Girişimci">Girişimci</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value as any)}
            className="bg-slate-800 text-white font-medium border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="Tümü">Tüm Sektörler (AI, FinTech...)</option>
            <option value="AI & Veri">AI & Veri</option>
            <option value="SaaS & Yazılım">SaaS & Yazılım</option>
            <option value="FinTech">FinTech</option>
            <option value="E-Ticaret & Lojistik">E-Ticaret & Lojistik</option>
            <option value="Oyun & Eğlence">Oyun & Eğlence</option>
            <option value="Sağlık & Biyo">Sağlık & Biyo</option>
            <option value="Derin Teknoloji">Derin Teknoloji</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Şehir veya isim ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Interactive Map & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Turkey Map Canvas Card */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>81 İl Gerçek Sınır Haritası</span>
              </h2>
              <p className="text-xs text-slate-400">İllerin üzerine gelip tıklayarak ekosistem yoğunluğunu detaylandırın.</p>
            </div>
            
            <div className="flex flex-wrap items-center space-x-2 text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-300 font-bold mr-1">Nispi Yoğunluk Ölçeği:</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Lider / Hub (%60+)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block ml-1"></span>
              <span>Orta-Yüksek (%25-%60)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block ml-1"></span>
              <span>Aktif (%1-%25)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block ml-1"></span>
              <span>Kayıtsız</span>
            </div>
          </div>

          {/* SVG GeoJSON Map Container */}
          <div className="relative w-full aspect-[2/1] bg-slate-950 rounded-2xl border border-slate-800/80 p-2 flex items-center justify-center overflow-hidden">
            {isLoadingGeo ? (
              <div className="flex items-center justify-center space-x-2 text-slate-400 text-xs py-20">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Türkiye Haritası İl Sınırları Yükleniyor...</span>
              </div>
            ) : (
              <svg viewBox="0 0 1000 480" className="w-full h-full select-none">
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Grid overlay */}
                <g stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4">
                  <line x1="0" y1="120" x2="1000" y2="120" />
                  <line x1="0" y1="240" x2="1000" y2="240" />
                  <line x1="0" y1="360" x2="1000" y2="360" />
                  <line x1="250" y1="0" x2="250" y2="480" />
                  <line x1="500" y1="0" x2="500" y2="480" />
                  <line x1="750" y1="0" x2="750" y2="480" />
                </g>

                {/* Sea Water Names */}
                <g fill="#475569" className="text-[10px] font-black tracking-widest uppercase select-none opacity-40 pointer-events-none">
                  <text x="500" y="35" textAnchor="middle">KARADENİZ</text>
                  <text x="60" y="260" textAnchor="middle" transform="rotate(-90 60 260)">EGE DENİZİ</text>
                  <text x="450" y="465" textAnchor="middle">AKDENİZ</text>
                  <text x="175" y="115" textAnchor="middle" className="text-[8px]">MARMARA</text>
                </g>

                {/* Render All 81 Official Turkish Provinces GeoJSON Paths */}
                {geoData && geoData.features && pathGenerator && (
                  <g>
                    {geoData.features.map((feature: any, idx: number) => {
                      const geoCityName = feature.properties?.name || '';
                      const normGeoName = normalizeCityName(geoCityName);
                      
                      const matched = normalizedCityCounts[normGeoName];
                      const rawName = matched ? matched.rawName : geoCityName;
                      const countInfo: CityData = matched ? matched.data : { total: 0, startups: 0, vcs: 0, entities: [] };
                      
                      const isSelected = selectedCity && normalizeCityName(selectedCity) === normGeoName;
                      const isHovered = hoveredCity && normalizeCityName(hoveredCity) === normGeoName;
                      
                      // Calculate province polygon path
                      const pathD = pathGenerator(feature);
                      
                      // Color based on activity density
                      let fill = '#0f172a'; // Base empty slate
                      let stroke = '#1e293b'; // subtle border
                      let strokeWidth = 1;

                      // Dynamic relative color scale based on max city total in active dataset
                      const totalCount = countInfo.total;
                      const ratio = totalCount / maxCityTotal;

                      if (totalCount > 0) {
                        if (ratio >= 0.6) {
                          fill = '#065f46'; // Lider Hub (Emerald)
                          stroke = '#10b981';
                          strokeWidth = 1.5;
                        } else if (ratio >= 0.25) {
                          fill = '#1e1b4b'; // Yüksek / Orta (Indigo)
                          stroke = '#6366f1';
                          strokeWidth = 1.2;
                        } else {
                          fill = '#0c4a6e'; // Gelişmekte / Aktif (Sky)
                          stroke = '#0ea5e9';
                          strokeWidth = 1.2;
                        }
                      }

                      if (isSelected) {
                        fill = '#047857'; // Bright Emerald selected
                        stroke = '#ffffff';
                        strokeWidth = 2.5;
                      } else if (isHovered) {
                        fill = '#15803d'; // Green hover
                        stroke = '#34d399';
                        strokeWidth = 2;
                      }

                      // Calculate centroid position for label/marker
                      let centroidX = 0;
                      let centroidY = 0;
                      if (projection) {
                        const c = geoCentroid(feature);
                        const projected = projection(c);
                        if (projected) {
                          centroidX = projected[0];
                          centroidY = projected[1];
                        }
                      }

                      return (
                        <g key={feature.id || geoCityName || idx} className="cursor-pointer">
                          {/* Province Polygon Path */}
                          <path
                            d={pathD || ''}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            strokeLinejoin="round"
                            className="transition-all duration-150 hover:brightness-125"
                            onClick={() => setSelectedCity(rawName)}
                            onMouseEnter={() => setHoveredCity(rawName)}
                            onMouseLeave={() => setHoveredCity(null)}
                          />

                          {/* Centroid Badge / Label for Active Cities */}
                          {centroidX > 0 && centroidY > 0 && countInfo.total > 0 && (
                            <g
                              className="pointer-events-none"
                              style={{ transform: `translate(${centroidX}px, ${centroidY}px)` }}
                            >
                              {/* Glowing Dot */}
                              <circle
                                r={isSelected ? 6 : 4}
                                fill={isSelected ? '#34d399' : '#10b981'}
                                stroke="#ffffff"
                                strokeWidth={1}
                              />

                              {/* City Name & Count Label */}
                              {(countInfo.total >= 3 || isSelected || isHovered) && (
                                <text
                                  y={-8}
                                  textAnchor="middle"
                                  className={`text-[9px] font-extrabold tracking-tight fill-white select-none ${
                                    isSelected ? 'fill-emerald-300 font-black text-[10px]' : ''
                                  }`}
                                  style={{
                                    textShadow: '0px 1px 3px rgba(0,0,0,0.9)'
                                  }}
                                >
                                  {rawName} ({countInfo.total})
                                </text>
                              )}
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>
                )}
              </svg>
            )}
          </div>

          {/* Sector Breakdown Bar Chart */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <PieChart className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sektörel Dağılım Sıralaması</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categoryStats.slice(0, 4).map(cat => (
                <div key={cat.name} className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 truncate">{cat.name}</div>
                  <div className="text-sm font-extrabold text-white">{cat.count} <span className="text-[10px] font-normal text-slate-500">kayıt</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected City Detail & Leaderboard Column */}
        <div className="space-y-6">
          
          {/* Selected City Inspector Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-lg font-black text-white">{selectedCity || 'Şehir Seçin'}</h3>
                  <p className="text-[11px] text-slate-400">Seçili Şehirdeki Kayıtlı Ekosistem Üyeleri</p>
                </div>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-extrabold">
                {activeCityData ? activeCityData.total : 0} Üye
              </span>
            </div>

            {/* City Entities List */}
            {activeCityData && activeCityData.entities.length > 0 ? (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {activeCityData.entities.map(item => (
                  <div key={item.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate max-w-[170px]">{item.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300">
                        {item.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="text-emerald-400 font-medium">{item.category}</span>
                      {item.stage && <span className="text-slate-500">{item.stage}</span>}
                    </div>

                    {item.website && (
                      <a
                        href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 pt-1"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{item.website}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                Bu şehirde henüz kayıtlı girişimci veya yatırımlı şirket bulunmuyor.
              </div>
            )}
          </div>

          {/* Top City Hubs Leaderboard */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>En Aktif Şehir Sıralaması</span>
            </h3>

            <div className="space-y-2">
              {sortedCities.slice(0, 5).map((city, idx) => {
                const percentage = Math.round((city.total / (filteredEntities.length || 1)) * 100);
                return (
                  <div
                    key={city.name}
                    onClick={() => setSelectedCity(city.name)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedCity === city.name
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-extrabold text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white">{city.name}</div>
                        <div className="text-[10px] text-slate-400">{city.startups} Startup · {city.vcs} VC</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400">{city.total}</span>
                      <div className="text-[9px] text-slate-500">%{percentage}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
        </>
      )}

      {/* WordPress iFrame Embed Code Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Code className="w-5 h-5 text-emerald-400" />
                <span>WordPress veya Web Sitenize iFrame Gömme</span>
              </h3>
              <button
                onClick={() => setShowEmbedModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bu Haritayı WordPress sitenizdeki veya blogunuzdaki herhangi bir sayfaya tek tıkla canlı olarak yerleştirebilirsiniz.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                iFrame HTML Kodunuz (Kopyala & Yapıştır):
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  rows={6}
                  value={iframeEmbedCode}
                  className="w-full bg-slate-950 text-emerald-300 font-mono text-[11px] p-3 rounded-2xl border border-slate-800 focus:outline-none"
                />
                <button
                  onClick={handleCopyEmbedCode}
                  className="absolute top-3 right-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-white flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>WordPress İpucu:</span>
              </div>
              <p>WordPress Sayfa/Yazı düzenleyicinizde <strong>"Custom HTML / Özel HTML"</strong> bloğunu seçip bu kodu yapıştırmanız yeterlidir.</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowEmbedModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
