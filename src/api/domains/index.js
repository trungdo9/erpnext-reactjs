/**
 * Domain Services
 *
 * Business-logic oriented services that:
 * - Provide domain-specific interfaces (not DocType-specific)
 * - Encapsulate business rules and validations
 * - Transform data between API and UI formats
 * - Handle complex operations that span multiple doctypes
 *
 * Frontend components import from here, NOT from gateway directly.
 */

// Export all domain services
export { DocumentService } from './documentService';
export { MetadataService } from './metadataService';
export { AuthService } from './authService';
export { ProductionService } from './productionService';
export { InventoryService } from './inventoryService';
export { WorkflowService } from './workflowService';
export { SearchService } from './searchService';
export { FileService } from './fileService';
export { WorkspaceService } from './workspaceService';
export { TranslationService } from './translationService';
