import { UserState } from './types.js';

/**
 * State manager for tracking user sessions during task creation
 * Similar to the reference bot but adapted for our task structure
 */
class StateManager {
    private userStates: Map<number, UserState> = new Map();

    /**
     * Set user state
     */
    setUserState(userId: number, state: UserState): void {
        this.userStates.set(userId, state);
        console.log(`📝 State set for user ${userId}: step=${state.step}`);
    }

    /**
     * Get user state
     */
    getUserState(userId: number): UserState | undefined {
        return this.userStates.get(userId);
    }

    /**
     * Check if user has active state
     */
    hasUserState(userId: number): boolean {
        return this.userStates.has(userId);
    }

    /**
     * Delete user state
     */
    deleteUserState(userId: number): void {
        const deleted = this.userStates.delete(userId);
        if (deleted) {
            console.log(`🗑️ State deleted for user ${userId}`);
        }
    }

    /**
     * Clear all states (used on bot restart)
     */
    clear(): void {
        const count = this.userStates.size;
        this.userStates.clear();
        console.log(`🧹 Cleared ${count} user states`);
    }

    /**
     * Get total number of active states
     */
    size(): number {
        return this.userStates.size;
    }
}

// Export singleton instance
export const stateManager = new StateManager();