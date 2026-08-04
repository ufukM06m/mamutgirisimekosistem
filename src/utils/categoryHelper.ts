import { CategoryType, EcosystemEntity } from '../types';

export const VALID_CATEGORIES: CategoryType[] = [
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

export function normalizeCategory(rawCategory: string | undefined | null): CategoryType {
  if (!rawCategory || typeof rawCategory !== 'string') return 'SaaS & Yazılım';

  const clean = rawCategory.trim();
  if (VALID_CATEGORIES.includes(clean as CategoryType)) {
    return clean as CategoryType;
  }

  const lower = clean.toLowerCase();

  if (lower.includes('3d') || lower.includes('donanim') || lower.includes('hardware') || lower.includes('iot')) {
    return 'Donanım & IoT';
  }
  if (lower.includes('ai') || lower.includes('yapay') || lower.includes('veri') || lower.includes('data') || lower.includes('makine')) {
    return 'AI & Veri';
  }
  if (lower.includes('saas') || lower.includes('yazilim') || lower.includes('software') || lower.includes('bulut') || lower.includes('cloud')) {
    return 'SaaS & Yazılım';
  }
  if (lower.includes('fin') || lower.includes('odeme') || lower.includes('bank') || lower.includes('kripto') || lower.includes('crypto')) {
    return 'FinTech';
  }
  if (lower.includes('ticaret') || lower.includes('e-commerce') || lower.includes('pazar') || lower.includes('lojistik') || lower.includes('kargo')) {
    return 'E-Ticaret & Lojistik';
  }
  if (lower.includes('oyun') || lower.includes('game') || lower.includes('eglence') || lower.includes('medya')) {
    return 'Oyun & Eğlence';
  }
  if (lower.includes('saglik') || lower.includes('biyo') || lower.includes('health') || lower.includes('med') || lower.includes('biyotek')) {
    return 'Sağlık & Biyo';
  }
  if (lower.includes('derin') || lower.includes('deep') || lower.includes('nano') || lower.includes('robot')) {
    return 'Derin Teknoloji';
  }
  if (lower.includes('egitim') || lower.includes('edtech') || lower.includes('okul') || lower.includes('kurs')) {
    return 'Eğitim (EdTech)';
  }
  if (lower.includes('iklim') || lower.includes('yesil') || lower.includes('enerji') || lower.includes('green') || lower.includes('cevre') || lower.includes('sürdür')) {
    return 'İklim & Yeşil Teknoloji';
  }
  if (lower.includes('siber') || lower.includes('guvenlik') || lower.includes('cyber') || lower.includes('security')) {
    return 'Siber Güvenlik';
  }
  if (lower.includes('gayrimenkul') || lower.includes('emlak') || lower.includes('proptech') || lower.includes('inşaat')) {
    return 'Gayrimenkul (PropTech)';
  }
  if (lower.includes('ik') || lower.includes('hr') || lower.includes('insan') || lower.includes('kariyer')) {
    return 'İnsan Kaynakları (HRTech)';
  }
  if (lower.includes('pazarlama') || lower.includes('martech') || lower.includes('marketing') || lower.includes('reklam')) {
    return 'Pazarlama (MarTech)';
  }
  if (lower.includes('tarim') || lower.includes('gida') || lower.includes('agri') || lower.includes('food') || lower.includes('besin')) {
    return 'Tarım & Gıda (AgriTech)';
  }
  if (lower.includes('sigorta') || lower.includes('insurtech') || lower.includes('insurance')) {
    return 'Sigorta (InsurTech)';
  }
  if (lower.includes('savunma') || lower.includes('uzay') || lower.includes('defense') || lower.includes('space') || lower.includes('havacilik')) {
    return 'Savunma & Uzay';
  }

  return 'SaaS & Yazılım';
}

export function deduplicateAndNormalizeEntities(entities: EcosystemEntity[]): EcosystemEntity[] {
  if (!Array.isArray(entities)) return [];

  const seenNames = new Map<string, EcosystemEntity>();

  entities.forEach((entity, index) => {
    if (!entity || typeof entity !== 'object') return;

    const rawName = (entity.name || '').trim();
    if (!rawName) return;

    const normalizedNameKey = rawName.toLocaleLowerCase('tr-TR');

    // Normalize category to standard categories
    const cleanCategory = normalizeCategory(entity.category);

    // Ensure unique ID
    const cleanId = entity.id && entity.id.trim()
      ? entity.id.trim()
      : `ent-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;

    const normalizedEntity: EcosystemEntity = {
      ...entity,
      id: cleanId,
      name: rawName,
      category: cleanCategory,
      titleOrCompany: (entity.titleOrCompany || '').trim() || cleanCategory,
      type: entity.type || 'Startup',
      city: (entity.city || '').trim() || 'İstanbul',
      description: (entity.description || '').trim() || `${rawName} girişimi.`,
      status: entity.status || 'active'
    };

    if (seenNames.has(normalizedNameKey)) {
      const existing = seenNames.get(normalizedNameKey)!;

      // Merge and keep the most complete entry
      const merged: EcosystemEntity = {
        ...existing,
        ...normalizedEntity,
        id: existing.id,
        website: normalizedEntity.website || existing.website,
        linkedin: normalizedEntity.linkedin || existing.linkedin,
        twitter: normalizedEntity.twitter || existing.twitter,
        description: (normalizedEntity.description.length > existing.description.length)
          ? normalizedEntity.description
          : existing.description,
        status: existing.status === 'active' ? 'active' : normalizedEntity.status
      };
      seenNames.set(normalizedNameKey, merged);
    } else {
      seenNames.set(normalizedNameKey, normalizedEntity);
    }
  });

  return Array.from(seenNames.values());
}
