const { google } = require('googleapis');
const oauth2Client = require('../config/google'); 

class TaskService {
    
    // Add a new task
    static async addTask(title, deadline) {
        const tasksAPI = google.tasks({ version: 'v1', auth: oauth2Client });

        await tasksAPI.tasks.insert({
            tasklist: '@default', 
            resource: {
                title: title,
                notes: `Deadline: ${deadline}` 
            }
        });
    }

    // Mark a task as complete
    static async completeTask(keyword) {
        const tasksAPI = google.tasks({ version: 'v1', auth: oauth2Client });

        const response = await tasksAPI.tasks.list({
            tasklist: '@default',
            showCompleted: false
        });

        const tasks = response.data.items || [];
        const taskToComplete = tasks.find(t => t.title.toLowerCase().includes(keyword.toLowerCase()));

        if (!taskToComplete) throw new Error("TASK_NOT_FOUND");

        await tasksAPI.tasks.patch({
            tasklist: '@default',
            task: taskToComplete.id,
            resource: { status: 'completed' }
        });

        return taskToComplete.title; 
    }

    // Get your upcoming tasks
    static async getRecentTasks(limit = 10) {
        const tasksAPI = google.tasks({ version: 'v1', auth: oauth2Client });

        const response = await tasksAPI.tasks.list({
            tasklist: '@default',
            showCompleted: false,
            maxResults: limit
        });

        const tasks = response.data.items;
        if (!tasks || tasks.length === 0) return "No pending tasks found. You're all caught up!";

        let output = `📋 *Top ${limit} Upcoming Tasks:*\n\n`;
        tasks.forEach(task => {
            const notes = task.notes ? `\n└ ${task.notes}` : "";
            output += `🔹 *${task.title}*${notes}\n\n`;
        });

        return output;
    }

    // Fetch all pending tasks for the background reminder engine
    static async getAllPendingTasks() {
        const tasksAPI = google.tasks({ version: 'v1', auth: oauth2Client });
        const response = await tasksAPI.tasks.list({
            tasklist: '@default',
            showCompleted: false,
            maxResults: 100 // Maximum tasks to fetch
        });
        return response.data.items || [];
    }
}

module.exports = TaskService;