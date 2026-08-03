import React, { useState } from 'react';
import { EcosystemEntity, EntityType, CategoryType, StageType } from '../types';
import { X, Send, Sparkles, Building2, User, Globe, Linkedin, CheckCircle2 } from 'lucide-react';

interface PublicSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: Omit<EcosystemEntity, 'id' | 'lastUpdated'>) => void;
}

export const PublicSubmissionModal: React.FC<PublicSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    titleOrCompany: '',
    type: 'Startup' as EntityType,
    category: 'SaaS & Yazılım' as CategoryType,
    city: 'İstanbul',
    description: '',
    website: '',
    linkedin: '',
    stage: 'Seed' as StageType,
    teamSize: '1-10',
    investmentFocus: '',
    portfolioCount: '',
    submitterEmail: '',
    isCommunityMember: true
  });

  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEntity: Omit<EcosystemEntity, 'id' | 'lastUpdated'> = {
      name: formData.name.trim(),
      titleOrCompany: formData.titleOrCompany.trim(),
      type: formData.type,
      category: formData.category,
      city: formData.city.trim() || 'İstanbul',
      description: formData.description.trim(),
      website: formData.website.trim() || undefined,
      linkedin: formData.linkedin.trim() || undefined,
      avatarUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=300',
      stage: formData.type === 'Startup' || formData.type === 'Girişimci' ? formData.stage : undefined,
      teamSize: formData.teamSize,
      investmentFocus: formData.investmentFocus ? formData.investmentFocus.split(',').map(s => s.trim()) : undefined,
      portfolioCount: formData.portfolioCount ? parseInt(formData.portfolioCount, 10) : undefined,
      featured: false
    };

    onSubmit(newEntity);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1800);
  };

  const categories: CategoryType[] = [
    'AI & Veri',
    'SaaS & Yazılım',
    'FinTech',
    'E-Ticaret & Lojistik',
    'Oyun & Eğlence',
    'Sağlık & Biyo',
    'Derin Teknoloji',
    'Eğitim (EdTech)',
    'İklim & Yeşil Teknoloji',
    'Siber Güvenlik',
    'Gayrimenkul (PropTech)',
    'İnsan Kaynakları (HRTech)',
    'Pazarlama (MarTech)',
    'Tarım & Gıda (AgriTech)',
    'Sigorta (InsurTech)',
    'Savunma & Uzay',
    'Donanım & IoT'
  ];

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Harika! Kaydınız Alındı 🎉</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Girişiminiz / Profiliniz başarıyla Mamuthub ekosistem dizinine eklendi ve hafızaya kaydedildi.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Topluluk Katkısı (Public Submission)</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Girişim / Yatırımcı Profilini Ekle</h2>
              <p className="text-xs text-slate-500">
                Türkiye girişimcilik ekosisteminde yer alan profilinizi veya girişiminizi ekleyin, dizinde hemen görünür olun.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Type Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Kayıt Türü *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['Startup', 'Girişimci', 'Yatırımcı (VC)', 'Melek Yatırımcı', 'Hızlandırıcı & Kuluçka'] as EntityType[]).map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                      className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                        formData.type === t
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {formData.type === 'Girişimci' || formData.type === 'Melek Yatırımcı' ? 'Adınız Soyadınız *' : 'Şirket / Kurum Adı *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.type === 'Girişimci' ? 'ör. Hande Çilingir' : 'ör. Insider, Getir'}
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unvan veya Başlık *</label>
                  <input
                    type="text"
                    required
                    placeholder="ör. Kurucu & CEO veya Yapay Zeka Platformu"
                    value={formData.titleOrCompany}
                    onChange={e => setFormData(prev => ({ ...prev, titleOrCompany: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Category & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Sektör / Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as CategoryType }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Şehir *</label>
                  <input
                    type="text"
                    required
                    placeholder="ör. İstanbul, Ankara, İzmir, Eskişehir"
                    value={formData.city}
                    onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Açıklama (Kısa Tanıtım) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Girişimin sunduğu çözüm, hedefleri veya odağı hakkında kısa ve net bilgi yazın..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Web Sitesi URL</label>
                  <input
                    type="url"
                    placeholder="https://girisim.com"
                    value={formData.website}
                    onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">LinkedIn Profili</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/veya-company"
                    value={formData.linkedin}
                    onChange={e => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Conditional Stage / Team / Focus */}
              {(formData.type === 'Startup' || formData.type === 'Girişimci') ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Yatırım Aşaması</label>
                    <select
                      value={formData.stage}
                      onChange={e => setFormData(prev => ({ ...prev, stage: e.target.value as StageType }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Pre-seed">Pre-seed</option>
                      <option value="Seed">Seed</option>
                      <option value="Seri A">Seri A</option>
                      <option value="Seri B+">Seri B+</option>
                      <option value="Growth / Scale-up">Growth / Scale-up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Ekip Büyüklüğü</label>
                    <input
                      type="text"
                      placeholder="ör. 1-10, 50+"
                      value={formData.teamSize}
                      onChange={e => setFormData(prev => ({ ...prev, teamSize: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Yatırım Odakları (Virgülle ayırın)</label>
                    <input
                      type="text"
                      placeholder="SaaS, AI, FinTech"
                      value={formData.investmentFocus}
                      onChange={e => setFormData(prev => ({ ...prev, investmentFocus: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Portföy Sayısı</label>
                    <input
                      type="number"
                      placeholder="ör. 25"
                      value={formData.portfolioCount}
                      onChange={e => setFormData(prev => ({ ...prev, portfolioCount: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Anında onaylanır ve dizinde yayınlanır.</span>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Dizine Gönder & Yayınla</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
