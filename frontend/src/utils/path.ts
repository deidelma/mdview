export interface ResolvedMarkdownLink {
  absolutePath: string;
  anchor: string | null;
}

function isWindowsAbsolutePath(path: string) {
  return /^[a-zA-Z]:[\\/]/.test(path);
}

function isAbsolutePath(path: string) {
  return path.startsWith('/') || isWindowsAbsolutePath(path);
}

function getSeparator(path: string) {
  return path.includes('\\') ? '\\' : '/';
}

function decomposePath(path: string) {
  if (isWindowsAbsolutePath(path)) {
    const root = path.slice(0, 2);
    const remainder = path.slice(2).replace(/^[\\/]+/, '');
    return {
      root,
      separator: '\\',
      segments: remainder.split(/[\\/]+/).filter(Boolean),
    };
  }

  if (path.startsWith('/')) {
    return {
      root: '/',
      separator: '/',
      segments: path.slice(1).split('/').filter(Boolean),
    };
  }

  const separator = getSeparator(path);
  return {
    root: '',
    separator,
    segments: path.split(/[\\/]+/).filter(Boolean),
  };
}

function joinPath(root: string, separator: string, segments: string[]) {
  if (root === '/') {
    return `${root}${segments.join('/')}`;
  }

  if (/^[a-zA-Z]:$/.test(root)) {
    return segments.length > 0 ? `${root}${separator}${segments.join(separator)}` : `${root}${separator}`;
  }

  return segments.join(separator);
}

export function getBaseName(path: string) {
  const segments = path.split(/[\\/]+/).filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}

export function resolveLocalMarkdownPath(currentPath: string, relativePath: string): ResolvedMarkdownLink {
  const [rawFilePath, rawAnchor] = relativePath.split('#', 2);
  const filePath = rawFilePath.trim();
  const anchor = rawAnchor || null;

  if (!filePath) {
    return { absolutePath: currentPath, anchor };
  }

  if (isAbsolutePath(filePath)) {
    return { absolutePath: filePath, anchor };
  }

  const current = decomposePath(currentPath);
  const nextSegments = current.segments.slice(0, -1);

  for (const segment of filePath.split(/[\\/]+/).filter(Boolean)) {
    if (segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (nextSegments.length > 0) {
        nextSegments.pop();
      }
      continue;
    }

    nextSegments.push(segment);
  }

  return {
    absolutePath: joinPath(current.root, current.separator, nextSegments),
    anchor,
  };
}