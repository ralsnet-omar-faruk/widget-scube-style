/**
 * RALS Slide Widget Renderer
 * tenpos-ft.com用スライドウィジェット
 */
(function() {
  'use strict';
  
  async function initRalsSlideWidget() {
    var container = document.getElementById('rals-slide-container');
    if (!container) return;
    
    if (window.RalsWidgetRenderer && window.RalsWidgetRenderer.applyCompanyConfig) {
      window.RalsWidgetRenderer.applyCompanyConfig(container);
    }
    
    var template = document.getElementById('rals-slide-template');
    if (!template) return;
    
    // テンプレートHTMLを取得
    var templateHTML = template.innerHTML;
    
    // ローディング表示
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#666;">物件を読み込み中...</div>';
    
    // データ取得
    var properties;
    try {
      properties = await window.RalsWidget3.fetchPropertyData(container);
    } catch (e) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">読み込みに失敗しました</div>';
      return;
    }
    
    // 居抜き OR スケルトン のみ表示するフィルター
    if (container.dataset.filterCondition === 'true') {
      properties = properties.filter(function(p) {
        return p.condition === '居抜き' || p.condition === 'スケルトン';
      });
    }
    
    // 表示件数の制限
    var displayLimit = parseInt(container.dataset.displayLimit, 10);
    if (displayLimit && properties.length > displayLimit) {
      properties = properties.slice(0, displayLimit);
    }
    
    if (!properties || !properties.length) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">物件が見つかりません</div>';
      return;
    }
    
    // data-max-comment属性から最大文字数を取得（デフォルト100）
    var maxComment = parseInt(container.dataset.maxComment, 10) || 100;
    
    // スライドHTML生成（テンプレート置換方式）
    var slidesHTML = properties.map(function(p) {
      var html = templateHTML;
      
      // コメントを最大文字数以内に制限
      var comment = p.comment || p.title || '';
      if (comment.length > maxComment) {
        comment = comment.substring(0, maxComment) + '...';
      }
      
      html = html.split('{thumbnailUrl}').join(p.thumbnailUrl || '');
      html = html.split('{detailUrl}').join(p.detailUrl || '#');
      html = html.split('{address}').join(p.address || '');
      html = html.split('{title}').join(p.title || '');
      html = html.split('{area}').join(p.area || '');
      html = html.split('{comment}').join(comment);
      
      // 居抜き or スケルトン を表示、なければ要素を削除
      var conditionValue = p.condition || '';
      html = html.split('{condition}').join(conditionValue);
      if (!conditionValue) {
        html = html.replace(/<div[^>]*class="[^"]*item-condition[^"]*"[^>]*>[^<]*<\/div>/gi, '');
      }
      
      // 物件タイプを表示
      html = html.split('{type}').join(p.propertyType || '');
      
      // テンプレートIDを削除
      html = html.replace(/id="rals-tpl-[^"]*"/g, '');
      
      return html;
    }).join('');
    
    // クライアントサイトと同じ構造で出力
    container.innerHTML = 
      '<div class="frontpage-recommend-slider">' +
        '<ul class="swiper-wrapper">' + slidesHTML + '</ul>' +
      '</div>' +
      '<div class="swiper-button-prev"></div>' +
      '<div class="swiper-button-next"></div>';
    
    // Swiper初期化（データ読み込み後に必要）
    var el = container.querySelector('.frontpage-recommend-slider');
    if (el && typeof Swiper !== 'undefined') {
      new Swiper(el, {
        slidesPerView: 1, spaceBetween: 20, loop: true,
        autoplay: { delay: 4000, disableOnInteraction: false },
        navigation: { nextEl: container.querySelector('.swiper-button-next'), prevEl: container.querySelector('.swiper-button-prev') },
        breakpoints: { 769: { slidesPerView: 2, spaceBetween: 40 } },
        watchOverflow: true
      });
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRalsSlideWidget);
  } else {
    initRalsSlideWidget();
  }
})();

