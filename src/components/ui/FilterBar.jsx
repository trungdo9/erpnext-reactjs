import { useState } from 'react';
import Button from './Button';
import Input from './Input';
import { Filter, Plus, X } from 'lucide-react';

const OPERATORS = [
    { label: 'Equals', value: '=' },
    { label: 'Like', value: 'like' },
    { label: 'Not Equals', value: '!=' },
    { label: 'In', value: 'in' },
    { label: '>', value: '>' },
    { label: '>=', value: '>' },
    { label: '<', value: '<' },
    { label: '<=', value: '<=' },
];

const FilterBar = ({ fields, onApply, onClear }) => {
    const [filters, setFilters] = useState([]);

    const addFilter = () => {
        setFilters([...filters, { field: 'name', operator: '=', value: '' }]);
    };

    const removeFilter = (index) => {
        const newFilters = filters.filter((_, i) => i !== index);
        setFilters(newFilters);
    };

    const updateFilter = (index, key, val) => {
        const newFilters = [...filters];
        newFilters[index][key] = val;
        setFilters(newFilters);
    };

    const handleApply = () => {
        onApply(filters);
    };

    const handleClear = () => {
        setFilters([]);
        onClear();
    };

    if (!fields) return null;

    const filterableFields = fields.filter(f =>
        !['Section Break', 'Column Break', 'HTML', 'Image', 'Table'].includes(f.fieldtype)
    );

    // Ensure basics
    if (!filterableFields.find(f => f.fieldname === 'name')) filterableFields.unshift({ fieldname: 'name', label: 'ID' });
    if (!filterableFields.find(f => f.fieldname === 'modified')) filterableFields.push({ fieldname: 'modified', label: 'Last Modified' });
    if (!filterableFields.find(f => f.fieldname === 'owner')) filterableFields.push({ fieldname: 'owner', label: 'Owner' });

    return (
        <div className="bg-card p-4 rounded-xl shadow-sm border border-border mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Filters</span>
                    {filters.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                            {filters.length}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {filters.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
                            Clear All
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={addFilter}>
                        <Plus className="h-3 w-3 mr-1.5" />
                        Add Filter
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleApply} disabled={filters.length === 0}>
                        Apply Filters
                    </Button>
                </div>
            </div>

            {filters.length > 0 ? (
                <div className="space-y-3">
                    {filters.map((filter, index) => (
                        <div key={index} className="flex gap-3 items-center flex-wrap sm:flex-nowrap bg-muted/50 p-2 rounded-lg border border-border">
                            <div className="w-1/3 min-w-[140px]">
                                <select
                                    className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 transition-colors duration-200"
                                    value={filter.field}
                                    onChange={(e) => updateFilter(index, 'field', e.target.value)}
                                >
                                    {filterableFields.map(f => (
                                        <option key={f.fieldname} value={f.fieldname}>
                                            {f.label} ({f.fieldname})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-[120px]">
                                <select
                                    className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 transition-colors duration-200"
                                    value={filter.operator}
                                    onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                                >
                                    {OPERATORS.map(op => (
                                        <option key={op.value} value={op.value}>{op.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1">
                                <Input
                                    className="h-9"
                                    placeholder="Value..."
                                    value={filter.value}
                                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                                />
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFilter(index)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground">
                    No active filters. Click "Add Filter" to refine your search.
                </div>
            )}
        </div>
    );
};

export default FilterBar;
