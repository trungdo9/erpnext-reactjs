/**
 * Frappe JS SDK Type Declarations
 *
 * Augments the frappe-js-sdk with proper types.
 */

declare module 'frappe-js-sdk' {
    export interface FrappeConfig {
        url: string;
        useToken?: boolean;
        token?: string;
        type?: 'token' | 'Bearer';
    }

    export interface FrappeAuth {
        loginWithUsernamePassword(credentials: { username: string; password: string }): Promise<void>;
        logout(): Promise<void>;
        getLoggedInUser(): Promise<string | null>;
    }

    export interface FrappeDB {
        getDocList<T = Record<string, unknown>>(
            doctype: string,
            options?: {
                fields?: string[];
                filters?: Array<[string, string, unknown] | [string, unknown]>;
                orderBy?: { field: string; order?: 'asc' | 'desc' };
                limit_start?: number;
                limit_page_length?: number;
                asDict?: boolean;
            }
        ): Promise<T[]>;

        getDoc<T = Record<string, unknown>>(
            doctype: string,
            name: string
        ): Promise<T>;

        createDoc<T = Record<string, unknown>>(
            doctype: string,
            data: Partial<T>
        ): Promise<T>;

        updateDoc<T = Record<string, unknown>>(
            doctype: string,
            name: string,
            data: Partial<T>
        ): Promise<T>;

        deleteDoc(doctype: string, name: string): Promise<void>;

        getCount(
            doctype: string,
            filters?: Array<[string, string, unknown]>
        ): Promise<number>;

        getValue<T = unknown>(
            doctype: string,
            name: string,
            fieldname: string
        ): Promise<T>;

        setValue(
            doctype: string,
            name: string,
            fieldname: string,
            value: unknown
        ): Promise<void>;

        submitDoc(doctype: string, name: string): Promise<void>;
        cancelDoc(doctype: string, name: string): Promise<void>;
    }

    export interface FrappeCall {
        get<T = unknown>(
            method: string,
            params?: Record<string, unknown>
        ): Promise<{ message: T }>;

        post<T = unknown>(
            method: string,
            params?: Record<string, unknown>
        ): Promise<{ message: T }>;
    }

    export interface FrappeFile {
        uploadFile(
            file: File,
            options?: {
                isPrivate?: boolean;
                doctype?: string;
                docname?: string;
                fieldname?: string;
            }
        ): Promise<{ file_url: string; name: string }>;
    }

    export class FrappeApp {
        constructor(url: string);
        auth(): FrappeAuth;
        db(): FrappeDB;
        call(): FrappeCall;
        file(): FrappeFile;
    }

    export function FrappeApp(url: string): {
        auth: FrappeAuth;
        db: FrappeDB;
        call: FrappeCall;
        file: FrappeFile;
    };
}
