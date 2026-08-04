import React, { useState, useMemo, useEffect } from 'react';
import { geoPath, geoMercator, geoCentroid } from 'd3-geo';
import { EcosystemEntity } from '../types';
import { Flame, Layers, MapPin, Globe, Sparkles, ChevronRight, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip } from 'recharts';

interface RegionalHeatmapViewProps {
  entities: EcosystemEntity[];
}

type HeatmapMetric = 'startups' | 'vcs' | 'categories' | 'maturity';

// Mapping Turkey's 81 Cities to 7 Geographical Regions
const REGION_MAP: Record<string, string> = {
  // Marmara
  'İstanbul': 'Marmara', 'Kocaeli': 'Marmara', 'Bursa': 'Marmara', 'Tekirdağ': 'Marmara',
  'Sakarya': 'Marmara', 'Balıkesir': 'Marmara', 'Çanakkale': 'Marmara', 'Yalova': 'Marmara',
  'Edirne': 'Marmara', 'Kırklareli': 'Marmara', 'Bilecik': 'Marmara',

  // İç Anadolu
  'Ankara': 'İç Anadolu', 'Eskişehir': 'İç Anadolu', 'Konya': 'İç Anadolu', 'Kayseri': 'İç Anadolu',
  'Sivas': 'İç Anadolu', 'Kırıkkale': 'İç Anadolu', 'Nevşehir': 'İç Anadolu', 'Aksaray': 'İç Anadolu',
  'Niğde': 'İç Anadolu', 'Karaman': 'İç Anadolu', 'Yozgat': 'İç Anadolu', 'Çankırı': 'İç Anadolu', 'Kırşehir': 'İç Anadolu',

  // Ege
  'İzmir': 'Ege', 'Manisa': 'Ege', 'Denizli': 'Ege', 'Muğla': 'Ege', 'Aydın': 'Ege',
  'Kütahya': 'Ege', 'Afyonkarahisar': 'Ege', 'Uşak': 'Ege',

  // Akdeniz
  'Antalya': 'Akdeniz', 'Adana': 'Akdeniz', 'Mersin': 'Akdeniz', 'Hatay': 'Akdeniz',
  'Kahramanmaraş': 'Akdeniz', 'Isparta': 'Akdeniz', 'Osmaniye': 'Akdeniz', 'Burdur': 'Akdeniz',

  // Karadeniz
  'Trabzon': 'Karadeniz', 'Samsun': 'Karadeniz', 'Ordu': 'Karadeniz', 'Rize': 'Karadeniz',
  'Zonguldak': 'Karadeniz', 'Giresun': 'Karadeniz', 'Düzce': 'Karadeniz', 'Kastamonu': 'Karadeniz',
  'Tokat': 'Karadeniz', 'Bolu': 'Karadeniz', 'Sinop': 'Karadeniz', 'Amasya': 'Karadeniz',
  'Karabük': 'Karadeniz', 'Artvin': 'Karadeniz', 'Bartın': 'Karadeniz', 'Gümüşhane': 'Karadeniz', 'Bayburt': 'Karadeniz',

  // Güneydoğu Anadolu
  'Gaziantep': 'Güneydoğu', 'Diyarbakır': 'Güneydoğu', 'Şanlıurfa': 'Güneydoğu', 'Mardin': 'Güneydoğu',
  'Batman': 'Güneydoğu', 'Adıyaman': 'Güneydoğu', 'Siirt': 'Güneydoğu', 'Şırnak': 'Güneydoğu', 'Kilis': 'Güneydoğu',

  // Doğu Anadolu
  'Erzurum': 'Doğu Anadolu', 'Malatya': 'Doğu Anadolu', 'Van': 'Doğu Anadolu', 'Elazığ': 'Doğu Anadolu',
  'Sivas (Doğu)': 'Doğu Anadolu', 'Erzincan': 'Doğu Anadolu', 'Ağrı': 'Doğu Anadolu', 'Kars': 'Doğu Anadolu',
  'Bitlis': 'Doğu Anadolu', 'Muş': 'Doğu Anadolu', 'Iğdır': 'Doğu Anadolu', 'Hakkari': 'Doğu Anadolu',
  'Bingöl': 'Doğu Anadolu', 'Tunceli': 'Doğu Anadolu', 'Ardahan': 'Doğu Anadolu'
};

const normalizeCityName = (str: string): string => {
  if (!str) return '';
  return str.trim().replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
};

const REGION_COLORS: Record<string, string> = {
  'Marmara': '#10b981',      // Emerald
  'İç Anadolu': '#6366f1',   // Indigo
  'Ege': '#f59e0b',          // Amber
  'Akdeniz': '#ec4899',       // Pink
  'Karadeniz': '#06b6d4',     // Cyan
  'Güneydoğu': '#8b5cf6',     // Purple
  'Doğu Anadolu': '#f97316',  // Orange
};

export const RegionalHeatmapView: React.FC<RegionalHeatmapViewProps> = ({ entities }) => {
  const [activeMetric, setActiveMetric] = useState<HeatmapMetric>('startups');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState<boolean>(true);

  useEffect(() => {
    setIsLoadingGeo(true);
    fetch('/turkey-cities.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setIsLoadingGeo(false);
      })
      .catch(err => {
        console.error('GeoJSON load error:', err);
        setIsLoadingGeo(false);
      });
  }, []);

  // Compute City-level Metrics
  const cityMetricsMap = useMemo(() => {
    const map: Record<string, { total: number; startups: number; vcs: number; categories: Set<string>; maturityScore: number }> = {};

    entities.forEach(e => {
      const cityKey = normalizeCityName(e.city);
      if (!map[cityKey]) {
        map[cityKey] = { total: 0, startups: 0, vcs: 0, categories: new Set(), maturityScore: 0 };
      }
      map[cityKey].total += 1;
      if (e.type === 'Startup') map[cityKey].startups += 1;
      if (e.type === 'Yatırımcı (VC)' || e.type === 'Melek Yatırımcı') map[cityKey].vcs += 1;
      map[cityKey].categories.add(e.category);
      if (e.stage === 'Seri A' || e.stage === 'Seri B+') map[cityKey].maturityScore += 2;
      else if (e.stage === 'Seed') map[cityKey].maturityScore += 1;
    });

    return map;
  }, [entities]);

  // Compute 7 Regional Breakdown
  const regionStats = useMemo(() => {
    const stats: Record<string, { total: number; startups: number; vcs: number; cities: Set<string> }> = {
      'Marmara': { total: 0, startups: 0, vcs: 0, cities: new Set() },
      'İç Anadolu': { total: 0, startups: 0, vcs: 0, cities: new Set() },
      'Ege': { total: 0, startups: 0, vcs: 0, cities: new Set() },
      'Akdeniz': { total: 0, startups: 0, vcs: 0, cities: new Set() },
      'Karadeniz': { total: 0, startups: 0, vcs: 0, cities: new Set() },
      'Güneydoğu': { total: 0, startups: 0, vcs: 0, cities: new Set() },
      'Doğu Anadolu': { total: 0, startups: 0, vcs: 0, cities: new Set() },
    };

    entities.forEach(e => {
      const reg = REGION_MAP[e.city.trim()] || 'Marmara';
      if (stats[reg]) {
        stats[reg].total += 1;
        if (e.type === 'Startup') stats[reg].startups += 1;
        if (e.type === 'Yatırımcı (VC)' || e.type === 'Melek Yatırımcı') stats[reg].vcs += 1;
        stats[reg].cities.add(e.city.trim());
      }
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      total: data.total,
      startups: data.startups,
      vcs: data.vcs,
      cityCount: data.cities.size,
      color: REGION_COLORS[name] || '#64748b',
    })).sort((a, b) => b.total - a.total);
  }, [entities]);

  // Map D3 Projection
  const projection = useMemo(() => {
    if (!geoData) return null;
    return geoMercator().fitSize([1000, 480], geoData);
  }, [geoData]);

  const pathGenerator = useMemo(() => {
    if (!projection) return null;
    return geoPath().projection(projection);
  }, [projection]);

  // Find Max metric value dynamically across all cities for active metric scale
  const maxMetricValue = useMemo(() => {
    let maxVal = 1;
    (Object.values(cityMetricsMap) as { total: number; startups: number; vcs: number; categories: Set<string>; maturityScore: number }[]).forEach(data => {
      let val = 0;
      if (activeMetric === 'startups') val = data.startups;
      else if (activeMetric === 'vcs') val = data.vcs;
      else if (activeMetric === 'categories') val = data.categories.size;
      else if (activeMetric === 'maturity') val = data.maturityScore;

      if (val > maxVal) maxVal = val;
    });
    return maxVal;
  }, [cityMetricsMap, activeMetric]);

  // Color logic according to active metric with relative scale
  const getProvinceFill = (normCityName: string, rawCityName: string) => {
    const cityReg = REGION_MAP[rawCityName.trim()] || 'Marmara';
    const data = cityMetricsMap[normCityName];

    if (selectedRegion && cityReg !== selectedRegion) {
      return '#090d16'; // Dimmed when filtering by region
    }

    if (!data || data.total === 0) {
      return '#0f172a';
    }

    let val = 0;
    if (activeMetric === 'startups') val = data.startups;
    else if (activeMetric === 'vcs') val = data.vcs;
    else if (activeMetric === 'categories') val = data.categories.size;
    else if (activeMetric === 'maturity') val = data.maturityScore;

    if (val === 0) return '#0f172a';

    const ratio = val / maxMetricValue;

    // Relative Heatmap intensity shades (% scale based on max city)
    if (ratio >= 0.75) return '#059669'; // High emerald (75-100%)
    if (ratio >= 0.50) return '#10b981';  // Medium emerald (50-75%)
    if (ratio >= 0.25) return '#34d399';  // Light emerald (25-50%)
    return '#064e3b';  // Deep emerald tint (1-25%)
  };

  return (
    <div className="space-y-6">
      
      {/* Mode Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4" />
            <span>Choropleth Isı Haritası & Coğrafi Kümelenme</span>
          </div>
          <h2 className="text-xl font-black text-white">Bölgesel Girişim & Yatırım Haritası</h2>
          <p className="text-xs text-slate-400">
            Farklı analitik metriklere göre 81 ilin ve 7 coğrafi bölgenin ekosistem yoğunluk katsayısını inceleyin.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveMetric('startups')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'startups' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🚀 Girişim Yoğunluğu
          </button>
          <button
            onClick={() => setActiveMetric('vcs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'vcs' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            💰 VC & Fon Yoğunluğu
          </button>
          <button
            onClick={() => setActiveMetric('categories')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'categories' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Sektörel Çeşitlilik
          </button>
          <button
            onClick={() => setActiveMetric('maturity')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'maturity' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏆 Olgunluk İndeksi
          </button>
        </div>
      </div>

      {/* Main Map & Region Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Choropleth Map */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>
                {activeMetric === 'startups' && 'Girişim (Startup) Isı Haritası'}
                {activeMetric === 'vcs' && 'Yatırımcı (VC) Isı Haritası'}
                {activeMetric === 'categories' && 'Sektörel Çeşitlilik Isı Haritası'}
                {activeMetric === 'maturity' && 'Aşama / Olgunluk İndeksi Haritası'}
              </span>
            </h3>

            {selectedRegion && (
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-xs text-amber-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Filtreyi Temizle ({selectedRegion})</span>
                <span>✕</span>
              </button>
            )}
          </div>

          <div className="relative w-full aspect-[2/1] bg-slate-950 rounded-2xl border border-slate-800/80 p-2 flex items-center justify-center overflow-hidden">
            {isLoadingGeo ? (
              <div className="text-slate-400 text-xs flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Isı Haritası Yükleniyor...</span>
              </div>
            ) : (
              <svg viewBox="0 0 1000 480" className="w-full h-full select-none">
                {geoData && geoData.features && pathGenerator && (
                  <g>
                    {geoData.features.map((feature: any, idx: number) => {
                      const geoCityName = feature.properties?.name || '';
                      const normGeoName = normalizeCityName(geoCityName);
                      const pathD = pathGenerator(feature);
                      const fill = getProvinceFill(normGeoName, geoCityName);

                      return (
                        <path
                          key={feature.id || geoCityName || idx}
                          d={pathD || ''}
                          fill={fill}
                          stroke="#1e293b"
                          strokeWidth={0.8}
                          className="transition-all duration-150 hover:brightness-125 cursor-pointer"
                        />
                      );
                    })}
                  </g>
                )}
              </svg>
            )}
          </div>

          {/* Heatmap Legend */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span className="font-semibold text-slate-300">Nispi Isı Katsayısı (Zirveye Göre):</span>
            <div className="flex items-center space-x-1.5">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-800"></span>
                <span className="text-[10px]">%1-25</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-emerald-700"></span>
                <span className="text-[10px]">%25-50</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                <span className="text-[10px]">%50-75</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-emerald-400"></span>
                <span className="text-[10px] font-bold text-emerald-300">%75-100 (Zirve Hub)</span>
              </span>
            </div>
          </div>
        </div>

        {/* 7 Regions Breakdown List & Pie */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <span>7 Coğrafi Bölge Pay Dağılımı</span>
          </h3>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={regionStats}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {regionStats.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          {/* Regions Cards */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {regionStats.map((reg) => (
              <div
                key={reg.name}
                onClick={() => setSelectedRegion(selectedRegion === reg.name ? null : reg.name)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedRegion === reg.name
                    ? 'bg-emerald-950/50 border-emerald-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: reg.color }}></span>
                  <div>
                    <div className="text-xs font-bold text-white">{reg.name}</div>
                    <div className="text-[10px] text-slate-400">{reg.startups} Startup · {reg.vcs} VC</div>
                  </div>
                </div>

                <div className="text-right flex items-center space-x-1">
                  <span className="text-xs font-black text-white">{reg.total}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
