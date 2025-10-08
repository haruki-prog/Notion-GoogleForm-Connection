/**
 * Google Form to Notion Integration
 * Google Formの回答をスプレッドシートに転記し、Notionデータベースに送信します
 */

// ===== 設定 =====
const NOTION_API_KEY = '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'; // NotionのIntegration Tokenを設定
const NOTION_DATABASE_ID = '2852f7a875c580419a19ecae6626cfbf'; // NotionデータベースIDを設定
const SPREADSHEET_ID = '1RxrRj9XEpeXiby05v5ydCCgew9Jy4urA8RBKxsP7t6I'; // スプレッドシートID

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
 * Notionのプロパティオブジェクトを構築
 * @param {Object} data - フォームデータ
 * @return {Object} Notionプロパティオブジェクト
 */
function buildNotionProperties(data) {
  // この関数はフォームの質問とNotionデータベースのプロパティに応じてカスタマイズが必要
  const properties = {
    // タイトルプロパティ（必須）
    'Name': {
      title: [
        {
          text: {
            content: `Form Response - ${Utilities.formatDate(data.timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')}`
          }
        }
      ]
    },
    // タイムスタンプ
    'Timestamp': {
      date: {
        start: data.timestamp.toISOString()
      }
    }
  };

  // 各回答をNotionプロパティに追加
  // フォームの質問とNotionのプロパティ名をマッピング
  for (const [question, answer] of Object.entries(data.responses)) {
    // プロパティ名をサニタイズ（Notionのプロパティ名として使用可能にする）
    const propertyName = question;

    // 回答のタイプに応じてプロパティを設定
    if (typeof answer === 'string') {
      properties[propertyName] = {
        rich_text: [
          {
            text: {
              content: answer.substring(0, 2000) // Notionの制限に対応
            }
          }
        ]
      };
    }
  }

  return properties;
}

/**
 * フォーム送信トリガーを手動でセットアップする関数
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
  const form = FormApp.openByUrl(ss.getFormUrl());

  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log('Form trigger setup complete');
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
