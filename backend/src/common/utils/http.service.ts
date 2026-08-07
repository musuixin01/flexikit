import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { validateUrlSafe } from './ssrf.util';

export interface HttpOptions {
  timeout?: number;
  headers?: Record<string, string>;
  maxRedirects?: number;
}

@Injectable()
export class HttpService {
  private readonly logger = new Logger('HttpService');
  private readonly DEFAULT_TIMEOUT = 10000;
  private readonly DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * GET 请求获取文本内容
   */
  async getText(url: string, options: HttpOptions = {}): Promise<string> {
    return this.request(url, {
      ...options,
      responseType: 'text',
    }) as Promise<string>;
  }

  /**
   * GET 请求获取 JSON
   */
  async getJson<T = any>(url: string, options: HttpOptions = {}): Promise<T> {
    const text = await this.getText(url, options);
    return JSON.parse(text) as T;
  }

  /**
   * GET 请求下载 Buffer
   */
  async getBuffer(url: string, options: HttpOptions = {}): Promise<{ data: Buffer; contentType: string }> {
    return this.request(url, {
      ...options,
      responseType: 'buffer',
      maxSize: 5 * 1024 * 1024, // 5MB
    }) as Promise<{ data: Buffer; contentType: string }>;
  }

  private async request(
    url: string,
    options: HttpOptions & { responseType: 'text' | 'buffer'; maxSize?: number },
    redirectCount = 0
  ): Promise<string | { data: Buffer; contentType: string }> {
    const maxRedirects = options.maxRedirects ?? 5;
    if (redirectCount >= maxRedirects) {
      throw new Error('Too many redirects');
    }

    // SSRF 安全检查
    await validateUrlSafe(url);

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(url, {
        timeout: options.timeout ?? this.DEFAULT_TIMEOUT,
        headers: {
          'User-Agent': this.DEFAULT_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...options.headers,
        },
      }, (res) => {
        // 处理重定向
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).href;
          this.request(redirectUrl, options, redirectCount + 1).then(resolve).catch(reject);
          return;
        }

        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        if (options.responseType === 'text') {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve(data));
        } else {
          const contentType = res.headers['content-type'] || 'application/octet-stream';
          const chunks: Buffer[] = [];
          let totalSize = 0;

          res.on('data', (chunk: Buffer) => {
            totalSize += chunk.length;
            if (options.maxSize && totalSize > options.maxSize) {
              req.destroy();
              reject(new Error('Response too large'));
              return;
            }
            chunks.push(chunk);
          });
          res.on('end', () => {
            const data = Buffer.concat(chunks);
            resolve({ data, contentType });
          });
        }
      });

      req.on('error', (e) => {
        this.logger.debug(`Request failed: ${url} - ${e.message}`);
        reject(e);
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}
