import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the gateway module
vi.mock('../gateway', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        getDoc: vi.fn(),
        createDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
    },
}));

import { DocumentService } from './documentService';
import { apiClient } from '../gateway';

const MOCK_DOCS = [
    { name: 'SO-001', customer: 'Test Customer', total: 1000, modified: '2024-01-15 10:00:00' },
    { name: 'SO-002', customer: 'Another Customer', total: 2000, modified: '2024-01-16 12:00:00' },
];

const MOCK_SINGLE_DOC = {
    name: 'SO-001',
    doctype: 'Sales Order',
    customer: 'Test Customer',
    total: 1000,
    items: [{ item_code: 'ITEM-001', qty: 5 }],
};

describe('DocumentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getList', () => {
        it('should fetch documents with default options', async () => {
            apiClient.post.mockResolvedValue({ message: MOCK_DOCS });

            const result = await DocumentService.getList('Sales Order');

            expect(apiClient.post).toHaveBeenCalledWith(
                'frappe.client.get_list',
                expect.objectContaining({
                    doctype: 'Sales Order',
                    fields: ['name'],
                    order_by: 'modified desc',
                    limit_page_length: 20,
                    limit_start: 0,
                })
            );
            expect(result.data).toEqual(MOCK_DOCS);
        });

        it('should pass custom fields and filters', async () => {
            apiClient.post.mockResolvedValue({ message: MOCK_DOCS });

            await DocumentService.getList('Sales Order', {
                fields: ['name', 'customer', 'total'],
                filters: [['status', '=', 'Draft']],
                orderBy: 'creation desc',
                limit: 50,
                start: 20,
            });

            expect(apiClient.post).toHaveBeenCalledWith(
                'frappe.client.get_list',
                expect.objectContaining({
                    fields: ['name', 'customer', 'total'],
                    filters: [['status', '=', 'Draft']],
                    order_by: 'creation desc',
                    limit_page_length: 50,
                    limit_start: 20,
                })
            );
        });

        it('should include or_filters when provided', async () => {
            apiClient.post.mockResolvedValue({ message: MOCK_DOCS });

            await DocumentService.getList('Sales Order', {
                orFilters: [['name', 'like', '%test%'], ['customer', 'like', '%test%']],
            });

            expect(apiClient.post).toHaveBeenCalledWith(
                'frappe.client.get_list',
                expect.objectContaining({
                    or_filters: [['name', 'like', '%test%'], ['customer', 'like', '%test%']],
                })
            );
        });

        it('should always call apiClient (caching handled by React Query)', async () => {
            apiClient.post.mockResolvedValue({ message: MOCK_DOCS });

            const result = await DocumentService.getList('Sales Order');

            expect(apiClient.post).toHaveBeenCalledTimes(1);
            expect(result.data).toEqual(MOCK_DOCS);
        });

        it('should handle empty response', async () => {
            apiClient.post.mockResolvedValue({ message: [] });

            const result = await DocumentService.getList('Sales Order');
            expect(result.data).toEqual([]);
        });

        it('should handle null message in response', async () => {
            apiClient.post.mockResolvedValue({});

            const result = await DocumentService.getList('Sales Order');
            expect(result.data).toEqual([]);
        });
    });

    describe('get', () => {
        it('should fetch a single document', async () => {
            apiClient.getDoc.mockResolvedValue(MOCK_SINGLE_DOC);

            const doc = await DocumentService.get('Sales Order', 'SO-001');

            expect(apiClient.getDoc).toHaveBeenCalledWith('Sales Order', 'SO-001');
            expect(doc.name).toBe('SO-001');
            expect(doc.customer).toBe('Test Customer');
        });

        it('should always call apiClient.getDoc (caching handled by React Query)', async () => {
            apiClient.getDoc.mockResolvedValue(MOCK_SINGLE_DOC);

            await DocumentService.get('Sales Order', 'SO-001');

            expect(apiClient.getDoc).toHaveBeenCalledTimes(1);
        });
    });

    describe('create', () => {
        it('should create a document via apiClient', async () => {
            const newDoc = { customer: 'New Customer', total: 500 };
            const createdDoc = { name: 'SO-003', ...newDoc };
            apiClient.createDoc.mockResolvedValue(createdDoc);

            const result = await DocumentService.create('Sales Order', newDoc);

            expect(apiClient.createDoc).toHaveBeenCalledWith('Sales Order', newDoc);
            expect(result.name).toBe('SO-003');
        });

        it('should throw for invalid data', async () => {
            await expect(DocumentService.create('Sales Order', null)).rejects.toThrow('Invalid document data');
        });
    });

    describe('update', () => {
        it('should update a document and return result', async () => {
            const updateData = { total: 1500 };
            const updatedDoc = { name: 'SO-001', ...updateData };
            apiClient.updateDoc.mockResolvedValue(updatedDoc);

            const result = await DocumentService.update('Sales Order', 'SO-001', updateData);

            expect(apiClient.updateDoc).toHaveBeenCalledWith('Sales Order', 'SO-001', updateData);
            expect(result.name).toBe('SO-001');
        });

        it('should throw for missing document name', async () => {
            await expect(DocumentService.update('Sales Order', '', {})).rejects.toThrow('Document name is required');
        });
    });

    describe('delete', () => {
        it('should delete a document via apiClient', async () => {
            apiClient.deleteDoc.mockResolvedValue({});

            await DocumentService.delete('Sales Order', 'SO-001');

            expect(apiClient.deleteDoc).toHaveBeenCalledWith('Sales Order', 'SO-001');
        });

        it('should throw for missing document name', async () => {
            await expect(DocumentService.delete('Sales Order', '')).rejects.toThrow('Document name is required');
        });
    });

    describe('getCount', () => {
        it('should return document count via apiClient.post', async () => {
            apiClient.post.mockResolvedValue({ message: 42 });

            const count = await DocumentService.getCount('Sales Order', []);

            expect(apiClient.post).toHaveBeenCalledWith(
                'frappe.client.get_count',
                expect.objectContaining({ doctype: 'Sales Order', filters: [] })
            );
            expect(count).toBe(42);
        });

        it('should return 0 on error', async () => {
            apiClient.post.mockRejectedValue(new Error('Server error'));

            const count = await DocumentService.getCount('Sales Order', []);

            expect(count).toBe(0);
        });
    });

    describe('validateBeforeCreate', () => {
        it('should not throw for valid data', () => {
            expect(() => {
                DocumentService.validateBeforeCreate('Sales Order', { customer: 'Test' });
            }).not.toThrow();
        });

        it('should throw for null data', () => {
            expect(() => {
                DocumentService.validateBeforeCreate('Sales Order', null);
            }).toThrow('Invalid document data');
        });
    });

    describe('validateBeforeUpdate', () => {
        it('should not throw for valid update', () => {
            expect(() => {
                DocumentService.validateBeforeUpdate('Sales Order', 'SO-001', { total: 100 });
            }).not.toThrow();
        });

        it('should throw for missing name', () => {
            expect(() => {
                DocumentService.validateBeforeUpdate('Sales Order', '', { total: 100 });
            }).toThrow('Document name is required');
        });
    });
});
