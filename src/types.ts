export type CategoryType =
  | 'AI & Veri'
  | 'SaaS & Yazılım'
  | 'FinTech'
  | 'E-Ticaret & Lojistik'
  | 'Oyun & Eğlence'
  | 'Sağlık & Biyo'
  | 'Derin Teknoloji'
  | 'Eğitim (EdTech)'
  | 'İklim & Yeşil Teknoloji'
  | 'Siber Güvenlik'
  | 'Gayrimenkul (PropTech)'
  | 'İnsan Kaynakları (HRTech)'
  | 'Pazarlama (MarTech)'
  | 'Tarım & Gıda (AgriTech)'
  | 'Sigorta (InsurTech)'
  | 'Savunma & Uzay'
  | 'Donanım & IoT';

export type EntityType = 'Girişimci' | 'Yatırımcı (VC)' | 'Melek Yatırımcı' | 'Startup' | 'Hızlandırıcı & Kuluçka';

export type StageType = 'Pre-seed' | 'Seed' | 'Seri A' | 'Seri B+' | 'Growth / Scale-up';

export interface EcosystemEntity {
  id: string;
  name: string;
  titleOrCompany: string;
  type: EntityType;
  category: CategoryType;
  city: string;
  description: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  avatarUrl: string;
  stage?: StageType;
  investmentFocus?: string[];
  portfolioCount?: number;
  teamSize?: string;
  foundedYear?: number;
  lastUpdated: string;
  sourceUrl?: string;
  featured?: boolean;
}

export interface ScraperLog {
  id: string;
  timestamp: string;
  source: string;
  status: 'Başarılı' | 'Kısmi' | 'Hata';
  itemsFetched: number;
  durationMs: number;
  memoryUsageMb: number;
}

export type ActiveTab = 'directory' | 'admin' | 'scraper';
