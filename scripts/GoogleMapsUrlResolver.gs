/**
 * Google Apps Script for resolving shortened Google Maps URLs.
 * 
 * 使用說明：
 * 1. 前往 https://script.google.com/ 建立新專案
 * 2. 將此程式碼貼入 Code.gs
 * 3. 點擊「部署」 -> 「新建部署」
 * 4. 選擇類型「網頁應用程式」
 * 5. 執行身分：「我」(Me)
 * 6. 誰可以存取：「任何人」(Anyone) -> 這是解決 CORS 的關鍵
 * 7. 複製產生的網頁應用程式網址，並更新至前端程式碼中
 */

/**
 * 接收前端傳來的網址，解析重定向後回傳長網址
 */
function doGet(e) {
  var shortUrl = e.parameter.url;
  
  if (!shortUrl) {
    return createJsonResponse({ error: "No URL provided" });
  }

  try {
    // 發送請求，設定不自動跳轉 (followRedirects: false)
    // 這樣我們才能抓到重定向的 Location Header
    var response = UrlFetchApp.fetch(shortUrl, {
      followRedirects: false,
      muteHttpExceptions: true
    });

    var longUrl = response.getHeaders()['Location'];
    
    // 如果沒有 Location，說明它可能已經是長網址或無效
    if (!longUrl) {
      longUrl = shortUrl;
    }

    // 支援遞迴處理（有時候會有兩層重定向）
    if (longUrl.indexOf('goo.gl') !== -1 || longUrl.indexOf('maps.app.goo.gl') !== -1) {
       return doGet({ parameter: { url: longUrl } });
    }

    return createJsonResponse({ longUrl: longUrl });

  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
