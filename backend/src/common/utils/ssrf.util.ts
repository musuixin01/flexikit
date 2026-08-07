import * as dns from 'dns';
import { promisify } from 'util';
import { BadRequestException } from '@nestjs/common';

const dnsLookup = promisify(dns.lookup);

/**
 * SSRF 防护：检查URL是否安全（禁止访问内网IP）
 */
export async function validateUrlSafe(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new BadRequestException('无效的URL');
  }

  // 只允许 http 和 https 协议
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new BadRequestException('不支持的URL协议');
  }

  // 禁止访问 localhost
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    throw new BadRequestException('禁止访问本地地址');
  }

  // 禁止访问内网IP段
  try {
    const { address } = await dnsLookup(hostname);
    if (isPrivateIp(address)) {
      throw new BadRequestException('禁止访问内网地址');
    }
  } catch (e) {
    if (e instanceof BadRequestException) {
      throw e;
    }
    // DNS解析失败，继续（可能是域名不存在）
  }

  return url;
}

/**
 * 判断IP是否为私有/内网IP
 */
function isPrivateIp(ip: string): boolean {
  // IPv4 私有地址段
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    // IPv6 简单检查（只禁止 ::1 和 fe80:: 链路本地）
    return ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:');
  }

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (链路本地)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 127.0.0.0/8 (回环)
  if (parts[0] === 127) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}
