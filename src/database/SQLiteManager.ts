/**
 * src/database/SQLiteManager.ts
 * Offline-First SQLite Core Manager
 * Handles: DB Init, Transaction Wrapper, Safe Query Execution
 * Library: react-native-sqlite-storage
 */

import SQLite from "react-native-sqlite-storage";
type SQLiteDatabase = any;
type Transaction = any;
type ResultSet = any;

// Enable Promise
SQLite.enablePromise(true);

const DATABASE_NAME = "myapp_offline.db";
const DATABASE_VERSION = "1.0";
const DATABASE_DISPLAY_NAME = "MyApp Offline DB";
const DATABASE_SIZE = 200000; // 200KB initial

class SQLiteManagerSingleton {
  private static instance: SQLiteManagerSingleton;
  private db: SQLiteDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<SQLiteDatabase> | null = null;

  private constructor() {}

  static getInstance(): SQLiteManagerSingleton {
    if (!SQLiteManagerSingleton.instance) {
      SQLiteManagerSingleton.instance = new SQLiteManagerSingleton();
    }
    return SQLiteManagerSingleton.instance;
  }

  /**
   * Initialize DB (Offline-First)
   * Called once at App Launch
   */
  async init(): Promise<SQLiteDatabase> {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        console.log("[SQLiteManager] Initializing DB...");
        const database = await SQLite.openDatabase({
          name: DATABASE_NAME,
          version: DATABASE_VERSION,
          displayName: DATABASE_DISPLAY_NAME,
          size: DATABASE_SIZE,
          createFromLocation: "~myapp_offline.db", // Pre-populated if needed
        });

        this.db = database;
        await this.createTables(database);
        await this.enableForeignKeys(database);

        this.isInitialized = true;
        console.log("[SQLiteManager] DB Initialized Successfully");
        resolve(database);
      } catch (error) {
        console.error("[SQLiteManager] Init Failed:", error);
        reject(error);
      } finally {
        this.initPromise = null;
      }
    });

    return this.initPromise;
  }

  private async enableForeignKeys(db: SQLiteDatabase): Promise<void> {
    await db.executeSql("PRAGMA foreign_keys = ON;");
    await db.executeSql("PRAGMA journal_mode = WAL;"); // Better concurrency
  }

  /**
   * Create Tables - WordTable & ChapterTable + DailyBank + Settings
   */
  private async createTables(db: SQLiteDatabase): Promise<void> {
    const queries = [
      // WordTable - Core Content
      `CREATE TABLE IF NOT EXISTS WordTable (
        word_id INTEGER PRIMARY KEY NOT NULL,
        display_word_id INTEGER NOT NULL,
        chapter_id INTEGER NOT NULL,
        chapter_name TEXT NOT NULL,
        content TEXT,
        view_id INTEGER DEFAULT 0, -- 0=Locked/Incomplete, 1=Unlocked/Complete (5 Modes Done)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // ChapterTable - Chapter Unlock Logic (80% Manager)
      `CREATE TABLE IF NOT EXISTS ChapterTable (
        chapter_id INTEGER PRIMARY KEY NOT NULL,
        chapter_name TEXT NOT NULL,
        total_words INTEGER NOT NULL,
        completed_words INTEGER DEFAULT 0,
        unlocked_id INTEGER DEFAULT 0, -- 0=Locked, 1=Unlocked (80% + Bank)
        target_percentage INTEGER DEFAULT 50, -- Dynamic from 30-Day Algo (50-100)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // DailyBank - Credit Wallet
      `CREATE TABLE IF NOT EXISTS DailyBank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_balance INTEGER DEFAULT 0, -- e.g., 490%
        today_earned INTEGER DEFAULT 0, -- e.g., +20%
        last_updated DATE DEFAULT CURRENT_DATE
      );`,

      // Manifesto Download List
      `CREATE TABLE IF NOT EXISTS ManifestoTable (
        manifesto_id INTEGER PRIMARY KEY NOT NULL,
        chapter_id INTEGER NOT NULL,
        chapter_name TEXT NOT NULL,
        is_downloaded INTEGER DEFAULT 0, -- 0=Download Icon, 1=Delete Icon
        json_data TEXT,
        downloaded_at TIMESTAMP
      );`,

      // Indexes for Performance (Batch Query Optimization)
      "CREATE INDEX IF NOT EXISTS idx_word_chapter ON WordTable(chapter_id);",
      "CREATE INDEX IF NOT EXISTS idx_word_view ON WordTable(view_id);",
      "CREATE INDEX IF NOT EXISTS idx_word_display ON WordTable(display_word_id);",
    ];

    for (const query of queries) {
      await db.executeSql(query);
    }

    console.log("[SQLiteManager] Tables Created / Verified");
  }

  /**
   * Get DB Instance
   */
  async getDB(): Promise<SQLiteDatabase> {
    if (this.db && this.isInitialized) {
      return this.db;
    }
    return this.init();
  }

  /**
   * Safe Execute SQL with Error Handling
   */
  async executeSql(query: string, params: any[] = []): Promise<[ResultSet]> {
    const db = await this.getDB();
    try {
      const result = await db.executeSql(query, params);
      return result as unknown as [ResultSet];
    } catch (error) {
      console.error(`[SQLiteManager] Query Failed: ${query}`, error);
      throw error;
    }
  }

  /**
   * Transaction Wrapper - For Batch Operations
   */
  async transaction(
    callback: (tx: Transaction) => Promise<void> | void
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(
        async (tx: any) => {
          try {
            await callback(tx);
          } catch (error) {
            console.error("[SQLiteManager] Transaction Callback Error:", error);
            throw error;
          }
        },
        (error: any) => {
          console.error("[SQLiteManager] Transaction Failed:", error);
          reject(error);
        },
        () => {
          resolve();
        }
      );
    });
  }

  /**
   * Close DB (On App Exit)
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log("[SQLiteManager] DB Closed");
    }
  }

  /**
   * For Debugging - Clear All
   */
  async clearAll(): Promise<void> {
    const db = await this.getDB();
    await db.executeSql("DELETE FROM WordTable;");
    await db.executeSql("DELETE FROM ChapterTable;");
    await db.executeSql("DELETE FROM DailyBank;");
    console.log("[SQLiteManager] All Tables Cleared");
  }
}

export const SQLiteManager = SQLiteManagerSingleton.getInstance();
export default SQLiteManager;
