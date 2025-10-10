/**
 * Google Form to Notion Integration
 * Google Formの回答をスプレッドシートに転記し、Notionデータベースに送信します
 */

// ===== 設定 =====
const NOTION_API_KEY = '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'; // NotionのIntegration Tokenを設定
const NOTION_DATABASE_ID = '2852f7a875c580419a19ecae6626cfbf'; // NotionデータベースIDを設定
const SPREADSHEET_ID = '1Q30s0iPmXSW50jx6NgW4fC6szwa4X_yLYSPYPBpIOJQ'; // スプレッドシートID

/**
 * Google Formの送信時に自動実行されるトリガー関数
 * @param {Object} e - フォーム送信イベントオブジェクト
 */
function onFormSubmit(e) {
  try {
    // フォームの回答を取得
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    // スプレッドシートに書き込み
    const sheetData = writeToSpreadsheet(formResponse, itemResponses);

    // Notionに送信
    sendToNotion(sheetData);

    Logger.log('Successfully processed form submission');
  } catch (error) {
    Logger.log('Error in onFormSubmit: ' + error.toString());
    // エラー通知を送信する場合はここに追加
  }
}

/**
 * スプレッドシートにデータを書き込む
 * @param {FormResponse} formResponse - フォーム送信レスポンス
 * @param {ItemResponse[]} itemResponses - 各質問への回答
 * @return {Object} スプレッドシートに書き込んだデータ
 */
function writeToSpreadsheet(formResponse, itemResponses) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getActiveSheet();

  // タイムスタンプ
  const timestamp = formResponse.getTimestamp();

  // 回答データを配列に変換
  const rowData = [timestamp];
  const dataObject = {
    timestamp: timestamp,
    responses: {}
  };

  itemResponses.forEach(function(itemResponse) {
    const question = itemResponse.getItem().getTitle();
    const answer = itemResponse.getResponse();
    rowData.push(answer);
    dataObject.responses[question] = answer;
  });

  // スプレッドシートに追加
  sheet.appendRow(rowData);

  return dataObject;
}

/**
 * Notionデータベースにデータを送信
 * @param {Object} data - 送信するデータ
 */
function sendToNotion(data) {
  const url = `https://api.notion.com/v1/pages`;

  // Notionのプロパティを構築（フォームの質問に応じてカスタマイズが必要）
  const properties = buildNotionProperties(data);

  const payload = {
    parent: { database_id: NOTION_DATABASE_ID },
    properties: properties
  };

  const options = {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode === 200) {
    Logger.log('Successfully sent to Notion');
  } else {
    Logger.log('Error sending to Notion: ' + response.getContentText());
    throw new Error('Notion API error: ' + responseCode);
  }
}

/**
 * 値を文字列に変換するヘルパー関数
 * @param {*} value - 変換する値
 * @return {string} 文字列に変換された値
 */
function convertToString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

/**
 * 時刻文字列を数値に変換するヘルパー関数
 * @param {*} value - 時刻の値（例: "09:00", "9", 9）
 * @return {number} 数値に変換された値
 */
function parseTimeToNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // 既に数値の場合
  if (typeof value === 'number') {
    return value;
  }

  // 文字列の場合
  const stringValue = String(value);

  // 数値部分のみを抽出してparseFloat（例: "09:00" → 9, "9.5" → 9.5）
  const parsed = parseFloat(stringValue.replace(/[^0-9.]/g, ''));

  return isNaN(parsed) ? null : parsed;
}

/**
 * Notionのプロパティオブジェクトを構築
 * @param {Object} data - フォームデータ
 * @return {Object} Notionプロパティオブジェクト
 */
function buildNotionProperties(data) {
  // この関数はフォームの質問とNotionデータベースのプロパティに応じてカスタマイズが必要
  const properties = {
    // タイトルプロパティ（必須） - 名前
    '名前': {
      title: [
        {
          text: {
            content: convertToString(data.responses['名前']) || `Form Response - ${Utilities.formatDate(data.timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')}`
          }
        }
      ]
    },
    // 日付
    '日付': {
      date: {
        start: data.timestamp.toISOString().split('T')[0] // YYYY-MM-DD形式
      }
    },
    // クライアント名
    'クライアント名': {
      rich_text: [
        {
          text: {
            content: convertToString(data.responses['クライアント名']).substring(0, 2000)
          }
        }
      ]
    },
    // 出社予定時刻（数値）
    '出社予定時刻': {
      number: parseTimeToNumber(data.responses['出社予定時刻'])
    },
    // 業務内容
    '業務内容': {
      rich_text: [
        {
          text: {
            content: convertToString(data.responses['業務内容']).substring(0, 2000)
          }
        }
      ]
    },
    // 出社（選択式）
    '出社': {
      select: { name: convertToString(data.responses['出社']) }
    }
  };

  return properties;
}

/**
 * フォーム送信トリガーを手動でセットアップする関数
 * 使い方: Google Formが既にスプレッドシートに紐付いている場合のみ使用可能
 * または、スプレッドシートのGUIから「ツール」→「スクリプトエディタ」→「トリガー」で手動設定してください
 */
function setupFormTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 新しいトリガーを作成
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // スプレッドシートにフォームが紐付いているか確認
  try {
    const formUrl = ss.getFormUrl();
    if (!formUrl) {
      throw new Error('このスプレッドシートにはGoogle Formが紐付いていません');
    }
    const form = FormApp.openByUrl(formUrl);

    ScriptApp.newTrigger('onFormSubmit')
      .forForm(form)
      .onFormSubmit()
      .create();

    Logger.log('Form trigger setup complete');
  } catch (error) {
    Logger.log('エラー: ' + error.toString());
    Logger.log('');
    Logger.log('【トリガーの手動設定方法】');
    Logger.log('1. Apps Script IDE で左側のメニューから「トリガー」(時計アイコン)をクリック');
    Logger.log('2. 右下の「トリガーを追加」をクリック');
    Logger.log('3. 以下の設定を行う:');
    Logger.log('   - 実行する関数: onFormSubmit');
    Logger.log('   - イベントのソース: フォームから');
    Logger.log('   - イベントの種類: フォーム送信時');
    Logger.log('4. 「保存」をクリック');
    throw error;
  }
}

/**
 * テスト用: 最新の回答をNotionに送信
 */
function testSendLatestResponseToNotion() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getActiveSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    Logger.log('No data to send');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const lastData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  const dataObject = {
    timestamp: new Date(lastData[0]),
    responses: {}
  };

  for (let i = 1; i < headers.length; i++) {
    dataObject.responses[headers[i]] = lastData[i];
  }

  sendToNotion(dataObject);
  Logger.log('Test completed');
}
