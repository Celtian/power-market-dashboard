import { Injectable } from '@nestjs/common';

const DEFAULT_API_URL = 'https://web-api.tp.entsoe.eu/api';
const DEFAULT_CZECH_DOMAIN = '10YCZ-CEPS-----N';
const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class EntsoeConfig {
  get apiUrl(): string {
    return process.env.ENTSOE_API_URL?.trim() || DEFAULT_API_URL;
  }

  get domain(): string {
    return process.env.ENTSOE_DOMAIN?.trim() || DEFAULT_CZECH_DOMAIN;
  }

  get securityToken(): string {
    const token = process.env.ENTSOE_SECURITY_TOKEN?.trim();

    if (!token) {
      throw new Error('ENTSOE_SECURITY_TOKEN is missing. Set it in apps/importer/.env.');
    }

    return token;
  }

  get timeoutMs(): number {
    const value = Number(process.env.ENTSOE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('ENTSOE_TIMEOUT_MS must be a positive integer.');
    }

    return value;
  }
}
