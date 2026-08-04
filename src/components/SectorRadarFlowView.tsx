import React, { useState, useMemo } from 'react';
import { EcosystemEntity, CategoryType, StageType } from '../types';
import { Network, PieChart, Layers, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface SectorRadarFlowViewProps {
  entities: EcosystemEntity[];
}

export const SectorRadarFlowView: React.FC<SectorRadarFlowViewProps> = ({ entities }) => {
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('Tümü');

  // Extract all categories present in entities dynamically
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [entities]);

  // Compute Radar Chart Data across top categories
  const radarData = useMemo(() => {
    const categories: CategoryType[] = [
      'AI & Veri',
      'FinTech',
      'SaaS & Yazılım',
      'Oyun & Eğlence',
      'Sağlık & Biyo',
      'Derin Teknoloji',
      'E-Ticaret & Lojistik',
      'İklim & Yeşil Teknoloji'
    ];

    return categories.map(cat => {
      const catEntities = entities.filter(e => e.category === cat);
      const startups = catEntities.filter(e => e.type === 'Startup').length;
      const vcs = catEntities.filter(e => e.type === 'Yatırımcı (VC)' || e.type === 'Melek Yatırımcı').length;
      const seriesA = catEntities.filter(e => e.stage === 'Seri A' || e.stage === 'Seri B+').length;

      return {
        category: cat,
        Startups: startups * 10,
        Yatırımcılar: vcs * 15,
        Olgunluk: seriesA * 20,
        fullMark: 100,
      };
    });
  }, [entities]);

  // Compute Flow Connections (Sector -> Stage -> Investor Cluster)
  const flowNodes = useMemo(() => {
    const filtered = selectedSectorFilter === 'Tümü'
      ? entities
      : entities.filter(e => e.category === selectedSectorFilter);

    // Group by Category
    const sectorCounts: Record<string, number> = {};
    const stageCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    filtered.forEach(e => {
      sectorCounts[e.category] = (sectorCounts[e.category] || 0) + 1;
      const stg = e.stage || 'Erken Aşama (Seed)';
      stageCounts[stg] = (stageCounts[stg] || 0) + 1;
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    });

    const sectors = Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const stages = Object.entries(stageCounts)
      .sort((a, b) => b[1] - a[1]);

    const types = Object.entries(typeCounts);

    return { sectors, stages, types, total: filtered.length };
  }, [entities, selectedSectorFilter]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Network className="w-4 h-4" />
          <span>Analitik Radar & Küme Bağlantı Görselleştirici</span>
        </div>
        <h2 className="text-xl font-black text-white">Sektörel Dağılım & Aşama Akış Diyagramı</h2>
        <p className="text-xs text-slate-400">
          Girişimcilik sektörlerinin göreceli gücünü Radar analiziyle görün ve sektörlerin yatırım aşamalarına (Seed, Seri A, Growth) aktarım akışını inceleyin.
        </p>
      </div>

      {/* Grid: Radar Chart + Flow Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Radar Chart Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span>Sektörel Güç & Olgunluk Radar Analizi</span>
            </h3>
            <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              8 Temel Odak
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="category" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                <PolarRadiusAxis stroke="#475569" angle={30} domain={[0, 100]} />
                <Radar name="Startups" dataKey="Startups" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Radar name="Yatırımcılar" dataKey="Yatırımcılar" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                <Radar name="Olgunluk" dataKey="Olgunluk" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center space-x-4 text-xs pt-2 border-t border-slate-800">
            <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Girişim Sayısı</span>
            </span>
            <span className="flex items-center space-x-1.5 text-indigo-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
              <span>Yatırımcı İlgisi</span>
            </span>
            <span className="flex items-center space-x-1.5 text-amber-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Aşama Olgunluğu</span>
            </span>
          </div>
        </div>

        {/* Sector-to-Stage Pipeline Connection Flow */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Sektör & Aşama Hiyerarşisi (Flow Diagram)</span>
            </h3>

            {/* Filter */}
            <select
              value={selectedSectorFilter}
              onChange={e => setSelectedSectorFilter(e.target.value)}
              className="bg-slate-950 text-white font-medium border border-slate-800 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[180px]"
            >
              <option value="Tümü">Tüm Sektörler ({availableCategories.length})</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-400">
            Sektör kategorilerinin yatırım aşamalarına göre şirket kırılımı ve yatırım türü dağılımı:
          </p>

          {/* 3 Column Flow Pipeline */}
          <div className="grid grid-cols-3 gap-3 items-center text-xs py-4">
            
            {/* Col 1: Sectors */}
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center pb-1">Sektörler</div>
              {flowNodes.sectors.map(([sec, count]) => (
                <div key={sec} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center shadow-md">
                  <div className="font-bold text-white text-[11px] truncate">{sec}</div>
                  <div className="text-[10px] text-emerald-400 font-black">{count} şirket</div>
                </div>
              ))}
            </div>

            {/* Col 2: Stages */}
            <div className="space-y-2 relative">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center pb-1">Aşamalar</div>
              {flowNodes.stages.map(([stg, count]) => (
                <div key={stg} className="bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-500/30 text-center shadow-md">
                  <div className="font-bold text-indigo-200 text-[11px] truncate">{stg}</div>
                  <div className="text-[10px] text-indigo-400 font-black">{count} adet</div>
                </div>
              ))}
            </div>

            {/* Col 3: Types */}
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center pb-1">Yapı Türü</div>
              {flowNodes.types.map(([t, count]) => (
                <div key={t} className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/30 text-center shadow-md">
                  <div className="font-bold text-emerald-200 text-[11px] truncate">{t}</div>
                  <div className="text-[10px] text-emerald-400 font-black">{count} kayıt</div>
                </div>
              ))}
            </div>

          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Toplam Analiz Edilen Hacim:</span>
            <span className="font-extrabold text-white text-xs">{flowNodes.total} Üye Bağlantısı</span>
          </div>
        </div>

      </div>

    </div>
  );
};
