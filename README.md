# Google Form to Notion Integration

Google Formの回答を自動的にスプレッドシートに転記し、Notionデータベースに送信するGASプロジェクトです。

## セットアップ手順

### 1. Notion Integration の作成

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. Integration名を入力（例: Google Form Integration）
4. 「Submit」をクリックして作成
5. 「Internal Integration Token」をコピー（後で使用）

### 2. Notionデータベースの準備

1. Notionで新しいデータベースを作成
2. データベースに以下のプロパティを追加:
   - `Name` (Title) - 必須
   - `Timestamp` (Date)
   - フォームの各質問に対応するプロパティ（Text型推奨）
3. データベースの右上「...」→「Add connections」→作成したIntegrationを選択
4. データベースIDを取得:
   - データベースのURLから取得: `https://notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...`
   - `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` の部分がデータベースID

### 3. GASスクリプトの設定

`Code.gs` ファイルの以下の値を設定:

```javascript
const NOTION_API_KEY = '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'; // 手順1で取得したトークン
const NOTION_DATABASE_ID = '2852f7a875c580419a19ecae6626cfbf'; // 手順2で取得したデータベースID
const SPREADSHEET_ID = '1RxrRj9XEpeXiby05v5ydCCgew9Jy4urA8RBKxsP7t6I'; // 既に設定済み
```

### 4. Notionプロパティのカスタマイズ

`buildNotionProperties()` 関数内で、Google Formの質問とNotionデータベースのプロパティをマッピング:

```javascript
// 例: チェックボックスの場合
properties['選択肢'] = {
  multi_select: answer.split(', ').map(item => ({ name: item }))
};

// 例: 数値の場合
properties['年齢'] = {
  number: parseInt(answer)
};
```

### 5. デプロイ

```bash
# GASプロジェクトにプッシュ
clasp push

# ブラウザでスクリプトエディタを開く
clasp open
```

### 6. トリガーのセットアップ

スクリプトエディタで:
1. `setupFormTrigger()` 関数を実行
2. 権限を承認

または、手動でトリガーを設定:
1. スクリプトエディタ → トリガー（時計アイコン）
2. 「トリガーを追加」
3. 関数: `onFormSubmit`
4. イベントソース: フォームから
5. イベントタイプ: フォーム送信時

## 使用方法

1. Google Formで回答を送信
2. 自動的にスプレッドシートに転記
3. 自動的にNotionデータベースに送信

## テスト

最新の回答をNotionに送信してテスト:

```javascript
testSendLatestResponseToNotion()
```

## トラブルシューティング

### エラーログの確認

```bash
clasp logs
```

または、スクリプトエディタ → 実行 → ログを表示

### よくあるエラー

1. **Notion API error: 400**
   - プロパティ名が一致していない
   - プロパティタイプが間違っている
   - `buildNotionProperties()` を確認

2. **Notion API error: 401**
   - Integration Tokenが無効
   - `NOTION_API_KEY` を確認

3. **Notion API error: 404**
   - データベースIDが間違っている
   - IntegrationがデータベースにConnectionされていない

## ファイル構成

- `Code.gs` - メインスクリプト
- `appsscript.json` - プロジェクト設定
- `.clasp.json` - claspプロジェクト設定
- `README.md` - このファイル

## 注意事項

- Notion APIのレート制限: 3 requests/second
- Notionのrich_textは最大2000文字
- スプレッドシートIDは既に設定されています
