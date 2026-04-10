/**
 * Content Type Detection and Parser Selection
 */

export type ContentType = 'markdown' | 'code' | 'plaintext';

export interface ContentTypeInfo {
  type: ContentType;
  language?: string; // For code files: 'javascript', 'python', etc.
  extension?: string;
}

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'];
const PLAINTEXT_EXTENSIONS = ['.txt', '.text'];

// Common programming language extensions
const CODE_LANGUAGE_MAP: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sql': 'sql',
  '.r': 'r',
  '.m': 'matlab',
  '.lua': 'lua',
  '.pl': 'perl',
  '.vim': 'vim',
};

/**
 * Detect content type from filename and content
 */
export function detectContentType(filename: string, content: string): ContentTypeInfo {
  const extension = getFileExtension(filename);

  // Check for Markdown
  if (MARKDOWN_EXTENSIONS.includes(extension)) {
    return { type: 'markdown', extension };
  }

  // Check for known code languages
  if (CODE_LANGUAGE_MAP[extension]) {
    return {
      type: 'code',
      language: CODE_LANGUAGE_MAP[extension],
      extension,
    };
  }

  // Check for plain text
  if (PLAINTEXT_EXTENSIONS.includes(extension)) {
    return { type: 'plaintext', extension };
  }

  // Heuristic detection based on content
  return detectFromContent(content, extension);
}

/**
 * Detect content type from content analysis
 */
function detectFromContent(content: string, extension: string): ContentTypeInfo {
  const lines = content.split('\n');
  const firstFewLines = lines.slice(0, 10).join('\n');

  // Check for Markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m, // Headings
    /^\*\s+/m, // Unordered lists
    /^\d+\.\s+/m, // Ordered lists
    /^\[.+\]\(.+\)/m, // Links
    /^```/m, // Code blocks
  ];

  const hasMarkdownPatterns = markdownPatterns.some(pattern => pattern.test(firstFewLines));

  if (hasMarkdownPatterns) {
    return { type: 'markdown', extension };
  }

  // Check for code patterns (shebang, imports, etc.)
  const codePatterns = [
    /^#!\//, // Shebang
    /^import\s+/m, // Python/JS imports
    /^from\s+.+\s+import/m, // Python imports
    /^package\s+/m, // Java/Go package
    /^using\s+/m, // C# using
    /^require\s*\(/m, // Node.js require
  ];

  const hasCodePatterns = codePatterns.some(pattern => pattern.test(firstFewLines));

  if (hasCodePatterns) {
    // Try to detect language from patterns
    const language = detectLanguageFromContent(content);
    return { type: 'code', language, extension };
  }

  // Default to plain text
  return { type: 'plaintext', extension };
}

/**
 * Detect programming language from content patterns
 */
function detectLanguageFromContent(content: string): string | undefined {
  if (/^#!\/.*python/.test(content)) {
    return 'python';
  }
  if (/^#!\/.*node/.test(content)) {
    return 'javascript';
  }
  if (/^#!\/.*bash/.test(content)) {
    return 'bash';
  }
  if (/^package\s+\w+;/.test(content)) {
    return 'java';
  }
  if (/^namespace\s+\w+/.test(content)) {
    return 'csharp';
  }
  if (/def\s+\w+\(.*\):/.test(content)) {
    return 'python';
  }
  if (/function\s+\w+\(.*\)\s*{/.test(content)) {
    return 'javascript';
  }
  if (/public\s+class\s+\w+/.test(content)) {
    return 'java';
  }

  return undefined;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return '';
  }
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Check if content should be rendered as Markdown
 */
export function isMarkdownContent(contentType: ContentTypeInfo): boolean {
  return contentType.type === 'markdown';
}

/**
 * Check if content should be rendered as code
 */
export function isCodeContent(contentType: ContentTypeInfo): boolean {
  return contentType.type === 'code';
}

/**
 * Check if content should be rendered as plain text
 */
export function isPlainTextContent(contentType: ContentTypeInfo): boolean {
  return contentType.type === 'plaintext';
}
