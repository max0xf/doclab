import type { ExpressiveCodePlugin } from '@expressive-code/core';
import { FileComment } from '../../../../../services/commentsApi';

export interface CommentPluginOptions {
  comments: FileComment[];
  onCommentClick: (lineNumber: number) => void;
}

/**
 * Custom Expressive Code plugin to add comment indicators to code blocks
 * Integrates natively with the rendering pipeline
 */
export function pluginCommentIndicators(options: CommentPluginOptions): ExpressiveCodePlugin {
  const { comments, onCommentClick: _onCommentClick } = options;

  // Group comments by line number
  const commentsByLine = new Map<number, FileComment[]>();
  comments.forEach(comment => {
    const line = comment.computed_line_number;
    if (line !== null) {
      if (!commentsByLine.has(line)) {
        commentsByLine.set(line, []);
      }
      commentsByLine.get(line)!.push(comment);
    }
  });

  return {
    name: 'Comment Indicators',

    hooks: {
      postprocessRenderedBlock: async ({ codeBlock, renderData }) => {
        // Add comment indicators to lines that have comments
        const lines = codeBlock.code.split('\n');

        lines.forEach((_, lineIndex) => {
          const lineNumber = lineIndex + 1;
          const lineComments = commentsByLine.get(lineNumber);

          if (lineComments && lineComments.length > 0) {
            // Add a data attribute to mark lines with comments
            // This will be used for styling and interaction
            const lineElement = renderData.blockAst.children[lineIndex];
            if (lineElement && lineElement.type === 'element') {
              lineElement.properties = lineElement.properties || {};
              lineElement.properties['data-has-comments'] = 'true';
              lineElement.properties['data-comment-count'] = String(lineComments.length);
              lineElement.properties['data-line-number'] = String(lineNumber);
            }
          }
        });

        // Add custom CSS for comment indicators
        const styles = `
          .expressive-code [data-has-comments="true"] {
            position: relative;
            background-color: #fff4e5;
            border-left: 3px solid #ff9800;
            padding-left: 8px;
          }
          
          .expressive-code [data-has-comments="true"]::after {
            content: "💬 " attr(data-comment-count);
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background-color: #ff9800;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            z-index: 10;
          }
          
          .expressive-code [data-has-comments="true"]:hover::after {
            background-color: #f57c00;
          }
        `;

        // Add styles to the document if not already added
        if (typeof document !== 'undefined') {
          const styleId = 'expressive-code-comment-indicators';
          if (!document.getElementById(styleId)) {
            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
          }
        }
      },
    },
  };
}
