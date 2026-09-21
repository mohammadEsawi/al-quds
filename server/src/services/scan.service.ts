import { antivirusEnabled, scanBuffer } from '../lib/antivirus.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { recordAudit } from './audit.service.js';

/**
 * Refuses a file that the antivirus scanner flags. With no scanner configured this does nothing.
 * If the scanner is configured but unreachable: uploads are refused when CLAMAV_REQUIRED=true, otherwise
 * they are accepted and a warning is logged (an outage of the scanner should not take the site's forms down).
 */
export async function assertFileClean(buf: Buffer, context: { where: string; ip?: string | undefined }): Promise<void> {
  if (!antivirusEnabled()) return;
  const result = await scanBuffer(buf);

  if (result.status === 'clean') return;

  if (result.status === 'infected') {
    void recordAudit({ action: 'security virus blocked', detail: `${context.where}: ${result.signature}`, ip: context.ip ?? null });
    throw AppError.badRequest('The file was rejected by the virus scanner', 'FILE_INFECTED');
  }

  console.warn(`Antivirus scan failed (${context.where}): ${result.message}`);
  if (env.CLAMAV_REQUIRED) throw new AppError(503, 'SCANNER_UNAVAILABLE', 'Files cannot be checked right now, please try again later');
}
