import { CommentThread, AiFinding } from '../shared/types';

export class ExportService {
  exportToMarkdown(threads: CommentThread[], findings: AiFinding[]): string {
    let md = '# Code Review Report\n\n';
    md += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Summary
    const openThreads = threads.filter(t => t.status === 'open');
    const resolvedThreads = threads.filter(t => t.status === 'resolved');
    const aiThreads = threads.filter(t => t.origin === 'ai');

    md += '## Summary\n\n';
    md += `- Total comments: ${threads.length}\n`;
    md += `- Open: ${openThreads.length}\n`;
    md += `- Resolved: ${resolvedThreads.length}\n`;
    md += `- AI findings: ${aiThreads.length}\n\n`;

    // Group by file
    const byFile = new Map<string, CommentThread[]>();
    for (const thread of threads) {
      const file = thread.anchor.filePath;
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push(thread);
    }

    md += '## Comments by File\n\n';

    for (const [file, fileThreads] of byFile.entries()) {
      md += `### ${file}\n\n`;

      // Sort by line number
      fileThreads.sort((a, b) => a.anchor.lineNumber - b.anchor.lineNumber);

      for (const thread of fileThreads) {
        const statusBadge = thread.status === 'open' ? '🔴' : thread.status === 'resolved' ? '✅' : '⚠️';
        const originBadge = thread.origin === 'ai' ? '🤖' : '👤';
        const severityBadge = thread.severity ? `[${thread.severity.toUpperCase()}]` : '';

        md += `#### ${statusBadge} ${originBadge} Line ${thread.anchor.lineNumber} ${severityBadge}\n\n`;

        for (const comment of thread.comments) {
          md += `**${comment.author}** (${new Date(comment.createdAt).toLocaleString()}):\n\n`;
          md += `${comment.body}\n\n`;
        }

        md += '---\n\n';
      }
    }

    return md;
  }
}
