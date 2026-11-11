import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { colors } from '@/theme';

export default function Html({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return <html lang="en" {...htmlAttributes}><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AniStream</title><ScrollViewStyleReset />
    <style dangerouslySetInnerHTML={{ __html: `html,body,#root{background:${colors.bg};color:${colors.text}}` }} />
    {headNodes}
  </head><body {...bodyAttributes}>{children}{bodyNodes}</body></html>;
}
