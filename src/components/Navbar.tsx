import React from 'react';
import { ActiveTab } from '../types';
import { LayoutGrid, Shield, Cpu, Eye, PlusCircle, Newspaper, MapPin } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  entityCount: number;
  pendingCount?: number;
  issueCount?: number;
  isEmbedMode: boolean;
  onToggleEmbedMode: () => void;
  onOpenPublicSubmissionModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  entityCount,
  pendingCount = 0,
  issueCount = 0,
  isEmbedMode,
  onToggleEmbedMode,
  onOpenPublicSubmissionModal
}) => {
  const totalNotifications = pendingCount + issueCount;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-2 sm:py-0 sm:h-16 gap-2">
          {/* Logo & Title */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('directory')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 font-black text-lg">
                M
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                    mamuthub.com
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ekosistem
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden xs:block">Türkiye Girişimci & Yatırımcı Veritabanı</p>
              </div>
            </div>

            {/* Mobile Submit Button Quick Link */}
            <button
              onClick={onOpenPublicSubmissionModal}
              className="sm:hidden bg-emerald-500 text-slate-950 font-extrabold px-2.5 py-1.5 rounded-lg text-xs flex items-center space-x-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Ekle</span>
            </button>
          </div>

          {/* Navigation Tabs (Horizontal Scrollable on Mobile) */}
          <nav className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                activeTab === 'directory'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dizin ({entityCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'map'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Türkiye Şehir Bazlı Girişim & Yatırım Görselleştirme Haritası"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Harita</span>
            </button>

            <button
              onClick={() => setActiveTab('news')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'news'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Canlı Haber Akışı ve RSS Girişim Taraması"
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>Haberler</span>
            </button>

            <button
              onClick={() => setActiveTab('scraper')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'scraper'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Yapay Zeka Destekli Canlı Web Scraper & Sync"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Scraper</span>
            </button>

            {/* Prominent Admin / Management Tab */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold shrink-0 transition-all border ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                  : 'bg-indigo-950/80 text-indigo-200 border-indigo-800/80 hover:bg-indigo-900 hover:text-white'
              }`}
              title="Yönetim Paneli, Veri Düzenleme, GitHub Senkronizasyonu ve Moderasyon"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-300" />
              <span>Admin Paneli</span>
              {totalNotifications > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {totalNotifications}
                </span>
              )}
            </button>

            {/* Desktop + Profile Add Button */}
            <button
              onClick={onOpenPublicSubmissionModal}
              className="hidden sm:flex bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg text-xs items-center space-x-1 shrink-0 transition-all shadow-md shadow-emerald-500/10"
              title="Topluluğa Katıl: Girişimci veya Yatırımcı profilinizi ekleyin"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Girişim Ekle</span>
            </button>

            <button
              onClick={onToggleEmbedMode}
              className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 border shrink-0 transition-all ${
                isEmbedMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="WordPress iFrame Embed Test Modu"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isEmbedMode ? 'Tam Mod' : 'Embed'}</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
