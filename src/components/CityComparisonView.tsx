import React, { useState, useMemo } from 'react';
import { EcosystemEntity } from '../types';
import { MapPin, Building2, TrendingUp, Award, Layers, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface CityComparisonViewProps {
  entities: EcosystemEntity[];
  allCities: string[];
}

export const CityComparisonView: React.FC<CityComparisonViewProps> = ({ entities, allCities }) => {
  const [city1, setCity1] = useState<string>('İstanbul');
  const [city2, setCity2] = useState<string>('Ankara');
  const [city3, setCity3] = useState<string>('İzmir');

  // Filter available cities list
  const availableCities = useMemo(() => {
    const set = new Set(allCities);
    if (!set.has('İstanbul')) set.add('İstanbul');
    if (!set.has('Ankara')) set.add('Ankara');
    if (!set.has('İzmir')) set.add('İzmir');
    return Array.from(set).sort();
  }, [allCities]);

  // Compute stats for selected cities
  const getCityMetrics = (cityName: string) => {
    const cityEntities = entities.filter(e => e.city.trim().toLowerCase() === cityName.trim().toLowerCase());
    const startups = cityEntities.filter(e => e.type === 'Startup');
    const vcs = cityEntities.filter(e => e.type === 'Yatırımcı (VC)' || e.type === 'Melek Yatırımcı');
    const incubators = cityEntities.filter(e => e.type === 'Hızlandırıcı & Kuluçka');
    
    // Sector distribution
    const catCounts: Record<string, number> = {};
    cityEntities.forEach(e => {
      catCounts[e.category] = (catCounts[e.category] || 0) + 1;
    });
    const topSectors = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, count]) => `${cat} (${count})`);

    // Stages breakdown
    const stages: Record<string, number> = { 'Pre-seed': 0, 'Seed': 0, 'Seri A': 0, 'Seri B+': 0 };
    cityEntities.forEach(e => {
      if (e.stage && stages[e.stage] !== undefined) {
        stages[e.stage] += 1;
      }
    });

    return {
      cityName,
      total: cityEntities.length,
      startups: startups.length,
      vcs: vcs.length,
      incubators: incubators.length,
      topSectors: topSectors.length > 0 ? topSectors : ['Veri henüz az'],
      stages,
      entities: cityEntities,
    };
  };

  const metrics1 = useMemo(() => getCityMetrics(city1), [city1, entities]);
  const metrics2 = useMemo(() => getCityMetrics(city2), [city2, entities]);
  const metrics3 = useMemo(() => getCityMetrics(city3), [city3, entities]);

  const selectedMetrics = [metrics1, metrics2, metrics3];

  // Recharts Bar Data
  const chartData = useMemo(() => {
    return [
      {
        metric: 'Girişim (Startup)',
        [city1]: metrics1.startups,
        [city2]: metrics2.startups,
        [city3]: metrics3.startups,
      },
      {
        metric: 'Yatırımcı & VC',
        [city1]: metrics1.vcs,
        [city2]: metrics2.vcs,
        [city3]: metrics3.vcs,
      },
      {
        metric: 'Kuluçka & Hızlandırıcı',
        [city1]: metrics1.incubators,
        [city2]: metrics2.incubators,
        [city3]: metrics3.incubators,
      },
      {
        metric: 'Pre-seed / Seed',
        [city1]: (metrics1.stages['Pre-seed'] || 0) + (metrics1.stages['Seed'] || 0),
        [city2]: (metrics2.stages['Pre-seed'] || 0) + (metrics2.stages['Seed'] || 0),
        [city3]: (metrics3.stages['Pre-seed'] || 0) + (metrics3.stages['Seed'] || 0),
      },
      {
        metric: 'Seri A+',
        [city1]: (metrics1.stages['Seri A'] || 0) + (metrics1.stages['Seri B+'] || 0),
        [city2]: (metrics2.stages['Seri A'] || 0) + (metrics2.stages['Seri B+'] || 0),
        [city3]: (metrics3.stages['Seri A'] || 0) + (metrics3.stages['Seri B+'] || 0),
      },
    ];
  }, [metrics1, metrics2, metrics3, city1, city2, city3]);

  return (
    <div className="space-y-6">
      {/* Selector Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Analitik Karşılaştırma Modülü</span>
            </div>
            <h2 className="text-xl font-black text-white">Şehirlerarası Ekosistem Karşılaştırması</h2>
            <p className="text-xs text-slate-400">
              Türkiye'nin girişimcilik merkezlerini doğrudan yan yana koyarak girişim, yatırım ve sektör gücünü kıyaslayın.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider mb-1">1. Şehir</label>
              <select
                value={city1}
                onChange={e => setCity1(e.target.value)}
                className="w-full bg-slate-950 text-white font-bold border border-emerald-500/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {availableCities.map(c => (
                  <option key={`c1-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider mb-1">2. Şehir</label>
              <select
                value={city2}
                onChange={e => setCity2(e.target.value)}
                className="w-full bg-slate-950 text-white font-bold border border-indigo-500/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {availableCities.map(c => (
                  <option key={`c2-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-amber-400 uppercase tracking-wider mb-1">3. Şehir</label>
              <select
                value={city3}
                onChange={e => setCity3(e.target.value)}
                className="w-full bg-slate-950 text-white font-bold border border-amber-500/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {availableCities.map(c => (
                  <option key={`c3-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {selectedMetrics.map((m, idx) => {
          const colors = [
            { border: 'border-emerald-500/40', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', accent: 'text-emerald-400' },
            { border: 'border-indigo-500/40', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', accent: 'text-indigo-400' },
            { border: 'border-amber-500/40', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', accent: 'text-amber-400' }
          ][idx];

          return (
            <div key={m.cityName + idx} className={`bg-slate-900/90 border ${colors.border} rounded-3xl p-5 space-y-4 shadow-xl`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <MapPin className={`w-5 h-5 ${colors.accent}`} />
                  <h3 className="text-lg font-black text-white">{m.cityName}</h3>
                </div>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${colors.badge}`}>
                  {m.total} Kayıtlı Varlık
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Building2 className="w-3 h-3 text-emerald-400" />
                    <span>Startups</span>
                  </div>
                  <div className="text-lg font-black text-white">{m.startups}</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-amber-400" />
                    <span>VC / Fonlar</span>
                  </div>
                  <div className="text-lg font-black text-white">{m.vcs}</div>
                </div>
              </div>

              {/* Dominant Sectors */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Öne Çıkan Lider Sektörler:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.topSectors.map((sec, i) => (
                    <span key={i} className="bg-slate-950 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg border border-slate-800 font-medium">
                      {sec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stage breakdown */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>Yatırım Aşama Dağılımı:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-slate-950 px-2 py-1 rounded-md text-slate-400 border border-slate-800 flex justify-between">
                    <span>Pre-seed / Seed:</span>
                    <span className="font-bold text-white">{(m.stages['Pre-seed'] || 0) + (m.stages['Seed'] || 0)}</span>
                  </div>
                  <div className="bg-slate-950 px-2 py-1 rounded-md text-slate-400 border border-slate-800 flex justify-between">
                    <span>Seri A+:</span>
                    <span className="font-bold text-emerald-400">{(m.stages['Seri A'] || 0) + (m.stages['Seri B+'] || 0)}</span>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Comparative Bar Chart Visualizer */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Şehir Metrikleri Yan Yana Karşılaştırma Grafiği</span>
        </h3>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey={city1} fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey={city2} fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey={city3} fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
