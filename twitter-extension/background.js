// Twitter情報取得 - バックグラウンドスクリプト

console.log('Twitter情報取得: バックグラウンドスクリプト開始');

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('メッセージ受信:', request);
  
  if (request.action === 'saveTweet') {
    saveTweetToSpreadsheet(request.data)
      .then(result => {
        console.log('保存成功:', result);
        sendResponse({ success: true, result: result });
      })
      .catch(error => {
        console.error('保存エラー:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // 非同期レスポンス
  }
});

// スプレッドシートに保存する関数
async function saveTweetToSpreadsheet(tweetData) {
  try {
    // 保存されたURLを取得
    const result = await chrome.storage.sync.get(['gasUrl']);
    
    if (!result.gasUrl) {
      throw new Error('Google Apps ScriptのURLが設定されていません。\n拡張機能のポップアップで設定してください。');
    }
    
    // 送信データを準備
    const dataToSend = {
      content: tweetData.content || '',
      author: tweetData.author || '',
      date: tweetData.date || '',
      impressions: tweetData.impressions || '0',
      likes: tweetData.likes || '0',
      retweets: tweetData.retweets || '0',
      replies: tweetData.replies || '0',
      url: tweetData.url || '',
      timestamp: new Date().toISOString()
    };
    
    console.log('送信データ:', dataToSend);
    
    // Google Apps Scriptに送信
    const response = await fetch(result.gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP エラー: ${response.status} - ${response.statusText}`);
    }
    
    const responseData = await response.text();
    console.log('レスポンス:', responseData);
    
    return responseData;
    
  } catch (error) {
    console.error('スプレッドシート保存エラー:', error);
    throw error;
  }
}