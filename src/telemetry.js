'use strict';

const crypto = require('node:crypto');

// TODO: set to the nodejs-dna Sentry DSN
const DEFAULT_SENTRY_DSN = '';

/**
 * Error message substrings that are high-volume expected noise and should not
 * be sent to Sentry. Ported from php-dna $DEFAULT_IGNORED_ERRORS.
 */
const IGNORED_ERRORS = [
  'Domain not found',
  'ERR_DOMAIN_NOT_FOUND',
  'Reseller not found',
  'Domain is not in updateable status',
  'balance is not sufficient',
  'Price definition not found',
  'TLD is not supported',
  'Invalid API credentials',
  'could not be found', // API_404 "The domain name you requested could not be found" — high-volume expected noise
  'Insufficent reseller balance', // insufficient balance (sic — misspelling intentional, must match API response)
];

/**
 * Parse a Sentry DSN.
 * Format: https://{publicKey}[:{secretKey}]@{host}/{projectId}
 *
 * @param {string} dsn
 * @returns {{ host: string, projectId: string, publicKey: string, secretKey: string|null }|null}
 */
function parseDsn(dsn) {
  if (!dsn || typeof dsn !== 'string' || dsn.trim() === '') return null;
  try {
    const url = new URL(dsn);
    const host = url.hostname;
    const projectId = url.pathname.replace(/^\/+/, '');
    const publicKey = url.username;
    const secretKey = url.password || null;
    if (!host || !projectId || !publicKey) return null;
    return { host, projectId, publicKey, secretKey };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers (mirrors php-dna buildCommonTags / buildSentryClassification)
// ---------------------------------------------------------------------------

/**
 * Build volatile tags from the error and context.
 * Port of buildCommonTags in SharedApiConfigAndUtilsTrait.php.
 *
 * @param {Error|null} error
 * @param {object} context
 * @returns {object}
 */
function _buildCommonTags(error, context) {
  const tags = {};

  if (context.reseller) {
    tags.reseller = String(context.reseller);
  }

  // Extract domain from lastRequest (mirrors PHP: payload.domainName / request.DomainName)
  const lr = context.lastRequest;
  if (lr && typeof lr === 'object') {
    const domain =
      (lr.payload && lr.payload.domainName) ||
      (lr.request && lr.request.DomainName) ||
      null;
    if (domain && typeof domain === 'string' && domain.trim()) {
      tags.domain = domain.trim();
    }
  }

  if (context.lastFunction) {
    tags.operation = String(context.lastFunction);
  }

  tags.api_type = context.transport || 'REST';

  if (error) {
    const msg = String(error.message || '');
    const apiCodeMatch = msg.match(/API_(-?\d+)_ERROR/);
    if (apiCodeMatch) {
      tags.api_code = 'API_' + apiCodeMatch[1];
    } else {
      const numCode = Number(error.code);
      if (!isNaN(numCode) && numCode !== 0) {
        tags.api_code = 'API_' + numCode;
      }
    }
    const numCode = Number(error.code);
    if (!isNaN(numCode) && numCode !== 0) {
      tags.status_code = String(numCode);
    }
  }

  return tags;
}

/**
 * Normalise an error message so identical underlying errors always render the
 * same Sentry title regardless of volatile bits (IPs, domain names, reseller
 * IDs, UUIDs, large numbers).
 *
 * Mirrors the PHP normalisation in buildSentryClassification.
 *
 * @param {string} msg        Raw error message
 * @param {object} tags       Already-built common tags (must contain api_code if present)
 * @param {string} errorName  Fallback error class name (e.g. 'Error', 'TypeError')
 * @returns {string}
 */
function _normalizeMessage(msg, tags, errorName) {
  const apiCode = tags.api_code || null;
  let n = msg;

  n = n.replace(/^\[API_ERROR\]:\s*/i, '');
  n = n.replace(/API_-?\d+_ERROR\s*-\s*Failed\s*-\s*/i, '');
  n = n.replace(/\s*\(Reseller Id[^)]*\)\s*/i, '');

  // Strip IPv4 addresses
  n = n.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '{ip}');

  // Strip quoted strings
  n = n.replace(/'[^']{0,80}'|"[^"]{0,80}"/g, '{v}');

  // Strip UUIDs (Node-specific addition: UUIDs appear in reseller credentials)
  n = n.replace(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
    '{uuid}',
  );

  // Replace runs of 2+ digits (single digits often carry meaning: "v4", "All 4 contact types")
  n = n.replace(/\b\d{2,}\b/g, '{n}');

  n = n.replace(/\s+/g, ' ').trim();

  if (!n) {
    // Empty backend message (e.g. HTTP 4xx/5xx with empty body)
    n = apiCode || errorName || 'Error';
  } else if (apiCode && !n.startsWith(apiCode)) {
    n = apiCode + ': ' + n;
  }

  if (n.length > 160) {
    n = n.slice(0, 157) + '...';
  }

  return n;
}

/**
 * Build stable Sentry classification from an error + context.
 * Port of buildSentryClassification in SharedApiConfigAndUtilsTrait.php.
 *
 * @param {Error} error
 * @param {object} context
 * @returns {{ value: string, tags: object, fingerprint: string[] }}
 */
function _buildSentryClassification(error, context) {
  const tags = _buildCommonTags(error, context);
  const msg = String(error.message || '');

  // ip_value is meaningful only when the error message itself names an IP
  const ipMatch = msg.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
  if (ipMatch) {
    tags.ip_value = ipMatch[1];
  }

  const value = _normalizeMessage(msg, tags, error.name || 'Error');

  return {
    value,
    tags,
    // Fingerprint: ['dna', application, operation, normalised_value].
    // Reseller is intentionally NOT included — it would re-shatter groups.
    fingerprint: [
      'dna',
      context.application || 'CORE',
      tags.operation || 'unknown',
      value,
    ],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Sentry store event object from an error and context.
 *
 * Node-flavored tags: runtime_name:'Node.js', runtime_version: process.version,
 * platform:'node', logger:'node'.
 *
 * Volatile data (reseller, domain, operation, api_code) lives as tags so it
 * is filterable in Sentry without fragmenting issue groups. The raw backend
 * message is preserved unchanged in extra.original_message.
 *
 * @param {Error} error
 * @param {{ version?: string, application?: string, environment?: string,
 *           transport?: string, reseller?: string, lastRequest?: object,
 *           lastResponse?: object, lastFunction?: string, startAt?: number }} context
 * @returns {object} Sentry store event
 */
function buildSentryEvent(error, context) {
  const elapsed = context.startAt
    ? ((Date.now() - context.startAt) / 1000).toFixed(4)
    : '0.0000';

  const classification = _buildSentryClassification(error, context);

  const eventId = crypto.randomBytes(16).toString('hex');
  const traceId = crypto.randomBytes(8).toString('hex');

  // ISO 8601 without milliseconds — matches PHP gmdate('Y-m-d\TH:i:s\Z')
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // First meaningful stack frame for the stacktrace entry
  const stackLines = (error.stack || '').split('\n');
  const firstAtLine = stackLines.find((l) => l.trim().startsWith('at ')) || '';

  const tags = {
    handled: 'yes',
    level: 'error',
    runtime_name: 'Node.js',
    runtime_version: process.version,
    elapsed_time: elapsed,
    application: context.application || 'UNKNOWN',
    transport: context.transport || 'REST',
    trace_id: traceId,
    ...classification.tags,
  };

  return {
    event_id: eventId,
    timestamp,
    level: 'error',
    logger: 'node',
    platform: 'node',
    release: context.version,
    environment: context.environment || 'production',
    message: {
      formatted: classification.value,
    },
    exception: {
      values: [
        {
          type: error.name || 'Error',
          value: classification.value,
          stacktrace: {
            frames: [
              {
                filename: (stackLines[0] || String(error)).trim(),
                lineno: null,
                function: firstAtLine.trim(),
              },
            ],
          },
        },
      ],
    },
    tags,
    extra: {
      request_data: context.lastRequest || {},
      response_data: context.lastResponse || {},
      original_message: error.message || '',
    },
    fingerprint: classification.fingerprint,
  };
}

/**
 * Fire-and-forget: report an error to Sentry. Never throws.
 *
 * @param {{ dsn: string, enabled: boolean, version?: string,
 *           application?: string, environment?: string, transport?: string,
 *           reseller?: string, lastRequest?: object, lastResponse?: object,
 *           lastFunction?: string, startAt?: number,
 *           _fetch?: Function }} config
 * @param {Error} error
 * @returns {Promise<void>}  Always resolves; never rejects.
 */
async function reportError(config, error) {
  try {
    if (!config || !config.enabled || !config.dsn) return;

    const parsed = parseDsn(config.dsn);
    if (!parsed) return;

    const msg = error && error.message ? String(error.message) : '';
    for (const ignored of IGNORED_ERRORS) {
      if (msg.includes(ignored)) return;
    }

    const apiUrl = `https://${parsed.host}/api/${parsed.projectId}/store/`;

    const context = {
      version: config.version,
      application: config.application,
      environment: config.environment,
      transport: config.transport,
      reseller: config.reseller,
      lastRequest: config.lastRequest,
      lastResponse: config.lastResponse,
      lastFunction: config.lastFunction,
      startAt: config.startAt,
    };

    const event = buildSentryEvent(error, context);

    let payload;
    try {
      payload = JSON.stringify(event);
    } catch {
      // Unencodable payload (e.g. circular references) — drop rather than POST empty
      return;
    }

    if (!payload) return;

    const authParts = [
      'sentry_version=7',
      `sentry_client=nodejs-dna/${config.version || '0.0.0'}`,
      `sentry_key=${parsed.publicKey}`,
    ];
    if (parsed.secretKey) {
      authParts.push(`sentry_secret=${parsed.secretKey}`);
    }
    const sentryAuthHeader = 'Sentry ' + authParts.join(', ');

    const fetchImpl = (config && config._fetch) || globalThis.fetch;

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 3000);

    let fetchPromise;
    try {
      fetchPromise = fetchImpl(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': sentryAuthHeader,
        },
        body: payload,
        signal: controller.signal,
      });
    } catch {
      // Synchronous throw from fetchImpl (e.g. invalid argument) — swallow
      clearTimeout(timerId);
      return;
    }

    // Clear the abort timer on completion; swallow any network/Sentry error.
    // The `.catch` is attached synchronously before any microtask tick so a
    // fast rejection can never escape as an unhandled rejection.
    fetchPromise
      .then(() => clearTimeout(timerId))
      .catch(() => clearTimeout(timerId));

  } catch {
    // Swallow — a telemetry failure must never surface to the host app.
  }
}

module.exports = {
  DEFAULT_SENTRY_DSN,
  IGNORED_ERRORS,
  parseDsn,
  buildSentryEvent,
  reportError,
};
