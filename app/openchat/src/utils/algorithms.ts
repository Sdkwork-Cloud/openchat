
/**
 * Calculates the Levenshtein distance between two strings.
 * Used for fuzzy string matching to handle typos and approximate matches.
 * Time Complexity: O(n*m)
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  // 1. Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // 2. Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calculates a similarity score between 0 and 100.
 * 100 = Exact Match
 * > 60 = High Similarity (Probable match with typos)
 */
export const calculateSimilarity = (source: string, target: string): number => {
  if (!source || !target) return 0;
  
  const s = source.toLowerCase();
  const t = target.toLowerCase();
  
  // Optimization: Direct containment check gets high base score
  if (s.includes(t)) return 100;

  const distance = levenshteinDistance(s, t);
  const maxLength = Math.max(s.length, t.length);
  
  if (maxLength === 0) return 100;
  
  const similarity = 1.0 - distance / maxLength;
  return Math.max(0, similarity * 100);
};

/**
 * Calculates the approximate size of data stored in LocalStorage.
 * Returns size in bytes.
 */
export const calculateStorageUsage = (): number => {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += (localStorage[key].length + key.length) * 2; // UTF-16 usually takes 2 bytes per char
    }
  }
  return total;
};

/**
 * Formats bytes into human-readable string (KB, MB).
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Weighted Fisher-Yates Shuffle for Recommendation Systems.
 * Sorts items based on a score, then adds slight randomness to keep the feed fresh.
 */
export const smartRecommendShuffle = <T>(
    items: T[], 
    scoreFn: (item: T) => number, 
    randomnessFactor: number = 0.2
): T[] => {
    // 1. Calculate scores
    const scoredItems = items.map(item => ({
        item,
        score: scoreFn(item) + (Math.random() * randomnessFactor * 100) // Inject noise
    }));

    // 2. Sort by score descending
    scoredItems.sort((a, b) => b.score - a.score);

    // 3. Extract items
    return scoredItems.map(i => i.item);
};
