import { getLocales } from 'expo-localization';

const en = {
  home: 'Home', discover: 'Discover', new: 'New', history: 'History', me: 'My Space',
  foundation: 'Foundation preview', placeholder: 'Screen preview. Content arrives in a later milestone.',
  design: 'Design system', typography: 'Typography', palette: 'Colours', skeletons: 'Skeletons',
  notFound: 'Page not found', notFoundBody: 'This link does not lead to a screen.', backHome: 'Back to Home',
  back: 'Back', sample: 'Find your next anime', loading: 'Loading preview',
  pause: 'Pause shimmer', resume: 'Resume shimmer',
} as const;
type Dictionary = { [K in keyof typeof en]: string };
const id: Dictionary = {
  home: 'Beranda', discover: 'Jelajahi', new: 'Terbaru', history: 'Riwayat', me: 'Ruang Saya',
  foundation: 'Pratinjau fondasi', placeholder: 'Pratinjau layar. Konten hadir pada milestone berikutnya.',
  design: 'Sistem desain', typography: 'Tipografi', palette: 'Warna', skeletons: 'Skeleton',
  notFound: 'Halaman tidak ditemukan', notFoundBody: 'Tautan ini tidak mengarah ke layar aplikasi.', backHome: 'Kembali ke Beranda',
  back: 'Kembali', sample: 'Temukan anime berikutnya', loading: 'Pratinjau pemuatan',
  pause: 'Jeda shimmer', resume: 'Lanjutkan shimmer',
};
export type TranslationKey = keyof Dictionary;
export type Language = 'id' | 'en';
export const dictionaries = { id, en } satisfies Record<Language, Dictionary>;
export function t(key: TranslationKey): string {
  const language = getLocales()[0]?.languageCode === 'id' ? 'id' : 'en';
  return dictionaries[language][key];
}
