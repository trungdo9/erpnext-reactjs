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
    cacheManager: {
        get: vi.fn(),
        set: vi.fn(),
        invalidate: vi.fn(),
        delete: vi.fn(),
    },
    GatewayConfig: {
        cacheTTL: {
            metadata: 300000,
            list: 30000,
            document: 60000,
            permissions: 600000,
        },
    },
}));

// Mock CacheKeys
vi.mock('../gateway/cache', () => ({
    CacheKeys: {
        meta: (doctype) => `meta:${doctype}`,
        doc: (doctype, name) => `doc:${doctype}:${name}`,
        docList: (doctype, params) => `list:${doctype}:${JSON.stringify(params)}`,
    },
}));

// Import after mocking
import { MetadataService } from './metadataService';
import { apiClient, cacheManager } from '../gateway';

// Sample raw metadata from Frappe API
const MOCK_RAW_META = {
    name: 'Sales Order',
    module: 'Selling',
    title_field: 'customer_name',
    image_field: null,
    search_fields: 'customer_name,customer',
    sort_field: 'modified',
    sort_order: 'desc',
    is_submittable: 1,
    issingle: 0,
    is_tree: 0,
    istable: 0,
    quick_entry: 0,
    track_changes: 1,
    allow_rename: 0,
    workflow_state_field: 'workflow_state',
    autoname: 'naming_series:',
    __permlevelwise_fields: [],
    fields: [
        {
            fieldname: 'customer',
            label: 'Customer',
            fieldtype: 'Link',
            options: 'Customer',
            reqd: 1,
            unique: 0,
            read_only: 0,
            hidden: 0,
            in_list_view: 1,
            in_standard_filter: 1,
            in_global_search: 0,
            description: 'Select the customer',
            depends_on: null,
            default: null,
        },
        {
            fieldname: 'total',
            label: 'Total',
            fieldtype: 'Currency',
            options: 'currency',
            reqd: 0,
            unique: 0,
            read_only: 1,
            hidden: 0,
            in_list_view: 1,
            in_standard_filter: 0,
            in_global_search: 0,
            precision: 2,
        },
        {
            fieldname: 'items',
            label: 'Items',
            fieldtype: 'Table',
            options: 'Sales Order Item',
            reqd: 0,
        },
        {
            fieldname: 'status',
            label: 'Status',
            fieldtype: 'Select',
            options: 'Draft\nSubmitted\nCancelled',
            reqd: 0,
        },
        {
            fieldname: 'section_break_1',
            label: '',
            fieldtype: 'Section Break',
        },
    ],
};

describe('MetadataService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getMeta', () => {
        it('should fetch and transform metadata', async () => {
            cacheManager.get.mockReturnValue(null);
            apiClient.get.mockResolvedValue({
                docs: [MOCK_RAW_META],
            });

            const meta = await MetadataService.getMeta('Sales Order');

            expect(apiClient.get).toHaveBeenCalledWith(
                'frappe.desk.form.load.getdoctype',
                { doctype: 'Sales Order' }
            );
            expect(meta.name).toBe('Sales Order');
            expect(meta.title_field).toBe('customer_name');
            expect(meta.is_submittable).toBe(1);
            expect(meta.workflow).toBe(true);
            expect(meta.fields).toHaveLength(5);
        });

        it('should return cached metadata when available', async () => {
            const cachedMeta = { name: 'Customer', fields: [] };
            cacheManager.get.mockReturnValue(cachedMeta);

            const meta = await MetadataService.getMeta('Customer');

            expect(apiClient.get).not.toHaveBeenCalled();
            expect(meta).toBe(cachedMeta);
        });

        it('should bypass cache when useCache is false', async () => {
            cacheManager.get.mockReturnValue({ name: 'cached' });
            apiClient.get.mockResolvedValue({
                docs: [MOCK_RAW_META],
            });

            const meta = await MetadataService.getMeta('Sales Order', { useCache: false });

            // Should NOT check cache
            expect(cacheManager.get).not.toHaveBeenCalled();
            // Should fetch from API
            expect(apiClient.get).toHaveBeenCalled();
            expect(meta.name).toBe('Sales Order');
        });

        it('should cache the result after fetch', async () => {
            cacheManager.get.mockReturnValue(null);
            apiClient.get.mockResolvedValue({
                docs: [MOCK_RAW_META],
            });

            await MetadataService.getMeta('Sales Order');

            expect(cacheManager.set).toHaveBeenCalledWith(
                'meta:Sales Order',
                expect.objectContaining({ name: 'Sales Order' }),
                300000  // metadata TTL
            );
        });

        it('should handle message.docs format', async () => {
            cacheManager.get.mockReturnValue(null);
            apiClient.get.mockResolvedValue({
                message: { docs: [MOCK_RAW_META] },
            });

            const meta = await MetadataService.getMeta('Sales Order');
            expect(meta.name).toBe('Sales Order');
        });

        it('should return null for missing metadata', async () => {
            cacheManager.get.mockReturnValue(null);
            apiClient.get.mockResolvedValue({});

            const meta = await MetadataService.getMeta('NonExistent');
            expect(meta).toBeNull();
        });
    });

    describe('transformMeta', () => {
        it('should transform raw metadata correctly', () => {
            const meta = MetadataService.transformMeta(MOCK_RAW_META);

            expect(meta.name).toBe('Sales Order');
            expect(meta.doctype).toBe('Sales Order');
            expect(meta.module).toBe('Selling');
            expect(meta.search_fields).toEqual(['customer_name', 'customer']);
            expect(meta.sort_field).toBe('modified');
            expect(meta.sort_order).toBe('desc');
            expect(meta.is_submittable).toBe(1);
            expect(meta.is_single).toBe(0);
            expect(meta.is_tree).toBe(0);
            expect(meta.workflow).toBe(true);
            expect(meta.workflow_state_field).toBe('workflow_state');
        });

        it('should return null for null input', () => {
            expect(MetadataService.transformMeta(null)).toBeNull();
        });

        it('should handle missing search_fields', () => {
            const meta = MetadataService.transformMeta({
                ...MOCK_RAW_META,
                search_fields: null,
            });
            expect(meta.search_fields).toEqual([]);
        });

        it('should default sort_field to modified', () => {
            const meta = MetadataService.transformMeta({
                ...MOCK_RAW_META,
                sort_field: null,
            });
            expect(meta.sort_field).toBe('modified');
        });
    });

    describe('transformField', () => {
        it('should transform a Link field correctly', () => {
            const field = MetadataService.transformField(MOCK_RAW_META.fields[0]);

            expect(field.fieldname).toBe('customer');
            expect(field.label).toBe('Customer');
            expect(field.fieldtype).toBe('Link');
            expect(field.required).toBe(true);
            expect(field.linkDoctype).toBe('Customer');
            expect(field.inListView).toBe(true);
            expect(field.inStandardFilter).toBe(true);
        });

        it('should transform a Currency field correctly', () => {
            const field = MetadataService.transformField(MOCK_RAW_META.fields[1]);

            expect(field.fieldname).toBe('total');
            expect(field.fieldtype).toBe('Currency');
            expect(field.readOnly).toBe(true);
            expect(field.precision).toBe(2);
        });

        it('should transform a Table field with childDoctype', () => {
            const field = MetadataService.transformField(MOCK_RAW_META.fields[2]);

            expect(field.fieldtype).toBe('Table');
            expect(field.childDoctype).toBe('Sales Order Item');
        });

        it('should parse Select options', () => {
            const field = MetadataService.transformField(MOCK_RAW_META.fields[3]);

            expect(field.fieldtype).toBe('Select');
            expect(field.selectOptions).toEqual(['Draft', 'Submitted', 'Cancelled']);
        });

        it('should handle Section Break (layout field)', () => {
            const field = MetadataService.transformField(MOCK_RAW_META.fields[4]);

            expect(field.fieldtype).toBe('Section Break');
            expect(field.uiType).toBe('section');
        });
    });

    describe('getFields', () => {
        it('should return field definitions from meta', async () => {
            cacheManager.get.mockReturnValue(null);
            apiClient.get.mockResolvedValue({ docs: [MOCK_RAW_META] });

            const fields = await MetadataService.getFields('Sales Order');
            expect(fields).toHaveLength(5);
            expect(fields[0].fieldname).toBe('customer');
        });
    });

    describe('isSubmittable', () => {
        it('should return true for submittable doctypes', async () => {
            cacheManager.get.mockReturnValue(null);
            apiClient.get.mockResolvedValue({ docs: [MOCK_RAW_META] });

            const result = await MetadataService.isSubmittable('Sales Order');
            expect(result).toBe(true);
        });
    });

    describe('hasWorkflow', () => {
        it('should return true when workflow_state_field exists', async () => {
            cacheManager.get.mockReturnValue(null);
            apiClient.get.mockResolvedValue({ docs: [MOCK_RAW_META] });

            const result = await MetadataService.hasWorkflow('Sales Order');
            expect(result).toBe(true);
        });
    });

    describe('isLayoutField', () => {
        it('should identify Section Break as layout field', () => {
            expect(MetadataService.isLayoutField({ fieldtype: 'Section Break' })).toBe(true);
        });

        it('should identify Column Break as layout field', () => {
            expect(MetadataService.isLayoutField({ fieldtype: 'Column Break' })).toBe(true);
        });

        it('should identify Tab Break as layout field', () => {
            expect(MetadataService.isLayoutField({ fieldtype: 'Tab Break' })).toBe(true);
        });

        it('should not identify Data as layout field', () => {
            expect(MetadataService.isLayoutField({ fieldtype: 'Data' })).toBe(false);
        });

        it('should not identify Link as layout field', () => {
            expect(MetadataService.isLayoutField({ fieldtype: 'Link' })).toBe(false);
        });
    });

    describe('invalidate', () => {
        it('should invalidate cache for a doctype', () => {
            MetadataService.invalidate('Sales Order');
            expect(cacheManager.delete).toHaveBeenCalledWith('meta:Sales Order');
        });
    });
});
