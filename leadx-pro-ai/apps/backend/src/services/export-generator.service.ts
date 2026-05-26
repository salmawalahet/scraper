import fs from 'fs';
import path from 'path';
import { IScrapedCompany } from '@leadx/shared';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

const exportDir = path.resolve(env.EXPORT_DIR);

// Ensure export directory exists
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

/**
 * Create CSV export file
 */
export async function createCsvExport(
  exportId: number,
  leads: IScrapedCompany[],
): Promise<{ filePath: string; fileSize: number }> {
  const fileName = `export_${exportId}_${Date.now()}.csv`;
  const filePath = path.join(exportDir, fileName);

  const headers = [
    'Company Name', 'Email', 'Phone', 'WhatsApp', 'Website', 'LinkedIn',
    'Facebook', 'Address', 'Category', 'Company Size', 'Source URL',
    'Verification Status', 'Confidence Score', 'Website Status', 'Lead Priority',
  ];

  const rows = leads.map((lead) => [
    escapeCsv(lead.company_name),
    escapeCsv(lead.email || ''),
    escapeCsv(lead.phone || ''),
    escapeCsv(lead.whatsapp || ''),
    escapeCsv(lead.website || ''),
    escapeCsv(lead.linkedin || ''),
    escapeCsv(lead.facebook || ''),
    escapeCsv(lead.address || ''),
    escapeCsv(lead.category || ''),
    escapeCsv(lead.company_size || ''),
    escapeCsv(lead.source_url),
    escapeCsv(lead.verification_status),
    String(lead.confidence_score),
    escapeCsv(lead.website_status),
    escapeCsv(lead.lead_priority),
  ].join(','));

  const content = [headers.join(','), ...rows].join('\n');

  fs.writeFileSync(filePath, '\ufeff' + content, 'utf-8'); // BOM for Excel compatibility
  const stats = fs.statSync(filePath);

  logger.info(`CSV export created: ${fileName}`, { records: leads.length });
  return { filePath, fileSize: stats.size };
}

/**
 * Create Excel export file
 */
export async function createExcelExport(
  exportId: number,
  leads: IScrapedCompany[],
): Promise<{ filePath: string; fileSize: number }> {
  const ExcelJS = await import('exceljs');
  const fileName = `export_${exportId}_${Date.now()}.xlsx`;
  const filePath = path.join(exportDir, fileName);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LeadX Pro AI';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Leads');

  // Define columns with styling
  sheet.columns = [
    { header: 'Company Name', key: 'company_name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'WhatsApp', key: 'whatsapp', width: 18 },
    { header: 'Website', key: 'website', width: 35 },
    { header: 'LinkedIn', key: 'linkedin', width: 35 },
    { header: 'Facebook', key: 'facebook', width: 35 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Company Size', key: 'company_size', width: 15 },
    { header: 'Source URL', key: 'source_url', width: 35 },
    { header: 'Verification', key: 'verification_status', width: 15 },
    { header: 'Confidence', key: 'confidence_score', width: 12 },
    { header: 'Website Status', key: 'website_status', width: 15 },
    { header: 'Priority', key: 'lead_priority', width: 12 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };

  // Add data
  leads.forEach((lead) => {
    sheet.addRow({
      company_name: lead.company_name,
      email: lead.email || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      website: lead.website || '',
      linkedin: lead.linkedin || '',
      facebook: lead.facebook || '',
      address: lead.address || '',
      category: lead.category || '',
      company_size: lead.company_size || '',
      source_url: lead.source_url,
      verification_status: lead.verification_status,
      confidence_score: lead.confidence_score,
      website_status: lead.website_status,
      lead_priority: lead.lead_priority,
    });
  });

  await workbook.xlsx.writeFile(filePath);
  const stats = fs.statSync(filePath);

  logger.info(`Excel export created: ${fileName}`, { records: leads.length });
  return { filePath, fileSize: stats.size };
}

/**
 * Create JSON export file
 */
export async function createJsonExport(
  exportId: number,
  leads: IScrapedCompany[],
): Promise<{ filePath: string; fileSize: number }> {
  const fileName = `export_${exportId}_${Date.now()}.json`;
  const filePath = path.join(exportDir, fileName);

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalRecords: leads.length,
      exportedBy: 'LeadX Pro AI',
    },
    leads: leads.map((lead) => ({
      companyName: lead.company_name,
      email: lead.email,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      website: lead.website,
      linkedin: lead.linkedin,
      facebook: lead.facebook,
      address: lead.address,
      category: lead.category,
      companySize: lead.company_size,
      sourceUrl: lead.source_url,
      verificationStatus: lead.verification_status,
      confidenceScore: lead.confidence_score,
      websiteStatus: lead.website_status,
      leadPriority: lead.lead_priority,
      tags: lead.tags,
    })),
  };

  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  const stats = fs.statSync(filePath);

  logger.info(`JSON export created: ${fileName}`, { records: leads.length });
  return { filePath, fileSize: stats.size };
}

function escapeCsv(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
