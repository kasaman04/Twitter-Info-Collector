// Twitter情報取得 - ポップアップスクリプト

document.addEventListener('DOMContentLoaded', function() {
  const gasUrlInput = document.getElementById('gasUrl');
  const saveButton = document.getElementById('saveButton');
  const testButton = document.getElementById('testButton');
  const statusDiv = document.getElementById('status');
  
  // 保存済み設定を読み込み
  chrome.storage.sync.get(['gasUrl'], function(result) {
    if (result.gasUrl) {
      gasUrlInput.value = result.gasUrl;
    }
  });
  
  // 設定保存
  saveButton.addEventListener('click', function() {
    const url = gasUrlInput.value.trim();
    
    if (!url) {
      showStatus('URLを入力してください', 'error');
      return;
    }
    
    if (!url.includes('script.google.com')) {
      showStatus('Google Apps ScriptのURLを入力してください', 'error');
      return;
    }
    
    if (!url.includes('/exec')) {
      showStatus('WebアプリのデプロイURL（/execで終わる）を入力してください', 'error');
      return;
    }
    
    chrome.storage.sync.set({ gasUrl: url }, function() {
      showStatus('✅ 設定を保存しました！', 'success');
    });
  });
  
  // 接続テスト
  testButton.addEventListener('click', async function() {
    const url = gasUrlInput.value.trim();
    
    if (!url) {
      showStatus('まずURLを入力してください', 'error');
      return;
    }
    
    testButton.disabled = true;
    testButton.textContent = '🔄 テスト中...';
    
    try {
      const testData = {
        content: 'テスト投稿',
        author: 'テストユーザー',
        date: new Date().toISOString(),
        impressions: '100',
        likes: '10',
        retweets: '5',
        replies: '2',
        url: 'https://x.com/test/status/123',
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('テストレスポンス:', responseText);
        showStatus('✅ 接続テスト成功！スプレッドシートが作成されました', 'success');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('接続テストエラー:', error);
      showStatus(`❌ 接続テスト失敗: ${error.message}`, 'error');
    } finally {
      testButton.disabled = false;
      testButton.textContent = '🧪 接続テスト';
    }
  });
  
  // ステータス表示
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = '';
      }, 5000);
    }
  }
});