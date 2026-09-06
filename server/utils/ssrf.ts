import dns from 'dns';
import { promisify } from 'util';

const lookupAsync = promisify(dns.lookup);

const ALLOWED_DOMAINS = [
  'fal.media',
  'fal.run',
  'googleapis.com',
  'byteplusapi.com',
  'elevenlabs.io',
  'google.com',
  'freepik.com',
  'unsplash.com'
];

function isPrivateIP(ip: string): boolean {
  // IPv4 bogons/private
  if (/^(127\.|169\.254\.|10\.|192\.168\.)/.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  // IPv6 localhost/private
  if (ip === '::1' || /^fc00:/i.test(ip) || /^fe80:/i.test(ip)) return true;
  if (ip === '0.0.0.0' || ip === '::') return true;
  return false;
}

export async function validateProxyUrl(targetUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname;
    
    // 1. Hostname whitelist check
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isAllowedDomain) {
       console.warn(`[SSRF] Blocked unauthorized domain: ${hostname}`);
       return false;
    }

    // 2. IP check (DNS Rebinding protection)
    // Even if domain is allowed, we verify it doesn't resolve to a private IP
    const { address } = await lookupAsync(hostname);
    if (isPrivateIP(address) || isPrivateIP(hostname)) {
       console.warn(`[SSRF] Blocked private IP resolution: ${address} for hostname ${hostname}`);
       return false;
    }

    return true;
  } catch (e) {
    console.warn(`[SSRF] Invalid URL format or resolution failure:`, e);
    return false;
  }
}
