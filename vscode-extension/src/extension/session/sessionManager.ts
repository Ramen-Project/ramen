import * as vscode from 'vscode';
import * as crypto from 'crypto';

/**
 * Session manager for enforcing single session per graph
 * Prevents concurrent editing conflicts
 */
export class SessionManager {
    private static instance: SessionManager;
    private sessions = new Map<string, Session>();
    private heartbeatTimers = new Map<string, NodeJS.Timeout>();
    private lockFiles = new Map<string, LockFile>();
    private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
    private readonly SESSION_TIMEOUT = 30000; // 30 seconds
    private readonly LOCK_CHECK_INTERVAL = 10000; // 10 seconds
    
    private constructor(private context: vscode.ExtensionContext) {
        this.startLockChecker();
    }
    
    static getInstance(context?: vscode.ExtensionContext): SessionManager {
        if (!this.instance) {
            if (!context) {
                throw new Error('Context required for SessionManager initialization');
            }
            this.instance = new SessionManager(context);
        }
        return this.instance;
    }
    
    /**
     * Create a new session for a graph
     */
    async createSession(
        graphPath: string,
        userId: string,
        options: SessionOptions = {}
    ): Promise<Session> {
        // Check if graph is already locked
        const existingLock = await this.checkLock(graphPath);
        if (existingLock && !options.force) {
            throw new SessionError(
                `Graph is already being edited by ${existingLock.userId}`,
                'SESSION_LOCKED',
                existingLock
            );
        }
        
        // Force unlock if requested and authorized
        if (existingLock && options.force) {
            await this.forceUnlock(graphPath, userId);
        }
        
        // Create new session
        const session: Session = {
            id: this.generateSessionId(),
            graphPath,
            userId,
            created: new Date(),
            lastHeartbeat: new Date(),
            status: SessionStatus.ACTIVE,
            metadata: options.metadata || {}
        };
        
        // Create lock file
        await this.createLock(graphPath, session);
        
        // Store session
        this.sessions.set(session.id, session);
        
        // Start heartbeat
        this.startHeartbeat(session.id);
        
        // Fire session created event
        this.context.globalState.update(`session.${graphPath}`, session.id);
        
        console.log(`Session created: ${session.id} for ${graphPath}`);
        return session;
    }
    
    /**
     * Get active session for a graph
     */
    async getSession(graphPath: string): Promise<Session | null> {
        // Check lock file first
        const lock = await this.checkLock(graphPath);
        if (!lock) {
            return null;
        }
        
        // Find session by lock
        for (const [id, session] of this.sessions) {
            if (session.graphPath === graphPath && session.id === lock.sessionId) {
                return session;
            }
        }
        
        return null;
    }
    
    /**
     * Update session heartbeat
     */
    async updateHeartbeat(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new SessionError('Session not found', 'SESSION_NOT_FOUND');
        }
        
        session.lastHeartbeat = new Date();
        
        // Update lock file
        await this.updateLock(session.graphPath, session);
    }
    
    /**
     * End a session
     */
    async endSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return;
        }
        
        // Stop heartbeat
        this.stopHeartbeat(sessionId);
        
        // Remove lock
        await this.removeLock(session.graphPath);
        
        // Update session status
        session.status = SessionStatus.CLOSED;
        
        // Remove from active sessions
        this.sessions.delete(sessionId);
        
        // Clear from global state
        this.context.globalState.update(`session.${session.graphPath}`, undefined);
        
        console.log(`Session ended: ${sessionId}`);
    }
    
    /**
     * Check if user can edit a graph
     */
    async canEdit(graphPath: string, userId: string): Promise<boolean> {
        const session = await this.getSession(graphPath);
        
        if (!session) {
            return true; // No active session
        }
        
        if (session.userId === userId) {
            return true; // Same user
        }
        
        // Check if session is stale
        const now = Date.now();
        const lastHeartbeat = session.lastHeartbeat.getTime();
        
        if (now - lastHeartbeat > this.SESSION_TIMEOUT) {
            // Session is stale, can take over
            await this.endSession(session.id);
            return true;
        }
        
        return false;
    }
    
    /**
     * Request edit access
     */
    async requestEdit(
        graphPath: string,
        userId: string
    ): Promise<EditRequest> {
        const session = await this.getSession(graphPath);
        
        if (!session) {
            // No session, can edit immediately
            const newSession = await this.createSession(graphPath, userId);
            return {
                granted: true,
                sessionId: newSession.id
            };
        }
        
        if (session.userId === userId) {
            // Same user, already has access
            return {
                granted: true,
                sessionId: session.id
            };
        }
        
        // Check if session is stale
        const now = Date.now();
        const lastHeartbeat = session.lastHeartbeat.getTime();
        
        if (now - lastHeartbeat > this.SESSION_TIMEOUT) {
            // Take over stale session
            await this.endSession(session.id);
            const newSession = await this.createSession(graphPath, userId);
            return {
                granted: true,
                sessionId: newSession.id,
                tookOver: true
            };
        }
        
        // Session is active, request queued
        return {
            granted: false,
            currentUser: session.userId,
            waitTime: this.SESSION_TIMEOUT - (now - lastHeartbeat)
        };
    }
    
    /**
     * Get all active sessions
     */
    getActiveSessions(): Session[] {
        return Array.from(this.sessions.values()).filter(
            s => s.status === SessionStatus.ACTIVE
        );
    }
    
    /**
     * Clean up stale sessions
     */
    async cleanupStaleSessions(): Promise<number> {
        const now = Date.now();
        const stale: string[] = [];
        
        for (const [id, session] of this.sessions) {
            const lastHeartbeat = session.lastHeartbeat.getTime();
            
            if (now - lastHeartbeat > this.SESSION_TIMEOUT) {
                stale.push(id);
            }
        }
        
        for (const id of stale) {
            await this.endSession(id);
        }
        
        console.log(`Cleaned up ${stale.length} stale sessions`);
        return stale.length;
    }
    
    private startHeartbeat(sessionId: string): void {
        const timer = setInterval(async () => {
            try {
                await this.updateHeartbeat(sessionId);
            } catch (error) {
                console.error(`Heartbeat failed for session ${sessionId}:`, error);
                this.stopHeartbeat(sessionId);
            }
        }, this.HEARTBEAT_INTERVAL);
        
        this.heartbeatTimers.set(sessionId, timer);
    }
    
    private stopHeartbeat(sessionId: string): void {
        const timer = this.heartbeatTimers.get(sessionId);
        if (timer) {
            clearInterval(timer);
            this.heartbeatTimers.delete(sessionId);
        }
    }
    
    private async createLock(graphPath: string, session: Session): Promise<void> {
        const lock: LockFile = {
            sessionId: session.id,
            userId: session.userId,
            created: session.created,
            lastUpdated: new Date(),
            hostname: vscode.env.machineId,
            pid: process.pid
        };
        
        this.lockFiles.set(graphPath, lock);
        
        // Also save to workspace state for persistence
        await this.saveLockToWorkspace(graphPath, lock);
    }
    
    private async updateLock(graphPath: string, session: Session): Promise<void> {
        const lock = this.lockFiles.get(graphPath);
        if (lock) {
            lock.lastUpdated = new Date();
            await this.saveLockToWorkspace(graphPath, lock);
        }
    }
    
    private async removeLock(graphPath: string): Promise<void> {
        this.lockFiles.delete(graphPath);
        await this.removeLockFromWorkspace(graphPath);
    }
    
    private async checkLock(graphPath: string): Promise<LockFile | null> {
        // Check in-memory first
        const memoryLock = this.lockFiles.get(graphPath);
        if (memoryLock) {
            return memoryLock;
        }
        
        // Check workspace state
        return await this.loadLockFromWorkspace(graphPath);
    }
    
    private async forceUnlock(graphPath: string, requestingUser: string): Promise<void> {
        const lock = await this.checkLock(graphPath);
        if (lock) {
            // Find and end the session
            for (const [id, session] of this.sessions) {
                if (session.graphPath === graphPath) {
                    await this.endSession(id);
                    break;
                }
            }
        }
        
        console.log(`Force unlocked ${graphPath} by ${requestingUser}`);
    }
    
    private generateSessionId(): string {
        return crypto.randomBytes(16).toString('hex');
    }
    
    private startLockChecker(): void {
        // Periodically check for stale locks
        setInterval(async () => {
            await this.cleanupStaleSessions();
        }, this.LOCK_CHECK_INTERVAL);
    }
    
    private async saveLockToWorkspace(graphPath: string, lock: LockFile): Promise<void> {
        const key = `lock.${Buffer.from(graphPath).toString('base64')}`;
        await this.context.workspaceState.update(key, lock);
    }
    
    private async loadLockFromWorkspace(graphPath: string): Promise<LockFile | null> {
        const key = `lock.${Buffer.from(graphPath).toString('base64')}`;
        return this.context.workspaceState.get<LockFile>(key) || null;
    }
    
    private async removeLockFromWorkspace(graphPath: string): Promise<void> {
        const key = `lock.${Buffer.from(graphPath).toString('base64')}`;
        await this.context.workspaceState.update(key, undefined);
    }
    
    /**
     * Handle workspace shutdown
     */
    async dispose(): Promise<void> {
        // End all sessions
        const sessionIds = Array.from(this.sessions.keys());
        for (const id of sessionIds) {
            await this.endSession(id);
        }
        
        // Clear all timers
        this.heartbeatTimers.forEach(timer => clearInterval(timer));
        this.heartbeatTimers.clear();
    }
}

export enum SessionStatus {
    ACTIVE = 'active',
    IDLE = 'idle',
    CLOSED = 'closed',
    EXPIRED = 'expired'
}

export interface Session {
    id: string;
    graphPath: string;
    userId: string;
    created: Date;
    lastHeartbeat: Date;
    status: SessionStatus;
    metadata: Record<string, any>;
}

export interface SessionOptions {
    force?: boolean;
    metadata?: Record<string, any>;
}

export interface LockFile {
    sessionId: string;
    userId: string;
    created: Date;
    lastUpdated: Date;
    hostname: string;
    pid: number;
}

export interface EditRequest {
    granted: boolean;
    sessionId?: string;
    currentUser?: string;
    waitTime?: number;
    tookOver?: boolean;
}

export class SessionError extends Error {
    constructor(
        message: string,
        public code: string,
        public lock?: LockFile
    ) {
        super(message);
        this.name = 'SessionError';
    }
}

/**
 * VS Code commands for session management
 */
export function registerSessionCommands(context: vscode.ExtensionContext): void {
    const manager = SessionManager.getInstance(context);
    
    context.subscriptions.push(
        vscode.commands.registerCommand('ramen.showActiveSessions', async () => {
            const sessions = manager.getActiveSessions();
            
            if (sessions.length === 0) {
                vscode.window.showInformationMessage('No active editing sessions');
                return;
            }
            
            const items = sessions.map(s => ({
                label: s.graphPath.split('/').pop() || s.graphPath,
                description: `User: ${s.userId}`,
                detail: `Created: ${s.created.toLocaleString()}, Last activity: ${s.lastHeartbeat.toLocaleString()}`,
                session: s
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a session to manage'
            });
            
            if (selected) {
                const action = await vscode.window.showQuickPick([
                    'End Session',
                    'View Details',
                    'Cancel'
                ]);
                
                if (action === 'End Session') {
                    await manager.endSession(selected.session.id);
                    vscode.window.showInformationMessage('Session ended');
                }
            }
        }),
        
        vscode.commands.registerCommand('ramen.cleanupSessions', async () => {
            const count = await manager.cleanupStaleSessions();
            vscode.window.showInformationMessage(`Cleaned up ${count} stale sessions`);
        })
    );
    
    // Cleanup on deactivation
    context.subscriptions.push({
        dispose: async () => {
            await manager.dispose();
        }
    });
}