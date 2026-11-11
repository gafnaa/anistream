import { t } from '@/i18n';

export function EmbedPlayer({ url, onError }: { url: string; onError: () => void }) {
  return <iframe src={url} title={t('watch')} onError={onError}
    sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; fullscreen; encrypted-media"
    allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />;
}
