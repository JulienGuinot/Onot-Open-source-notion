/**
 * Generates a unique ID with an optional prefix.
 * Centralized to avoid scattered Date.now() + Math.random() patterns.
 */
export function generateId(prefix: string = ''): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return prefix ? `${prefix}-${id}` : id;
}
