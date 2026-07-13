import { Env } from '../types';

// Database wrapper to handle local development issues
export class DatabaseWrapper {
  private env: Env;
  private isLocal: boolean;

  constructor(env: Env) {
    this.env = env;
    this.isLocal = this.detectLocalEnvironment();
  }

  private detectLocalEnvironment(): boolean {
    // Check if we're in local development mode
    return !this.env.DB || typeof this.env.DB.prepare !== 'function';
  }

  async prepare(query: string) {
    if (this.isLocal) {
      // For local development, we'll use a mock or alternative approach
      console.log('[DB Wrapper] Local environment detected, using fallback');
      return this.createLocalWrapper(query);
    }
    
    // Production/remote environment
    return this.env.DB.prepare(query);
  }

  private createLocalWrapper(query: string) {
    // Create a wrapper that mimics D1Database.prepare behavior
    return {
      bind: (...params: any[]) => {
        const boundStmt = {
          first: async () => {
            // For local testing, return mock data
            console.log('[DB Wrapper] Mock query:', query, 'Params:', params);
            
            // Handle specific queries with mock responses
            if (query.includes('SELECT * FROM User WHERE username = ?')) {
              const username = params[0];
              if (username === 'admin') {
                return {
                  id: 1,
                  username: 'admin',
                  nickname: '管理员',
                  password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
                  avatarUrl: '/avatar.webp',
                  slogan: '系统管理员',
                  coverUrl: '/cover.webp',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
              }
            }
            
            if (query.includes('SELECT username, nickname FROM User')) {
              return {
                username: 'admin',
                nickname: '管理员'
              };
            }
            
            if (query.includes('SELECT * FROM User ORDER BY id LIMIT 1')) {
              return {
                id: 1,
                username: 'admin',
                nickname: '管理员',
                slogan: '系统管理员',
                avatarUrl: '/avatar.webp',
                coverUrl: '/cover.webp',
                email: null
              };
            }
            
            if (query.includes('SELECT username, nickname, slogan, id, avatarUrl, coverUrl, email FROM User WHERE username = ?')) {
              const username = params[0];
              if (username === 'admin') {
                return {
                  id: 1,
                  username: 'admin',
                  nickname: '管理员',
                  slogan: '系统管理员',
                  avatarUrl: '/avatar.webp',
                  coverUrl: '/cover.webp',
                  email: null
                };
              }
            }
            
            return null;
          },
          run: async () => ({ success: true }),
          all: async () => []
        };
        return boundStmt;
      }
    };
  }
}

// Export a factory function to create database wrapper
export function createDatabaseWrapper(env: Env): DatabaseWrapper {
  return new DatabaseWrapper(env);
}