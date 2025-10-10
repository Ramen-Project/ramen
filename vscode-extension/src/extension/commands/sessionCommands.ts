import * as vscode from 'vscode';
import { CommandContext, CommandMetadata } from './commandRegistry';
import { SessionManager, Session } from '../session/sessionManager';

export const sessionCommands: CommandMetadata[] = [
    {
        id: 'showActiveSessions',
        title: 'Show Active Editing Sessions',
        category: 'Ramen',
    },
    {
        id: 'cleanupSessions',
        title: 'Clean Up Stale Sessions',
        category: 'Ramen',
    },
];

/**
 * Show active editing sessions
 */
export async function showActiveSessions(context: CommandContext): Promise<void> {
    const sessionManager = context.sessionManager as SessionManager;
    if (!sessionManager) {
        vscode.window.showErrorMessage('Session Manager not available');
        return;
    }
    const sessions = sessionManager.getActiveSessions();

    if (sessions.length === 0) {
        vscode.window.showInformationMessage('No active editing sessions');
        return;
    }

    const items = sessions.map((s: Session) => ({
        label: s.graphPath.split('/').pop() || s.graphPath,
        description: `User: ${s.userId}`,
        detail: `Created: ${s.created.toLocaleString()}, Last activity: ${s.lastHeartbeat.toLocaleString()}`,
        session: s,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a session to manage',
    });

    if (selected) {
        const action = await vscode.window.showQuickPick(['End Session', 'View Details', 'Cancel']);

        if (action === 'End Session') {
            await sessionManager.endSession(selected.session.id);
            vscode.window.showInformationMessage('Session ended');
        } else if (action === 'View Details') {
            const info = [
                `Session ID: ${selected.session.id}`,
                `Graph: ${selected.session.graphPath}`,
                `User: ${selected.session.userId}`,
                `Status: ${selected.session.status}`,
                `Created: ${selected.session.created.toLocaleString()}`,
                `Last Heartbeat: ${selected.session.lastHeartbeat.toLocaleString()}`,
                `Metadata: ${JSON.stringify(selected.session.metadata, null, 2)}`,
            ].join('\n');

            const document = await vscode.workspace.openTextDocument({
                content: info,
                language: 'plaintext',
            });
            await vscode.window.showTextDocument(document);
        }
    }
}

/**
 * Clean up stale sessions
 */
export async function cleanupSessions(context: CommandContext): Promise<void> {
    const sessionManager = context.sessionManager as SessionManager;
    if (!sessionManager) {
        vscode.window.showErrorMessage('Session Manager not available');
        return;
    }
    const count = await sessionManager.cleanupStaleSessions();
    vscode.window.showInformationMessage(`Cleaned up ${count} stale sessions`);
}
