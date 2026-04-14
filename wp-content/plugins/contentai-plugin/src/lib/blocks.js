function stripBlockComments(html) {
  return (html || '')
    .replace(/<!--\s+\/?wp:[^>]+-->/g, '')
    .trim();
}

export function normalizeGeneratedBlocks(html, { removeH1 = false } = {}) {
  let content = html || '';

  if (removeH1) {
    content = content
      .replace(/<!-- wp:heading\s*\{[^}]*"level"\s*:\s*1[^}]*\}\s*-->[\s\S]*?<!-- \/wp:heading -->\s*/gi, '')
      .replace(/<h1[^>]*>[\s\S]*?<\/h1>\s*/gi, '');
  }

  const rawHtml = stripBlockComments(content);
  const blocksApi = typeof wp !== 'undefined' ? wp.blocks : null;

  if (!rawHtml) {
    return '';
  }

  if (!blocksApi?.rawHandler || !blocksApi?.serialize) {
    return rawHtml;
  }

  const blocks = blocksApi.rawHandler({ HTML: rawHtml });
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return rawHtml;
  }

  return blocksApi.serialize(blocks);
}
