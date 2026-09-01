/**
 * Client Device & Hardware Fingerprinting Utility
 * Generates both persistent browser IDs and physical hardware fingerprints
 * (GPU, screen, CPU cores, canvas) to detect multi-account check-ins from the
 * same physical machine even across different browsers or incognito tabs.
 */

const DEVICE_STORAGE_KEY = 'mero_device_identifier_v1';

export interface DeviceFingerprint {
  deviceId: string;
  hardwareId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  formattedDeviceInfo: string;
}

/**
 * Fast 32-bit FNV-1a hash function
 */
function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate a physical hardware fingerprint that remains IDENTICAL
 * across Chrome, Edge, Firefox, Brave, and Incognito tabs on the SAME machine.
 */
export function getHardwareFingerprint(): string {
  if (typeof window === 'undefined') return 'hw_server';

  const parts: string[] = [];

  // 1. Screen & Display metrics
  try {
    const sw = window.screen?.width || 0;
    const sh = window.screen?.height || 0;
    const cd = window.screen?.colorDepth || 0;
    const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
    parts.push(`screen:${sw}x${sh}x${cd}@${dpr}`);
  } catch {}

  // 2. CPU threads & timezone
  try {
    const cores = navigator.hardwareConcurrency || 0;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    parts.push(`cpu:${cores}|tz:${tz}`);
  } catch {}

  // 3. WebGL Physical GPU Renderer & Vendor (Direct hardware access)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        parts.push(`gpu:${vendor}::${renderer}`);
      }
    }
  } catch {}

  // 4. Canvas 2D geometric & font rasterization signature
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'alphabetic';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#f60';
      ctx.fillRect(100, 1, 50, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('MeroPerf!2026', 2, 18);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('MeroPerf!2026', 4, 19);
      parts.push(`canvas:${canvas.toDataURL().slice(-40)}`);
    }
  } catch {}

  const rawString = parts.join('###');
  return `hw_${fnv1aHash(rawString)}`;
}

/**
 * Generate or retrieve a persistent device ID from localStorage.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_render';

  try {
    let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!deviceId) {
      const randomPart = Math.random().toString(36).substring(2, 10);
      const timePart = Date.now().toString(36);
      deviceId = `dev_${randomPart}_${timePart}`;
      localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return `dev_${Math.random().toString(36).substring(2, 10)}`;
  }
}

/**
 * Detect OS, Browser, and Device Type
 */
export function getDeviceDetails(): {
  os: string;
  browser: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
} {
  if (typeof window === 'undefined') {
    return { os: 'Unknown OS', browser: 'Unknown Browser', deviceType: 'desktop' };
  }

  const userAgent = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  // 1. Detect OS
  let os = 'Unknown OS';
  if (/windows nt 10.0/i.test(userAgent)) os = 'Windows 10/11';
  else if (/windows nt 6.3/i.test(userAgent)) os = 'Windows 8.1';
  else if (/windows/i.test(userAgent) || /win/i.test(platform)) os = 'Windows';
  else if (/iphone/i.test(userAgent)) os = 'iOS (iPhone)';
  else if (/ipad/i.test(userAgent)) os = 'iPadOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/macintosh|mac os x/i.test(userAgent) || /mac/i.test(platform)) os = 'macOS';
  else if (/linux/i.test(userAgent) || /linux/i.test(platform)) os = 'Linux';

  // 2. Detect Browser
  let browser = 'Browser';
  if (/edg\//i.test(userAgent)) browser = 'Edge';
  else if (/opr\/|opera/i.test(userAgent)) browser = 'Opera';
  else if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';

  // 3. Detect Device Type
  let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (/ipad|tablet/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobi|iphone|android/i.test(userAgent)) {
    deviceType = 'mobile';
  }

  return { os, browser, deviceType };
}

/**
 * Returns full device fingerprint object to send with attendance check-in.
 */
export function getDeviceFingerprint(): DeviceFingerprint {
  const deviceId = getOrCreateDeviceId();
  const hardwareId = getHardwareFingerprint();
  const { os, browser, deviceType } = getDeviceDetails();
  const shortHw = hardwareId.replace('hw_', '').slice(0, 6).toUpperCase();
  const deviceName = `${os} · ${browser} [${shortHw}]`;
  // Formatted string contains both hardware fingerprint and deviceId
  const formattedDeviceInfo = `${hardwareId}|${deviceId}|${os}|${browser}|${deviceType}`;

  return {
    deviceId,
    hardwareId,
    deviceName,
    deviceType,
    formattedDeviceInfo,
  };
}

