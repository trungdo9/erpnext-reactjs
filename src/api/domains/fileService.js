/**
 * File Service
 *
 * Handles file uploads, downloads, and management.
 */

import { apiClient } from '../gateway';

/**
 * File Service class
 */
class FileServiceClass {
    /**
     * Upload a file
     * @param {File} file
     * @param {object} options
     * @returns {Promise<object>}
     */
    async upload(file, options = {}) {
        const {
            doctype,
            docname,
            fieldname,
            isPrivate = false,
            folder = 'Home',
        } = options;

        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('is_private', isPrivate ? '1' : '0');
        formData.append('folder', folder);

        if (doctype) formData.append('doctype', doctype);
        if (docname) formData.append('docname', docname);
        if (fieldname) formData.append('fieldname', fieldname);

        const baseUrl = import.meta.env.VITE_FRAPPE_URL || '';
        const uploadUrl = `${baseUrl}/api/method/frappe.handler.upload_file`;

        // File upload requires FormData — cannot go through apiClient.post()
        // which serializes to JSON. Use fetch but include same CSRF + credentials.
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Frappe-CSRF-Token': window.csrf_token || window.frappe?.csrf_token || '',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            const err = new Error(`Upload failed: ${response.status} - ${errorText}`);
            err.httpStatus = response.status;
            throw err;
        }

        const data = await response.json();
        const fileInfo = data.message;

        return {
            name: fileInfo.name,
            url: this.getFullUrl(fileInfo.file_url),
            fileUrl: fileInfo.file_url,          // raw relative path (e.g. /files/...)
            fileName: fileInfo.file_name,
            fileSize: fileInfo.file_size,
            isPrivate: !!fileInfo.is_private,
            contentType: fileInfo.content_type,
        };
    }

    /**
     * Upload multiple files
     * @param {FileList|Array<File>} files
     * @param {object} options
     * @returns {Promise<Array>}
     */
    async uploadMultiple(files, options = {}) {
        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                const result = await this.upload(file, options);
                results.push({ success: true, file: result });
            } catch (error) {
                errors.push({ success: false, fileName: file.name, error: error.message });
            }
        }

        return { results, errors };
    }

    /**
     * Delete a file
     * @param {string} fileName
     * @returns {Promise<void>}
     */
    async delete(fileName) {
        await apiClient.post('frappe.client.delete', {
            doctype: 'File',
            name: fileName,
        });
    }

    /**
     * Get file info
     * @param {string} fileName
     * @returns {Promise<object>}
     */
    async getInfo(fileName) {
        const doc = await apiClient.getDoc('File', fileName);
        return {
            name: doc.name,
            url: this.getFullUrl(doc.file_url),
            fileName: doc.file_name,
            fileSize: doc.file_size,
            isPrivate: !!doc.is_private,
            contentType: doc.content_type,
            createdBy: doc.owner,
            createdAt: doc.creation,
        };
    }

    /**
     * Get files attached to a document
     * @param {string} doctype
     * @param {string} docname
     * @returns {Promise<Array>}
     */
    async getAttachments(doctype, docname) {
        try {
            const result = await apiClient.getList('File', {
                filters: [
                    ['attached_to_doctype', '=', doctype],
                    ['attached_to_name', '=', docname],
                ],
                fields: ['name', 'file_name', 'file_url', 'file_size', 'is_private'],
            });

            return result.map(file => ({
                name: file.name,
                fileName: file.file_name,
                url: this.getFullUrl(file.file_url),
                fileSize: file.file_size,
                isPrivate: !!file.is_private,
            }));
        } catch {
            return [];
        }
    }

    /**
     * Get full URL for a file
     * @param {string} fileUrl
     * @returns {string}
     */
    getFullUrl(fileUrl) {
        if (!fileUrl) return '';
        if (fileUrl.startsWith('http')) return fileUrl;

        const baseUrl = import.meta.env.VITE_FRAPPE_URL || '';
        return `${baseUrl}${fileUrl}`;
    }

    /**
     * Download a file
     * @param {string} fileUrl
     * @param {string} fileName
     */
    download(fileUrl, fileName) {
        const fullUrl = this.getFullUrl(fileUrl);
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Get file type from extension
     * @param {string} fileName
     * @returns {string}
     */
    getFileType(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const typeMap = {
            // Images
            jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
            // Documents
            pdf: 'pdf', doc: 'document', docx: 'document', odt: 'document',
            // Spreadsheets
            xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet', ods: 'spreadsheet',
            // Presentations
            ppt: 'presentation', pptx: 'presentation', odp: 'presentation',
            // Archives
            zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
            // Code
            js: 'code', ts: 'code', py: 'code', java: 'code', json: 'code', xml: 'code', html: 'code', css: 'code',
            // Video
            mp4: 'video', webm: 'video', avi: 'video', mov: 'video',
            // Audio
            mp3: 'audio', wav: 'audio', ogg: 'audio',
        };
        return typeMap[ext] || 'file';
    }

    /**
     * Format file size for display
     * @param {number} bytes
     * @returns {string}
     */
    formatSize(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let unitIndex = 0;
        let size = bytes;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Validate file before upload
     * @param {File} file
     * @param {object} options
     * @returns {{ valid: boolean, error?: string }}
     */
    validate(file, options = {}) {
        const {
            maxSize = 10 * 1024 * 1024, // 10MB default
            allowedTypes = null,
            allowedExtensions = null,
        } = options;

        // Check size
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File size exceeds ${this.formatSize(maxSize)}`,
            };
        }

        // Check type
        if (allowedTypes && !allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `File type ${file.type} is not allowed`,
            };
        }

        // Check extension
        if (allowedExtensions) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                return {
                    valid: false,
                    error: `File extension .${ext} is not allowed`,
                };
            }
        }

        return { valid: true };
    }
}

// Export singleton
export const FileService = new FileServiceClass();
export default FileService;
