import { db } from './frappeClient';

export const ChatService = {
    /**
     * Get open tasks for the current user
     * @returns {Promise<Array>} List of tasks
     */
    getOpenTasks: async () => {
        try {
            const tasks = await db.getList('ToDo', {
                filters: {
                    status: 'Open'
                },
                fields: ['name', 'description', 'date', 'priority'],
                order_by: 'date asc',
                limit: 5
            });
            return tasks;
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            throw error;
        }
    },
};
