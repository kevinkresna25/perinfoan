import { describe, it, expect } from 'vitest';
import { getContrastTextColor } from '../src/utils/contrast.js';

describe('Contrast Text Color Utility', () => {
  it('returns dark text for bright/light background colors', () => {
    expect(getContrastTextColor('#FFFFFF')).toBe('#0f172a');
    expect(getContrastTextColor('#FFD700')).toBe('#0f172a'); // Gold
    expect(getContrastTextColor('#E2E8F0')).toBe('#0f172a');
  });

  it('returns light text for dark background colors', () => {
    expect(getContrastTextColor('#000000')).toBe('#f8fafc');
    expect(getContrastTextColor('#1E1B4B')).toBe('#f8fafc'); // Deep indigo
    expect(getContrastTextColor('#3B0764')).toBe('#f8fafc'); // Deep purple
  });

  it('handles hex without # symbol and edge cases safely', () => {
    expect(getContrastTextColor('FFFFFF')).toBe('#0f172a');
    expect(getContrastTextColor('')).toBe('#f8fafc');
  });
});
