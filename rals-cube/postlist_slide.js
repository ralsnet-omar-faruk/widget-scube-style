/**
 * postlist.js - rals-cube 共通スクリプト
 * 新着物件リスト + スライドウィジェット対応
 */
(function() {
  'use strict';

  // ===========================================================================
  // グローバル設定（URLなど変更可能な項目）
  // ===========================================================================
  Ralsnet.configure({
    apiUrl: 'https://property.tenpos-ft.com/wp-json/rengodb/v1/search-properties',
    detailBaseUrl: 'https://property.tenpos-ft.com/property/',
    fallbackImageUrl: 'https://property.tenpos-ft.com/app/plugins/wp-rengodb/assets/img/noimg.png',
  });

  // ===========================================================================
  // 共通フィルター関数
  // ===========================================================================

  /**
   * コメントを指定文字数で切り詰めるフィルター
   * @param {number} maxLength - 最大文字数
   * @returns {function}
   */
  function truncateCommentFilter(maxLength) {
    return function(data) {
      return data.map(function(item) {
        var copy = Object.assign({}, item);
        if (copy.comment && copy.comment.length > maxLength) {
          copy.comment = copy.comment.substring(0, maxLength) + '...';
        }
        return copy;
      });
    };
  }

  /**
   * 居抜き・スケルトンのみ表示するフィルター
   * @returns {function}
   */
  function conditionFilter() {
    return function(data) {
      return data.filter(function(item) {
        return item.condition === '居抜き' || item.condition === 'スケルトン';
      });
    };
  }

  /**
   * 複数フィルターを合成
   * @param {...function} filters
   * @returns {function}
   */
  function combineFilters() {
    var filters = Array.prototype.slice.call(arguments);
    return function(data) {
      return filters.reduce(function(result, filter) {
        return filter(result);
      }, data);
    };
  }

  // ===========================================================================
  // 新着物件リストウィジェット（postlist.html用）
  // container: #rals-widget-container
  // ===========================================================================
  function initPostListWidget() {
    var container = document.getElementById('rals-widget-container');
    if (!container) return;

    Ralsnet.ralsCube(container, {
      sup: 62807,
      prop: 2,
      odr: 'cdtd',
      limit: 3
    }, {
      listSelector: '.post-list',
      templateSelector: '#rals-template-postlist',
      filter: truncateCommentFilter(100)
    }).then(function(result) {
      console.log('PostList Loaded:', result.data.length, 'properties');
    }).catch(function(error) {
      console.error('PostList Error:', error);
    });
  }

  // ===========================================================================
  // スライダーウィジェット（slider用 - シンプル版）
  // container: #slider
  // ===========================================================================
  function initSliderWidget() {
    var container = document.getElementById('slider');
    if (!container) return;

    Ralsnet.ralsCube(container, {
      sup: 62807,
      prop: 2,
      limit: 4
    }, {
      listSelector: '.swiper-wrapper',
      templateSelector: '#slide-tpl',
      filter: truncateCommentFilter(80)
    }).then(function(result) {
      console.log('Slider Loaded:', result.data.length, 'properties');
      
      // Swiper初期化
      if (typeof Swiper !== 'undefined') {
        new Swiper('#slider', {
          slidesPerView: 3,
          spaceBetween: 20,
          loop: true,
          pagination: { el: '.swiper-pagination', clickable: true },
          navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
          breakpoints: {
            320: { slidesPerView: 1, spaceBetween: 10 },
            768: { slidesPerView: 2, spaceBetween: 15 },
            1024: { slidesPerView: 3, spaceBetween: 20 }
          },
          // リンククリックを正しく動作させるための設定
          preventClicks: false,
          preventClicksPropagation: false,
          touchStartPreventDefault: false
        });
      }
    }).catch(function(error) {
      console.error('Slider Error:', error);
    });
  }

  // ===========================================================================
  // スライドウィジェット（tenpos-slide.html用 - 高度なフィルタリング版）
  // container: #rals-slide-container
  // ===========================================================================
  async function initSlideWidget() {
    var container = document.getElementById('rals-slide-container');
    if (!container) return;

    var template = document.getElementById('rals-slide-template');
    if (!template) return;

    var templateHTML = template.innerHTML;

    // ローディング表示
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#666;">物件を読み込み中...</div>';

    // rals-cubeでデータ取得
    var properties;
    try {
      properties = await RalsWidget3.fetchPropertyData(container);
    } catch (e) {
      console.error('Slide Error:', e);
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">読み込みに失敗しました</div>';
      return;
    }

    // クライアント側フィルタリング: 居抜き OR スケルトン のみ表示
    if (container.dataset.filterCondition === 'true') {
      properties = properties.filter(function(p) {
        return p.condition === '居抜き' || p.condition === 'スケルトン';
      });
    }

    // クライアント側フィルタリング: 表示件数の制限
    var displayLimit = parseInt(container.dataset.displayLimit, 10);
    if (displayLimit && displayLimit > 0 && properties.length > displayLimit) {
      properties = properties.slice(0, displayLimit);
    }

    if (!properties || !properties.length) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">物件が見つかりません</div>';
      return;
    }

    console.log('Slide Loaded:', properties.length, 'properties (after filtering)');

    var maxComment = parseInt(container.dataset.maxComment, 10) || 80;

    // スライドHTML生成
    var slidesHTML = properties.map(function(p) {
      var html = templateHTML;
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
      html = html.split('{type}').join(p.propertyType || '');

      var conditionValue = p.condition || '';
      html = html.split('{condition}').join(conditionValue);
      if (!conditionValue) {
        html = html.replace(/<div[^>]*class="[^"]*item-condition[^"]*"[^>]*>[^<]*<\/div>/gi, '');
      }

      html = html.replace(/id="rals-tpl-[^"]*"/g, '');
      return html;
    }).join('');

    // Swiper構造で出力
    container.innerHTML =
      '<div class="frontpage-recommend-slider">' +
        '<ul class="swiper-wrapper">' + slidesHTML + '</ul>' +
      '</div>' +
      '<div class="swiper-button-prev"></div>' +
      '<div class="swiper-button-next"></div>';

    // Swiper初期化
    var el = container.querySelector('.frontpage-recommend-slider');
    if (el && typeof Swiper !== 'undefined') {
      new Swiper(el, {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: true,
        autoplay: { delay: 4000, disableOnInteraction: false },
        navigation: {
          nextEl: container.querySelector('.swiper-button-next'),
          prevEl: container.querySelector('.swiper-button-prev')
        },
        breakpoints: { 769: { slidesPerView: 2, spaceBetween: 20 } },
        // リンククリックを正しく動作させるための設定
        preventClicks: false,
        preventClicksPropagation: false,
        touchStartPreventDefault: false
      });
    }
  }

  // ===========================================================================
  // 初期化（DOM ready時に実行）
  // ===========================================================================
  function init() {
    initPostListWidget();    // #rals-widget-container
    initSliderWidget();      // #slider (シンプル版)
    initSlideWidget();       // #rals-slide-container (高度版)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
