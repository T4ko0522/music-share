import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { Logger } from '../logger/index.js';

const DEFAULT_FILE_PATH = 'data/youtube-blacklist-channels.json';

export class YouTubeChannelBlacklist {
  private channelIds = new Set<string>();
  private readonly filePath: string;
  private readonly logger = new Logger('YouTubeChannelBlacklist');

  constructor(filePath: string = DEFAULT_FILE_PATH) {
    this.filePath = filePath;
  }

  async load(): Promise<void> {
    try {
      if (!existsSync(this.filePath)) {
        this.channelIds = new Set();
        return;
      }
      const data = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data) as string[];
      this.channelIds = new Set(Array.isArray(parsed) ? parsed : []);
      this.logger.debug('Loaded YouTube channel blacklist', { count: this.channelIds.size });
    } catch (err) {
      this.logger.warn('Failed to load YouTube channel blacklist, starting empty', { path: this.filePath, error: String(err) });
      this.channelIds = new Set();
    }
  }

  private async save(): Promise<void> {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      const data = JSON.stringify([...this.channelIds], null, 0);
      await writeFile(this.filePath, data, 'utf-8');
    } catch (err) {
      this.logger.error('Failed to save YouTube channel blacklist', { path: this.filePath, error: String(err) });
    }
  }

  has(channelId: string): boolean {
    return this.channelIds.has(channelId);
  }

  async add(channelId: string): Promise<void> {
    this.channelIds.add(channelId);
    await this.save();
  }

  async remove(channelId: string): Promise<void> {
    this.channelIds.delete(channelId);
    await this.save();
  }

  getAll(): string[] {
    return [...this.channelIds];
  }
}
