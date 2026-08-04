import React, { useState } from 'react';
import { EcosystemEntity, EntityType, CategoryType, StageType, IssueReport, GitHubConfig } from '../types';
import { EntityAvatar } from './EntityAvatar';
import { Plus, Edit3, Trash2, Download, Upload, Save, X, Search, Check, RefreshCw, ShieldAlert, AlertTriangle, CheckCircle, Clock, Link as LinkIcon, Database, Eye, GitCommit, GitBranch, Key, CheckCircle2, Star } from 'lucide-react';

interface AdminViewProps {
  entities: EcosystemEntity[];
  pendingEntities: EcosystemEntity[];
  issueReports: IssueReport[];
  githubConfig?: GitHubConfig;
  onSaveGithubConfig?: (config: GitHubConfig) => void;
  onPullFromGithub?: (config?: GitHubConfig) => Promise<{ success: boolean; message: string }>;
  onPushToGithub?: (config?: GitHubConfig, commitMsg?: string) => Promise<{ success: boolean; message: string }>;
  onAddEntity: (entity: Omit<EcosystemEntity, 'id' | 'lastUpdated'>) => void;
  onUpdateEntity: (entity: EcosystemEntity) => void;
  onDeleteEntity: (id: string) => void;
  onApprovePending: (pendingId: string) => void;
  onRejectPending: (pendingId: string) => void;
  onResolveIssue: (issueId: string) => void;
  onDismissIssue: (issueId: string) => void;
  onResetDefault: () => void;
  onSyncWithRepo: () => void;
  onSyncWithGithubUrl?: (githubRawUrl: string) => Promise<boolean>;
  onCleanDuplicates?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  entities,
  pendingEntities = [],
  issueReports = [],
  githubConfig,
  onSaveGithubConfig,
  onPullFromGithub,
  onPushToGithub,
  onAddEntity,
  onUpdateEntity,
  onDeleteEntity,
  onApprovePending,
  onRejectPending,
  onResolveIssue,
  onDismissIssue,
  onResetDefault,
  onSyncWithRepo,
  onSyncWithGithubUrl,
  onCleanDuplicates
}) => {
  const [adminTab, setAdminTab] = useState<'active' | 'pending' | 'issues' | 'github_sync'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [editingEntity, setEditingEntity] = useState<EcosystemEntity | null>(null);

  // GitHub API Config Form state
  const [ghOwner, setGhOwner] = useState(githubConfig?.owner || '');
  const [ghRepo, setGhRepo] = useState(githubConfig?.repo || '');
  const [ghBranch, setGhBranch] = useState(githubConfig?.branch || 'main');
  const [ghFilePath, setGhFilePath] = useState(githubConfig?.filePath || 'entities.json');
  const [ghToken, setGhToken] = useState(githubConfig?.token || '');
  const [ghCommitMsg, setGhCommitMsg] = useState('Veritabanı güncellendi (entities.json)');
  const [ghStatus, setGhStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isGhLoading, setIsGhLoading] = useState(false);

  // GitHub RAW JSON URL sync state
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [githubSyncStatus, setGithubSyncStatus] = useState<string | null>(null);
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);

  const pendingCount = pendingEntities.length;
  const activeIssueCount = issueReports.filter(i => i.status === 'pending').length;

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['name', 'titleOrCompany', 'type', 'category', 'city', 'description', 'website', 'stage', 'teamSize'];
    const sample1 = ['"Girişim Örnek A.Ş."', '"Bülent Yılmaz - Kurucu"', '"Startup"', '"FinTech"', '"İstanbul"', '"Örnek açıklama metni"', '"https://example.com"', '"Seed"', '"10-20"'];
    const sample2 = ['"Anadolu VC"', '"Risk Sermayesi"', '"Yatırımcı (VC)"', '"SaaS & Yazılım"', '"Ankara"', '"Erken aşama yazılım fonu"', '"https://anadoluvc.com"', '""', '""'];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), sample1.join(','), sample2.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mamuthub_toplu_veri_sablonu.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process Bulk CSV / JSON text
  const handleProcessBulkImport = () => {
    if (!bulkText.trim()) return;

    try {
      let count = 0;
      const text = bulkText.trim();

      if (text.startsWith('[') || text.startsWith('{')) {
        // Parse JSON
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        list.forEach((item: any) => {
          if (item.name) {
            onAddEntity({
              name: String(item.name),
              titleOrCompany: String(item.titleOrCompany || item.title || 'Ekosistem Üyesi'),
              type: (item.type as EntityType) || 'Startup',
              category: (item.category as CategoryType) || 'SaaS & Yazılım',
              city: String(item.city || 'İstanbul'),
              description: String(item.description || 'Toplu veri aktarımı ile yüklendi.'),
              website: item.website ? String(item.website) : undefined,
              linkedin: item.linkedin ? String(item.linkedin) : undefined,
              avatarUrl: item.avatarUrl || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=300',
              stage: item.stage as StageType,
              teamSize: item.teamSize ? String(item.teamSize) : undefined
            });
            count++;
          }
        });
      } else {
        // Parse CSV
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
          for (let i = 1; i < lines.length; i++) {
            // Simple CSV line parser respecting quotes
            const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
            if (row && row.length >= 2) {
              const cleanRow = row.map(cell => cell.replace(/^["']|["']$/g, '').trim());
              const name = cleanRow[0];
              const titleOrCompany = cleanRow[1] || 'Girişim / Kurum';
              if (name && name !== 'name') {
                onAddEntity({
                  name,
                  titleOrCompany,
                  type: (cleanRow[2] as EntityType) || 'Startup',
                  category: (cleanRow[3] as CategoryType) || 'SaaS & Yazılım',
                  city: cleanRow[4] || 'İstanbul',
                  description: cleanRow[5] || 'CSV Toplu içe aktarma ile yüklendi.',
                  website: cleanRow[6] || undefined,
                  stage: (cleanRow[7] as StageType) || undefined,
                  teamSize: cleanRow[8] || undefined,
                  avatarUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=300'
                });
                count++;
              }
            }
          }
        }
      }

      setBulkStatus(`Başarılı! ${count} adet veri dizine aktarıldı.`);
      setTimeout(() => {
        setBulkStatus(null);
        setBulkText('');
        setIsBulkModalOpen(false);
      }, 1500);
    } catch (e: any) {
      console.error(e);
      setBulkStatus(`Hata: Veri formatı okunamadı. Lütfen JSON veya CSV formatını kontrol edin.`);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    titleOrCompany: '',
    type: 'Girişimci' as EntityType,
    category: 'SaaS & Yazılım' as CategoryType,
    city: 'İstanbul',
    description: '',
    website: '',
    linkedin: '',
    twitter: '',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    stage: 'Seed' as StageType,
    portfolioCount: 0,
    featured: false
  });

  const filteredEntities = entities.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.titleOrCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingEntity(null);
    setFormData({
      name: '',
      titleOrCompany: '',
      type: 'Girişimci',
      category: 'SaaS & Yazılım',
      city: 'İstanbul',
      description: '',
      website: '',
      linkedin: '',
      twitter: '',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      stage: 'Seed',
      portfolioCount: 0,
      featured: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (entity: EcosystemEntity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      titleOrCompany: entity.titleOrCompany,
      type: entity.type,
      category: entity.category,
      city: entity.city,
      description: entity.description,
      website: entity.website || '',
      linkedin: entity.linkedin || '',
      twitter: entity.twitter || '',
      avatarUrl: entity.avatarUrl,
      stage: entity.stage || 'Seed',
      portfolioCount: entity.portfolioCount || 0,
      featured: entity.featured || false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.titleOrCompany) return;

    if (editingEntity) {
      onUpdateEntity({
        ...editingEntity,
        ...formData,
        lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
    } else {
      onAddEntity(formData);
    }
    setIsModalOpen(false);
  };

  // Export CSV for WP All Import
  const exportCSV = () => {
    const headers = ['id', 'name', 'titleOrCompany', 'type', 'category', 'city', 'description', 'website', 'linkedin', 'stage', 'lastUpdated'];
    const rows = entities.map(item => [
      `"${item.id}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.titleOrCompany.replace(/"/g, '""')}"`,
      `"${item.type}"`,
      `"${item.category}"`,
      `"${item.city}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.website || ''}"`,
      `"${item.linkedin || ''}"`,
      `"${item.stage || ''}"`,
      `"${item.lastUpdated}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'girisimci_yatirimci_veritabani.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entities, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'girisimciler_verisi.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Veri Yönetimi & Aktarım Paneli</h1>
          <p className="text-xs text-slate-500">
            Dizine yeni girişimci veya yatırımcı ekleyin, mevcut olanları düzenleyin ya da WordPress için dışa aktarın.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ekle</span>
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm"
            title="Excel/CSV veya JSON dosyalarınızdan topluca yüzlerce girişim aktarın"
          >
            <Upload className="w-4 h-4" />
            <span>Toplu İçe Aktar (CSV/JSON)</span>
          </button>
          <button
            onClick={exportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all"
            title="WP All Import Eklentisine Uyumlu CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV (WP Uyumlu)</span>
          </button>
          <button
            onClick={exportJSON}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs flex items-center space-x-1 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={onSyncWithRepo}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-2 rounded-xl text-xs flex items-center space-x-1 transition-all border border-blue-200"
            title="Manuel eklediğiniz firmaları korur, GitHub/Repo'daki yeni güncellemeleri ekler"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Repo Güncellemelerini Al</span>
          </button>
          {onCleanDuplicates && (
            <button
              onClick={onCleanDuplicates}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1 transition-all border border-amber-300 shadow-sm"
              title="Dizindeki tüm tekrarları siler ve '3D' gibi hatalı kategorileri standart kategorilere eşler"
            >
              <span>🧹 Tekrarları & Kategorileri Temizle</span>
            </button>
          )}
          <button
            onClick={onResetDefault}
            className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
            title="Tüm verileri silip fabrika ayarlarına sıfırla (Onay ister)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setAdminTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            adminTab === 'active'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Yayınlanan Kayıtlar ({entities.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 relative ${
            adminTab === 'pending'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500 group-hover:text-amber-600" />
          <span>🛡️ Onay Bekleyen Kayıtlar</span>
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse ml-1">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('issues')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 relative ${
            adminTab === 'issues'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-indigo-50 border border-indigo-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-indigo-500" />
          <span>✏️ Hata / Güncelleme Bildirimleri</span>
          {activeIssueCount > 0 && (
            <span className="bg-indigo-100 text-indigo-900 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
              {activeIssueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('github_sync')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            adminTab === 'github_sync'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <LinkIcon className="w-4 h-4 text-purple-600" />
          <span>GitHub JSON Deposu Bağlantısı</span>
        </button>
      </div>

      {/* SEARCH INPUT (Shown for Active & Pending) */}
      {(adminTab === 'active' || adminTab === 'pending') && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={adminTab === 'active' ? "Yayınlanan kayıtlar arasında ara..." : "Onay bekleyenler arasında ara..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>
      )}

      {/* TAB 1: ACTIVE ENTITIES */}
      {adminTab === 'active' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Kişi / Kurum</th>
                  <th className="py-3 px-4">Tür</th>
                  <th className="py-3 px-4">Sektör</th>
                  <th className="py-3 px-4">Şehir</th>
                  <th className="py-3 px-4">Son Güncelleme</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntities.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center space-x-3">
                      <EntityAvatar type={item.type} className="w-8 h-8 rounded-lg" iconSize="w-4 h-4" />
                      <div>
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{item.titleOrCompany}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{item.category}</td>
                    <td className="py-3 px-4">{item.city}</td>
                    <td className="py-3 px-4 text-slate-400">{item.lastUpdated}</td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => onUpdateEntity({ ...item, featured: !item.featured })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.featured
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                        }`}
                        title={item.featured ? "Öne Çıkarılan Kayıt (Kaldır)" : "Öne Çıkan Yap (Bant Ekle)"}
                      >
                        <Star className={`w-4 h-4 ${item.featured ? 'fill-amber-400' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteEntity(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING MODERATION QUEUE */}
      {adminTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block">Onay Bekleyen Topluluk / Scraper Kayıtları</span>
                <span className="text-amber-700">Topluluk tarafından gönderilen veya AI tarayıcının bulduğu içerikler sizin onayınızdan sonra dizine aktarılır.</span>
              </div>
            </div>
            <span className="font-extrabold text-amber-800 text-sm">{pendingEntities.length} Bekleyen Kayıt</span>
          </div>

          {pendingEntities.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Onay Bekleyen Kayıt Yok</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tüm gönderimler incelendi. Yeni bir topluluk eklemesi veya AI link taraması yapıldığında burada görünecektir.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Kişi / Şirket</th>
                      <th className="py-3 px-4">Tür & Sektör</th>
                      <th className="py-3 px-4">Açıklama</th>
                      <th className="py-3 px-4">Gönderen / Tarih</th>
                      <th className="py-3 px-4 text-right">Moderasyon İşlemi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingEntities.map(item => (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center space-x-2.5">
                            <EntityAvatar type={item.type} className="w-8 h-8 rounded-lg" iconSize="w-4 h-4" />
                            <div>
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[11px] text-slate-500">{item.titleOrCompany}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 block w-max mb-1">
                            {item.type}
                          </span>
                          <span className="text-slate-600">{item.category} • {item.city}</span>
                        </td>
                        <td className="py-3 px-4 max-w-xs text-slate-600 line-clamp-2">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          <div className="font-semibold text-slate-700">{item.submitterEmail || 'Web Gönderimi'}</div>
                          <div className="text-[10px]">{item.submittedAt || item.lastUpdated}</div>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                            title="Önce İncele / Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onApprovePending(item.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                          >
                            ✓ Onayla & Yayınla
                          </button>
                          <button
                            onClick={() => onRejectPending(item.id)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs transition-colors"
                          >
                            ✕ Reddet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ISSUE REPORTS */}
      {adminTab === 'issues' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <span className="font-bold block">Ziyaretçilerden Gelen Bilgi Güncelleme / Hata Bildirimleri</span>
                <span className="text-indigo-700">Kullanıcıların profil sayfalarındaki "Bilgi Güncelle" butonundan bildirdiği düzeltme talepleri.</span>
              </div>
            </div>
            <span className="font-extrabold text-indigo-800 text-sm">{issueReports.length} Bildirim</span>
          </div>

          {issueReports.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Bildirim Bulunmuyor</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Henüz bir hata veya güncelleme bildirimi yapılmadı.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-3 px-4">İlgili Profil</th>
                      <th className="py-3 px-4">Bildirim Türü</th>
                      <th className="py-3 px-4">Açıklama / Mesaj</th>
                      <th className="py-3 px-4">Gönderen / Tarih</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issueReports.map(issue => (
                      <tr key={issue.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{issue.entityName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {issue.reportType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-sm leading-relaxed">{issue.description}</td>
                        <td className="py-3 px-4 text-slate-500">
                          <div>{issue.reporterEmail || 'Ziyaretçi'}</div>
                          <div className="text-[10px]">{issue.createdAt}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            issue.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : issue.status === 'dismissed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {issue.status === 'resolved' ? 'Çözüldü' : issue.status === 'dismissed' ? 'Kapatıldı' : 'Bekliyor'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {issue.status === 'pending' && (
                            <>
                              <button
                                onClick={() => onResolveIssue(issue.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px]"
                              >
                                Çözüldü İşaretle
                              </button>
                              <button
                                onClick={() => onDismissIssue(issue.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-[11px]"
                              >
                                Yoksay
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GITHUB CENTRAL JSON DATA STORE SYNC */}
      {adminTab === 'github_sync' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-purple-500/30 shadow-xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-400/30">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-purple-200">GitHub Tabanlı Veritabanı (Otomatik Çoklu Dosya Senkronizasyonu)</h2>
                <p className="text-xs text-slate-300">
                  Veritabanınızı GitHub'da saklayın. 1-Tıkla GitHub'a commit attığınızda <code>entities.json</code>, <code>ecosystem.json</code> ve <code>src/data/entities.json</code> dosyalarının tümü <strong>otomatik olarak eşzamanlı güncellenir</strong>. Böylece Vercel veya WordPress hangi dosyayı okuyorsa canlı veriniz anında yansır!
                </p>
              </div>
            </div>

            {githubConfig?.lastSyncedAt && (
              <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-purple-200">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Son Senkronizasyon: <strong>{githubConfig.lastSyncedAt}</strong></span>
                </div>
                {githubConfig.lastCommitSha && (
                  <div className="flex items-center space-x-1.5">
                    <GitCommit className="w-4 h-4 text-emerald-400" />
                    <span>Son Commit SHA: <code className="bg-purple-950 px-2 py-0.5 rounded text-emerald-400">{githubConfig.lastCommitSha.substring(0, 7)}</code></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Alert Banner */}
          {ghStatus && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm ${
              ghStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : ghStatus.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
            }`}>
              <div className="flex items-center space-x-2">
                {ghStatus.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{ghStatus.text}</span>
              </div>
              <button onClick={() => setGhStatus(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* GitHub Config & Action Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-purple-600" />
                  <span>GitHub Depo & Erişim Ayarları</span>
                </h3>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  {ghToken ? '🔒 Token Tanımlı' : '🌐 Sadece Okuma Modu'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GitHub Kullanıcı veya Org Adı *</label>
                  <input
                    type="text"
                    placeholder="Örn: ufukkarakullukcu"
                    value={ghOwner}
                    onChange={e => setGhOwner(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GitHub Depo (Repository) Adı *</label>
                  <input
                    type="text"
                    placeholder="Örn: mamuthub-data"
                    value={ghRepo}
                    onChange={e => setGhRepo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch (Dal)</label>
                  <input
                    type="text"
                    placeholder="main"
                    value={ghBranch}
                    onChange={e => setGhBranch(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">JSON Dosya Yolu (Path)</label>
                  <input
                    type="text"
                    placeholder="entities.json"
                    value={ghFilePath}
                    onChange={e => setGhFilePath(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>GitHub Personal Access Token (PAT)</span>
                  <span className="text-[10px] text-purple-600 font-normal">Gereklilik: Repo Write / Commit İzni</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={ghToken}
                    onChange={e => setGhToken(e.target.value)}
                    className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-xs"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  GitHub'a doğrudan commit (yazma) atmak için <code>github.com/settings/tokens</code> adresinden PAT alıp yapıştırabilirsiniz.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    const updatedConfig: GitHubConfig = {
                      owner: ghOwner.trim(),
                      repo: ghRepo.trim(),
                      branch: ghBranch.trim() || 'main',
                      filePath: ghFilePath.trim() || 'entities.json',
                      token: ghToken.trim()
                    };
                    if (onSaveGithubConfig) onSaveGithubConfig(updatedConfig);
                    setGhStatus({ type: 'success', text: 'GitHub ayarlarınız yerel hafızaya kaydedildi.' });
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Ayarları Kaydet</span>
                </button>

                <button
                  disabled={isGhLoading || !ghOwner || !ghRepo}
                  onClick={async () => {
                    if (!onPullFromGithub) return;
                    setIsGhLoading(true);
                    setGhStatus({ type: 'info', text: 'GitHub API üzerinden veriler çekiliyor...' });
                    const activeConfig: GitHubConfig = {
                      owner: ghOwner.trim(),
                      repo: ghRepo.trim(),
                      branch: ghBranch.trim() || 'main',
                      filePath: ghFilePath.trim() || 'entities.json',
                      token: ghToken.trim()
                    };
                    const res = await onPullFromGithub(activeConfig);
                    setIsGhLoading(false);
                    setGhStatus({
                      type: res.success ? 'success' : 'error',
                      text: res.message
                    });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center space-x-1.5"
                >
                  <Download className={`w-3.5 h-3.5 ${isGhLoading ? 'animate-spin' : ''}`} />
                  <span>📥 GitHub'dan Veri Çek</span>
                </button>
              </div>
            </div>

            {/* Commit / Save Column */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-6 rounded-2xl border border-purple-200/60 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-600 text-white rounded-lg">
                    <GitCommit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">GitHub Depoma Commit Et</h3>
                    <p className="text-[11px] text-slate-600">Veritabanını doğrudan GitHub Reponuzda Güncelleyin</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">Yayınlanacak Canlı Kayıt Sayısı:</div>
                  <div className="text-xl font-black text-purple-700">{entities.length} Firma / Girişimci</div>
                  <div className="text-[10px] text-slate-500">Eşzamanlı olarak <code>entities.json</code>, <code>ecosystem.json</code> ve <code>src/data/entities.json</code> dosyalarına işlenir.</div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commit Mesajı:</label>
                  <input
                    type="text"
                    value={ghCommitMsg}
                    onChange={e => setGhCommitMsg(e.target.value)}
                    placeholder="Örn: 5 yeni girişim eklendi"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-purple-200/60">
                <button
                  disabled={isGhLoading || !ghOwner || !ghRepo || !ghToken}
                  onClick={async () => {
                    if (!onPushToGithub) return;
                    setIsGhLoading(true);
                    setGhStatus({ type: 'info', text: "GitHub API'ye yeni commit hazırlanıp gönderiliyor..." });
                    const activeConfig: GitHubConfig = {
                      owner: ghOwner.trim(),
                      repo: ghRepo.trim(),
                      branch: ghBranch.trim() || 'main',
                      filePath: ghFilePath.trim() || 'entities.json',
                      token: ghToken.trim()
                    };
                    const res = await onPushToGithub(activeConfig, ghCommitMsg);
                    setIsGhLoading(false);
                    setGhStatus({
                      type: res.success ? 'success' : 'error',
                      text: res.message
                    });
                  }}
                  className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-extrabold px-4 py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <GitCommit className={`w-4 h-4 ${isGhLoading ? 'animate-spin' : ''}`} />
                  <span>🚀 GitHub'a Commit Et ve Yayınla</span>
                </button>

                {!ghToken && (
                  <p className="text-[10px] text-amber-800 bg-amber-100/70 p-2 rounded-lg text-center font-medium">
                    ⚠️ Doğrudan GitHub'a commit atmak için yukarıya Personal Access Token (PAT) girmelisiniz.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Raw Sync Fallback Option */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Alternatif: Hızlı GitHub RAW URL İle Çek</h3>

            {githubSyncStatus && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                githubSyncStatus.includes('Başarılı') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {githubSyncStatus}
              </div>
            )}

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700">GitHub Raw JSON URL Adresi:</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="url"
                  placeholder="https://raw.githubusercontent.com/kullanici/repo/main/entities.json"
                  value={githubUrlInput}
                  onChange={e => setGithubUrlInput(e.target.value)}
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button
                  disabled={isSyncingGithub || !githubUrlInput.trim()}
                  onClick={async () => {
                    if (!onSyncWithGithubUrl || !githubUrlInput.trim()) return;
                    setIsSyncingGithub(true);
                    setGithubSyncStatus(null);
                    const success = await onSyncWithGithubUrl(githubUrlInput.trim());
                    setIsSyncingGithub(false);
                    if (success) {
                      setGithubSyncStatus('Başarılı! GitHub repository verileri aktarıldı ve yerel hafıza güncellendi.');
                    } else {
                      setGithubSyncStatus('Hata: GitHub adresi okunamadı. Adresin RAW formatında olduğundan ve JSON içerdiğinden emin olun.');
                    }
                  }}
                  className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingGithub ? 'animate-spin' : ''}`} />
                  <span>GitHub RAW'dan Çek</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <EntityAvatar type={formData.type} className="w-10 h-10 rounded-xl" iconSize="w-5 h-5" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingEntity ? 'Kayıt Düzenle' : 'Yeni Girişimci / Yatırımcı Ekle'}
                </h2>
                <p className="text-[11px] text-slate-500">Kategori ikon otomatik olarak belirlenir.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">İsim veya Şirket Adı *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Örn: Hande Çilingir veya Revo Capital"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unvan veya Açıklayıcı Başlık *</label>
                  <input
                    type="text"
                    required
                    value={formData.titleOrCompany}
                    onChange={e => setFormData({ ...formData, titleOrCompany: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Örn: Insider - Kurucu Ortak & CEO"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tür</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as EntityType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="Girişimci">Girişimci</option>
                    <option value="Yatırımcı (VC)">Yatırımcı (VC)</option>
                    <option value="Melek Yatırımcı">Melek Yatırımcı</option>
                    <option value="Startup">Startup</option>
                    <option value="Hızlandırıcı & Kuluçka">Hızlandırıcı & Kuluçka</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sektör / Kategori</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as CategoryType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="SaaS & Yazılım">SaaS & Yazılım</option>
                    <option value="AI & Veri">AI & Veri</option>
                    <option value="FinTech">FinTech</option>
                    <option value="E-Ticaret & Lojistik">E-Ticaret & Lojistik</option>
                    <option value="Oyun & Eğlence">Oyun & Eğlence</option>
                    <option value="Sağlık & Biyo">Sağlık & Biyo</option>
                    <option value="Derin Teknoloji">Derin Teknoloji</option>
                    <option value="Eğitim (EdTech)">Eğitim (EdTech)</option>
                    <option value="İklim & Yeşil Teknoloji">İklim & Yeşil Teknoloji</option>
                    <option value="Siber Güvenlik">Siber Güvenlik</option>
                    <option value="Gayrimenkul (PropTech)">Gayrimenkul (PropTech)</option>
                    <option value="İnsan Kaynakları (HRTech)">İnsan Kaynakları (HRTech)</option>
                    <option value="Pazarlama (MarTech)">Pazarlama (MarTech)</option>
                    <option value="Tarım & Gıda (AgriTech)">Tarım & Gıda (AgriTech)</option>
                    <option value="Sigorta (InsurTech)">Sigorta (InsurTech)</option>
                    <option value="Savunma & Uzay">Savunma & Uzay</option>
                    <option value="Donanım & IoT">Donanım & IoT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Şehir</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="İstanbul, Ankara vb."
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Açıklama / Biyografi</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Girişimci veya yatırımcı hakkında kısa bilgi..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Web Sitesi URL</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">LinkedIn Profil URL</label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Star className={`w-5 h-5 ${formData.featured ? 'text-amber-500 fill-amber-400' : 'text-slate-400'}`} />
                  <div>
                    <label htmlFor="featured-checkbox" className="font-bold text-slate-800 text-xs block cursor-pointer">
                      Öne Çıkarılan Kart Yap ("Öne Çıkan" Banti Ekle)
                    </label>
                    <p className="text-[10px] text-slate-500">Bu kartın üst köşesinde renkli rozet gösterilir ve listede en üstte yer alır.</p>
                  </div>
                </div>
                <input
                  id="featured-checkbox"
                  type="checkbox"
                  checked={formData.featured}
                  onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-auto max-h-[90vh] overflow-y-auto space-y-5">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
                Toplu Veri İçe Aktarma (Bulk Import Engine)
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">Toplu CSV / JSON Veri Yükleme</h2>
              <p className="text-xs text-slate-500">
                Excel veya veri tabanınızdan yüzlerce girişim/yatırımcı verisini tek seferde aktarabilirsiniz.
              </p>
            </div>

            {bulkStatus && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                bulkStatus.includes('Başarılı') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {bulkStatus}
              </div>
            )}

            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900">Hazır Şablon İle Hızlı Başlayın:</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Örnek CSV Şablonu İndir</span>
                </button>
              </div>
              <p className="text-purple-700 leading-relaxed text-[11px]">
                Sütun başlıkları: <code className="bg-white px-1 py-0.5 rounded text-purple-900 font-mono">name, titleOrCompany, type, category, city, description, website, stage, teamSize</code>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                CSV veya JSON Formatında Metni Yapıştırın veya Dosya İçeriğini Ekleyin:
              </label>
              <textarea
                rows={8}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={`"Getir", "Market Teslimatı", "Startup", "E-Ticaret & Lojistik", "İstanbul", "Hızlı teslimat", "https://getir.com", "Growth / Scale-up", "5000+"
"Picus Security", "Siber Güvenlik", "Startup", "Siber Güvenlik", "Ankara", "Saldırı simülasyonu", "https://picussecurity.com", "Seri B+", "150+"`}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">CSV veya JSON ayrıştırılarak doğrudan eklenir.</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleProcessBulkImport}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Verileri Ayrıştır & Aktar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
