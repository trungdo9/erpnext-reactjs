# Architecture Review - ERP Frontend
> Last Updated: 2026-01-29
> Reviewer: Claude (Principal Architect Level)

---

## Enterprise Readiness Score: 72%

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Code Organization | 80% | 15% | 12.0 |
| Error Handling | 85% | 15% | 12.75 |
| Security (Permissions) | 75% | 20% | 15.0 |
| Performance | 65% | 15% | 9.75 |
| Maintainability | 70% | 15% | 10.5 |
| UI/UX Consistency | 78% | 10% | 7.8 |
| Testing | 40% | 10% | 4.0 |
| **TOTAL** | | | **71.8%** |

---

## Architecture Summary

### Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS
- **State**: React Query + Context API
- **Routing**: React Router v6
- **Icons**: Lucide React
- **API**: Frappe/ERPNext Backend

### Architecture Pattern
```
App.jsx
├── AuthProvider (authentication context)
│   ├── MetadataProvider (doctype metadata cache)
│   │   ├── ThemeProvider (dark/light mode)
│   │   │   └── Routes
│   │   │       ├── DynamicListView (table + filters)
│   │   │       ├── DynamicForm (metadata-driven form)
│   │   │       └── Dashboard (stats + widgets)
```

### Key Patterns Used
- Metadata-driven forms (FormRenderer + Field Registry)
- Permission caching (PermissionService singleton)
- Link caching (LinkCache for dropdown options)
- Error boundaries for graceful error handling

---

## Critical Issues (High Risk)

### 1. Duplicate Child Table Implementations
- **Files**: `ChildTableGrid.jsx` vs `ChildTableField.jsx`
- **Status**: NOT FIXED
- **Impact**: Inconsistent behavior, double maintenance
- **Action**: Consolidate into single implementation

### 2. No Cache Invalidation Strategy
- **Files**: `LinkCache.js`, `MetadataCache.js`, `PermissionService.js`
- **Status**: NOT FIXED
- **Impact**: Stale data after updates
- **Action**: Add TTL-based invalidation (5min metadata, 2min permissions)

### 3. Hardcoded Routes
- **Files**: `Header.jsx`, `Sidebar.jsx`, `DynamicDocList.jsx`
- **Status**: NOT FIXED
- **Impact**: Route changes require multiple file edits
- **Action**: Create `routes.config.js`

### 4. Missing Form Section/Tab Rendering
- **Files**: `FormRenderer.jsx`
- **Status**: NOT FIXED
- **Impact**: Complex doctypes render flat
- **Action**: Implement section grouping and tab support

---

## Structural Weaknesses (Medium Risk)

### 1. Mixed Error Handling Patterns
- Some use try-catch + console.error
- Some use toast notifications
- Some use state-based errors
- **Action**: Standardize on centralized error handler

### 2. Inconsistent Hook Return Shapes
- Some return `{ data, loading, error }`
- Some return different structures
- **Action**: Document standard return shape

### 3. Component Folder Overlap
- `common/` and `ui/` have overlapping purposes
- **Action**: Merge primitives into `ui/`

### 4. Translation Gaps
- Some text hardcoded in Vietnamese
- Some use `t()` function
- **Action**: Audit all hardcoded strings

---

## UI/UX Issues

### Fixed in This Session
- [x] Dark mode card backgrounds (glass-card opacity)
- [x] Pagination changed to 10 records + "Load More"
- [x] Filter dropdown Apply button visibility
- [x] Header text for production routes

### Still Pending
- [ ] Some components use `bg-white` without `dark:` counterpart
- [ ] Inconsistent loading states (Spinner vs inline vs skeleton)
- [ ] Mixed color system (Tailwind direct vs CSS variables)
- [ ] Form field spacing inconsistency

---

## Scalability Risks

| Risk | Current State | Recommendation |
|------|---------------|----------------|
| Bundle Size | No code splitting | Add `React.lazy()` for routes |
| Large Lists | Partial virtualization | Apply to `DynamicListView` |
| API Calls | No deduplication | Add request queue |
| Permissions | Per-row checking | Add bulk `checkPermissions()` |

---

## Roadmap to 85%+

| Action | Impact | Effort | Priority |
|--------|--------|--------|----------|
| Consolidate ChildTable | +3% | Medium | P1 |
| Add Cache TTL | +3% | Low | P1 |
| Code Splitting | +4% | Medium | P2 |
| Add Tests | +8% | High | P2 |
| Centralize Routes | +2% | Low | P3 |
| Standardize Errors | +3% | Medium | P3 |

---

## Critical Patterns (DO NOT BREAK)

1. All forms MUST use `FormRenderer` + field registry
2. All API calls MUST go through `services.js`
3. All new components MUST support dark mode via CSS variables
4. Permission checks MUST use `usePermissions` hook
5. All caching MUST use existing cache services

---

## Anti-Patterns to Avoid

1. Don't create new child table implementations
2. Don't hardcode routes - use config when available
3. Don't use `bg-white` without `dark:bg-gray-*`
4. Don't call API directly - use services
5. Don't create new state management patterns

---

## Component Creation Checklist

When creating new components, ensure:

- [ ] Uses CSS variables for themeable colors
- [ ] Has `dark:` mode support for all backgrounds
- [ ] Has loading state handling
- [ ] Has error state handling
- [ ] Has PropTypes defined
- [ ] Uses existing UI primitives (Button, Card, Input)
- [ ] Follows existing naming conventions

---

## File Reference

### Must-Read Files
- `src/api/services.js` - All API methods
- `src/components/form/FormRenderer.jsx` - Form architecture
- `src/components/form/fields/index.js` - Field registry
- `src/hooks/usePermissions.js` - Permission logic
- `src/services/PermissionService.js` - Permission caching
- `src/index.css` - CSS variables and theming

### Key Hooks
- `useAuth` - Authentication state
- `useDoctypeMeta` - Doctype metadata
- `useFormState` - Form state management
- `usePermissions` - Permission checking
- `useTranslation` - i18n

---

## Session History

### 2026-01-29
- Fixed dark mode inconsistencies (glass-card, Card variant)
- Changed pagination to 10 records with "Load More" button
- Fixed filter dropdown Apply button visibility
- Added production route header text
- Completed architecture review (72% score)

---

## Next Session Priorities

1. **Phase 3**: Child Table Grid improvements
2. **Phase 3**: Form section/tab rendering
3. **Phase 4**: Code splitting implementation
4. **Phase 4**: Lint fixes and cleanup

---

## Prompt Templates for Future Work

### Adding Features
```
Add [feature] to [component].
Use existing [pattern/component].
Follow the style in [reference file].
Ensure dark mode support.
```

### Fixing Bugs
```
Fix [issue] in [file:line].
Expected: [X]. Current: [Y].
Don't change [related functionality].
```

### Refactoring
```
Refactor [component] to use [pattern].
Keep backward compatibility with [interface].
Update all usages in [scope].
```
