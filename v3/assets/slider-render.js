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
    if (!properties || !properties.length) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">物件が見つかりません</div>';
      return;
    }
    
    // スライドHTML生成
    var slidesHTML = properties.map(function(p) {
      var clone = template.content.cloneNode(true);
      var img = clone.querySelector('#rals-tpl-img');
      if (img) { img.style.background = "url('" + (p.thumbnailUrl || '') + "') center center /cover no-repeat"; img.removeAttribute('id'); }
      var cond = clone.querySelector('#rals-tpl-condition');
      if (cond) { cond.textContent = '居抜き'; cond.removeAttribute('id'); }
      var addr = clone.querySelector('#rals-tpl-address');
      if (addr) { addr.textContent = (p.address || '') + ' ' + (p.title || ''); addr.removeAttribute('id'); }
      var type = clone.querySelector('#rals-tpl-type');
      if (type) { type.textContent = '店舗'; type.removeAttribute('id'); }
      var area = clone.querySelector('#rals-tpl-area');
      if (area) { area.textContent = p.area || ''; area.removeAttribute('id'); }
      var comment = clone.querySelector('#rals-tpl-comment');
      if (comment) { comment.textContent = p.comment || p.title || ''; comment.removeAttribute('id'); }
      var link = clone.querySelector('#rals-tpl-link');
      if (link) { link.href = p.detailUrl || '#'; link.removeAttribute('id'); }
      return clone.querySelector('li').outerHTML;
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
        breakpoints: { 769: { slidesPerView: 2, spaceBetween: 36 } }
      });
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRalsSlideWidget);
  } else {
    initRalsSlideWidget();
  }
})();

