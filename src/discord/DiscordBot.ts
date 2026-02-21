import { Client, GatewayIntentBits, type Message, type MessageReplyOptions } from 'discord.js';
import { parseMessage } from '../parser/UrlParser.js';
import { MusicService, type ConversionResult } from '../types/index.js';
import type { ResolverRegistry } from '../resolver/ResolverRegistry.js';
import type { CrossServiceMatcher } from '../matcher/CrossServiceMatcher.js';
import type { TtlCache } from '../cache/TtlCache.js';
import type { RateLimiter } from '../ratelimit/RateLimiter.js';
import { MessageFormatter } from '../formatter/MessageFormatter.js';
import { Logger } from '../logger/index.js';
import { AppError, ErrorCategory } from '../errors/index.js';

export interface DiscordBotDeps {
  token: string;
  resolverRegistry: ResolverRegistry;
  crossMatcher: CrossServiceMatcher;
  cache: TtlCache<ConversionResult>;
  rateLimiter: RateLimiter;
}

export class DiscordBot {
  private readonly client: Client;
  private readonly deps: DiscordBotDeps;
  private readonly formatter = new MessageFormatter();
  private readonly logger = new Logger('DiscordBot');

  constructor(deps: DiscordBotDeps) {
    this.deps = deps;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.on('messageCreate', (msg) => this.handleMessage(msg));
    this.client.on('clientReady', () => {
      this.logger.info('Bot is ready', { user: this.client.user?.tag });
    });
  }

  async start(): Promise<void> {
    await this.client.login(this.deps.token);
  }

  async stop(): Promise<void> {
    this.client.destroy();
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bots
    if (message.author.bot) return;

    // Only respond to mentions
    if (!this.client.user || !message.mentions.has(this.client.user)) return;

    const userId = message.author.id;
    const guildId = message.guildId;

    // Rate limit check
    if (!this.deps.rateLimiter.check(userId, guildId)) {
      await this.sendToChannel(message, this.formatter.buildRateLimitedReplyWithEmbed());
      await this.deleteTriggerMessage(message);
      return;
    }

    // Parse URLs from message
    const parsedUrls = parseMessage(message.content);

    if (parsedUrls.length === 0) {
      await this.sendToChannel(message, this.formatter.buildUsageReplyWithEmbed());
      await this.deleteTriggerMessage(message);
      return;
    }

    // 先頭の URL のみ処理
    const parsed = parsedUrls[0]!;

    // Apple Music は対応予定のためスキップ
    if (parsed.service === MusicService.AppleMusic) {
      await this.sendToChannel(message, this.formatter.buildErrorReplyWithEmbed('Apple Music：対応予定'));
      await this.deleteTriggerMessage(message);
      return;
    }

    const displayName = message.member?.displayName ?? message.author.globalName ?? message.author.username;

    try {
      // Check cache
      const cacheKey = `${parsed.service}:${parsed.id}`;
      const cached = this.deps.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { cacheKey });
        await this.sendToChannel(message, this.formatter.buildReplyWithEmbed(cached, displayName));
        await this.deleteTriggerMessage(message);
        return;
      }

      // Resolve source metadata
      const resolver = this.deps.resolverRegistry.get(parsed.service);
      if (!resolver) {
        await this.sendToChannel(message, this.formatter.buildErrorReplyWithEmbed('サポートされていないサービスです'));
        await this.deleteTriggerMessage(message);
        return;
      }

      this.logger.info('Resolving track', { service: parsed.service, id: parsed.id });
      const metadata = await resolver.resolve(parsed.id);

      // Find matches on other services
      const links = await this.deps.crossMatcher.match(metadata);

      const result: ConversionResult = {
        source: metadata,
        links,
      };

      // Cache the result
      this.deps.cache.set(cacheKey, result);

      // 新しいメッセージとして送信
      await this.sendToChannel(message, this.formatter.buildReplyWithEmbed(result, displayName));
      await this.deleteTriggerMessage(message);
    } catch (error) {
      if (error instanceof AppError) {
        this.logger.error('Conversion failed', {
          category: error.category,
          message: error.message,
          context: error.context,
        });

        if (error.category === ErrorCategory.Api) {
          await this.sendToChannel(message, this.formatter.buildErrorReplyWithEmbed('外部APIとの通信に失敗しました。しばらく待ってから再試行してください。'));
        } else {
          await this.sendToChannel(message, this.formatter.buildErrorReplyWithEmbed('変換処理中にエラーが発生しました。'));
        }
      } else {
        this.logger.error('Unexpected error', { error: String(error) });
        await this.sendToChannel(message, this.formatter.buildErrorReplyWithEmbed('予期しないエラーが発生しました。'));
      }
      await this.deleteTriggerMessage(message);
    }
  }

  /** 同じチャンネルに新規メッセージとして送信（リプライではない） */
  private async sendToChannel(message: Message, options: MessageReplyOptions): Promise<void> {
    const channel = message.channel as { send(options: MessageReplyOptions): Promise<unknown> };
    await channel.send(options);
  }

  /** トリガーになったユーザーメッセージを削除。権限がない場合は握りつぶす */
  private async deleteTriggerMessage(message: Message): Promise<void> {
    await message.delete().catch((err) => {
      this.logger.debug('Could not delete trigger message', { reason: String(err) });
    });
  }
}
