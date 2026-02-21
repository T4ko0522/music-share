/**
 * Discord へ送信するメッセージの文言を定義します。
 * 表示を変えたい場合はここを編集してください。
 */
import { MusicService, MatchConfidence } from '../types/index.js';

export const FormatterMessages = {
  /** URL が無いときの使い方 */
  usage: '使い方: @Bot <Spotify or YouTube Music URL>',

  /** エラー文の先頭（後ろにメッセージが続く） */
  errorPrefix: '❌',

  /** レート制限時 */
  rateLimited: '⏳ レート制限中です。しばらく待ってから再試行してください。',

  /** サービス名（変換結果のリンク行のラベル） */
  serviceLabels: {
    [MusicService.Spotify]: 'Spotify',
    [MusicService.YouTubeMusic]: 'YouTube Music',
    [MusicService.AppleMusic]: 'Apple Music',
  } as Record<MusicService, string>,

  /** マッチ信頼度の表示 */
  confidenceLabels: {
    [MatchConfidence.High]: 'high',
    [MatchConfidence.Medium]: 'medium',
    [MatchConfidence.Low]: 'low',
  } as Record<MatchConfidence, string>,

  /** Embed の色（10進または 0xRRGGBB）。null なら左の縦線なし（無色） */
  embedColors: {
    success: null as number | null,  // 変換結果（無色）
    usage: 0x3498db,     // 使い方（青）
    error: 0xe74c3c,     // エラー（赤）
    rateLimited: 0xf39c12, // レート制限（オレンジ）
  },

  /**
   * 各サービスのボタン用絵文字。Unicode 文字列 or サーバーカスタム絵文字 { id, name }。
   * カスタム絵文字は Bot が所属するサーバーに登録されている必要があります。
   */
  buttonEmoji: {
    [MusicService.Spotify]: { id: '1474810594786934957', name: 'Spotify' },
    [MusicService.YouTubeMusic]: { id: '1474811331801649303', name: 'YouTubeMusic' },
    [MusicService.AppleMusic]: '🟣',
  } as Record<MusicService, string | { id: string; name: string }>,

  /**
   * Embed 用：フッター。「by ユーザー名」など。
   */
  formatEmbedFooter(username: string): string {
    return `by ${username}`;
  },

  /**
   * Embed 用：曲名のみ（1行目）
   */
  formatEmbedTitle(title: string): string {
    return title;
  },

  /**
   * Embed 用：アーティスト（2行目・タイトル下）
   */
  formatEmbedArtist(artist: string): string {
    return artist;
  },

  /**
   * 曲タイトル行のフォーマット（プレーン文用）。
   * 例: "🎵 **タイトル** — アーティスト"
   */
  formatTitleLine(title: string, artist: string): string {
    return `🎵 **${title}** — ${artist}`;
  },

  /**
   * 各サービスのリンク行のフォーマット。
   * isLow が true のときは信頼度 low 用（⚠️ などを付けたい場合）。
   */
  formatLinkLine(label: string, url: string, confidence: string, isLow: boolean): string {
    if (isLow) {
      return `${label}: <${url}> (match: ${confidence} ⚠️)`;
    }
    return `${label}: <${url}> (match: ${confidence})`;
  },
} as const;
