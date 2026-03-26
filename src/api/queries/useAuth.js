/**
 * Auth Query Hooks
 *
 * React Query hooks for authentication and permissions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthService } from '../domains';
import { queryKeys } from './keys';

/**
 * Hook to get current user
 */
export function useCurrentUser(queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.auth.currentUser(),
        queryFn: () => AuthService.getCurrentUser(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        retry: false, // Don't retry auth failures
        ...queryOptions,
    });
}

/**
 * Hook to login
 */
export function useLogin(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ username, password }) =>
            AuthService.login(username, password),
        onSuccess: (user) => {
            // Set user in cache
            queryClient.setQueryData(queryKeys.auth.currentUser(), user);
        },
        ...mutationOptions,
    });
}

/**
 * Hook to logout
 */
export function useLogout(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => AuthService.logout(),
        onSuccess: () => {
            // Clear all cached data on logout
            queryClient.clear();
        },
        ...mutationOptions,
    });
}

/**
 * Hook to get permissions for a doctype
 */
export function usePermissions(doctype, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.auth.permissions(doctype),
        queryFn: () => AuthService.getPermissions(doctype),
        enabled: !!doctype,
        staleTime: 10 * 60 * 1000, // 10 minutes
        ...queryOptions,
    });
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role, queryOptions = {}) {
    const { data: user, isLoading, error } = useCurrentUser(queryOptions);

    return {
        hasRole: user?.roles?.includes(role) ?? false,
        isLoading,
        error,
    };
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles, queryOptions = {}) {
    const { data: user, isLoading, error } = useCurrentUser(queryOptions);

    return {
        hasRole: roles.some(r => user?.roles?.includes(r)) ?? false,
        isLoading,
        error,
    };
}

/**
 * Hook to check if user can perform an action
 */
export function useCanPerform(doctype, action, queryOptions = {}) {
    const { data: permissions, isLoading, error } = usePermissions(doctype, queryOptions);

    return {
        canPerform: permissions?.[action] ?? false,
        isLoading,
        error,
    };
}

/**
 * Hook to change password
 */
export function useChangePassword(mutationOptions = {}) {
    return useMutation({
        mutationFn: ({ oldPassword, newPassword }) =>
            AuthService.changePassword(oldPassword, newPassword),
        ...mutationOptions,
    });
}

/**
 * Hook to update profile
 */
export function useUpdateProfile(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => AuthService.updateProfile(data),
        onSuccess: (user) => {
            queryClient.setQueryData(queryKeys.auth.currentUser(), user);
        },
        ...mutationOptions,
    });
}
