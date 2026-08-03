import React, { useState } from 'react';
import { EcosystemEntity, EntityType, CategoryType, StageType } from '../types';
import { EntityAvatar } from './EntityAvatar';
import { Plus, Edit3, Trash2, Download, Upload, Save, X, Search, Check, RefreshCw } from 'lucide-react';

interface AdminViewProps {
  entities: EcosystemEntity[];
  onAddEntity: (entity: Omit<EcosystemEntity, 'id' | 'lastUpdated'>) => void;
  onUpdateEntity: (entity: EcosystemEntity) => void;
  onDeleteEntity: (id: string) => void;
  onResetDefault: () => void;
  onSyncWithRepo: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  entities,
  onAddEntity,
  onUpdateEntity,
  onDeleteEntity,
  onResetDefault,
  onSyncWithRepo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [editingEntity, setEditingEntity] = useState<EcosystemEntity | null>(null);

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
          <button
            onClick={onResetDefault}
            className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
            title="Tüm verileri silip fabrika ayarlarına sıfırla (Onay ister)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Yönetim listesinde ara..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
        />
      </div>

      {/* Table */}
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
