import { TranslocoServerLoader } from './transloco-loader.server';

describe('TranslocoServerLoader', () => {
  it('loads a catalog from the application public directory', async () => {
    const translation = await new TranslocoServerLoader().getTranslation('en');

    expect(translation['app']).toEqual(
      expect.objectContaining({ home: 'Power Market Dashboard home' }),
    );
  });

  it('rejects an unknown language catalog', async () => {
    await expect(new TranslocoServerLoader().getTranslation('missing')).rejects.toThrow();
  });
});
