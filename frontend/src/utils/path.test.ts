import { describe, expect, it } from 'vitest';
import { getBaseName, resolveLocalMarkdownPath } from './path';

describe('resolveLocalMarkdownPath', () => {
  it('resolves simple relative paths from a Unix path', () => {
    expect(resolveLocalMarkdownPath('/docs/guide/current.md', 'next.md')).toEqual({
      absolutePath: '/docs/guide/next.md',
      anchor: null,
    });
  });

  it('resolves dot segments and anchors from a Windows path', () => {
    expect(resolveLocalMarkdownPath('C:\\docs\\guide\\current.md', '..\\other.md#section')).toEqual({
      absolutePath: 'C:\\docs\\other.md',
      anchor: 'section',
    });
  });

  it('preserves already absolute paths', () => {
    expect(resolveLocalMarkdownPath('/docs/current.md', '/tmp/other.md#intro')).toEqual({
      absolutePath: '/tmp/other.md',
      anchor: 'intro',
    });
  });
});

describe('getBaseName', () => {
  it('extracts the file name from mixed separators', () => {
    expect(getBaseName('C:\\docs\\guide\\current.md')).toBe('current.md');
    expect(getBaseName('/docs/guide/current.md')).toBe('current.md');
  });
});