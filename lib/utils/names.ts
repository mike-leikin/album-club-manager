/**
 * Extract first name from a full name string
 *
 * @param fullName - The full name (e.g., "John Doe", "Mary Jane Smith")
 * @returns The first name (e.g., "John", "Mary")
 *
 * @example
 * getFirstName("John Doe") // "John"
 * getFirstName("Mary Jane Smith") // "Mary"
 * getFirstName("Prince") // "Prince"
 * getFirstName("") // "Anonymous"
 * getFirstName("  John  ") // "John"
 */
export function getFirstName(fullName: string | null | undefined): string {
  // Handle null, undefined, or empty string
  if (!fullName || !fullName.trim()) {
    return 'Anonymous';
  }

  // Trim and split by whitespace, return first part
  const nameParts = fullName.trim().split(/\s+/);
  return nameParts[0];
}
