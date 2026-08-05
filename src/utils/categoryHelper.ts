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

export function normalizeCategory(rawCategory: string | undefined | null, name: string = '', desc: string = ''): CategoryType {
  const clean = (rawCategory || '').trim();
  if (VALID_CATEGORIES.includes(clean as CategoryType)) {
    return clean as CategoryType;
  }

  const searchText = `${clean} ${name} ${desc}`.toLowerCase();

  if (searchText.includes('ai') || searchText.includes('yapay') || searchText.includes('veri') || searchText.includes('data') || searchText.includes('makine') || searchText.includes('nlp') || searchText.includes('otonom')) {
    return 'AI & Veri';
  }
  if (searchText.includes('saglik') || searchText.includes('sağlık') || searchText.includes('biyo') || searchText.includes('health') || searchText.includes('med') || searchText.includes('biyotek') || searchText.includes('tıp')) {
    return 'Sağlık & Biyo';
  }
  if (searchText.includes('fin') || searchText.includes('odeme') || searchText.includes('ödeme') || searchText.includes('bank') || searchText.includes('kripto') || searchText.includes('crypto') || searchText.includes('pos')) {
    return 'FinTech';
  }
  if (searchText.includes('oyun') || searchText.includes('game') || searchText.includes('eglence') || searchText.includes('eğlence') || searchText.includes('medya') || searchText.includes('streaming')) {
    return 'Oyun & Eğlence';
  }
  if (searchText.includes('ticaret') || searchText.includes('e-commerce') || searchText.includes('pazar') || searchText.includes('lojistik') || searchText.includes('kargo') || searchText.includes('tedarik')) {
    return 'E-Ticaret & Lojistik';
  }
  if (searchText.includes('iklim') || searchText.includes('yesil') || searchText.includes('yeşil') || searchText.includes('enerji') || searchText.includes('green') || searchText.includes('cevre') || searchText.includes('çevre') || searchText.includes('sürdür') || searchText.includes('karbon')) {
    return 'İklim & Yeşil Teknoloji';
  }
  if (searchText.includes('siber') || searchText.includes('guvenlik') || searchText.includes('güvenlik') || searchText.includes('cyber') || searchText.includes('security') || searchText.includes('zafiyet')) {
    return 'Siber Güvenlik';
  }
  if (searchText.includes('egitim') || searchText.includes('eğitim') || searchText.includes('edtech') || searchText.includes('okul') || searchText.includes('kurs') || searchText.includes('öğrenci')) {
    return 'Eğitim (EdTech)';
  }
  if (searchText.includes('3d') || searchText.includes('donanim') || searchText.includes('donanım') || searchText.includes('hardware') || searchText.includes('iot') || searchText.includes('sensör')) {
    return 'Donanım & IoT';
  }
  if (searchText.includes('derin') || searchText.includes('deep') || searchText.includes('nano') || searchText.includes('robot') || searchText.includes('fotonik')) {
    return 'Derin Teknoloji';
  }
  if (searchText.includes('gayrimenkul') || searchText.includes('emlak') || searchText.includes('proptech') || searchText.includes('inşaat') || searchText.includes('bina')) {
    return 'Gayrimenkul (PropTech)';
  }
  if (searchText.includes('ik') || searchText.includes('hr') || searchText.includes('insan') || searchText.includes('kariyer') || searchText.includes('işe alım')) {
    return 'İnsan Kaynakları (HRTech)';
  }
  if (searchText.includes('pazarlama') || searchText.includes('martech') || searchText.includes('marketing') || searchText.includes('reklam') || searchText.includes('seo')) {
    return 'Pazarlama (MarTech)';
  }
  if (searchText.includes('tarim') || searchText.includes('tarım') || searchText.includes('gida') || searchText.includes('gıda') || searchText.includes('agri') || searchText.includes('food')) {
    return 'Tarım & Gıda (AgriTech)';
  }
  if (searchText.includes('sigorta') || searchText.includes('insurtech') || searchText.includes('insurance')) {
    return 'Sigorta (InsurTech)';
  }
  if (searchText.includes('savunma') || searchText.includes('uzay') || searchText.includes('defense') || searchText.includes('space') || searchText.includes('iha') || searchText.includes('havacilik')) {
    return 'Savunma & Uzay';
  }
  if (searchText.includes('saas') || searchText.includes('yazilim') || searchText.includes('yazılım') || searchText.includes('software') || searchText.includes('bulut') || searchText.includes('cloud') || searchText.includes('platform')) {
    return 'SaaS & Yazılım';
  }

  return 'SaaS & Yazılım';
}

export function inferCity(rawCity: string | undefined | null, fullText: string = ''): string {
  if (rawCity && rawCity.trim() && rawCity.trim() !== 'Türkiye' && rawCity.trim().length >= 3) {
    return rawCity.trim();
  }

  const lower = fullText.toLowerCase();
  if (lower.includes('bursa')) return 'Bursa';
  if (lower.includes('ankara') || lower.includes('odtu') || lower.includes('hacettepe') || lower.includes('bilkent')) return 'Ankara';
  if (lower.includes('izmir') || lower.includes('ege') || lower.includes('dokuz eylül')) return 'İzmir';
  if (lower.includes('kocaeli') || lower.includes('gebze') || lower.includes('gtu')) return 'Kocaeli';
  if (lower.includes('antalya')) return 'Antalya';
  if (lower.includes('mugla') || lower.includes('muğla')) return 'Muğla';
  if (lower.includes('eskişehir') || lower.includes('eskisehir')) return 'Eskişehir';

  return 'İstanbul';
}

export function deduplicateAndNormalizeEntities(entities: EcosystemEntity[]): EcosystemEntity[] {
  if (!Array.isArray(entities)) return [];

  const seenNames = new Map<string, EcosystemEntity>();

  entities.forEach((entity, index) => {
    if (!entity || typeof entity !== 'object') return;

    const rawName = (entity.name || '').trim();
    if (!rawName) return;

    const normalizedNameKey = rawName.toLocaleLowerCase('tr-TR');

    const cleanDesc = (entity.description || '').trim();
    // Normalize category to standard categories
    const cleanCategory = normalizeCategory(entity.category, rawName, cleanDesc);

    // Infer city
    const cleanCity = inferCity(entity.city, `${rawName} ${cleanDesc} ${entity.website || ''}`);

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
      city: cleanCity,
      description: cleanDesc.length > 5 ? cleanDesc : `${rawName} - Teknoloji ve inovasyon alanında faaliyet gösteren girişim.`,
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
