export function nodeUniqueId(node: { id?: string }): string {
  return node?.id || 'mock-unique-id';
}
