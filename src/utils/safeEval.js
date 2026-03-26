/**
 * Safe Expression Evaluator
 *
 * Uses expr-eval library instead of unsafe new Function() or eval()
 * to prevent code injection vulnerabilities.
 *
 * Supports:
 * - Arithmetic: +, -, *, /, %, ^
 * - Comparison: ==, !=, <, >, <=, >=
 * - Logical: and, or, not, &&, ||, !
 * - Ternary: condition ? trueValue : falseValue
 * - Functions: abs, ceil, floor, round, min, max, sqrt, etc.
 */

import { Parser } from 'expr-eval';

// Create a parser instance with safe defaults
const parser = new Parser({
    allowMemberAccess: false, // Prevent accessing object properties for security
});

// Add custom operators for JavaScript-style syntax
parser.consts = {
    ...parser.consts,
    true: true,
    false: false,
    null: null,
    undefined: undefined,
};

/**
 * Safely evaluate a mathematical/logical expression
 *
 * @param {string} expression - The expression to evaluate (e.g., "a + b * 100 / c")
 * @param {Object} variables - Object with variable values
 * @returns {number|boolean|null} Calculated value or null on error
 *
 * @example
 * safeEvaluate("a + b", { a: 10, b: 20 }) // returns 30
 * safeEvaluate("price * quantity", { price: 100, quantity: 5 }) // returns 500
 * safeEvaluate("a > b", { a: 10, b: 5 }) // returns true
 */
export function safeEvaluate(expression, variables = {}) {
    if (!expression || typeof expression !== 'string') {
        return null;
    }

    try {
        // Parse the expression
        const parsed = parser.parse(expression);

        // Evaluate with provided variables
        const result = parsed.evaluate(variables);

        // Validate result for numeric expressions
        if (typeof result === 'number') {
            if (isNaN(result) || !isFinite(result)) {
                return null;
            }
        }

        return result;
    } catch (err) {
        // Log for debugging but don't expose errors
        if (import.meta.env?.DEV) {
            console.warn('[safeEval] Expression evaluation error:', expression, err.message);
        }
        return null;
    }
}

/**
 * Safely evaluate a boolean/conditional expression
 * Used for depends_on evaluations
 *
 * @param {string} expression - The expression to evaluate
 * @param {Object} variables - Object with variable values (typically doc fields)
 * @returns {boolean} Result of evaluation, defaults to true on error
 *
 * @example
 * safeEvaluateBoolean("status == 'Active'", { status: 'Active' }) // returns true
 * safeEvaluateBoolean("amount > 0 and quantity > 0", { amount: 100, quantity: 5 }) // returns true
 */
export function safeEvaluateBoolean(expression, variables = {}) {
    if (!expression || typeof expression !== 'string') {
        return true; // Default to showing field if no expression
    }

    try {
        // Normalize expression syntax from JavaScript to expr-eval format
        let normalizedExpr = expression
            // Convert === to == (expr-eval uses == for equality)
            .replace(/===/g, '==')
            // Convert !== to !=
            .replace(/!==/g, '!=')
            // Convert && to 'and'
            .replace(/&&/g, ' and ')
            // Convert || to 'or'
            .replace(/\|\|/g, ' or ')
            // Convert ! to 'not ' (only when followed by word char or paren)
            .replace(/!(?=[a-zA-Z(])/g, 'not ');

        // Parse and evaluate
        const parsed = parser.parse(normalizedExpr);
        const result = parsed.evaluate(variables);

        return Boolean(result);
    } catch (err) {
        if (import.meta.env?.DEV) {
            console.warn('[safeEval] Boolean expression evaluation error:', expression, err.message);
        }
        return true; // Default to true (show field) on error
    }
}

/**
 * Check if an expression is safe to evaluate
 *
 * @param {string} expression - The expression to check
 * @returns {boolean} Whether the expression can be safely parsed
 */
export function isValidExpression(expression) {
    if (!expression || typeof expression !== 'string') {
        return false;
    }

    try {
        parser.parse(expression);
        return true;
    } catch {
        return false;
    }
}

export default {
    safeEvaluate,
    safeEvaluateBoolean,
    isValidExpression,
};
