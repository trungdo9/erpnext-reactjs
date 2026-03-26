import { describe, it, expect } from 'vitest';
import { evaluateDependsOn, validateMandatory, getEffectiveStatus } from './formUtils';

describe('evaluateDependsOn', () => {
    describe('simple field checks', () => {
        it('returns true for truthy field value', () => {
            const doc = { status: 'Active' };
            expect(evaluateDependsOn('status', doc)).toBe(true);
        });

        it('returns false for falsy field value', () => {
            const doc = { status: '' };
            expect(evaluateDependsOn('status', doc)).toBe(false);
        });

        it('returns true for null/undefined expression', () => {
            expect(evaluateDependsOn(null, {})).toBe(true);
            expect(evaluateDependsOn(undefined, {})).toBe(true);
            expect(evaluateDependsOn('', {})).toBe(true);
        });
    });

    describe('eval: expressions', () => {
        it('evaluates simple truthy check: eval:doc.field', () => {
            expect(evaluateDependsOn('eval:doc.active', { active: true })).toBe(true);
            expect(evaluateDependsOn('eval:doc.active', { active: false })).toBe(false);
            expect(evaluateDependsOn('eval:doc.active', { active: 0 })).toBe(false);
            expect(evaluateDependsOn('eval:doc.active', { active: 'yes' })).toBe(true);
        });

        it('evaluates equality comparison: doc.field == value', () => {
            const doc = { status: 'Draft', count: 5 };
            expect(evaluateDependsOn("eval:doc.status == 'Draft'", doc)).toBe(true);
            expect(evaluateDependsOn("eval:doc.status == 'Active'", doc)).toBe(false);
            expect(evaluateDependsOn('eval:doc.count == 5', doc)).toBe(true);
            expect(evaluateDependsOn('eval:doc.count == 10', doc)).toBe(false);
        });

        it('evaluates inequality comparison: doc.field != value', () => {
            const doc = { status: 'Draft' };
            expect(evaluateDependsOn("eval:doc.status != 'Active'", doc)).toBe(true);
            expect(evaluateDependsOn("eval:doc.status != 'Draft'", doc)).toBe(false);
        });

        it('evaluates greater/less than comparisons', () => {
            const doc = { amount: 100 };
            expect(evaluateDependsOn('eval:doc.amount > 50', doc)).toBe(true);
            expect(evaluateDependsOn('eval:doc.amount > 200', doc)).toBe(false);
            expect(evaluateDependsOn('eval:doc.amount < 200', doc)).toBe(true);
            expect(evaluateDependsOn('eval:doc.amount >= 100', doc)).toBe(true);
            expect(evaluateDependsOn('eval:doc.amount <= 100', doc)).toBe(true);
        });

        it('evaluates in_list function', () => {
            const doc = { status: 'Draft' };
            expect(evaluateDependsOn("eval:in_list(['Draft', 'Pending'], doc.status)", doc)).toBe(true);
            expect(evaluateDependsOn("eval:in_list(['Active', 'Completed'], doc.status)", doc)).toBe(false);
        });

        it('evaluates not_in_list function', () => {
            const doc = { status: 'Active' };
            expect(evaluateDependsOn("eval:not_in_list(['Draft', 'Pending'], doc.status)", doc)).toBe(true);
            expect(evaluateDependsOn("eval:not_in_list(['Active', 'Completed'], doc.status)", doc)).toBe(false);
        });

        it('evaluates AND expressions', () => {
            const doc = { status: 'Draft', enabled: true };
            expect(evaluateDependsOn("eval:doc.status == 'Draft' && doc.enabled", doc)).toBe(true);
            expect(evaluateDependsOn("eval:doc.status == 'Active' && doc.enabled", doc)).toBe(false);
        });

        it('evaluates OR expressions', () => {
            const doc = { status: 'Draft', enabled: false };
            expect(evaluateDependsOn("eval:doc.status == 'Draft' || doc.enabled", doc)).toBe(true);
            expect(evaluateDependsOn("eval:doc.status == 'Active' || doc.enabled", doc)).toBe(false);
        });
    });

    describe('simple field=value syntax', () => {
        it('evaluates equality without eval prefix', () => {
            const doc = { type: 'Sales' };
            expect(evaluateDependsOn("type=='Sales'", doc)).toBe(true);
            expect(evaluateDependsOn("type=='Purchase'", doc)).toBe(false);
        });
    });
});

describe('validateMandatory', () => {
    it('returns empty array when all required fields are filled', () => {
        const fields = [
            { fieldname: 'name', label: 'Name', reqd: true },
            { fieldname: 'email', label: 'Email', reqd: true },
        ];
        const doc = { name: 'John', email: 'john@example.com' };
        expect(validateMandatory(fields, doc)).toEqual([]);
    });

    it('returns array of missing field labels', () => {
        const fields = [
            { fieldname: 'name', label: 'Name', reqd: true },
            { fieldname: 'email', label: 'Email', reqd: true },
        ];
        const doc = { name: 'John', email: '' };
        expect(validateMandatory(fields, doc)).toEqual(['Email']);
    });

    it('ignores hidden required fields', () => {
        const fields = [
            { fieldname: 'name', label: 'Name', reqd: true, hidden: true },
        ];
        const doc = { name: '' };
        expect(validateMandatory(fields, doc)).toEqual([]);
    });

    it('treats 0 as valid value for required fields', () => {
        const fields = [
            { fieldname: 'count', label: 'Count', reqd: true },
        ];
        const doc = { count: 0 };
        expect(validateMandatory(fields, doc)).toEqual([]);
    });

    it('uses fieldname when label is not provided', () => {
        const fields = [
            { fieldname: 'amount', reqd: true },
        ];
        const doc = { amount: null };
        expect(validateMandatory(fields, doc)).toEqual(['amount']);
    });
});

describe('getEffectiveStatus', () => {
    it('returns Write for draft documents (docstatus 0)', () => {
        expect(getEffectiveStatus({ docstatus: 0 })).toBe('Write');
    });

    it('returns Submitted for submitted documents (docstatus 1)', () => {
        expect(getEffectiveStatus({ docstatus: 1 })).toBe('Submitted');
    });

    it('returns Cancelled for cancelled documents (docstatus 2)', () => {
        expect(getEffectiveStatus({ docstatus: 2 })).toBe('Cancelled');
    });

    it('returns Write for undefined docstatus', () => {
        expect(getEffectiveStatus({})).toBe('Write');
    });
});
