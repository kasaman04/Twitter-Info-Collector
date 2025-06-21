// Twitter投稿情報取得 - コンテンツスクリプト

console.log('Twitter情報取得: スクリプト開始');

// 処理済み投稿を追跡
const processedTweets = new Set();

// 投稿データを取得する関数
function extractTweetData(article) {
  const tweetData = {};
  
  try {
    // 投稿内容を取得
    let textElement = article.querySelector('[data-testid="tweetText"]');
    if (!textElement) {
      textElement = article.querySelector('[lang] span');
    }
    tweetData.content = textElement ? textElement.innerText : '投稿内容を取得できませんでした';
    
    // 投稿者名を取得
    let userElement = article.querySelector('[data-testid="User-Name"] span');
    if (!userElement) {
      userElement = article.querySelector('a[role="link"] span');
    }
    tweetData.author = userElement ? userElement.innerText : '投稿者名を取得できませんでした';
    
    // 投稿日時を取得
    const timeElement = article.querySelector('time');
    tweetData.date = timeElement ? timeElement.getAttribute('datetime') || timeElement.innerText : new Date().toISOString();
    
    // インプレッション数（ビュー数）を取得
    let impressions = '0';
    
    // 複数のパターンでインプレッション数を検索
    const viewElements = article.querySelectorAll('[data-testid="app-text-transition-container"]');
    for (const element of viewElements) {
      const text = element.textContent;
      if (text && (text.includes('回表示') || text.includes('views') || /^\d+[\d,]*$/.test(text.trim()))) {
        const match = text.match(/[\d,]+/);
        if (match) {
          impressions = match[0].replace(/,/g, '');
          break;
        }
      }
    }
    
    // 別のセレクタでも試す
    if (impressions === '0') {
      const analyticsElements = article.querySelectorAll('span');
      for (const element of analyticsElements) {
        const text = element.textContent;
        if (text && text.match(/^\d{1,3}(,\d{3})*$/)) {
          const parent = element.closest('[role="button"]');
          if (parent && parent.getAttribute('aria-label') && 
              (parent.getAttribute('aria-label').includes('表示') || 
               parent.getAttribute('aria-label').includes('view'))) {
            impressions = text.replace(/,/g, '');
            break;
          }
        }
      }
    }
    
    tweetData.impressions = impressions;
    
    // いいね数を取得
    const likeButton = article.querySelector('[data-testid="like"]');
    const likeText = likeButton ? likeButton.textContent.match(/[\d,]+/) : null;
    tweetData.likes = likeText ? likeText[0].replace(/,/g, '') : '0';
    
    // リツイート数を取得
    const retweetButton = article.querySelector('[data-testid="retweet"]');
    const retweetText = retweetButton ? retweetButton.textContent.match(/[\d,]+/) : null;
    tweetData.retweets = retweetText ? retweetText[0].replace(/,/g, '') : '0';
    
    // 返信数を取得
    const replyButton = article.querySelector('[data-testid="reply"]');
    const replyText = replyButton ? replyButton.textContent.match(/[\d,]+/) : null;
    tweetData.replies = replyText ? replyText[0].replace(/,/g, '') : '0';
    
    // 投稿URLを取得
    const linkElement = article.querySelector('a[href*="/status/"]');
    tweetData.url = linkElement ? 'https://x.com' + linkElement.getAttribute('href') : window.location.href;
    
    return tweetData;
    
  } catch (error) {
    console.error('データ取得エラー:', error);
    return {
      content: '取得エラー',
      author: '不明',
      date: new Date().toISOString(),
      impressions: '0',
      likes: '0',
      retweets: '0',
      replies: '0',
      url: window.location.href
    };
  }
}

// 保存ボタンを作成する関数
function createSaveButton(article) {
  const button = document.createElement('button');
  button.innerText = '💾 保存';
  button.className = 'twitter-save-button';
  
  button.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const tweetData = extractTweetData(article);
    console.log('取得したデータ:', tweetData);
    
    // バックグラウンドスクリプトに送信
    chrome.runtime.sendMessage({
      action: 'saveTweet',
      data: tweetData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime Error:', chrome.runtime.lastError);
        button.innerText = '❌ エラー';
        setTimeout(() => button.innerText = '💾 保存', 2000);
        return;
      }
      
      if (response && response.success) {
        button.innerText = '✅ 保存済み';
        button.disabled = true;
        setTimeout(() => {
          button.innerText = '💾 保存';
          button.disabled = false;
        }, 3000);
      } else {
        console.error('保存失敗:', response);
        button.innerText = '❌ エラー';
        setTimeout(() => button.innerText = '💾 保存', 2000);
      }
    });
  };
  
  return button;
}

// 投稿にボタンを追加する関数
function addButtonToTweet(article) {
  try {
    if (processedTweets.has(article)) return;
    if (article.querySelector('.twitter-save-button')) return;
    
    // アクションバーを探す
    const actionBar = article.querySelector('[role="group"]');
    if (!actionBar) return;
    
    // ボタンを追加
    const saveButton = createSaveButton(article);
    actionBar.appendChild(saveButton);
    
    processedTweets.add(article);
    console.log('保存ボタンを追加しました');
    
  } catch (error) {
    console.error('ボタン追加エラー:', error);
  }
}

// 投稿を監視してボタンを追加
function observeTweets() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  tweets.forEach(addButtonToTweet);
}

// ページの変更を監視
const observer = new MutationObserver(() => {
  observeTweets();
});

// 監視開始
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 初回実行
observeTweets();