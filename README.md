# music-share

Discord上で**Bot へのメンション + 音楽URL**を受け取り、対象曲を特定して **Spotify / YouTube Music** のリンクを整形して返信するBotです。  
![demo](https://raw.githubusercontent.com/T4ko0522/music-share/refs/heads/master/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-02-24%20032835.png)

設計の詳細は [architecture.md](./architecture.md) を参照してください。  
現在はSpotifyとYouTube Musicが対象で、Apple Musicは対応予定です。

## 必要環境

- Node.js 18 以上
- Discord Bot トークン（[Discord Developer Portal](https://discord.com/developers/applications) で作成）
- Spotify API クライアント ID / シークレット（[Spotify for Developers](https://developer.spotify.com/)）

## セットアップ

1. **リポジトリのクローン & 依存関係のインストール**

   ```bash
   cd music-share
   npm install
   ```

2. **環境変数の設定**

   ```bash
   cp .env.example .env
   ```

   `.env` を編集し、少なくとも以下を設定してください。

   - `DISCORD_BOT_TOKEN` … Discord Bot のトークン
   - `SPOTIFY_CLIENT_ID` … Spotify アプリの Client ID
   - `SPOTIFY_CLIENT_SECRET` … Spotify アプリの Client Secret

3. **Discord 側の設定**

   - 開発者ポータルで Bot に **Message Content Intent** を有効化する（メンションされたメッセージの内容を読むため）
   - サーバーに Bot を招待する

4. **ビルドと起動**

   ```bash
   npm run build
   npm start
   ```

   開発時は `npm run dev` で開発用モードで起動できます。

## 使い方

1. Discord で Bot をメンションし、音楽 URL を送る  
   - 例: `@Bot https://open.spotify.com/track/xxxxx`
2. Bot が曲を特定し、Spotify / YouTube Musicのリンクを整形して返信する

## スクリプト

| コマンド       | 説明                 |
|----------------|----------------------|
| `npm run dev`  | 開発用（watch 起動） |
| `npm run build`| TypeScript をビルド |
| `npm start`    | 本番起動             |
| `npm test`     | テスト実行           |

## プロジェクト構成（骨格）

- `src/discord/` … Discord Adapter（メッセージ受信・返信）
- `src/parser/` … URL パース・サービス判定・ID 抽出
- `src/resolver/` … 入力元メタデータ取得（Spotify / YT Music）
- `src/matcher/` … 他サービス検索・スコアリング
- `src/cache/` … 結果の TTL キャッシュ
- `src/formatter/` … 返信メッセージの組み立て
