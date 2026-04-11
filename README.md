# Chief Advisor - CoC リプレイ分析AI

Clash of Clans (TH18) のリプレイ動画をAIが分析し、攻めの振り返りをサポートするWebアプリです。
スーパーイエティ編成を中心に、フレーム単位で具体的な改善点をアドバイスします。

## ワークフロー

1. **スマホでプレイ** - クラン対戦やマルチでの攻めをプレイ
2. **PC録画** - リプレイ再生をPCで画面録画（mp4/mov）
3. **アップロード** - 動画をChief Advisorにドラッグ&ドロップ
4. **AI振り返り** - 5秒間隔で抽出されたフレームをAIが時系列分析し、良かった点・改善点・次回への提案を返す

## セットアップ

```bash
npm install
```

`.env.local` を作成して環境変数を設定:

```
COC_API_TOKEN=your_coc_api_token_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

開発サーバーを起動:

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 環境変数

| 変数名 | 説明 | 取得方法 |
|---|---|---|
| `COC_API_TOKEN` | Clash of Clans API トークン | [developer.clashofclans.com](https://developer.clashofclans.com/) でアカウント作成 → API Key を生成（許可IPアドレスの設定が必要） |
| `ANTHROPIC_API_KEY` | Anthropic API キー | [console.anthropic.com](https://console.anthropic.com/) でアカウント作成 → API Keys から生成 |

## 機能

- **リプレイ動画分析** - mp4/mov動画をアップロードすると5秒ごとにフレーム抽出、タイムライン表示
- **フレーム選択チャット** - タイムラインからフレームを選択し「このフレームについて聞く」でピンポイント分析
- **ストリーミング応答** - AIの返答をリアルタイムで表示
- **プレイヤー検索** - タグを入力してCoC公式APIから兵種・ヒーロー・呪文データを取得
- **マルチターン対話** - 会話履歴を保持した継続的な攻略相談

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Anthropic API (Claude) - ストリーミング対応
- Clash of Clans API
- fluent-ffmpeg + ffmpeg-static - 動画フレーム抽出
