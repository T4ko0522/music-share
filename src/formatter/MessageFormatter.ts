import type { MessageReplyOptions } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
} from 'discord.js';
import { MatchConfidence, type ConversionResult } from '../types/index.js';
import { FormatterMessages } from './messages.js';

/** Embed + コンポーネント付き返信用オプション */
export type ReplyWithEmbedOptions = MessageReplyOptions;

export class MessageFormatter {
  private readonly messages = FormatterMessages;

  /**
   * 変換結果を Embed + Link ボタンで返信するためのオプションを組み立てる。
   * 1 Embed（曲情報 + サムネ）+ 1 行の Link ボタン（元サービス + 他サービス）。
   * @param requestedByUsername リクエストしたユーザー名（フッター「by ...」に使用）
   */
  buildReplyWithEmbed(result: ConversionResult, requestedByUsername?: string): ReplyWithEmbedOptions {
    const { source, links } = result;
    const labels = this.messages.serviceLabels;
    const artistStr = source.artists.join(', ');

    // 表示順: 1. 曲名, 2. アーティスト（タイトル）, 3. 画像（大）。フッターは by username
    const embed = new EmbedBuilder()
      .setTitle(this.messages.formatEmbedTitle(source.title))
      .setDescription(this.messages.formatEmbedArtist(artistStr));
    const successColor = this.messages.embedColors.success;
    if (successColor != null) embed.setColor(successColor);
    if (requestedByUsername) {
      embed.setFooter({ text: this.messages.formatEmbedFooter(requestedByUsername) });
    }

    if (source.thumbnailUrl) {
      embed.setImage(source.thumbnailUrl);
    }

    // 元のサービス + マッチした他サービスのリンクをボタンに（最大5個）。各サービスの絵文字で色味を表現
    const emoji = this.messages.buttonEmoji;
    const buttons: ButtonBuilder[] = [
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(source.sourceUrl)
        .setLabel(labels[source.sourceService])
        .setEmoji(emoji[source.sourceService]),
    ];
    for (const link of links) {
      buttons.push(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setURL(link.url)
          .setLabel(labels[link.service])
          .setEmoji(emoji[link.service]),
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...buttons.slice(0, 5),
    );

    return {
      embeds: [embed],
      components: [row],
    };
  }

  /** エラーを Embed で返すオプション */
  buildErrorReplyWithEmbed(message: string): ReplyWithEmbedOptions {
    const embed = new EmbedBuilder()
      .setColor(this.messages.embedColors.error)
      .setDescription(`${this.messages.errorPrefix} ${message}`);
    return { embeds: [embed], components: [] };
  }

  /** 使い方を Embed で返すオプション */
  buildUsageReplyWithEmbed(): ReplyWithEmbedOptions {
    const embed = new EmbedBuilder()
      .setColor(this.messages.embedColors.usage)
      .setDescription(this.messages.usage);
    return { embeds: [embed], components: [] };
  }

  /** レート制限を Embed で返すオプション */
  buildRateLimitedReplyWithEmbed(): ReplyWithEmbedOptions {
    const embed = new EmbedBuilder()
      .setColor(this.messages.embedColors.rateLimited)
      .setDescription(this.messages.rateLimited);
    return { embeds: [embed], components: [] };
  }

  format(result: ConversionResult): string {
    const { source, links } = result;
    const artistStr = source.artists.join(', ');
    const labels = this.messages.serviceLabels;
    const confLabels = this.messages.confidenceLabels;

    const lines: string[] = [
      this.messages.formatTitleLine(source.title, artistStr),
    ];

    lines.push(`${labels[source.sourceService]}: <${source.sourceUrl}>`);

    for (const link of links) {
      const confidence = confLabels[link.confidence];
      const label = labels[link.service];
      const isLow = link.confidence === MatchConfidence.Low;
      lines.push(this.messages.formatLinkLine(label, link.url, confidence, isLow));
    }

    return lines.join('\n');
  }

  formatError(message: string): string {
    return `${this.messages.errorPrefix} ${message}`;
  }

  formatUsage(): string {
    return this.messages.usage;
  }

  formatRateLimited(): string {
    return this.messages.rateLimited;
  }
}
