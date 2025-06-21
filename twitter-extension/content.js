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
    
    // 最新のTwitter/X構造に対応した複数パターンでの検索
    const searchPatterns = [
      // パターン1: analytics group内のビューアイコン付近
      'a[href*="/analytics"] span',
      '[data-testid="analytics"] span',
      
      // パターン2: ビューアイコン（目のアイコン）の隣のテキスト
      'svg[aria-label*="表示"] ~ span',
      'svg[aria-label*="view"] ~ span',
      'svg[aria-label*="Views"] ~ span',
      
      // パターン3: role="button"でaria-labelに表示情報があるもの
      '[role="button"][aria-label*="表示"] span',
      '[role="button"][aria-label*="view"] span',
      '[role="button"][aria-label*="Views"] span',
      
      // パターン4: ビューアイコンのパス要素から探す
      'svg path[d*="M8.75"] ~ text, svg path[d*="M8.75"] + text',
      
      // パターン5: 数値パターンのテキスト
      '[data-testid="app-text-transition-container"]'
    ];
    
    for (const pattern of searchPatterns) {
      const elements = article.querySelectorAll(pattern);
      for (const element of elements) {
        const text = element.textContent?.trim();
        if (text) {
          // 数値パターンをチェック（カンマ区切りの数値）
          const numberMatch = text.match(/^[\d,]+$/);
          if (numberMatch) {
            // 親要素のaria-labelや周辺コンテキストをチェック
            const parent = element.closest('[role="button"]');
            const ariaLabel = parent?.getAttribute('aria-label') || '';
            
            if (ariaLabel.includes('表示') || ariaLabel.includes('view') || ariaLabel.includes('Views')) {
              impressions = text.replace(/,/g, '');
              break;
            }
          }
          
          // 「回表示」「views」「万」「k」「K」などの文字列が含まれる場合
          if (text.includes('回表示') || text.includes('views') || text.includes('Views') || 
              text.includes('万') || text.includes('k') || text.includes('K')) {
            let match = text.match(/([\d,]+\.?\d*)\s*([万kK]?)/);
            if (match) {
              let value = parseFloat(match[1].replace(/,/g, ''));
              const unit = match[2];
              
              // 単位換算
              if (unit === '万') {
                value = value * 10000;
              } else if (unit === 'k' || unit === 'K') {
                value = value * 1000;
              }
              
              impressions = Math.floor(value).toString();
              break;
            }
          }
        }
      }
      if (impressions !== '0') break;
    }
    
    // 最終手段：統計エリア内の数値から判断
    if (impressions === '0') {
      const statsArea = article.querySelector('[role="group"]');
      if (statsArea) {
        const allSpansInStats = statsArea.querySelectorAll('span');
        const numberSpans = [];
        
        for (const span of allSpansInStats) {
          const text = span.textContent?.trim();
          // 数値（万、k含む）を探す
          if (text && (text.match(/^\d+([.,]\d+)?[万kK]?$/) || text.match(/^\d{1,3}(,\d{3})*$/))) {
            numberSpans.push({
              element: span,
              text: text,
              value: parseNumberWithUnit(text)
            });
          }
        }
        
        // ビュー数は通常最も大きな値
        if (numberSpans.length > 0) {
          const largest = numberSpans.reduce((max, current) => 
            current.value > max.value ? current : max
          );
          impressions = largest.value.toString();
        }
      }
    }
    
    // 数値変換ヘルパー関数
    function parseNumberWithUnit(text) {
      const match = text.match(/([\d,]+\.?\d*)\s*([万kK]?)/);
      if (match) {
        let value = parseFloat(match[1].replace(/,/g, ''));
        const unit = match[2];
        
        if (unit === '万') {
          value = value * 10000;
        } else if (unit === 'k' || unit === 'K') {
          value = value * 1000;
        }
        
        return Math.floor(value);
      }
      return 0;
    }
    
    // デバッグ: インプレッション数が見つからない場合は詳細ログを出力
    if (impressions === '0') {
      console.log('インプレッション数が見つかりません。デバッグ情報:');
      console.log('記事全体:', article);
      
      // すべてのspanとその内容をログ出力
      const allSpans = article.querySelectorAll('span');
      allSpans.forEach((span, index) => {
        const text = span.textContent?.trim();
        if (text && /^\d+/.test(text)) {
          console.log(`Span ${index}: "${text}"`, span);
          console.log('親要素:', span.parentElement);
          console.log('aria-label:', span.closest('[aria-label]')?.getAttribute('aria-label'));
        }
      });
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
        const errorMsg = response?.error || '不明なエラー';
        console.error('保存失敗:', response);
        button.innerText = '❌ エラー';
        alert(`保存に失敗しました:\n${errorMsg}`);
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