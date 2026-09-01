export type BrowserNetworkIpResult = {
  ip: string;
  source: 'browser_public';
};

type BrowserPublicIpOptions = {
  attempts?: number;
  retryDelayMs?: number;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeIpAddress(value?: string | null): string {
  if (!value) return '';

  let ip = value.trim();
  if (!ip) return '';

  if (ip.startsWith('[') && ip.endsWith(']')) {
    ip = ip.slice(1, -1);
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  if (ip === '0:0:0:0:0:0:0:1') {
    return '::1';
  }

  return ip;
}

export function isLoopbackIp(value?: string | null): boolean {
  const ip = normalizeIpAddress(value).toLowerCase();
  return ip === 'localhost' || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.');
}

function ipv4ToNumber(value: string): number | null {
  const parts = value.split('.');
  if (parts.length !== 4) return null;

  const octets = parts.map((part) => {
    if (!/^\d+$/.test(part)) return null;
    const octet = Number(part);
    return octet >= 0 && octet <= 255 ? octet : null;
  });

  if (octets.some((octet) => octet === null)) return null;

  return (
    ((octets[0] as number) * 256 ** 3) +
    ((octets[1] as number) * 256 ** 2) +
    ((octets[2] as number) * 256) +
    (octets[3] as number)
  );
}

export function expandIpv6Address(ip: string): string | null {
  const normalized = normalizeIpAddress(ip).toLowerCase();
  if (!normalized.includes(':')) return null;

  // Split off CIDR if present
  const baseIp = normalized.includes('/') ? normalized.split('/')[0] : normalized;

  let parts = baseIp.split(':');
  if (baseIp.includes('::')) {
    const [head, tail] = baseIp.split('::');
    const headParts = head ? head.split(':').filter(Boolean) : [];
    const tailParts = tail ? tail.split(':').filter(Boolean) : [];
    const missingCount = 8 - (headParts.length + tailParts.length);
    const middle = Array(Math.max(0, missingCount)).fill('0000');
    parts = [...headParts, ...middle, ...tailParts];
  }

  if (parts.length !== 8) return null;

  return parts.map((part) => part.padStart(4, '0')).join(':');
}

export function isIpv6SubnetMatch(clientIp: string, allowedEntry: string): boolean {
  let [networkPart, prefixStr] = allowedEntry.split('/');
  // Default to /64 (the standard residential/office ISP subnet allocation)
  let prefixBits = prefixStr ? parseInt(prefixStr, 10) : 64;

  if (isNaN(prefixBits) || prefixBits < 0 || prefixBits > 128) {
    prefixBits = 64;
  }

  const expandedClient = expandIpv6Address(clientIp);
  const expandedNetwork = expandIpv6Address(networkPart);

  if (!expandedClient || !expandedNetwork) return false;

  const clientHex = expandedClient.replace(/:/g, '');
  const networkHex = expandedNetwork.replace(/:/g, '');

  const hexCharsToCompare = Math.min(32, Math.floor(prefixBits / 4));
  return clientHex.slice(0, hexCharsToCompare) === networkHex.slice(0, hexCharsToCompare);
}

export function isIpv4CidrMatch(clientIp: string, cidr: string): boolean {
  try {
    const [range, bits = '32'] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
    const ipToLong = (ip: string) =>
      ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
    return (ipToLong(clientIp) & mask) === (ipToLong(range) & mask);
  } catch {
    return false;
  }
}

export function isIpAllowed(clientIp: string, allowedList: string[]): boolean {
  const normalizedClientIp = normalizeIpAddress(clientIp);
  if (!normalizedClientIp) return false;
  if (!allowedList || allowedList.length === 0) return true;

  // Loopback allowed
  if (isLoopbackIp(normalizedClientIp)) return true;

  return allowedList.some((entry) => {
    const allowedEntry = entry.trim();
    if (!allowedEntry) return false;

    // Loopback match
    if (isLoopbackIp(allowedEntry) && isLoopbackIp(normalizedClientIp)) {
      return true;
    }

    // Direct Exact Match
    if (normalizeIpAddress(allowedEntry).toLowerCase() === normalizedClientIp.toLowerCase()) {
      return true;
    }

    // IPv6 Subnet Matching (Supports /64 subnet prefix or matching office router prefix)
    if (normalizedClientIp.includes(':') && allowedEntry.includes(':')) {
      return isIpv6SubnetMatch(normalizedClientIp, allowedEntry);
    }

    // IPv4 CIDR Matching (e.g. 192.168.1.0/24 or 27.34.0.0/16)
    if (allowedEntry.includes('/') && !allowedEntry.includes(':')) {
      return isIpv4CidrMatch(normalizedClientIp, allowedEntry);
    }

    return false;
  });
}

export async function fetchBrowserPublicIp(options: BrowserPublicIpOptions = {}): Promise<BrowserNetworkIpResult | null> {
  const attempts = Math.max(1, options.attempts || 1);
  const retryDelayMs = Math.max(0, options.retryDelayMs || 0);
  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
  ];
  let latestResult: BrowserNetworkIpResult | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const url = new URL(endpoint);
        url.searchParams.set('_', `${Date.now()}-${attempt}-${Math.random().toString(36).slice(2)}`);

        const response = await fetch(url.toString(), {
          cache: 'no-store',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });
        if (!response.ok) continue;

        const data = await response.json();
        const ip = normalizeIpAddress(data?.ip);

        if (ip && !isLoopbackIp(ip)) {
          latestResult = { ip, source: 'browser_public' };
          if (attempts === 1) {
            return latestResult;
          }
        }
      } catch {
        // Try the next resolver.
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (attempt < attempts - 1 && retryDelayMs > 0) {
      await wait(retryDelayMs);
    }
  }

  return latestResult;
}
