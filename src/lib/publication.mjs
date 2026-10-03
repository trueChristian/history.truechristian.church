/**
 * Reversible, build-time publication holds. Source files are never modified.
 * Pass the repository policy explicitly; do not include it in public assets.
 * Apply the record filter after source overrides and locale overlays so those
 * inputs cannot restore held records, links, or prose to published output.
 */
const OMIT = Symbol('omit from publication');
const identityFields = new Set(['slug', 'contentId', 'recordSlug']);
const relationshipFields = new Set([
  'people', 'traditions', 'places', 'sourceAccounts', 'relatedAccounts',
  'recordSlugs', 'preservedSourceAccounts', 'relatedRecords',
]);

export function validatePublicationPolicy(policy) {
  if (policy?.schemaVersion !== 1) throw new Error('Unsupported publication policy');
  const slugs = policy.excludedRecordSlugs;
  if (!Array.isArray(slugs) || slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) || new Set(slugs).size !== slugs.length) {
    throw new Error('Publication exclusions must be unique record slugs');
  }
  if (!Array.isArray(policy.organizationReferences) || policy.organizationReferences.some(term =>
    typeof term !== 'string' || !term.trim() || !/[\s./-]/.test(term.trim()))) {
    throw new Error('Publication references must identify organizations, not generic words');
  }
  for (const [slug, replacements] of Object.entries(policy.recordTextReplacements || {})) {
    if (!/^[a-z0-9-]+$/.test(slug) || !Array.isArray(replacements) || replacements.some(item =>
      typeof item?.from !== 'string' || !item.from || typeof item.to !== 'string')) {
      throw new Error('Invalid publication text replacement');
    }
  }
  return true;
}

const normalized = value => value.normalize('NFKC').replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ').toLowerCase();
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function contextFor(policy, additionalSlugs = []) {
  validatePublicationPolicy(policy);
  const terms = [...policy.excludedRecordSlugs, ...additionalSlugs, ...policy.organizationReferences].map(value => escaped(normalized(value)));
  // Whole terms avoid treating ordinary biblical language as an organization.
  const expression = terms.length ? new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${terms.join('|')})(?=$|[^\\p{L}\\p{N}])`, 'u') : null;
  return {
    excluded: new Set([...policy.excludedRecordSlugs, ...additionalSlugs]),
    mentions: value => typeof value === 'string' && !!expression?.test(normalized(value)),
    replacements: policy.recordTextReplacements || {},
  };
}

/** True for a named held organization, held identifier, or link to one. */
export function containsWithheldReference(value, policy) {
  return contextFor(policy).mentions(value);
}

function containsReference(value, context) {
  if (typeof value === 'string') return context.mentions(value);
  if (Array.isArray(value)) return value.some(item => containsReference(item, context));
  return !!value && typeof value === 'object' && Object.values(value).some(item => containsReference(item, context));
}

function heldIdentity(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return [...identityFields].some(field => context.excluded.has(value[field]));
}

function replaceText(value, replacements) {
  if (typeof value === 'string') return replacements.reduce((text, {from, to}) => text.replaceAll(from, to), value);
  if (Array.isArray(value)) return value.map(item => replaceText(item, replacements));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceText(item, replacements)]));
  return value;
}

/** Return a detached public projection, never an edited source object. */
function clean(value, context, field = '') {
  if (typeof value === 'string') return context.mentions(value) ? OMIT : value;
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (relationshipFields.has(field) && context.excluded.has(item)) return [];
      // A reference is atomic: do not publish a label whose destination was held.
      if (field === 'references' && containsReference(item, context)) return [];
      const projected = clean(item, context);
      return projected === OMIT ? [] : [projected];
    });
  }
  if (value && typeof value === 'object') {
    if (heldIdentity(value, context)) return OMIT;
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (context.excluded.has(key)) continue;
      const projected = clean(item, context, key);
      if (projected !== OMIT) result[key] = projected;
    }
    return result;
  }
  return value;
}

/** Filter records and all relationship lists, including rendered/search prose. */
export function filterPublicRecords(records, policy) {
  const initial = contextFor(policy);
  // A newly added record named for a held organization is held as well, even
  // before its new identifier has been added to the repository policy.
  const additionalSlugs = records.filter(record => initial.mentions(record.title)).map(record => record.slug);
  const context = additionalSlugs.length ? contextFor(policy, additionalSlugs) : initial;
  return records.flatMap(record => {
    if (context.excluded.has(record.slug)) return [];
    const source = replaceText(record, context.replacements[record.slug] || []);
    const projected = clean(source, context);
    if (projected === OMIT) return [];
    if (Array.isArray(projected.paragraphs) && (!projected.html || source.text !== projected.text || JSON.stringify(source.paragraphs) !== JSON.stringify(projected.paragraphs))) {
      projected.text = projected.paragraphs.join('\n\n');
    }
    if (typeof projected.text === 'string' && Object.hasOwn(record, 'textLength')) projected.textLength = projected.text.length;
    // Precomputed search text must be rebuilt from the actual public prose.
    if (Object.hasOwn(record, 'normalized')) delete projected.normalized;
    return [projected];
  });
}

/** Remove held graph nodes, incident edges, and now-empty family headings. */
export function filterPublicBranches(branches, policy, publicRecords) {
  const context = contextFor(policy);
  const publicSlugs = publicRecords ? new Set(publicRecords.map(record => record.slug)) : null;
  const nodes = (branches.nodes || []).filter(node => !heldIdentity(node, context) && !containsReference(node, context) && (!publicSlugs || publicSlugs.has(node.slug))).map(node => clean(node, context));
  const retained = new Set(nodes.map(node => node.slug));
  const edges = (branches.edges || []).filter(edge => retained.has(edge.from) && retained.has(edge.to) && !containsReference(edge, context)).map(edge => clean(edge, context));
  const families = (branches.families || []).filter(family => nodes.some(node => node.family === family.id) && !containsReference(family, context)).map(family => clean(family, context));
  return {...clean(branches, context), nodes, edges, families};
}

/**
 * Public source-coverage projection. Remove organization-specific rows entirely;
 * keep unrelated mixed rows with held links and prose removed. Historical audit
 * totals remain historical; page totals must use the projected arrays' lengths.
 */
export function filterPublicCoverage(coverage, policy) {
  if (coverage == null) return coverage;
  const context = contextFor(policy);
  function project(value, field = '') {
    if (Array.isArray(value)) return value.flatMap(item => {
      if (field === 'references' && containsReference(item, context)) return [];
      if (heldIdentity(item, context)) return [];
      if (item && typeof item === 'object' && ['title', 'label', 'name', 'name_as_printed', 'legible_text'].some(key => context.mentions(item[key]))) return [];
      const result = project(item, field);
      return result === OMIT ? [] : [result];
    });
    if (value && typeof value === 'object') {
      if (heldIdentity(value, context)) return OMIT;
      return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
        if (context.excluded.has(key)) return [];
        const result = project(item, key);
        return result === OMIT ? [] : [[key, result]];
      }));
    }
    return clean(value, context, field);
  }
  const projected = project(coverage);
  return projected === OMIT ? null : projected;
}
