import { Injectable } from '@angular/core';

import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class TranslocoServerLoader implements TranslocoLoader {
  public async getTranslation(language: string): Promise<Translation> {
    const relativePath = join('i18n', `${language}.json`);
    const candidates = [
      join(import.meta.dirname, '../browser', relativePath),
      join(process.cwd(), 'dist/apps/web/browser', relativePath),
      join(process.cwd(), 'apps/web/public', relativePath),
    ];

    for (const path of candidates) {
      try {
        return JSON.parse(await readFile(path, 'utf8')) as Translation;
      } catch (error) {
        if (path === candidates.at(-1)) {
          throw error;
        }
      }
    }

    throw new Error(`No server translation was found for ${language}.`);
  }
}
