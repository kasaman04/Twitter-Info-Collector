// Google Apps Scriptに貼り付けるコード
// Twitter情報取得用（インプレッション数対応版）

function doPost(e) {
  try {
    // JSONデータを解析
    const data = JSON.parse(e.postData.contents);
    
    // 既存のスプレッドシートを探すか新規作成
    let spreadsheet;
    let sheet;
    
    try {
      // 既存のスプレッドシートを探す
      const files = DriveApp.getFilesByName('Twitter情報まとめ');
      if (files.hasNext()) {
        spreadsheet = SpreadsheetApp.openById(files.next().getId());
        sheet = spreadsheet.getActiveSheet();
        
        // ヘッダー行が古い場合は更新
        const headerRange = sheet.getRange(1, 1, 1, 9);
        const currentHeaders = headerRange.getValues()[0];
        if (!currentHeaders.includes('インプレッション数')) {
          sheet.getRange(1, 1, 1, 9).setValues([
            ['投稿内容', '投稿者', '投稿日時', 'インプレッション数', 'いいね数', 'リツイート数', '返信数', 'URL', '保存日時']
          ]);
        }
      } else {
        throw new Error('ファイルが見つかりません');
      }
    } catch (error) {
      // 新規作成
      spreadsheet = SpreadsheetApp.create('Twitter情報まとめ');
      sheet = spreadsheet.getActiveSheet();
      
      // ヘッダー行を作成（希望の順序）
      sheet.getRange(1, 1, 1, 9).setValues([
        ['投稿内容', '投稿者', '投稿日時', 'インプレッション数', 'いいね数', 'リツイート数', '返信数', 'URL', '保存日時']
      ]);
      
      // スプレッドシートのフォーマット設定
      const headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      
      // 列幅を自動調整
      sheet.autoResizeColumns(1, 9);
    }
    
    // データを追加（希望の順序）
    sheet.appendRow([
      data.content || '',           // 投稿内容
      data.author || '',            // 投稿者
      data.date || '',              // 投稿日時
      data.impressions || '0',      // インプレッション数
      data.likes || '0',            // いいね数
      data.retweets || '0',         // リツイート数
      data.replies || '0',          // 返信数
      data.url || '',               // URL
      data.timestamp || new Date().toISOString()  // 保存日時
    ]);
    
    // 新しく追加した行をフォーマット
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(lastRow, 1, 1, 9);
    
    // 数値列の書式設定
    sheet.getRange(lastRow, 4).setNumberFormat('#,##0');  // インプレッション数
    sheet.getRange(lastRow, 5).setNumberFormat('#,##0');  // いいね数
    sheet.getRange(lastRow, 6).setNumberFormat('#,##0');  // リツイート数
    sheet.getRange(lastRow, 7).setNumberFormat('#,##0');  // 返信数
    
    // 日時列の書式設定
    sheet.getRange(lastRow, 3).setNumberFormat('yyyy/mm/dd hh:mm:ss');  // 投稿日時
    sheet.getRange(lastRow, 9).setNumberFormat('yyyy/mm/dd hh:mm:ss');  // 保存日時
    
    // レスポンスを返す
    const output = ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '保存完了',
      spreadsheetUrl: spreadsheet.getUrl(),
      dataCount: sheet.getLastRow() - 1  // ヘッダー行を除く
    }));
    
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
    
  } catch (error) {
    console.error('エラー:', error);
    
    const output = ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: 'データ保存に失敗しました'
    }));
    
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  }
}