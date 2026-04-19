import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: string;
  userId: string; // Unique visible ID (e.g., "USR-001")
  username: string;
  name: string;
  email: string;
  position: string;
  createdAt: string;
  passwordHint: string | null;
}

const AUTH_STORAGE_KEY = "cms_current_user";

export const authService = {
  // Login (async - now makes API call)
  async login(username: string, password: string): Promise<User | null> {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });

      const data = await response.json() as { success: boolean; user: User };

      if (data.success && data.user) {
        // Store user in localStorage for client-side state
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        return data.user;
      }

      return null;
    } catch (error) {
      console.error("Login error:", error);
      return null;
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear localStorage
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  // Get current user from localStorage (instant, synchronous)
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Set current user in localStorage (used for syncing with server session)
  setCurrentUser(user: User): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  // Get all users from database
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await apiRequest("GET", "/api/auth/users");
      const users = await response.json() as User[];
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  },

  // Get password hint for a username (from database)
  async getPasswordHint(username: string): Promise<string | null> {
    try {
      const response = await apiRequest("POST", "/api/auth/password-hint", {
        username,
      });
      const data = await response.json() as { hint: string };
      return data.hint;
    } catch (error) {
      console.error("Error getting password hint:", error);
      return null;
    }
  },

  // Add a new user
  async addUser(
    username: string,
    password: string,
    name: string,
    email: string,
    position: string,
    passwordHint: string = ""
  ): Promise<User> {
    const response = await apiRequest("POST", "/api/auth/users", {
      username,
      password,
      name,
      email,
      position,
      passwordHint,
    });
    const user = await response.json() as User;
    return user;
  },

  // Update a user
  async updateUser(
    id: string,
    updates: {
      username?: string;
      name?: string;
      email?: string;
      position?: string;
      passwordHint?: string;
    }
  ): Promise<User> {
    const response = await apiRequest("PATCH", `/api/auth/users/${id}`, updates);
    const user = await response.json() as User;
    return user;
  },

  // Update user password
  async updateUserPassword(
    id: string,
    newPassword: string,
    passwordHint?: string
  ): Promise<void> {
    await apiRequest("PATCH", `/api/auth/users/${id}/password`, {
      newPassword,
      passwordHint,
    });
  },

  // Delete a user
  async deleteUser(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/auth/users/${id}`);
  },

  // Get all users for display (alias for getAllUsers for backward compatibility)
  async getUsersForDisplay(): Promise<User[]> {
    return this.getAllUsers();
  },
};
