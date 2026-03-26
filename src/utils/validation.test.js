import { describe, it, expect } from 'vitest';
import {
    isValidEmail,
    isValidPhone,
    isValidUrl,
    isRequired,
    minLength,
    maxLength,
    inRange,
    isPositive,
    isNonNegative,
    isNotPastDate,
    isNotFutureDate,
    isAlphanumeric,
    matchesPattern,
    sanitizeString,
    validateFrappeField,
    validateForm,
    createValidator
} from './validation';

describe('isValidEmail', () => {
    it('should validate correct emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co')).toBe(true);
        expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail('notanemail')).toBe(false);
        expect(isValidEmail('missing@domain')).toBe(false);
        expect(isValidEmail('@nodomain.com')).toBe(false);
        expect(isValidEmail(null)).toBe(false);
        expect(isValidEmail(undefined)).toBe(false);
    });
});

describe('isValidPhone', () => {
    it('should validate correct phone numbers', () => {
        expect(isValidPhone('+1234567890')).toBe(true);
        expect(isValidPhone('123-456-7890')).toBe(true);
        expect(isValidPhone('(123) 456-7890')).toBe(true);
        expect(isValidPhone('+855 12 345 678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
        expect(isValidPhone('')).toBe(false);
        expect(isValidPhone('123')).toBe(false);
        expect(isValidPhone('abcdefghij')).toBe(false);
        expect(isValidPhone(null)).toBe(false);
    });
});

describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://localhost:3000')).toBe(true);
        expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
        expect(isValidUrl('')).toBe(false);
        expect(isValidUrl('not a url')).toBe(false);
        expect(isValidUrl('example.com')).toBe(false);
        expect(isValidUrl(null)).toBe(false);
    });
});

describe('isRequired', () => {
    it('should pass for non-empty values', () => {
        expect(isRequired('text')).toBe(true);
        expect(isRequired(0)).toBe(true);
        expect(isRequired(false)).toBe(true);
        expect(isRequired([1, 2])).toBe(true);
    });

    it('should fail for empty values', () => {
        expect(isRequired('')).toBe(false);
        expect(isRequired('   ')).toBe(false);
        expect(isRequired(null)).toBe(false);
        expect(isRequired(undefined)).toBe(false);
        expect(isRequired([])).toBe(false);
    });
});

describe('minLength', () => {
    it('should validate minimum length', () => {
        expect(minLength('hello', 3)).toBe(true);
        expect(minLength('hi', 2)).toBe(true);
        expect(minLength('  hi  ', 2)).toBe(true); // trimmed
    });

    it('should fail for short strings', () => {
        expect(minLength('hi', 5)).toBe(false);
        expect(minLength('', 1)).toBe(false);
        expect(minLength(null, 1)).toBe(false);
    });
});

describe('maxLength', () => {
    it('should validate maximum length', () => {
        expect(maxLength('hi', 5)).toBe(true);
        expect(maxLength('hello', 5)).toBe(true);
        expect(maxLength('', 5)).toBe(true);
        expect(maxLength(null, 5)).toBe(true);
    });

    it('should fail for long strings', () => {
        expect(maxLength('hello world', 5)).toBe(false);
    });
});

describe('inRange', () => {
    it('should validate number in range', () => {
        expect(inRange(5, 1, 10)).toBe(true);
        expect(inRange(1, 1, 10)).toBe(true);
        expect(inRange(10, 1, 10)).toBe(true);
        expect(inRange('5', 1, 10)).toBe(true);
    });

    it('should fail for out of range', () => {
        expect(inRange(0, 1, 10)).toBe(false);
        expect(inRange(11, 1, 10)).toBe(false);
        expect(inRange('abc', 1, 10)).toBe(false);
    });
});

describe('isPositive', () => {
    it('should validate positive numbers', () => {
        expect(isPositive(1)).toBe(true);
        expect(isPositive(100)).toBe(true);
        expect(isPositive('5')).toBe(true);
    });

    it('should fail for non-positive', () => {
        expect(isPositive(0)).toBe(false);
        expect(isPositive(-1)).toBe(false);
        expect(isPositive('abc')).toBe(false);
    });
});

describe('isNonNegative', () => {
    it('should validate non-negative numbers', () => {
        expect(isNonNegative(0)).toBe(true);
        expect(isNonNegative(1)).toBe(true);
        expect(isNonNegative('5')).toBe(true);
    });

    it('should fail for negative', () => {
        expect(isNonNegative(-1)).toBe(false);
        expect(isNonNegative('abc')).toBe(false);
    });
});

describe('isNotPastDate', () => {
    it('should validate future or today dates', () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        expect(isNotPastDate(today)).toBe(true);
        expect(isNotPastDate(tomorrow)).toBe(true);
    });

    it('should fail for past dates', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        expect(isNotPastDate(yesterday)).toBe(false);
        expect(isNotPastDate(null)).toBe(false);
    });
});

describe('isNotFutureDate', () => {
    it('should validate past or today dates', () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        expect(isNotFutureDate(today)).toBe(true);
        expect(isNotFutureDate(yesterday)).toBe(true);
    });

    it('should fail for future dates', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        expect(isNotFutureDate(tomorrow)).toBe(false);
        expect(isNotFutureDate(null)).toBe(false);
    });
});

describe('isAlphanumeric', () => {
    it('should validate alphanumeric strings', () => {
        expect(isAlphanumeric('abc123')).toBe(true);
        expect(isAlphanumeric('ABC')).toBe(true);
        expect(isAlphanumeric('123')).toBe(true);
    });

    it('should fail for non-alphanumeric', () => {
        expect(isAlphanumeric('abc 123')).toBe(false);
        expect(isAlphanumeric('abc-123')).toBe(false);
        expect(isAlphanumeric('')).toBe(false);
        expect(isAlphanumeric(null)).toBe(false);
    });
});

describe('matchesPattern', () => {
    it('should validate pattern match', () => {
        expect(matchesPattern('ABC123', /^[A-Z]+[0-9]+$/)).toBe(true);
        expect(matchesPattern('test', /^test$/)).toBe(true);
    });

    it('should fail for non-matching', () => {
        expect(matchesPattern('abc', /^[0-9]+$/)).toBe(false);
        expect(matchesPattern('', /^.+$/)).toBe(false);
    });
});

describe('sanitizeString', () => {
    it('should escape HTML characters', () => {
        expect(sanitizeString('<script>')).toBe('&lt;script&gt;');
        expect(sanitizeString('"test"')).toBe('&quot;test&quot;');
        expect(sanitizeString("'test'")).toBe('&#x27;test&#x27;');
        expect(sanitizeString('a & b')).toBe('a &amp; b');
    });

    it('should handle empty/null', () => {
        expect(sanitizeString('')).toBe('');
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
    });
});

describe('validateFrappeField', () => {
    it('should validate required fields', () => {
        const result = validateFrappeField('', { fieldtype: 'Data', reqd: 1 });
        expect(result.valid).toBe(false);
        expect(result.error).toBe('validation.required');
    });

    it('should pass for valid email', () => {
        const result = validateFrappeField('test@example.com', {
            fieldtype: 'Data',
            fieldname: 'email_id',
            reqd: 1
        });
        expect(result.valid).toBe(true);
    });

    it('should fail for invalid email', () => {
        const result = validateFrappeField('invalid', {
            fieldtype: 'Data',
            fieldname: 'email_id',
            reqd: 1
        });
        expect(result.valid).toBe(false);
    });

    it('should validate integers', () => {
        expect(validateFrappeField('123', { fieldtype: 'Int' }).valid).toBe(true);
        expect(validateFrappeField('abc', { fieldtype: 'Int' }).valid).toBe(false);
    });

    it('should validate percentages', () => {
        expect(validateFrappeField('50', { fieldtype: 'Percent' }).valid).toBe(true);
        expect(validateFrappeField('150', { fieldtype: 'Percent' }).valid).toBe(false);
    });

    it('should validate select options', () => {
        const field = { fieldtype: 'Select', options: 'Option1\nOption2\nOption3' };
        expect(validateFrappeField('Option1', field).valid).toBe(true);
        expect(validateFrappeField('InvalidOption', field).valid).toBe(false);
    });
});

describe('validateForm', () => {
    it('should validate entire form', () => {
        const fields = [
            { fieldname: 'name', fieldtype: 'Data', reqd: 1 },
            { fieldname: 'email', fieldtype: 'Data', reqd: 1 },
            { fieldname: 'Section Break', fieldtype: 'Section Break' }
        ];

        const formData = { name: 'Test', email: 'test@example.com' };
        const result = validateForm(formData, fields);

        expect(result.valid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return errors for invalid form', () => {
        const fields = [
            { fieldname: 'name', fieldtype: 'Data', reqd: 1 },
            { fieldname: 'email', fieldtype: 'Data', reqd: 1 }
        ];

        const formData = { name: '', email: '' };
        const result = validateForm(formData, fields);

        expect(result.valid).toBe(false);
        expect(result.errors.name).toBeDefined();
        expect(result.errors.email).toBeDefined();
    });
});

describe('createValidator', () => {
    it('should create validator with required rule', () => {
        const validator = createValidator({
            required: { message: 'Field is required' }
        });

        expect(validator('')).toBe('Field is required');
        expect(validator('value')).toBeNull();
    });

    it('should create validator with email rule', () => {
        const validator = createValidator({
            email: { message: 'Invalid email' }
        });

        expect(validator('invalid')).toBe('Invalid email');
        expect(validator('test@example.com')).toBeNull();
    });

    it('should create validator with multiple rules', () => {
        const validator = createValidator({
            required: true,
            minLength: { value: 3, message: 'Too short' },
            maxLength: { value: 10, message: 'Too long' }
        });

        expect(validator('')).toBe('validation.required');
        expect(validator('ab')).toBe('Too short');
        expect(validator('this is way too long')).toBe('Too long');
        expect(validator('valid')).toBeNull();
    });

    it('should support custom validation', () => {
        const validator = createValidator({
            custom: {
                validate: (value) => value !== 'forbidden' ? null : 'This value is forbidden'
            }
        });

        expect(validator('forbidden')).toBe('This value is forbidden');
        expect(validator('allowed')).toBeNull();
    });
});
