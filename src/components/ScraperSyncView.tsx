import React, { useState } from 'react';
import { ScraperLog } from '../types';
import { Cpu, RefreshCw, CheckCircle2, AlertOctagon, Zap, Clock, ShieldCheck, Database, ArrowRight, Play, Server } from 'lucide-react';

interface ScraperSyncViewProps {
  logs: ScraperLog[];
  onTriggerScrape: () => void;
  isScraping: boolean;
}

export const ScraperSyncView: React.FC<ScraperSyncViewProps> = ({ logs, onTriggerScrape, isScraping }) => {
  const [syncFrequency, setSyncFrequency] = useState('12_hours');
  const [selectedSources, setSelectedSources] = useState({
    webrazzi: true,
    egirisim: true,
    linkedin: false,
    googleSheets: true,
    ticaretSicil: false
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 font-bold">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Web Scraper & Otomatik Senkronizasyon Simülatörü
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Verilerin dışarıdan otomatik nasıl çekildiğini ve WordPress'in neden çökmediğini canlı görün.
            </p>
          </div>
        </div>
      </div>

      {/* Trigger & Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scraper Control Card */}
        <div className="md:col-span-2 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-base">Harici Scraper Engine (Cron Job)</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              Hazır & Aktif
            </span>
          </div>

          <p className="text-slate-300 text-xs leading-relaxed">
            Bu motor WordPress sunucunuzdan tamamen bağımsız çalışır. Belirlenen periyotlarda hedef sitelerdeki yeni girişimcileri ve yatırım duyurularını tarar, temizler ve veritabanını günceller.
          </p>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">Taranacak Veri Kaynakları:</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center space-x-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.googleSheets}
                  onChange={e => setSelectedSources({ ...selectedSources, googleSheets: e.target.checked })}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span>Google Sheets CSV Tablosu</span>
              </label>

              <label className="flex items-center space-x-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.webrazzi}
                  onChange={e => setSelectedSources({ ...selectedSources, webrazzi: e.target.checked })}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span>Haber & Yatırım Portalları</span>
              </label>

              <label className="flex items-center space-x-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.egirisim}
                  onChange={e => setSelectedSources({ ...selectedSources, egirisim: e.target.checked })}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span>Startup Duyuru Beslemeleri</span>
              </label>

              <label className="flex items-center space-x-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.linkedin}
                  onChange={e => setSelectedSources({ ...selectedSources, linkedin: e.target.checked })}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span>Açık Web API / Webhooks</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Otomatik Tarama Sıklığı:</span>
              <select
                value={syncFrequency}
                onChange={e => setSyncFrequency(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none font-semibold"
              >
                <option value="6_hours">Her 6 Saatte Bir</option>
                <option value="12_hours">Her 12 Saatte Bir (Önerilen)</option>
                <option value="24_hours">Her 24 Saatte Bir</option>
                <option value="7_days">Haftada Bir</option>
              </select>
            </div>

            <button
              onClick={onTriggerScrape}
              disabled={isScraping}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
              <span>{isScraping ? 'Tarama Yapılıyor...' : 'Şimdi Test Taraması Başlat'}</span>
            </button>
          </div>
        </div>

        {/* WP Safety Stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
            WordPress Performans Raporu
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
              <span className="text-[11px] text-slate-500 block font-semibold">WordPress Sunucu Yükü</span>
              <span className="text-xl font-extrabold text-emerald-700">0.00 % (Sıfır Etki)</span>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
              <span className="text-[11px] text-slate-500 block font-semibold">WordPress Bellek Kullanımı</span>
              <span className="text-xl font-extrabold text-blue-700">0 KB (Harici Bellek)</span>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
              <span className="text-[11px] text-slate-500 block font-semibold">WordPress Yanıt Süresi (TTFB)</span>
              <span className="text-xl font-extrabold text-purple-700">18 ms (Anında)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-tight">
            * Scraper işlemi harici izolasyonda çalıştığı için WordPress sitenizde 504 Gateway Timeout yaşanmaz.
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Son Otomatik Tarama ve Senkronizasyon Günlüğü (Logs)</h3>
          <span className="text-xs text-slate-400">Son 3 İşlem</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Tarih / Saat</th>
                <th className="py-2.5 px-3">Veri Kaynağı</th>
                <th className="py-2.5 px-3">Durum</th>
                <th className="py-2.5 px-3">Çekilen Kayıt</th>
                <th className="py-2.5 px-3">Harcanan Süre</th>
                <th className="py-2.5 px-3">WP Yükü</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-mono text-slate-600">{log.timestamp}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{log.source}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{log.itemsFetched} Girişimci/Yatırımcı</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{log.durationMs} ms</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">%0 (Sıfır)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
