import Constants from 'expo-constants';

/**
 * Content Moderation Service
 * 
 * Integrates with Google Perspective API for toxicity detection
 * and provides local profanity checking as a fallback.
 */

interface PerspectiveAPIResponse {
  attributeScores: {
    TOXICITY: {
      summaryScore: {
        value: number;
      };
    };
    SEVERE_TOXICITY?: {
      summaryScore: {
        value: number;
      };
    };
    INSULT?: {
      summaryScore: {
        value: number;
      };
    };
  };
}

interface ModerationResult {
  isSafe: boolean;
  score: number;
  reason?: string;
}

// Toxicity threshold (0.0 to 1.0)
const TOXICITY_THRESHOLD = 0.7;

// Google Perspective API endpoint
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

// Get API key from environment config
const PERSPECTIVE_API_KEY = Constants.expoConfig?.extra?.perspectiveApiKey;

/**
 * Local profanity word list (fallback)
 * This is a small list for demonstration. In production, use a comprehensive list.
 */
const PROFANITY_LIST = [
  // Add profanity words here
  // Keep this list minimal and use Perspective API as primary check
  'badword1',
  'badword2',
  'badword3',
  // ... add more as needed
];

/**
 * Check content using Google Perspective API
 * 
 * @param text - The text content to check
 * @returns Promise with moderation result
 */
export const checkContent = async (text: string): Promise<ModerationResult> => {
  // Skip check for empty text
  if (!text || text.trim().length === 0) {
    return { isSafe: true, score: 0 };
  }

  // Check if API key is configured
  if (!PERSPECTIVE_API_KEY) {
    console.warn('Perspective API key not configured, using local check only');
    const hasLocalProfanity = localProfanityCheck(text);
    return {
      isSafe: !hasLocalProfanity,
      score: hasLocalProfanity ? 1.0 : 0,
      reason: hasLocalProfanity ? 'local_profanity' : undefined,
    };
  }

  try {
    // Call Perspective API
    const response = await fetch(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: {
          text: text,
        },
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
        },
        languages: ['en', 'hi'], // English and Hindi
        doNotStore: true, // Don't store comments in Google's systems
      }),
      // Set timeout to 5 seconds
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Perspective API error: ${response.status}`);
    }

    const data: PerspectiveAPIResponse = await response.json();

    // Get toxicity score
    const toxicityScore = data.attributeScores.TOXICITY.summaryScore.value;
    const severeToxicityScore = data.attributeScores.SEVERE_TOXICITY?.summaryScore.value || 0;
    const insultScore = data.attributeScores.INSULT?.summaryScore.value || 0;

    // Use the highest score
    const maxScore = Math.max(toxicityScore, severeToxicityScore, insultScore);

    // Determine if content is safe
    const isSafe = maxScore < TOXICITY_THRESHOLD;

    return {
      isSafe,
      score: maxScore,
      reason: !isSafe ? 'toxicity_detected' : undefined,
    };
  } catch (error) {
    // Fail open - don't block posts if moderation API is down
    console.error('Error checking content with Perspective API:', error);

    // Log the failure for monitoring
    logModerationFailure(text, error);

    // Fall back to local profanity check
    const hasLocalProfanity = localProfanityCheck(text);

    if (hasLocalProfanity) {
      return {
        isSafe: false,
        score: 1.0,
        reason: 'local_profanity',
      };
    }

    // If local check passes and API failed, allow the content
    return {
      isSafe: true,
      score: 0,
      reason: 'api_failure_fallback',
    };
  }
};

/**
 * Local profanity check (fallback)
 * 
 * @param text - The text content to check
 * @returns true if profanity is detected
 */
export const localProfanityCheck = (text: string): boolean => {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();

  // Check for exact word matches (with word boundaries)
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) {
      return true;
    }
  }

  // Check for common obfuscation patterns
  // e.g., "b@dword", "b4dword", "b a d w o r d"
  const normalizedText = lowerText
    .replace(/[@4$]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[5]/g, 's')
    .replace(/\s+/g, ''); // Remove spaces

  for (const word of PROFANITY_LIST) {
    if (normalizedText.includes(word)) {
      return true;
    }
  }

  return false;
};

/**
 * Check multiple text fields at once
 * 
 * @param fields - Object with field names and text values
 * @returns Promise with moderation results for each field
 */
export const checkMultipleFields = async (
  fields: Record<string, string>
): Promise<Record<string, ModerationResult>> => {
  const results: Record<string, ModerationResult> = {};

  // Check all fields in parallel
  const checks = Object.entries(fields).map(async ([fieldName, text]) => {
    const result = await checkContent(text);
    return { fieldName, result };
  });

  const allResults = await Promise.all(checks);

  // Build results object
  allResults.forEach(({ fieldName, result }) => {
    results[fieldName] = result;
  });

  return results;
};

/**
 * Get user-friendly error message based on moderation result
 * 
 * @param result - Moderation result
 * @returns User-friendly error message
 */
export const getModerationErrorMessage = (result: ModerationResult): string => {
  if (result.isSafe) {
    return '';
  }

  if (result.reason === 'local_profanity') {
    return 'Your content contains inappropriate language. Please revise and try again.';
  }

  if (result.reason === 'toxicity_detected') {
    if (result.score >= 0.9) {
      return 'Your content contains highly inappropriate or offensive language. Please revise and try again.';
    } else if (result.score >= 0.8) {
      return 'Your content may be offensive to others. Please consider revising it.';
    } else {
      return 'Your content may contain inappropriate language. Please review and revise if needed.';
    }
  }

  return 'Your content could not be verified. Please try again.';
};

/**
 * Log moderation API failures for monitoring
 * 
 * @param text - The text that was being checked
 * @param error - The error that occurred
 */
const logModerationFailure = (text: string, error: any): void => {
  // In production, send this to your logging/monitoring service
  // e.g., Sentry, LogRocket, Firebase Crashlytics, etc.
  
  const logData = {
    timestamp: new Date().toISOString(),
    textLength: text.length,
    errorMessage: error.message || 'Unknown error',
    errorType: error.name || 'Error',
  };

  console.error('Moderation API failure:', logData);

  // TODO: Send to monitoring service
  // Example with Firebase Analytics:
  // logEvent('moderation_api_failure', logData);
};

/**
 * Validate text length before moderation
 * Perspective API has a 20,480 character limit
 * 
 * @param text - The text to validate
 * @returns true if text is within limits
 */
export const validateTextLength = (text: string): boolean => {
  const MAX_LENGTH = 20480; // Perspective API limit
  return text.length <= MAX_LENGTH;
};

/**
 * Sanitize text before sending to API
 * Remove excessive whitespace and normalize
 * 
 * @param text - The text to sanitize
 * @returns Sanitized text
 */
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double newline
};

/**
 * Check if moderation is required for a given text
 * Skip moderation for very short texts
 * 
 * @param text - The text to check
 * @returns true if moderation is required
 */
export const shouldModerate = (text: string): boolean => {
  const MIN_LENGTH = 3; // Don't moderate very short texts
  return text.trim().length >= MIN_LENGTH;
};

/**
 * Batch check multiple texts
 * Useful for checking multiple user inputs at once
 * 
 * @param texts - Array of texts to check
 * @returns Promise with array of moderation results
 */
export const batchCheckContent = async (
  texts: string[]
): Promise<ModerationResult[]> => {
  // Check all texts in parallel
  const checks = texts.map((text) => checkContent(text));
  return Promise.all(checks);
};

/**
 * Check if any result in a batch failed moderation
 * 
 * @param results - Array of moderation results
 * @returns true if any result is unsafe
 */
export const hasUnsafeContent = (results: ModerationResult[]): boolean => {
  return results.some((result) => !result.isSafe);
};

/**
 * Get the worst (highest) toxicity score from a batch
 * 
 * @param results - Array of moderation results
 * @returns Highest toxicity score
 */
export const getWorstScore = (results: ModerationResult[]): number => {
  return Math.max(...results.map((result) => result.score));
};

/**
 * Generate content hash for duplicate detection
 * 
 * @param name - Circle name
 * @param pitch - Circle pitch
 * @param tags - Circle tags
 * @returns Hash string
 */
export const generateContentHash = (
  name: string,
  pitch: string,
  tags: string[]
): string => {
  // Normalize text: lowercase, remove extra spaces, remove punctuation
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedName = normalize(name);
  const normalizedPitch = normalize(pitch);
  const normalizedTags = tags.map(normalize).sort().join(',');

  // Simple hash: combine normalized strings
  const combined = `${normalizedName}|${normalizedPitch}|${normalizedTags}`;
  
  // Create a simple hash (for production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (0-1, where 1 is identical)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  
  return 1 - distance / maxLength;
};
