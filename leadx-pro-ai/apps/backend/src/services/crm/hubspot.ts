import { IScrapedCompany } from '@leadx/shared';
import { logger } from '../../utils/logger';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

/**
 * Verify a HubSpot access token
 */
export async function verifyHubSpotToken(accessToken: string): Promise<{ valid: boolean; user?: string }> {
  try {
    // Private App tokens return 401 on the /oauth endpoint, so we verify by making a harmless CRM request
    const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts?limit=1`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      return { valid: true, user: 'Private App Token' };
    }
    return { valid: false };
  } catch (error: any) {
    logger.error('HubSpot token verification failed', { error: error.message });
    return { valid: false };
  }
}

/**
 * Split a company name into first/last name for HubSpot contact
 */
function splitName(name: string): { firstname: string; lastname: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstname: parts[0], lastname: '' };
  }
  return {
    firstname: parts[0],
    lastname: parts.slice(1).join(' '),
  };
}

/**
 * Push a single lead to HubSpot as a contact.
 * On 409 Conflict, updates the existing contact instead.
 */
export async function pushLeadToHubSpot(
  accessToken: string,
  company: IScrapedCompany,
): Promise<{ id: string }> {
  const { firstname, lastname } = splitName(company.company_name);

  const properties: Record<string, string> = {
    firstname,
    lastname,
  };

  if (company.email) properties.email = company.email;
  if (company.phone) properties.phone = company.phone;
  if (company.website) properties.website = company.website;
  if (company.address) properties.address = company.address;
  if (company.company_name) properties.company = company.company_name;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  // Try to create the contact
  const createRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ properties }),
  });

  if (createRes.ok) {
    const data = await createRes.json();
    logger.info(`HubSpot contact created: ${data.id}`);
    return { id: data.id };
  }

  // Handle 409 Conflict — contact already exists
  if (createRes.status === 409) {
    const errorData = await createRes.json().catch(() => ({}));
    // HubSpot returns the existing contact ID in the error response
    const existingId = errorData?.message?.match(/Existing ID: (\d+)/)?.[1];

    if (existingId) {
      // Update the existing contact
      const patchRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${existingId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ properties }),
      });

      if (patchRes.ok) {
        logger.info(`HubSpot contact updated (existing): ${existingId}`);
        return { id: existingId };
      }

      const patchError = await patchRes.text().catch(() => '');
      throw new Error(`Failed to update existing HubSpot contact ${existingId}: ${patchRes.status} ${patchError}`);
    }

    // If we can't extract the existing ID, throw the original error
    throw new Error(`HubSpot 409 Conflict but could not extract existing ID: ${JSON.stringify(errorData)}`);
  }

  // Any other error
  const errorText = await createRes.text().catch(() => '');
  throw new Error(`HubSpot API error ${createRes.status}: ${errorText}`);
}
