(function () {
  function loadCSS() {
    return;
  }
  const debug = false;

  // テキストを指定された長さに切り詰める
  function truncateText(text, maxLength) {
    if (!text || !maxLength || maxLength <= 0) return text;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // 価格を「万」単位でフォーマットする
  function formatPrice(price, pricePrivateFlg) {
    if (price === null || price === undefined) {
      return "見学用のため販売しておりません";
    }
    if (pricePrivateFlg === true || pricePrivateFlg === 1) {
      return "お問合せ下さい";
    }
    if (!price || price === 0) {
      return "価格未定";
    }

    const man = Math.floor(price / 10000);
    const remainder = price % 10000;

    if (remainder === 0) {
      return `${man}万円`;
    } else {
      const formattedRemainder = remainder.toLocaleString("ja-JP");
      return `${man}万${formattedRemainder}円`;
    }
  }

  // 面積を「坪」単位でフォーマットする
  const TSUBO_PER_SQUARE_METER = 3.30579;

  function formatArea(area) {
    if (!area) return "";

    // rounded to 1 decimal place
    const tsubo = area / TSUBO_PER_SQUARE_METER;
    const roundedTsubo = Math.round(tsubo * 10) / 10;

    // m2 truncated to 2 decimal places
    const truncatedArea = Math.floor(area * 100) / 100;

    return `${roundedTsubo}坪(${truncatedArea}㎡)`;
  }

  // jsonTraffic フィールドから交通情報を取得する
  function getTrafficInfo(item) {
    if (
      item.jsonTraffic &&
      Array.isArray(item.jsonTraffic) &&
      item.jsonTraffic.length > 0
    ) {
      // 徒歩時間でソートし、最寄り駅を先に表示する
      const sortedTraffic = item.jsonTraffic
        .filter(
          (traffic) =>
            traffic.transport_min_station !== null ||
            traffic.transport_min_bus !== null
        )
        .sort((a, b) => {
          const timeA = a.transport_min_station || a.transport_min_bus || 999;
          const timeB = b.transport_min_station || b.transport_min_bus || 999;
          return timeA - timeB;
        });

      if (sortedTraffic.length > 0) {
        const firstTraffic = sortedTraffic[0];

        // train stations
        if (firstTraffic.station_name && firstTraffic.transport_min_station) {
          return `${firstTraffic.station_name}(徒歩${firstTraffic.transport_min_station}分)`;
        }

        // bus stops
        if (firstTraffic.bus_info && firstTraffic.transport_min_bus) {
          const busInfo = firstTraffic.bus_info.trim();
          return `${busInfo}(徒歩${firstTraffic.transport_min_bus}分)`;
        }
      }
    }

    // jsonTraffic が利用できない場合は trafficDataStr を使用する
    if (item.trafficDataStr && item.trafficDataStr.trim() !== "") {
      const trafficItems = item.trafficDataStr.split(" / ");
      if (trafficItems.length > 0) {
        const firstTraffic = trafficItems[0].trim();
        const match = firstTraffic.match(/^(.+?)\s+徒歩(\d+)分/);
        if (match) {
          const stationName = match[1].trim();
          const walkTime = match[2];
          return `${stationName}(徒歩${walkTime}分)`;
        }
        return firstTraffic;
      }
    }

    return "";
  }

  // wp-rengodb と同じ形式で住所を取得
  function getAddress(item) {
    const addressParts = [];
    if (item.area1Name) addressParts.push(item.area1Name);
    if (item.area2Name) addressParts.push(item.area2Name);
    if (item.area3Name) addressParts.push(item.area3Name);
    if (item.area4) addressParts.push(item.area4);
    return addressParts.join("");
  }

  // 物件データを処理して、構造化されたデータオブジェクトを返す

  function processPropertyData(item, detailBaseUrl, imageBaseUrl) {
    if (!item.buildingMasterId) {
      if (debug) console.warn("物件をスキップ: Building Master ID がありません", item);
      return null;
    }
    if (!item.supplierId) {
      if (debug) console.warn("物件をスキップ: Supplier ID がありません", item);
      return null;
    }
    if (!item.buildingId) {
      if (debug) console.warn("物件をスキップ: Building ID がありません", item);
      return null;
    }
    if (!item.propertyId) {
      if (debug) console.warn("物件をスキップ: Property ID がありません", item);
      return null;
    }

    const isSale = item.isSale === true || item.hasOwnProperty("saleInfoId");

    const title = item.buildingName || "";
    const price = formatPrice(item.propertyPrice, item.pricePrivateFlg);
    const detailUrl = `${detailBaseUrl}${item.buildingMasterId}`;
    const address = getAddress(item);
    const traffic = getTrafficInfo(item);
    const area = formatArea(item.exclusiveSize);

    const supplierId = item.supplierId;
    const buildingId = item.buildingId;
    const propertyId = item.propertyId;

    // 画像URLを決定するロジック
    const getImageUrlFromImageObject = (imageObj) => {
      if (!imageObj) return null;

      const number = imageObj.number;
      const category = imageObj.category;

      let prefix;
      let id;
      if (category === 'layout' || category === 'interior') {
        prefix = isSale ? 's' : 'r';
        id = propertyId;
      } else { // 'exterior', 'surrounding', etc.
        prefix = 'c';
        id = buildingId;
      }

      // Handle special suffixes for number 1
      if (number === 1) {
        if (category === 'exterior') {
          return `${imageBaseUrl}${supplierId}/${prefix}-${supplierId}-${id}-g.jpg`;
        }
        if (category === 'layout') {
          return `${imageBaseUrl}${supplierId}/${prefix}-${supplierId}-${id}-m.jpg`;
        }
      }

      // For all other numbers, subtract 1
      const adjustedNumber = number - 1;
      return `${imageBaseUrl}${supplierId}/${prefix}-${supplierId}-${id}-${adjustedNumber}.jpg`;
    };

    let thumbnailUrl = null;

    const delegateBuildingImgNum = item.delegateImgBuilding || 1;
    const buildingImage = item.buildingImages?.find(img => img.number === delegateBuildingImgNum);

    if (buildingImage) {
      thumbnailUrl = getImageUrlFromImageObject(buildingImage);
    } else {
      const delegateRoomImgNum = item.delegateImg || 1;
      const roomImage = item.propertyImages?.find(img => img.number === delegateRoomImgNum);

      if (roomImage) {
        thumbnailUrl = getImageUrlFromImageObject(roomImage);
      } else if (item.images && item.images.length > 0) {
        // Fallback to the first available image if no delegate is found
        const selectedImage =
          item.images.find((img) => img.category === "exterior") ||
          item.images.find((img) => img.category === "layout") ||
          item.images[0];

        if (selectedImage) {
          thumbnailUrl = getImageUrlFromImageObject(selectedImage);
        }
      }
    }

    // 日付をフォーマットする (YYYY-MM-DD)
    let registDate = "";
    if (item.propertyMakeDatetime && item.propertyMakeDatetime.date) {
      const dateStr = item.propertyMakeDatetime.date;
      registDate = dateStr.substring(0, 10); // "2025-12-01"
    }

    // コメントを取得する
    const comment = item.comment || "";

    return {
      title,
      price,
      detailUrl,
      address,
      traffic,
      area,
      thumbnailUrl,
      registDate,
      comment,
    };
  }

  // すべての物件を処理して、処理済みデータの配列を返す
  function processProperties(list, detailBaseUrl, imageBaseUrl) {
    if (!list || !list.length) {
      return [];
    }
    return list
      .map((item) => processPropertyData(item, detailBaseUrl, imageBaseUrl))
      .filter((item) => item !== null);
  }


  async function fetchPropertyData(container) {
    if (!container.dataset.api) {
      throw new Error("APIのベースURLが必要です。.");
    }
    if (!container.dataset.detailUrl) {
      throw new Error(
        "詳細ページのベースURLが必要です。"
      );
    }
    if (!container.dataset.imageBaseUrl) {
      throw new Error(
        "画像のベースURLが必要です。"
      );
    }

    const apiBase = container.dataset.api;
    const detailBaseUrl = container.dataset.detailUrl;
    const imageBaseUrl = container.dataset.imageBaseUrl;

    let url;
    if (container.dataset.query) {
      url = `${apiBase}?${container.dataset.query}`;
    } else {
      if (!container.dataset.supplier) {
        throw new Error(
          "サプライヤーIDが必要です。data-supplier 属性を設定してください。"
        );
      }
      if (!container.dataset.prop) {
        throw new Error("物件タイプが必要です。data-prop 属性を設定してください。");
      }

      const supplier = container.dataset.supplier;
      const prop = container.dataset.prop;
      url = `${apiBase}?sup=${supplier}&prop=${prop}`;

      if (container.dataset.limit) {
        url += `&limit=${container.dataset.limit}`;
      }
    }

    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) {
        console.error(
          `APIエラー: ステータス ${response.status} が返されました。`
        );
        return [];
      }

      const data = await response.json();
      const processedData = processProperties(
        data,
        detailBaseUrl,
        imageBaseUrl
      );

      if (data && data.length > processedData.length) {
        if (debug) {
          console.warn(
            `Filtered out ${data.length - processedData.length} invalid properties from ${data.length} total properties`
          );
        }
      }

      return processedData;
    } catch (error) {
      console.error("物件情報の読み込みに失敗しました:", error);
      return []; // Return empty array
    }
  }

  // widget 初期化する
  function init() {
    loadCSS();
    return Promise.all(
      document.querySelectorAll(".rals-widget").map(async (container) => {
        if (!container.dataset.api) {
          throw new Error("APIのベースURLが必要です。");
        }
        if (!container.dataset.detailUrl) {
          throw new Error(
            "詳細ページのベースURLが必要です。"
          );
        }
        if (!container.dataset.imageBaseUrl) {
          throw new Error(
            "画像のベースURLが必要です"
          );
        }

        const customColor = container.dataset.color;
        const customHoverColor = container.dataset.hoverColor;
        const customCardBg = container.dataset.cardBg;

        if (customColor) {
          container.style.setProperty("--rals-main-color", customColor);
        }
        if (customHoverColor) {
          container.style.setProperty("--rals-hover-color", customHoverColor);
        }
        if (customCardBg) {
          container.style.setProperty("--rals-card-bg", customCardBg);
        }

        try {
          const propertyData = await fetchPropertyData(container);
          return {
            container,
            data: propertyData,
          };
        } catch (error) {
          return {
            container,
            data: [],
            error: error.message,
          };
        }
      })
    );
  }

  async function renderWidget(container) {
    try {
      // Get the template from HTML BEFORE clearing the container
      // Support: 1) data-template-id attribute, 2) class-based detection
      let template = null;
      let formatType = "card";
      
      // First, check if data-template-id is specified
      const templateId = container.dataset.templateId;
      if (templateId) {
        template = document.getElementById(templateId);
        if (template) {
          // Determine format type based on classes
          if (template.classList.contains("postList__item")) {
            formatType = "postList";
          } else if (template.classList.contains("property-list-item")) {
            formatType = "list";
          } else if (template.classList.contains("property-card")) {
            formatType = "card";
          } else {
            formatType = "postList"; // default for ID-based templates
          }
        }
      }
      
      // Fallback to class-based detection
      if (!template) {
        template = container.querySelector(".property-card");
        if (template) {
          formatType = "card";
        }
      }
      
      if (!template) {
        template = container.querySelector(".property-list-item");
        if (template) {
          formatType = "list";
        }
      }
      
      if (!template) {
        template = container.querySelector(".postList__item");
        if (template) {
          formatType = "postList";
        }
      }
      
      if (!template) {
        console.error("Template not found in HTML. Use data-template-id or provide a template element.");
        return;
      }

      // Store the template HTML for later use
      const templateHTML = template.outerHTML;

      // Show loading message
      const loadingMessage =
        container.dataset.loadingMessage || "物件を読み込み中...";
      container.innerHTML = `<p style="text-align: center;">${loadingMessage}</p>`;

      // Fetch property data using the widget
      let properties;
      try {
        properties = await fetchPropertyData(container);
      } catch (error) {
        console.error("Error fetching property data:", error);
        const errorMessage =
          container.dataset.errorMessage ||
          "物件情報の読み込みに失敗しました。しばらくしてから再度お試しください。";
        container.innerHTML = `<p>${errorMessage}</p>`;
        return;
      }

      if (!properties || properties.length === 0) {
        const noPropertiesMessage =
          container.dataset.noPropertiesMessage || "物件が見つかりません。";
        container.innerHTML = `<p>${noPropertiesMessage}</p>`;
        return;
      }

      // Add container class
      container.classList.add("rals-widget-container");

      const cardsHTML = properties
        .map((property, index) => {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = templateHTML;
          const card = tempDiv.firstElementChild;
          
          // Remove the display:none style from the template
          card.style.display = "";
          
          // Remove template ID to avoid duplicate IDs
          card.removeAttribute("id");

          // Helper function to find element by ID or class
          const findElement = (idSelector, classSelector) => {
            let el = card.querySelector(`#${idSelector}`);
            if (!el && classSelector) {
              el = card.querySelector(classSelector);
            }
            // Remove ID attribute to avoid duplicates
            if (el) el.removeAttribute("id");
            return el;
          };

          // フォールバック付きで画像を処理する
          const img = findElement("rals-tpl-img", ".property-img");
          if (img) {
            if (property.thumbnailUrl && property.thumbnailUrl.trim() !== "") {
              img.src = property.thumbnailUrl;
              img.onerror = function () {
                console.log(`画像の読み込みに失敗しました: ${this.src}、フォールバック画像を使用します。`);
                this.src = container.dataset.fallbackImageUrl;
                this.onerror = null;
              };
            } else {
              img.src = container.dataset.fallbackImageUrl;
            }
            img.alt = property.title || "Property Image";
          }

          // Handle title
          const title = findElement("rals-tpl-title", ".property-title");
          if (title) {
            if (property.title && property.title.trim() !== "") {
              title.textContent = property.title;
            } else {
              title.style.display = "none";
            }
          }

          // Handle rent price
          const rent = findElement("rals-tpl-rent", ".property-rent");
          if (rent) {
            if (property.price && property.price.trim() !== "") {
              rent.textContent = property.price;
              rent.style.display = "block";
            } else {
              rent.style.display = "none";
            }
          }

          // Handle details
          const details = findElement("rals-tpl-details", ".property-details");
          if (details) {
            details.innerHTML = "";
            const contentToAdd = [];
            if (property.traffic) contentToAdd.push(property.traffic);
            if (property.address) contentToAdd.push(property.address);
            if (property.area) contentToAdd.push(property.area);

            if (contentToAdd.length > 0) {
              details.innerHTML = contentToAdd.join("<br>");
              details.style.display = "block";
            } else {
              details.style.display = "none";
            }
          }

          // Handle detail button
          const link = findElement("rals-tpl-btn", ".property-detail-btn");
          if (link) {
            if (property.detailUrl && property.detailUrl.trim() !== "") {
              link.href = property.detailUrl;
              link.textContent = container.dataset.detailButtonText || "物件詳細を見る";
              link.style.display = "block";
            } else {
              link.style.display = "none";
            }
          }

          // Handle date - ID first, then class fallback
          const dateEl = findElement("rals-tpl-time", ".property-date, .postList__time");
          if (dateEl) {
            if (property.registDate && property.registDate.trim() !== "") {
              dateEl.textContent = property.registDate;
              dateEl.setAttribute("datetime", property.registDate);
              dateEl.style.display = "";
            } else {
              dateEl.style.display = "none";
            }
          }

          // Handle comment/heading - ID first, then class fallback
          const commentEl = findElement("rals-tpl-comment", ".property-comment, .postList__heading span");
          if (commentEl) {
            const commentMaxLength = parseInt(container.dataset.commentMaxLength) || 0;
            
            if (property.comment && property.comment.trim() !== "") {
              const displayComment = truncateText(property.comment, commentMaxLength);
              commentEl.textContent = displayComment;
              commentEl.style.display = "";
            } else if (property.title && property.title.trim() !== "") {
              const displayTitle = truncateText(property.title, commentMaxLength);
              commentEl.textContent = displayTitle;
              commentEl.style.display = "";
            } else {
              commentEl.style.display = "none";
            }
          }

          // Handle link - ID first, then class fallback
          const propertyLink = findElement("rals-tpl-link", ".property-link, .postList__link");
          if (propertyLink) {
            if (property.detailUrl && property.detailUrl.trim() !== "") {
              propertyLink.href = property.detailUrl;
            }
          }

          return card.outerHTML;
        })
        .join("");

      // Output different HTML structure based on format type
      if (formatType === "postList") {
        // Client site structure - just output the articles directly
        container.innerHTML = cardsHTML;
      } else if (formatType === "list") {
        container.innerHTML = `
          <div class="properties-list">
            <div class="property-list-items">
              ${cardsHTML}
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="properties-grid">
            <div class="property-cards">
              ${cardsHTML}
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error loading properties:", error);
      const errorMessage =
        container.dataset.errorMessage ||
        "物件情報の読み込みに失敗しました。しばらくしてから再度お試しください。";
      container.innerHTML = `<p>${errorMessage}</p>`;
    }
  }

  // Auto-initialize all widgets when DOM is ready
  function initAllWidgets() {
    const containers = document.querySelectorAll(".rals-widget");
    containers.forEach((container) => {
      renderWidget(container);
    });
  }

  /// 関数をグローバルに公開する
  window.RalsWidget3 = {
    init,
    fetchPropertyData,
    processPropertyData,
    processProperties,
    renderWidget,
    initAllWidgets,
  };
})();
