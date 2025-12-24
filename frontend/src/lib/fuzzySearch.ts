import Fuse, { IFuseOptions } from 'fuse.js'

/**
 * Creates a fuzzy search function for a list of items.
 * Combines Levenshtein distance matching with token-based search.
 *
 * @param items - The array of items to search
 * @param keys - The keys to search in (e.g., ['name', 'address'])
 * @param options - Additional Fuse.js options
 * @returns A search function that takes a query and returns filtered items
 */
export function createFuzzySearch<T>(
  items: T[],
  keys: string[],
  options?: Partial<IFuseOptions<T>>
) {
  const defaultOptions: IFuseOptions<T> = {
    // Keys to search in
    keys,
    // Include score in results (lower is better match)
    includeScore: true,
    // Threshold: 0.0 = exact match, 1.0 = match anything
    // 0.4 is a good balance for typo tolerance
    threshold: 0.4,
    // Ignore location of match in string
    ignoreLocation: true,
    // Use extended search for token matching
    useExtendedSearch: true,
    // Minimum characters before search kicks in
    minMatchCharLength: 1,
    // Find matches within words
    findAllMatches: true,
    // Sort by score
    shouldSort: true,
    ...options,
  }

  const fuse = new Fuse(items, defaultOptions)

  return (query: string): T[] => {
    if (!query || query.trim() === '') {
      return items
    }

    // For multi-word queries, search for each word
    const trimmedQuery = query.trim()

    // Use Fuse.js search
    const results = fuse.search(trimmedQuery)

    return results.map(result => result.item)
  }
}

/**
 * Hook-friendly fuzzy search that returns filtered items
 *
 * @param items - The array of items to search
 * @param keys - The keys to search in
 * @param query - The search query
 * @param options - Additional Fuse.js options
 * @returns Filtered items matching the query
 */
export function fuzzyFilter<T>(
  items: T[],
  keys: string[],
  query: string,
  options?: Partial<IFuseOptions<T>>
): T[] {
  if (!query || query.trim() === '') {
    return items
  }

  if (!items || items.length === 0) {
    return []
  }

  const defaultOptions: IFuseOptions<T> = {
    keys,
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 1,
    findAllMatches: true,
    shouldSort: true,
    ...options,
  }

  const fuse = new Fuse(items, defaultOptions)
  const results = fuse.search(query.trim())

  return results.map(result => result.item)
}
