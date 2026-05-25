export function parseMultiset(str) {
  const multiset = new Map();
  if (!str || str.trim() === '') return multiset;
  str.split(',').forEach(part => {
    part = part.trim();
    if (!part) return;
    const [objRaw, countStr] = part.split(':');
    const obj = objRaw.trim();
    const count = countStr ? parseInt(countStr.trim(), 10) : 1;
    if (obj && !isNaN(count) && count > 0) {
      multiset.set(obj, (multiset.get(obj) || 0) + count);
    }
  });
  return multiset;
}
