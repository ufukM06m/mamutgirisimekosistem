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
  avatarUrl?: string;
  stage?: StageType;
  investmentFocus?: string[];
  portfolioCount?: number;
  teamSize?: string;
  foundedYear?: number;
  lastUpdated: string;
  sourceUrl?: string;
  featured?: boolean;
  status?: 'active' | 'pending' | 'rejected';
  submittedAt?: string;
  submitterEmail?: string;
  notes?: string;
}

export interface IssueReport {
  id: string;
  entityId: string;
  entityName: string;
  reportType: 'Hatalı Bilgi' | 'Güncelleme İsteği' | 'Kapanmış/Aktif Değil' | 'Diğer';
  description: string;
  reporterEmail?: string;
  createdAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
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

export type ActiveTab = 'directory' | 'map' | 'news' | 'admin' | 'scraper';

export interface RssFeedSource {
  id: string;
  name: string;
  url: string;
  category: string;
  active: boolean;
  lastSynced?: string;
}

export interface NewsArticleItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  creator?: string;
  contentSnippet: string;
  sourceName: string;
  sourceUrl: string;
  detectedStartups?: {
    name: string;
    category?: CategoryType;
    investmentAmount?: string;
    stage?: StageType;
    city?: string;
    summary?: string;
  }[];
  aiProcessed?: boolean;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  filePath: string;
  branch: string;
  token?: string;
  autoSyncOnApprove?: boolean;
  lastSyncedAt?: string;
  lastCommitSha?: string;
}
