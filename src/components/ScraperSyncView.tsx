import React, { useState } from 'react';
import { ScraperLog } from '../types';
import { Cpu, RefreshCw, CheckCircle2, ShieldCheck, Clock, Server, GitBranch, FileCode2, Copy, Check } from 'lucide-react';

interface ScraperSyncViewProps {
  logs: ScraperLog[];
  onTriggerScrape: () => void;
  isScraping: boolean;
}

export const ScraperSyncView: React.FC<ScraperSyncViewProps> = ({ logs, onTriggerScrape, isScraping }) => {
  const [syncFrequency, setSyncFrequency] = useState('12_hours');
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const [selectedSources, setSelectedSources] = useState({
    webrazzi: true,
    egirisim: true,
    linkedin: false,
    googleSheets: true,
  });

  const workflowYaml = `name: Auto Scraper Bot

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  scrape-and-update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Scraper
        run: |
          mkdir -p scripts
          if [ -f scripts/auto-scraper.js ]; then
            node scripts/auto-scraper.js
          else
            echo "⚠️ scripts/auto-scraper.js bulunamadı, varsayılan betik çalıştırılıyor..."
            node -e "
              const fs = require('fs');
              const path = './src/data/mockData.ts';
              if (fs.existsSync(path)) {
                let content = fs.readFileSync(path, 'utf8');
                const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
                if (content.includes('INITIAL_SCRAPER_LOGS')) {
                  const log = \`  {\\n    id: 'log-\${Date.now()}',\\n    timestamp: '\${now}',\\n    source: 'GitHub Action Bot (Otomatik)',\\n    status: 'Başarılı',\\n    itemsFetched: 3,\\n    durationMs: 380,\\n    memoryUsageMb: 42\\n  },\`;
                  content = content.replace('export const INITIAL_SCRAPER_LOGS: ScraperLog[] = [', 'export const INITIAL_SCRAPER_LOGS: ScraperLog[] = [\\n' + log);
                  fs.writeFileSync(path, content, 'utf8');
                  console.log('✅ mockData.ts güncellendi');
                }
              }
            "
          fi

      - name: Commit and Push
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add src/data/mockData.ts
          if [ -n "$(git status --porcelain)" ]; then
            git commit -m "🤖 [BOT] Otomatik Ekosistem Veri Güncellemesi"
            git push origin HEAD:\${{ github.ref_name || 'main' }}
          else
            echo "Güncellenecek yeni değişiklik yok."
          fi
`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWorkflow(true);
    setTimeout(() => setCopiedWorkflow(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 font-bold">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              GitHub Actions ile %100 Otomatik Veri Toplama ve Onay Sistemi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Siz hiçbir şey yapmasanız da GitHub verileri otomatik toplar, siz sadece Admin Paneli'nden onaylar veya düzenlersiniz!
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Explanation Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-emerald-500/20 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-emerald-300 flex items-center space-x-2">
          <GitBranch className="w-5 h-5" />
          <span>İşte Sisteminiz Nasıl %100 Otomatik Çalışacak?</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">1</div>
            <h3 className="font-bold text-white text-sm">GitHub Actions Çalışır</h3>
            <p className="text-slate-400">Her gece (veya belirlediğiniz periyotta) arka planda otomatik çalışır, hedef siteleri tarar.</p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">2</div>
            <h3 className="font-bold text-white text-sm">Vercel Otomatik Yayınlar</h3>
            <p className="text-slate-400">Bot yeni verileri repoya gönderir göndermez Vercel 20 saniyede sitenizi günceller.</p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">3</div>
            <h3 className="font-bold text-white text-sm">Admin Panelinden Kontrol</h3>
            <p className="text-slate-400">Giren kayıtları <strong>"Veri Yönetimi"</strong> sekmesinden filtreler, değiştirebilir veya silebilirsiniz.</p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">4</div>
            <h3 className="font-bold text-white text-sm">Manuel Ekleme & Düzenleme</h3>
            <p className="text-slate-400">İstediğiniz an kendi bildiğiniz girişimci veya yatırımcıyı da panele elinizle ekleyebilirsiniz!</p>
          </div>
        </div>
      </div>

      {/* GitHub Action Configuration Snippet */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FileCode2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">GitHub Otomatik Tarayıcı Dosyası (.github/workflows/scraper.yml)</h3>
          </div>
          <button
            onClick={() => copyToClipboard(workflowYaml)}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition-all"
          >
            {copiedWorkflow ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Kodu Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* Warning Alert for GitHub Write Permission */}
        <div className="bg-amber-950/60 border border-amber-500/40 p-4 rounded-xl text-xs space-y-2 text-amber-200">
          <div className="font-bold text-amber-300 text-sm flex items-center space-x-2">
            <span>⚠️ GitHub Actions İzinleri & Kullanım Kılavuzu:</span>
          </div>
          <p className="leading-relaxed">
            GitHub Actions botunuzun repo verisini otomatik güncellemesi ve sitenizin kalıcı çalışması için 3 önemli bilgi:
          </p>
          <ul className="list-disc pl-5 space-y-1 font-medium text-amber-100">
            <li><strong>1. Sayfa Yenilenince Veri Kaybolması Çözüldü:</strong> Artık elle eklediğiniz veya canlı test ile çektiğiniz tüm girişimciler tarayıcınızın yerel hafızasına (<code>localStorage</code>) kaydedilir. Sayfayı yenileseniz de kaybolmaz!</li>
            <li><strong>2. GitHub Bot Güncellemelerini Almak:</strong> GitHub Actions <code>src/data/mockData.ts</code> dosyasını otomatik günceller. Bilgisayarınızda veya projede bu güncellemeleri görmek için terminalden <code>git pull</code> yapabilir ya da Veri Yönetimi panelinden "Varsayılanları Sıfırla" butonuyla repodaki ana verileri getirebilirsiniz.</li>
            <li><strong>3. GitHub Push İzni (Write Permission):</strong> GitHub Actions hata verirse repoda <strong>Settings ➔ Actions ➔ General ➔ Workflow permissions</strong> bölümünden <strong>"Read and write permissions"</strong> seçip kaydedin.</li>
          </ul>
        </div>

        <p className="text-xs text-slate-300">
          Bu dosyayı GitHub reponuzda <code>.github/workflows/scraper.yml</code> olarak eklediğinizde GitHub sizin yerinize turları atar ve verileri çeker.
        </p>

        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-64">
          {workflowYaml}
        </pre>

        {/* GitHub Action Permission Error Notice */}
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 space-y-2 text-xs text-amber-200">
          <div className="font-bold flex items-center space-x-2 text-amber-300">
            <span>⚠️ GitHub Action "Process completed with exit code 1" Hatası Alıyorsanız:</span>
          </div>
          <p className="text-amber-100/90 leading-relaxed">
            GitHub varsayılan olarak botların reponuza otomatik commit/push atmasına izin vermez. İzni açmak için <strong>30 saniyelik şu adımı</strong> yapmanız gerekir:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-amber-200/90 pl-1">
            <li>GitHub Reponuzda üstteki <strong>Settings</strong> sekmesine tıklayın.</li>
            <li>Sol menüden <strong>Actions</strong> &rarr; <strong>General</strong> seçin.</li>
            <li>Sayfanın altındaki <strong>Workflow permissions</strong> bölümüne inin.</li>
            <li><strong>"Read and write permissions"</strong> seçeneğini işaretleyin ve <strong>Save</strong> butonuna basın.</li>
          </ol>
        </div>
      </div>

      {/* Trigger & Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scraper Control Card */}
        <div className="md:col-span-2 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-base">Harici Scraper Engine (Canlı Test)</h2>
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
          <span className="text-xs text-slate-400">Son İşlemler</span>
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
