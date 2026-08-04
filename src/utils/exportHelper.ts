import { EcosystemEntity } from '../types';

/**
 * Clean string values for CSV format
 */
const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Export array of entities as a UTF-8 BOM encoded CSV file
 * Works seamlessly with Microsoft Excel (preserves Turkish characters)
 */
export const exportEntitiesToCSV = (entities: EcosystemEntity[], filename = 'mamuthub_ekosistem_dizini.csv') => {
  if (!entities || entities.length === 0) return;

  const headers = [
    'ID',
    'İsim / Unvan',
    'Kurucu / Detay Unvan',
    'Tür',
    'Kategori',
    'Şehir',
    'Aşama',
    'Açıklama',
    'Web Sitesi',
    'LinkedIn',
    'Twitter',
    'Ekip Büyüklüğü',
    'Kuruluş Yılı',
    'Yatırım Odağı',
    'Portföy Sayısı',
    'Öne Çıkan',
    'Durum',
    'Son Güncelleme'
  ];

  const rows = entities.map(e => [
    escapeCsvField(e.id),
    escapeCsvField(e.name),
    escapeCsvField(e.titleOrCompany),
    escapeCsvField(e.type),
    escapeCsvField(e.category),
    escapeCsvField(e.city),
    escapeCsvField(e.stage || ''),
    escapeCsvField(e.description),
    escapeCsvField(e.website || ''),
    escapeCsvField(e.linkedin || ''),
    escapeCsvField(e.twitter || ''),
    escapeCsvField(e.teamSize || ''),
    escapeCsvField(e.foundedYear || ''),
    escapeCsvField((e.investmentFocus || []).join('; ')),
    escapeCsvField(e.portfolioCount || ''),
    escapeCsvField(e.featured ? 'Evet' : 'Hayır'),
    escapeCsvField(e.status || 'active'),
    escapeCsvField(e.lastUpdated)
  ]);

  // UTF-8 BOM (\uFEFF) ensures Excel reads Turkish characters properly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export array of entities as a formatted JSON file
 */
export const exportEntitiesToJSON = (entities: EcosystemEntity[], filename = 'mamuthub_ekosistem_dizini.json') => {
  if (!entities || entities.length === 0) return;

  const jsonString = JSON.stringify(entities, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
