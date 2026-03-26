import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormState } from './useFormState';

describe('useFormState', () => {
    describe('initialization', () => {
        it('should initialize with empty data', () => {
            const { result } = renderHook(() => useFormState());

            expect(result.current.formData).toEqual({});
            expect(result.current.isDirty).toBe(false);
            expect(result.current.errors).toEqual({});
            expect(result.current.touched).toEqual({});
        });

        it('should initialize with provided data', () => {
            const initialData = { name: 'Test', email: 'test@example.com' };
            const { result } = renderHook(() => useFormState(initialData));

            expect(result.current.formData).toEqual(initialData);
            expect(result.current.isDirty).toBe(false);
        });
    });

    describe('setField', () => {
        it('should update a single field', () => {
            const { result } = renderHook(() => useFormState({ name: '' }));

            act(() => {
                result.current.setField('name', 'Updated Name');
            });

            expect(result.current.formData.name).toBe('Updated Name');
            expect(result.current.touched.name).toBe(true);
            expect(result.current.isDirty).toBe(true);
        });

        it('should clear error when field is modified', () => {
            const fields = [{ fieldname: 'name', fieldtype: 'Data', reqd: 1 }];
            const { result } = renderHook(() => useFormState({ name: '' }, fields));

            // Validate to create error
            act(() => {
                result.current.validate();
            });
            expect(result.current.errors.name).toBeDefined();

            // Update field to clear error
            act(() => {
                result.current.setField('name', 'New Value');
            });
            expect(result.current.errors.name).toBeUndefined();
        });
    });

    describe('setFields', () => {
        it('should update multiple fields at once', () => {
            const { result } = renderHook(() => useFormState({ name: '', email: '' }));

            act(() => {
                result.current.setFields({ name: 'Test', email: 'test@example.com' });
            });

            expect(result.current.formData.name).toBe('Test');
            expect(result.current.formData.email).toBe('test@example.com');
            expect(result.current.touched.name).toBe(true);
            expect(result.current.touched.email).toBe(true);
        });
    });

    describe('isDirty', () => {
        it('should be false when data matches original', () => {
            const initialData = { name: 'Test' };
            const { result } = renderHook(() => useFormState(initialData));

            expect(result.current.isDirty).toBe(false);
        });

        it('should be true when data differs from original', () => {
            const { result } = renderHook(() => useFormState({ name: 'Original' }));

            act(() => {
                result.current.setField('name', 'Changed');
            });

            expect(result.current.isDirty).toBe(true);
        });

        it('should handle empty value equivalence', () => {
            const { result } = renderHook(() => useFormState({ name: null }));

            act(() => {
                result.current.setField('name', '');
            });

            // null and '' are treated as equivalent empty values
            expect(result.current.isDirty).toBe(false);
        });

        it('should detect array changes', () => {
            const initialData = { items: [{ id: 1 }] };
            const { result } = renderHook(() => useFormState(initialData));

            act(() => {
                result.current.setField('items', [{ id: 1 }, { id: 2 }]);
            });

            expect(result.current.isDirty).toBe(true);
        });
    });

    describe('validate', () => {
        it('should validate required fields', () => {
            const fields = [
                { fieldname: 'name', fieldtype: 'Data', reqd: 1, label: 'Name' },
                { fieldname: 'email', fieldtype: 'Data', reqd: 1, label: 'Email' }
            ];
            const { result } = renderHook(() => useFormState({ name: '', email: '' }, fields));

            let isValid;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid).toBe(false);
            expect(result.current.errors.name).toBeDefined();
            expect(result.current.errors.email).toBeDefined();
        });

        it('should skip hidden fields', () => {
            const fields = [
                { fieldname: 'hidden_field', fieldtype: 'Data', reqd: 1, hidden: 1 }
            ];
            const { result } = renderHook(() => useFormState({ hidden_field: '' }, fields));

            let isValid;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid).toBe(true);
            expect(result.current.errors.hidden_field).toBeUndefined();
        });

        it('should validate integer fields', () => {
            const fields = [
                { fieldname: 'count', fieldtype: 'Int', label: 'Count' }
            ];
            const { result } = renderHook(() => useFormState({ count: 'not a number' }, fields));

            let isValid;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid).toBe(false);
            expect(result.current.errors.count).toBeDefined();
        });

        it('should validate float/currency fields', () => {
            const fields = [
                { fieldname: 'amount', fieldtype: 'Currency', label: 'Amount' }
            ];
            const { result } = renderHook(() => useFormState({ amount: 'invalid' }, fields));

            let isValid;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid).toBe(false);
            expect(result.current.errors.amount).toContain('number');
        });

        it('should validate date fields', () => {
            const fields = [
                { fieldname: 'date', fieldtype: 'Date', label: 'Date' }
            ];
            const { result } = renderHook(() => useFormState({ date: 'invalid-date' }, fields));

            let isValid;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid).toBe(false);
            expect(result.current.errors.date).toBeDefined();
        });

        it('should pass for valid data', () => {
            const fields = [
                { fieldname: 'name', fieldtype: 'Data', reqd: 1, label: 'Name' },
                { fieldname: 'count', fieldtype: 'Int', label: 'Count' }
            ];
            const { result } = renderHook(() =>
                useFormState({ name: 'Test', count: 5 }, fields)
            );

            let isValid;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid).toBe(true);
            expect(Object.keys(result.current.errors)).toHaveLength(0);
        });
    });

    describe('reset', () => {
        it('should reset form to original data', () => {
            const initialData = { name: 'Original' };
            const { result } = renderHook(() => useFormState(initialData));

            act(() => {
                result.current.setField('name', 'Changed');
            });
            expect(result.current.formData.name).toBe('Changed');

            act(() => {
                result.current.reset();
            });

            expect(result.current.formData.name).toBe('Original');
            expect(result.current.errors).toEqual({});
            expect(result.current.touched).toEqual({});
            expect(result.current.isDirty).toBe(false);
        });
    });

    describe('getCleanData', () => {
        it('should remove system fields', () => {
            const initialData = {
                name: 'DOC-001',
                owner: 'admin@example.com',
                creation: '2024-01-01',
                modified: '2024-01-02',
                modified_by: 'user@example.com',
                docstatus: 0,
                title: 'My Document',
                description: 'Test description'
            };
            const { result } = renderHook(() => useFormState(initialData));

            const cleanData = result.current.getCleanData();

            expect(cleanData.name).toBeUndefined();
            expect(cleanData.owner).toBeUndefined();
            expect(cleanData.creation).toBeUndefined();
            expect(cleanData.modified).toBeUndefined();
            expect(cleanData.modified_by).toBeUndefined();
            expect(cleanData.docstatus).toBeUndefined();
            expect(cleanData.title).toBe('My Document');
            expect(cleanData.description).toBe('Test description');
        });
    });

    describe('markSaved', () => {
        it('should update original data to match current', () => {
            const { result } = renderHook(() => useFormState({ name: 'Original' }));

            act(() => {
                result.current.setField('name', 'Updated');
            });
            expect(result.current.isDirty).toBe(true);

            act(() => {
                result.current.markSaved();
            });

            expect(result.current.isDirty).toBe(false);
            expect(result.current.touched).toEqual({});
        });

        it('should accept new saved data', () => {
            const { result } = renderHook(() => useFormState({ name: 'Original' }));

            act(() => {
                result.current.markSaved({ name: 'Server Response', id: 123 });
            });

            expect(result.current.formData.name).toBe('Server Response');
            expect(result.current.formData.id).toBe(123);
            expect(result.current.isDirty).toBe(false);
        });
    });

    describe('sync with initialData', () => {
        it('should sync when initialData changes', () => {
            const { result, rerender } = renderHook(
                ({ initialData }) => useFormState(initialData),
                { initialProps: { initialData: { name: 'First' } } }
            );

            expect(result.current.formData.name).toBe('First');

            rerender({ initialData: { name: 'Second' } });

            expect(result.current.formData.name).toBe('Second');
            expect(result.current.isDirty).toBe(false);
        });
    });
});
