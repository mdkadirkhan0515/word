/**
 * src/database/SQLiteManager.ts
 * Offline-First SQLite Core Manager
 * Handles: DB Init, Transaction Wrapper, Safe Query Execution
 * Library: react-native-sqlite-storage
 */

import SQLite from 'react-native-sqlite-storage';
type SQLiteDatabase = any;
type Transaction = any;
type ResultSet = any;

// Enable Promise
SQLite.enablePromise(true);

const DATABASE_NAME = 'myapp_offline.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAY_NAME = 'MyApp Offline DB';
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
        console.log('[SQLiteManager] Initializing DB...');
        const database = await SQLite.openDatabase({
          name: DATABASE_NAME,
          version: DATABASE_VERSION,
          displayName: DATABASE_DISPLAY_NAME,
          size: DATABASE_SIZE,
          // createFromLocation removed - using seeded default data
        });

        this.db = database;
        await this.createTables(database);
        await this.enableForeignKeys(database);

        this.isInitialized = true;
        console.log('[SQLiteManager] DB Initialized Successfully');
        resolve(database);
      } catch (error) {
        console.error('[SQLiteManager] Init Failed:', error);
        reject(error);
      } finally {
        this.initPromise = null;
      }
    });

    return this.initPromise;
  }

  private async enableForeignKeys(db: SQLiteDatabase): Promise<void> {
    await db.executeSql('PRAGMA foreign_keys = ON;');
    await db.executeSql('PRAGMA journal_mode = WAL;'); // Better concurrency
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
      'CREATE INDEX IF NOT EXISTS idx_word_chapter ON WordTable(chapter_id);',
      'CREATE INDEX IF NOT EXISTS idx_word_view ON WordTable(view_id);',
      'CREATE INDEX IF NOT EXISTS idx_word_display ON WordTable(display_word_id);',
    ];

    for (const query of queries) {
      await db.executeSql(query);
    }

    console.log('[SQLiteManager] Tables Created / Verified');

    // Seed default data if empty - Fix for blank splash
    await this.seedDefaultDataIfNeeded(db);
  }

  /**
   * Seed Default Data - Offline First Default Content
   * If ChapterTable is empty, insert 3 default chapters + sample words
   * This prevents HomeScreen empty and App stuck on splash
   */
  public async forceSeedDefaultData(): Promise<void> {
    const db = await this.getDB();
    await this.seedDefaultDataIfNeeded(db);
    // If still 0, delete and re-seed
    try {
      const [r] = await db.executeSql(
        'SELECT COUNT(*) as count FROM ChapterTable;',
      );
      if (r.rows.item(0).count === 0) {
        console.log(
          '[SQLiteManager] Still 0 after seed, clearing and re-seeding...',
        );
        await db.executeSql('DELETE FROM ChapterTable;');
        await db.executeSql('DELETE FROM WordTable;');
        // Insert directly again
        const defaultChapters = [
          {
            chapter_id: 1,
            chapter_name: 'সহজ শব্দ',
            total_words: 20,
            unlocked_id: 1,
            target_percentage: 50,
          },
          {
            chapter_id: 2,
            chapter_name: 'মাঝারি শব্দ',
            total_words: 20,
            unlocked_id: 0,
            target_percentage: 60,
          },
          {
            chapter_id: 3,
            chapter_name: 'কঠিন শব্দ',
            total_words: 20,
            unlocked_id: 0,
            target_percentage: 80,
          },
        ];
        for (const ch of defaultChapters) {
          await db.executeSql(
            'INSERT OR REPLACE INTO ChapterTable (chapter_id, chapter_name, total_words, completed_words, unlocked_id, target_percentage) VALUES (?, ?, ?, 0, ?, ?);',
            [
              ch.chapter_id,
              ch.chapter_name,
              ch.total_words,
              ch.unlocked_id,
              ch.target_percentage,
            ],
          );
        }
      }
    } catch (e) {
      console.error('[SQLiteManager] forceSeed check failed', e);
    }
  }

  private async seedDefaultDataIfNeeded(db: SQLiteDatabase): Promise<void> {
    try {
      const [result] = await db.executeSql(
        'SELECT COUNT(*) as count FROM ChapterTable;',
      );
      const count = result.rows.item(0).count as number;

      if (count === 0) {
        console.log('[SQLiteManager] Seeding default chapters...');

        // Default Chapters - শব্দ App
        const defaultChapters = [
          {
            chapter_id: 1,
            chapter_name: 'সহজ শব্দ',
            total_words: 20,
            unlocked_id: 1,
            target_percentage: 50,
          },
          {
            chapter_id: 2,
            chapter_name: 'মাঝারি শব্দ',
            total_words: 20,
            unlocked_id: 0,
            target_percentage: 60,
          },
          {
            chapter_id: 3,
            chapter_name: 'কঠিন শব্দ',
            total_words: 20,
            unlocked_id: 0,
            target_percentage: 80,
          },
        ];

        for (const ch of defaultChapters) {
          await db.executeSql(
            'INSERT OR IGNORE INTO ChapterTable (chapter_id, chapter_name, total_words, completed_words, unlocked_id, target_percentage) VALUES (?, ?, ?, 0, ?, ?);',
            [
              ch.chapter_id,
              ch.chapter_name,
              ch.total_words,
              ch.unlocked_id,
              ch.target_percentage,
            ],
          );
        }

        // Sample Words for Chapter 1 (20 words)
        const sampleWords = [
          'অভিজ্ঞতা',
          'অর্জন',
          'অনুভূতি',
          'আলোচনা',
          'উন্নতি',
          'কল্পনা',
          'জীবন',
          'চিন্তা',
          'দক্ষতা',
          'পরিশ্রম',
          'প্রচেষ্টা',
          'বন্ধুত্ব',
          'ভালোবাসা',
          'মনোযোগ',
          'যাত্রা',
          'সাহস',
          'স্বপ্ন',
          'সফলতা',
          'সময়',
          'শিক্ষা',
        ];

        for (let i = 0; i < sampleWords.length; i++) {
          const word_id = 101 + i;
          await db.executeSql(
            'INSERT OR IGNORE INTO WordTable (word_id, display_word_id, chapter_id, chapter_name, content, view_id) VALUES (?, ?, ?, ?, ?, 0);',
            [
              word_id,
              word_id,
              1,
              'সহজ শব্দ',
              JSON.stringify({
                word: sampleWords[i],
                meaning: `অর্থ ${i + 1}`,
                example: `উদাহরণ ${sampleWords[i]}`,
              }),
            ],
          );
        }

        // DailyBank initial row
        await db.executeSql(
          'INSERT OR IGNORE INTO DailyBank (id, total_balance, today_earned, last_updated) VALUES (1, 0, 0, CURRENT_DATE);',
        );

        console.log(
          '[SQLiteManager] Default data seeded - 3 chapters, 20 words',
        );
      }
    } catch (e) {
      console.error('[SQLiteManager] Seed failed:', e);
    }
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
    callback: (tx: Transaction) => Promise<void> | void,
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(
        async (tx: any) => {
          try {
            await callback(tx);
          } catch (error) {
            console.error('[SQLiteManager] Transaction Callback Error:', error);
            throw error;
          }
        },
        (error: any) => {
          console.error('[SQLiteManager] Transaction Failed:', error);
          reject(error);
        },
        () => {
          resolve();
        },
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
      console.log('[SQLiteManager] DB Closed');
    }
  }

  /**
   * For Debugging - Clear All
   */
  async clearAll(): Promise<void> {
    const db = await this.getDB();
    await db.executeSql('DELETE FROM WordTable;');
    await db.executeSql('DELETE FROM ChapterTable;');
    await db.executeSql('DELETE FROM DailyBank;');
    console.log('[SQLiteManager] All Tables Cleared');
  }
}

export const SQLiteManager = SQLiteManagerSingleton.getInstance();
export default SQLiteManager;
