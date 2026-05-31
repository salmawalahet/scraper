import crypto from 'crypto';
import { webhookService } from './webhook.service';
import { logger } from '../../utils/logger';

/**
 * Sign a payload with HMAC-SHA256
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Attempt to deliver a webhook to a single endpoint
 */
async function deliverToEndpoint(
  endpointId: number,
  url: string,
  secret: string,
  event: string,
  payload: object,
): Promise<{ statusCode: number | null; body: string | null }> {
  const bodyStr = JSON.stringify(payload);
  const signature = signPayload(bodyStr, secret);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LeadX-Signature': signature,
        'X-LeadX-Event': event,
      },
      body: bodyStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const responseBody = await response.text().catch(() => '');
    return {
      statusCode: response.status,
      body: responseBody.substring(0, 2000), // cap at 2KB
    };
  } catch (error: any) {
    return {
      statusCode: null,
      body: error.message || 'Network error',
    };
  }
}

/**
 * Dispatch a webhook event to all matching endpoints for a user.
 * Retries once after 5 seconds on failure.
 */
export async function dispatchWebhook(
  userId: number,
  event: string,
  payload: object,
): Promise<void> {
  try {
    const endpoints = await webhookService.findActiveByEvent(userId, event);

    if (endpoints.length === 0) return;

    logger.info(`Dispatching webhook "${event}" to ${endpoints.length} endpoint(s) for user ${userId}`);

    for (const endpoint of endpoints) {
      let result = await deliverToEndpoint(endpoint.id, endpoint.url, endpoint.secret, event, payload);
      const isSuccess = result.statusCode !== null && result.statusCode >= 200 && result.statusCode < 300;

      if (!isSuccess) {
        // Retry once after 5 seconds
        logger.warn(`Webhook delivery to ${endpoint.url} failed (${result.statusCode}). Retrying in 5s...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        result = await deliverToEndpoint(endpoint.id, endpoint.url, endpoint.secret, event, payload);
      }

      const finalSuccess = result.statusCode !== null && result.statusCode >= 200 && result.statusCode < 300;

      // Log the delivery
      await webhookService.logDelivery(
        endpoint.id,
        event,
        payload,
        result.statusCode,
        result.body,
        finalSuccess ? new Date() : null,
      );

      if (finalSuccess) {
        logger.info(`Webhook delivered to ${endpoint.url} (${result.statusCode})`);
      } else {
        logger.error(`Webhook delivery to ${endpoint.url} failed after retry (${result.statusCode})`);
      }
    }
  } catch (error) {
    logger.error('Error dispatching webhooks', { error, userId, event });
  }
}
