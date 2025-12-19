# SCUBE v3 - 物件表示ウィジェット

Rengodb API対応の物件表示スクリプト。テンプレートベースで柔軟にカスタマイズ可能。

---

## 📦 インストール

```html
<!-- CDN版 -->
<script src="https://ralsnet-omar-faruk.github.io/widget-scube-style/v3/assets/scube-v3.js"></script>

<!-- ローカル版 -->
<script src="./dist/scube-v3.js"></script>
```

---

## 🚀 基本的な使い方

### HTML テンプレート

```html
<div id="widget-container">
  <div class="list">
    <template id="item-template">
      <div class="item">
        <a href="{detailUrl}">
          <img src="{thumbnailUrl}" alt="{title}">
          <h3>{title}</h3>
          <p>{price}</p>
        </a>
      </div>
    </template>
  </div>
</div>
```

### JavaScript 呼び出し

```javascript
Ralsnet.scubeV3(document.getElementById('widget-container'), {
  sup: 62807,
  prop: 2,
  limit: 10
}, {
  listSelector: '.list',
  templateSelector: '#item-template'
}).then(function(result) {
  console.log('Loaded:', result.data.length, 'properties');
}).catch(function(error) {
  console.error('Error:', error);
});
```

---

## ⚙️ グローバル設定

URL等の設定を一元管理できます。

```javascript
// 設定
Ralsnet.configure({
  apiUrl: 'https://property.tenpos-ft.com/wp-json/rengodb/v1/search-properties',
  detailBaseUrl: 'https://property.tenpos-ft.com/property/',
  fallbackImageUrl: 'https://property.tenpos-ft.com/app/plugins/wp-rengodb/assets/img/noimg.png',
});

// 現在の設定を取得
var config = Ralsnet.getConfig();
console.log(config.apiUrl);
```

---

## 📋 API パラメータ

`Ralsnet.scubeV3(container, params, options)` の第2引数

| パラメータ | 型 | 説明 | 例 |
|-----------|------|-------------|-----|
| `sup` | number/string | 業者ID (Supplier ID) | `62807` |
| `prop` | number/string | 物件種別 (1=売買, 2=賃貸) | `2` |
| `limit` | number | 取得件数上限 | `10` |
| `odr` | string | ソート順 (`'cdtd'` = 新着順) | `'cdtd'` |

```javascript
{
  sup: 62807,
  prop: 2,
  limit: 10,
  odr: 'cdtd'
}
```

---

## 🎨 オプション

`Ralsnet.scubeV3(container, params, options)` の第3引数

| オプション | 型 | 説明 | デフォルト |
|-----------|------|-------------|-----------|
| `listSelector` | string | アイテムを追加する要素のセレクタ | `'.list'` |
| `templateSelector` | string | テンプレート要素のセレクタ | `'.list > *'` |
| `filter` | function | データ変換フィルター関数 | `(data) => data` |
| `callback` | function | 各要素生成後のコールバック | `() => {}` |
| `loadingMessage` | string | ローディング中メッセージ | `'物件を読み込み中...'` |
| `noPropertiesMessage` | string | 物件なし時メッセージ | `'物件が見つかりません。'` |
| `errorMessage` | string | エラー時メッセージ | `'物件情報の読み込みに失敗しました。'` |
| `customColors` | object | カスタムカラー設定 | `{}` |

### customColors

```javascript
{
  customColors: {
    mainColor: '#ff6600',
    hoverColor: '#ff8833',
    cardBg: '#ffffff'
  }
}
```

---

## 📝 テンプレート変数

HTMLテンプレート内で使用可能なプレースホルダー `{variable}`

| 変数 | 説明 | 例 |
|------|------|-----|
| `{title}` | 物件名（建物名） | `渋谷駅前ビル` |
| `{price}` | 価格（フォーマット済み） | `150万円` |
| `{detailUrl}` | 詳細ページURL | `https://property.tenpos-ft.com/property/12345` |
| `{address}` | 住所（都道府県〜番地） | `東京都渋谷区道玄坂1-2-3` |
| `{traffic}` | 交通情報 | `渋谷駅(徒歩5分)` |
| `{area}` | 面積（坪/㎡） | `15.2坪(50.25㎡)` |
| `{thumbnailUrl}` | サムネイル画像URL | `https://pic.cbiz.ne.jp/pic/...` |
| `{registDate}` | 登録日 | `2025-01-15` |
| `{comment}` | コメント・備考 | `駅近で好立地の店舗物件です...` |
| `{propertyType}` | 物件種別 | `店舗` / `事務所` |
| `{condition}` | 状態 | `居抜き` / `スケルトン` / `''` |

### テンプレート例

```html
<template id="property-template">
  <article class="property-card">
    <a href="{detailUrl}" target="_blank">
      <div class="image">
        <img src="{thumbnailUrl}" alt="{title}">
        <span class="condition">{condition}</span>
      </div>
      <div class="info">
        <h3 class="title">{title}</h3>
        <p class="price">{price}</p>
        <p class="address">{address}</p>
        <p class="traffic">{traffic}</p>
        <p class="area">{area}</p>
        <p class="comment">{comment}</p>
        <time class="date">{registDate}</time>
      </div>
    </a>
  </article>
</template>
```

---

## 🔧 フィルター関数

データをテンプレートに流し込む前に加工できます。

### コメントを指定文字数で切り詰め

```javascript
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

// 使用
Ralsnet.scubeV3(container, params, {
  filter: truncateCommentFilter(100)
});
```

### 居抜き・スケルトンのみ表示

```javascript
function conditionFilter(data) {
  return data.filter(function(item) {
    return item.condition === '居抜き' || item.condition === 'スケルトン';
  });
}

// 使用
Ralsnet.scubeV3(container, params, {
  filter: conditionFilter
});
```

### 複数フィルターを組み合わせ

```javascript
function combineFilters() {
  var filters = Array.prototype.slice.call(arguments);
  return function(data) {
    return filters.reduce(function(result, filter) {
      return filter(result);
    }, data);
  };
}

// 使用
Ralsnet.scubeV3(container, params, {
  filter: combineFilters(
    conditionFilter,
    truncateCommentFilter(80)
  )
});
```

---

## 📤 レスポンスオブジェクト

`.then(function(result) {...})` で受け取れるオブジェクト

```javascript
{
  context: HTMLElement,      // コンテナ要素
  list: HTMLElement,         // リスト要素
  data: PropertyData[],      // 処理済み物件データ配列
  raw: RawPropertyData[]     // APIからの生データ配列
}
```

### PropertyData の構造

```javascript
{
  title: string,
  price: string,
  detailUrl: string,
  address: string,
  traffic: string,
  area: string,
  thumbnailUrl: string | null,
  registDate: string,
  comment: string,
  propertyType: string,
  condition: string
}
```

---

## 🎠 Swiper連携例

### シンプルなスライダー

```html
<div id="slider" class="swiper">
  <div class="swiper-wrapper">
    <template id="slide-tpl">
      <div class="swiper-slide">
        <a href="{detailUrl}">
          <img src="{thumbnailUrl}" alt="{title}">
          <h3>{title}</h3>
          <p>{price}</p>
        </a>
      </div>
    </template>
  </div>
  <div class="swiper-pagination"></div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
</div>

<script src="swiper.min.js"></script>
<script src="scube-v3.js"></script>
<script>
Ralsnet.scubeV3(document.getElementById('slider'), {
  sup: 62807,
  prop: 2,
  limit: 8
}, {
  listSelector: '.swiper-wrapper',
  templateSelector: '#slide-tpl'
}).then(function() {
  new Swiper('#slider', {
    slidesPerView: 3,
    spaceBetween: 20,
    loop: true,
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    breakpoints: {
      320: { slidesPerView: 1 },
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 3 }
    }
  });
});
</script>
```

---

## 📂 ファイル構成

```
scube-v3/
├── src/                    # ソースコード (TypeScript)
│   ├── index.ts           # エントリーポイント
│   ├── scube.ts           # メイン処理
│   ├── format.ts          # データフォーマット
│   ├── tmpl.ts            # テンプレート処理
│   ├── req.ts             # API リクエスト
│   └── types.ts           # 型定義
├── dist/                   # ビルド済みファイル
│   ├── scube-v3.js        # ブラウザ用 (IIFE)
│   ├── scube-v3.mjs       # ESM
│   └── scube-v3.cjs       # CommonJS
├── example/                # 使用例
│   ├── postlist.html      # 新着物件リスト例
│   ├── postlist.js        # 共通スクリプト
│   └── tenpos-slide.html  # スライド例
└── README.md              # このファイル
```

---

## 🛠️ 開発

### ビルド

```bash
npm install
npm run build
```

### テスト

```bash
npm test
```

---

## 📌 API リファレンス

### Ralsnet.scubeV3(container, params, options)

メインの物件表示関数

- **container**: `HTMLElement` - 物件を表示するコンテナ要素
- **params**: `object | string` - API パラメータ
- **options**: `object` - 表示オプション
- **returns**: `Promise<ScubeResponse>`

### Ralsnet.configure(config)

グローバル設定を更新

- **config**: `object` - 設定オブジェクト

### Ralsnet.getConfig()

現在の設定を取得

- **returns**: `ScubeOptions`

### RalsWidget3.fetchPropertyData(container)

物件データのみ取得（テンプレート処理なし）

- **container**: `HTMLElement` - data属性からパラメータを読み取る要素
- **returns**: `Promise<PropertyData[]>`

---

## 📄 ライセンス

MIT License

