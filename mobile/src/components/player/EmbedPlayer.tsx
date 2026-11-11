import { useEffect, useRef } from 'react';
import { useKeepAwake } from 'expo-keep-awake';
import { WebView } from 'react-native-webview';

export function EmbedPlayer({ url, onError }: { url: string; onError: () => void }) {
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    timeout.current = setTimeout(onError, 15000);
    return () => clearTimeout(timeout.current);
  }, [url, onError]);
  const host = new URL(url).hostname;
  // Blogger mounts its actual player in a Google-owned child frame.
  const allowedHosts = new Set([host, ...(host === 'www.blogger.com' || host === 'blogger.com'
    ? ['youtube.googleapis.com', 'www.youtube.com'] : [])]);
  return <WebView source={{ uri: url }} style={{ flex: 1, backgroundColor: '#000' }}
    originWhitelist={['*']}
    onShouldStartLoadWithRequest={request => {
      try {
        const destination = new URL(request.url);
        return destination.protocol === 'https:' && allowedHosts.has(destination.hostname);
      } catch {
        return false;
      }
    }}
    setSupportMultipleWindows={false} onOpenWindow={(): void => {}}
    allowsInlineMediaPlayback allowsFullscreenVideo mediaPlaybackRequiresUserAction={false}
    onLoad={() => clearTimeout(timeout.current)}
    onError={onError} onHttpError={onError} />;
}
