export const brandRamp = {
  'brand-50': '#FFF1F2', 'brand-100': '#FFE4E6', 'brand-200': '#FECDD3',
  'brand-300': '#FDA4AF', 'brand-400': '#FB7185', 'brand-500': '#F43F5E',
  'brand-600': '#E11D48', 'brand-700': '#BE123C', 'brand-800': '#9F1239', 'brand-900': '#881337',
} as const;
export const tones = {
  cyan: { solid: '#22D3EE', subtle: '#22D3EE1F' },
  amber: { solid: '#FBBF24', subtle: '#FBBF241F' },
  pink: { solid: '#FDA4AF', subtle: '#FDA4AF1F' },
  green: { solid: '#4ADE80', subtle: '#4ADE801F' },
} as const;
export const gradients = {
  brand: ['#9F1239', '#8C3D16'], sunset: ['#9B234C', '#805500'],
  ocean: ['#16449A', '#076477'], aurora: ['#7F1D35', '#744314'],
  heroScrim: ['#0B0D1200', '#0B0D12'],
} as const;
export const genreGradients = {
  Action: ['#922C4D', '#6F251C'], Romance: ['#8D285C', '#682B35'],
  Comedy: ['#785300', '#764128'], Fantasy: ['#7F3040', '#214B71'],
  'Sci-Fi': ['#2447A0', '#076477'], Horror: ['#582B39', '#24202A'],
  'Slice of Life': ['#24634E', '#33515E'], Sports: ['#744314', '#853B39'],
} as const;
