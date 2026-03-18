// Type definitions (JSDoc for IDE support without TypeScript)

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'user' | 'assistant' | 'error'} role
 * @property {string} content
 * @property {AssistantResult | null} [result]
 * @property {number} timestamp
 */

/**
 * @typedef {Object} AssistantResult
 * @property {string} optimized_prompt
 * @property {string} skill_persona
 * @property {string[]} mcp_suggestions
 */

export {}
