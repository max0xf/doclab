/**
 * Unified Content Parser - Handles all content types
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { Root as MdastRoot } from 'mdast';
import { ContentTypeInfo } from './contentTypeDetector';
import yaml from 'js-yaml';

/**
 * Unified AST node that works for all content types
 */
export interface UnifiedNode {
  type: string;
  position?: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
  value?: string;
  lang?: string;
  children?: UnifiedNode[];
  data?: Record<string, any>;
}

export interface UnifiedAST {
  type: 'root';
  children: UnifiedNode[];
  contentType: ContentTypeInfo;
}

/**
 * Parse content to unified AST based on content type
 */
export function parseContent(content: string, contentType: ContentTypeInfo): UnifiedAST {
  switch (contentType.type) {
    case 'markdown':
      return parseMarkdown(content, contentType);
    case 'code':
      // Special handling for YAML files
      if (contentType.language === 'yaml') {
        return parseYAML(content, contentType);
      }
      return parseCode(content, contentType);
    case 'plaintext':
      return parsePlainText(content, contentType);
    default:
      return parsePlainText(content, contentType);
  }
}

/**
 * Parse Markdown content using remark
 */
function parseMarkdown(content: string, contentType: ContentTypeInfo): UnifiedAST {
  const processor = unified().use(remarkParse).use(remarkGfm);

  const mdast = processor.parse(content) as MdastRoot;

  return {
    type: 'root',
    children: mdast.children as UnifiedNode[],
    contentType,
  };
}

/**
 * Parse code content - treat entire file as single code block
 */
function parseCode(content: string, contentType: ContentTypeInfo): UnifiedAST {
  const lines = content.split('\n');

  return {
    type: 'root',
    contentType,
    children: [
      {
        type: 'code',
        lang: contentType.language || 'text',
        value: content,
        position: {
          start: { line: 1, column: 1, offset: 0 },
          end: {
            line: lines.length,
            column: lines[lines.length - 1].length + 1,
            offset: content.length,
          },
        },
        data: {
          isFullFile: true,
        },
      },
    ],
  };
}

/**
 * Parse plain text content - preserve line structure
 */
function parsePlainText(content: string, contentType: ContentTypeInfo): UnifiedAST {
  const lines = content.split('\n');

  // Create a node for each line
  const children: UnifiedNode[] = lines.map((line, index) => ({
    type: 'text',
    value: line,
    position: {
      start: { line: index + 1, column: 1, offset: 0 },
      end: { line: index + 1, column: line.length + 1, offset: line.length },
    },
  }));

  return {
    type: 'root',
    contentType,
    children,
  };
}

/**
 * Parse YAML content with structure preservation
 */
function parseYAML(content: string, contentType: ContentTypeInfo): UnifiedAST {
  try {
    // Parse YAML to get structure
    const parsed = yaml.load(content, { json: false });

    // Build line map to track which lines belong to which keys
    const lines = content.split('\n');
    const lineMap = buildYAMLLineMap(lines);

    // Convert to UnifiedNode tree with position tracking
    const children = convertYAMLToNodes(parsed, lineMap, []);

    return {
      type: 'root',
      contentType,
      children,
    };
  } catch (error) {
    console.error('YAML parsing error:', error);
    // Fall back to code parsing if YAML is invalid
    return parseCode(content, contentType);
  }
}

/**
 * Build a map of line numbers to YAML keys/values
 */
function buildYAMLLineMap(lines: string[]): Map<string, { line: number; indent: number }> {
  const map = new Map<string, { line: number; indent: number }>();
  const pathStack: Array<{ key: string; indent: number; isArray?: boolean }> = [];
  const arrayCounters = new Map<string, number>();

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const indent = line.length - line.trimStart().length;
    const lineNum = index + 1;

    // Pop stack to current indent level
    while (pathStack.length > 0 && pathStack[pathStack.length - 1].indent >= indent) {
      pathStack.pop();
    }

    // Check if this is an array item
    if (trimmed.startsWith('-')) {
      const parentPath = pathStack.map(p => p.key).join('.');
      const counterKey = parentPath || 'root';
      const itemIndex = arrayCounters.get(counterKey) || 0;
      arrayCounters.set(counterKey, itemIndex + 1);

      const path = parentPath ? `${parentPath}[${itemIndex}]` : `[${itemIndex}]`;
      map.set(path, { line: lineNum, indent });

      // Check if array item has inline key-value
      const inlineKeyMatch = trimmed
        .substring(1)
        .trim()
        .match(/^([^:]+):/);
      if (inlineKeyMatch) {
        const key = inlineKeyMatch[1].trim();
        pathStack.push({ key: `[${itemIndex}].${key}`, indent, isArray: true });
        map.set(`${path}.${key}`, { line: lineNum, indent });
      } else {
        pathStack.push({ key: `[${itemIndex}]`, indent, isArray: true });
      }
    } else {
      // Regular key-value line
      const keyMatch = trimmed.match(/^([^:]+):/);
      if (keyMatch) {
        const key = keyMatch[1].trim();
        const path = [...pathStack.map(p => p.key), key].join('.').replace(/\.\[/g, '[');
        map.set(path, { line: lineNum, indent });
        pathStack.push({ key, indent });

        // Reset array counter for this path
        arrayCounters.set(path, 0);
      }
    }
  });

  return map;
}

/**
 * Convert YAML object to UnifiedNode tree
 */
function convertYAMLToNodes(
  obj: any,
  lineMap: Map<string, { line: number; indent: number }>,
  path: string[]
): UnifiedNode[] {
  if (obj === null || obj === undefined) {
    return [];
  }

  const nodes: UnifiedNode[] = [];

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPath = [...path, `[${index}]`];
      const pathKey = itemPath.join('.').replace(/\.\[/g, '[');

      // Try to find line info for this array item
      let lineInfo = lineMap.get(pathKey);

      // If not found, try without brackets
      if (!lineInfo && path.length > 0) {
        const parentPath = path.join('.');
        lineInfo = lineMap.get(`${parentPath}[${index}]`);
      }

      // Fallback to line 1 if still not found
      if (!lineInfo) {
        lineInfo = { line: 1, indent: 0 };
      }

      nodes.push({
        type: 'yaml_array_item',
        value: typeof item === 'object' || item === null ? undefined : String(item),
        children:
          typeof item === 'object' && item !== null
            ? convertYAMLToNodes(item, lineMap, itemPath)
            : undefined,
        position: {
          start: { line: lineInfo.line, column: lineInfo.indent + 1, offset: 0 },
          end: { line: lineInfo.line, column: 100, offset: 0 },
        },
        data: {
          blockId: `yaml-${pathKey}`,
          path: itemPath,
          indent: lineInfo.indent,
        },
      });
    });
  } else if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      const itemPath = [...path, key];
      const pathKey = itemPath.join('.').replace(/\.\[/g, '[');
      const lineInfo = lineMap.get(pathKey) || { line: 1, indent: 0 };

      nodes.push({
        type: 'yaml_mapping',
        value: typeof value === 'object' || value === null ? undefined : String(value),
        children:
          typeof value === 'object' && value !== null
            ? convertYAMLToNodes(value, lineMap, itemPath)
            : undefined,
        position: {
          start: { line: lineInfo.line, column: lineInfo.indent + 1, offset: 0 },
          end: { line: lineInfo.line, column: 100, offset: 0 },
        },
        data: {
          blockId: `yaml-${pathKey}`,
          path: itemPath,
          key,
          indent: lineInfo.indent,
        },
      });
    });
  }

  return nodes;
}

/**
 * Get line range for a node
 */
export function getNodeLineRange(node: UnifiedNode): { start: number; end: number } | null {
  if (!node.position) {
    return null;
  }

  return {
    start: node.position.start.line,
    end: node.position.end.line,
  };
}

/**
 * Check if a line is within a node's range
 */
export function isLineInNode(line: number, node: UnifiedNode): boolean {
  const range = getNodeLineRange(node);
  if (!range) {
    return false;
  }

  return line >= range.start && line <= range.end;
}
