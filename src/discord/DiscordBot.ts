import {
  Client,
  GatewayIntentBits,
  type Message,
  type MessageReplyOptions,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
} from 'discord.js';
import { parseMessage } from '../parser/UrlParser.js';
import { MusicService, type ConversionResult } from '../types/index.js';
import type { ResolverRegistry } from '../resolver/ResolverRegistry.js';
import type { CrossServiceMatcher } from '../matcher/CrossServiceMatcher.js';
import type { TtlCache } from '../cache/TtlCache.js';
import type { RateLimiter } from '../ratelimit/RateLimiter.js';
import type { YouTubeChannelBlacklist } from '../matcher/YouTubeChannelBlacklist.js';
import { MessageFormatter } from '../formatter/MessageFormatter.js';
import { Logger } from '../logger/index.js';
import { AppError, ErrorCategory } from '../errors/index.js';

/** 入力から YouTube チャンネルID（UCで始まる24文字）を抽出。URLまたは生IDに対応。 */
function parseYouTubeChannelId(input: string): string | null {
  const trimmed = input.trim();
  // すでに UCxxxxxxxxxxxxxxxxxxxxxx 形式（24文字）
  if (/^UC[\w-]{22}$/.test(trimmed)) return trimmed;
  // youtube.com/channel/UC... または music.youtube.com/channel/UC...
  const m = trimmed.match(/(?:youtube\.com|youtube\.co\.uk|music\.youtube\.com)\/channel\/(UC[\w-]{22})/i);
  return m ? m[1]! : null;
}

export interface DiscordBotDeps {
  token: string;
  resolverRegistry: ResolverRegistry;
  crossMatcher: CrossServiceMatcher;
  cache: TtlCache<ConversionResult>;
  rateLimiter: RateLimiter;
  youtubeChannelBlacklist: YouTubeChannelBlacklist;
  /** /blacklist-channel を実行できるユーザーID */
  blacklistAdminUserId: string;
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
      this.registerSlashCommands().catch((err) => this.logger.error('Failed to register slash commands', { error: String(err) }));
    });
    this.client.on('interactionCreate', (interaction) => this.handleInteraction(interaction));
  }

  async start(): Promise<void> {
    await this.client.login(this.deps.token);
  }

  private async registerSlashCommands(): Promise<void> {
    const app = this.client.application;
    if (!app) return;

    await app.commands.set([
      {
        name: 'blacklist-channel',
        description: 'YouTubeチャンネルをマッチ除外リストに登録または解除します',
        defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
        options: [
          {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'add',
            description: 'YouTubeチャンネルを除外リストに追加（そのチャンネルの動画はマッチ候補から除外）',
            options: [
              {
                type: ApplicationCommandOptionType.String,
                name: 'channel',
                description: 'YouTubeチャンネルID（UCで始まる24文字）または youtube.com/channel/UC... のURL',
                required: true,
              },
            ],
          },
          {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'remove',
            description: 'YouTubeチャンネルを除外リストから解除',
            options: [
              {
                type: ApplicationCommandOptionType.String,
                name: 'channel',
                description: 'YouTubeチャンネルID（UCで始まる24文字）または youtube.com/channel/UC... のURL',
                required: true,
              },
            ],
          },
        ],
      },
    ]);
    this.logger.info('Slash commands registered');
  }

  private async handleInteraction(interaction: import('discord.js').BaseInteraction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'blacklist-channel') return;

    if (interaction.user.id !== this.deps.blacklistAdminUserId) {
      await interaction.reply({ content: 'このコマンドを使用する権限がありません。', ephemeral: true });
      return;
    }

    const input = interaction.options.getString('channel', true).trim();
    const channelId = parseYouTubeChannelId(input);
    if (!channelId) {
      await interaction.reply({
        content: 'YouTubeチャンネルIDを認識できません。UCで始まる24文字のIDか、youtube.com/channel/UC... のURLを指定してください。',
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'add') {
      await this.deps.youtubeChannelBlacklist.add(channelId);
      await interaction.reply({ content: `YouTubeチャンネル \`${channelId}\` を除外リストに追加しました。`, ephemeral: true });
    } else if (subcommand === 'remove') {
      await this.deps.youtubeChannelBlacklist.remove(channelId);
      await interaction.reply({ content: `YouTubeチャンネル \`${channelId}\` を除外リストから解除しました。`, ephemeral: true });
    }
  }

  async stop(): Promise<void> {
    this.client.destroy();
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bots
    if (message.author.bot) return;

    // Only respond to direct mentions (ignore implicit mentions from replies)
    if (!this.client.user || !message.mentions.has(this.client.user, { ignoreRepliedUser: true })) return;

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
