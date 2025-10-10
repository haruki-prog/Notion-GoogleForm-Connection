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
   - `名前` (Title) - 必須
   - `日付` (Date)
   - `クライアント名` (Text)
   - `出社予定時刻` (Number) - 数値型
   - `業務内容` (Text)
   - `出社` (Select) - 選択式（フォームの回答値と一致する選択肢を追加）
3. データベースの右上「...」→「Add connections」→作成したIntegrationを選択
4. データベースIDを取得:
   - データベースのURLから取得: `https://notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...`
   - `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` の部分がデータベースID

### 3. GASスクリプトの環境変数設定

**重要:** トークンやIDをコードに直接記述しないため、スクリプトプロパティを使用します。

#### 方法1: setupScriptProperties() 関数を使用（推奨）

1. `Code.gs` の `setupScriptProperties()` 関数内に実際の値を入力:

```javascript
properties.setProperties({
  'NOTION_API_KEY': 'ntn_your_actual_token_here',        // 手順1で取得したトークン
  'NOTION_DATABASE_ID': 'your_actual_database_id_here',  // 手順2で取得したデータベースID
  'SPREADSHEET_ID': 'your_actual_spreadsheet_id_here'    // スプレッドシートID
});
```

2. スクリプトエディタで `setupScriptProperties()` 関数を一度だけ実行
3. ログで設定が正しく保存されたことを確認

#### 方法2: Apps Script IDE で直接設定

1. Apps Script IDE を開く（`clasp open`）
2. 左側のメニューから「プロジェクトの設定」（歯車アイコン）をクリック
3. 「スクリプト プロパティ」セクションで「スクリプト プロパティを追加」をクリック
4. 以下の3つのプロパティを追加:
   - プロパティ: `NOTION_API_KEY`、値: 手順1で取得したトークン
   - プロパティ: `NOTION_DATABASE_ID`、値: 手順2で取得したデータベースID
   - プロパティ: `SPREADSHEET_ID`、値: スプレッドシートID

**セキュリティ上の注意:**
- スクリプトプロパティに保存された値はリポジトリにコミットされません
- `.gitignore` に `.env` と `.clasp.json` が含まれています

### 4. Notionプロパティのカスタマイズ

`buildNotionProperties()` 関数内で、Google Formの質問とNotionデータベースのプロパティをマッピング:

```javascript
// 6つのプロパティが設定されています:
properties['名前'] = {
  title: [{ text: { content: data.responses['名前'] || '...' } }]
};

properties['日付'] = {
  date: { start: data.timestamp.toISOString().split('T')[0] }
};

properties['クライアント名'] = {
  rich_text: [{ text: { content: data.responses['クライアント名'] || '' } }]
};

// 数値型に変換（例: "09:00" → 9）
properties['出社予定時刻'] = {
  number: parseTimeToNumber(data.responses['出社予定時刻'])
};

properties['業務内容'] = {
  rich_text: [{ text: { content: data.responses['業務内容'] || '' } }]
};

// 選択式（Notionデータベースの選択肢と一致させる必要あり）
properties['出社'] = {
  select: { name: data.responses['出社'] }
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

**重要:** Google Formとスプレッドシートをまだ紐付けていない場合は、先にGoogle Formを作成し、「回答」タブから「スプレッドシートにリンク」でスプレッドシート(SPREADSHEET_ID)に紐付けてください。

#### 方法1: 手動でトリガーを設定（推奨）
1. Apps Script IDE で左側のメニューから「トリガー」(時計アイコン)をクリック
2. 右下の「トリガーを追加」をクリック
3. 以下の設定を行う:
   - 実行する関数: `onFormSubmit`
   - イベントのソース: `フォームから`
   - イベントの種類: `フォーム送信時`
4. 「保存」をクリック
5. 権限の承認を求められたら承認

//実装メモ：10/08ここまで実装

#### 方法2: setupFormTrigger()関数を使用
スクリプトエディタで:
1. `setupFormTrigger()` 関数を実行
2. 権限を承認
※ この方法は、Google Formが既にスプレッドシートに紐付いている場合のみ使用可能

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
