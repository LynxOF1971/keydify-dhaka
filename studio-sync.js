/* Merge independent edits without overwriting changes made on another device. */
window.KeydifyDraft = (() => {
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function merge(base, draft, latest) {
    const conflicts = [];
    function visit(b, d, r, path) {
      if (equal(d, b)) return r;
      if (equal(r, b) || equal(d, r)) return d;
      const object = v => v && typeof v === 'object' && !Array.isArray(v);
      if (object(d) && object(r) && (object(b) || b === undefined)) {
        const result = {};
        for (const key of new Set([...Object.keys(b || {}), ...Object.keys(d), ...Object.keys(r)])) {
          const value = visit(b?.[key], d[key], r[key], path ? `${path}.${key}` : key);
          if (value !== undefined) result[key] = value;
        }
        return result;
      }
      const keyed = a => Array.isArray(a) && a.every(v => v && typeof v.id === 'string');
      if (keyed(b) && keyed(d) && keyed(r)) {
        const ids = a => a.map(v => v.id);
        const baseIds = ids(b), draftIds = ids(d), remoteIds = ids(r);
        let order;
        if (equal(draftIds, baseIds)) order = remoteIds;
        else if (equal(remoteIds, baseIds) || equal(draftIds, remoteIds)) order = draftIds;
        else {
          // Independent additions/deletions retain remote order; simultaneous reorder needs review.
          const common = baseIds.filter(id => draftIds.includes(id) && remoteIds.includes(id));
          const project = list => list.filter(id => common.includes(id));
          if (!equal(project(draftIds), project(remoteIds))) conflicts.push(`${path} order`);
          order = [...remoteIds, ...draftIds.filter(id => !remoteIds.includes(id))];
        }
        const values = new Map();
        for (const id of new Set([...baseIds, ...draftIds, ...remoteIds])) {
          const value = visit(b.find(v => v.id === id), d.find(v => v.id === id), r.find(v => v.id === id), `${path}[${id}]`);
          if (value !== undefined) values.set(id, value);
        }
        return [...new Set([...order, ...values.keys()])].filter(id => values.has(id)).map(id => values.get(id));
      }
      conflicts.push(path); return d;
    }
    return { data: visit(base, draft, latest, ''), conflicts };
  }
  return { merge };
})();
