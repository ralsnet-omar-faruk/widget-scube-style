(function () {
  function loadCSS() {
    return;
  }

  // Format price in 万 format with comma-separated remainder
  function formatPrice(price) {
    if (!price) return "価格未定";

    const man = Math.floor(price / 10000);
    const remainder = price % 10000;

    if (remainder === 0) {
      return `${man}万円`;
    } else {
      // Format remainder with commas
      const formattedRemainder = remainder.toLocaleString("ja-JP");
      return `${man}万${formattedRemainder}円`;
    }
  }

  // Format area in 坪 (tsubo) format
 const TSUBO_PER_SQUARE_METER = 3.30579;

 function formatArea(area) {
   if (!area) return "";

   // Convert from square meters to tsubo (坪)
   const tsubo = area / TSUBO_PER_SQUARE_METER;
   const roundedTsubo = Math.round(tsubo * 10) / 10;

   return `${roundedTsubo}坪(${area}㎡)`;
 }
  // Get traffic information from jsonTraffic field (like uchiike does)
  function getTrafficInfo(item) {
    if (
      item.jsonTraffic &&
      Array.isArray(item.jsonTraffic) &&
      item.jsonTraffic.length > 0
    ) {
      // Sort by walking time to get the closest station first
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

        // Handle train stations
        if (firstTraffic.station_name && firstTraffic.transport_min_station) {
          return `${firstTraffic.station_name}(徒歩${firstTraffic.transport_min_station}分)`;
        }

        // Handle bus stops
        if (firstTraffic.bus_info && firstTraffic.transport_min_bus) {
          // Clean up the bus info (remove extra spaces)
          const busInfo = firstTraffic.bus_info.trim();
          return `${busInfo}(徒歩${firstTraffic.transport_min_bus}分)`;
        }
      }
    }

    // Fallback to trafficDataStr if jsonTraffic is not available
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

  // Get address in the same format as uchiike
  function getAddress(item) {
    const addressParts = [];
    if (item.area1Name) addressParts.push(item.area1Name);
    if (item.area2Name) addressParts.push(item.area2Name);
    if (item.area3Name) addressParts.push(item.area3Name);
    if (item.area4) addressParts.push(item.area4);
    return addressParts.join("");
  }

  // Process property data and return structured data object
  function processPropertyData(item, detailBaseUrl, imageBaseUrl) {
    // Validate required fields - return null for invalid data instead of throwing
    if (!item.buildingName) {
      console.warn("物件をスキップ: Building Name がありません", item);
      return null;
    }
    if (!item.buildingMasterId) {
      console.warn("物件をスキップ: Building Master ID がありません", item);
      return null;
    }
    if (!item.supplierId) {
      console.warn("物件をスキップ: Supplier ID がありません", item);
      return null;
    }
    if (!item.buildingId) {
      console.warn("物件をスキップ: Building ID がありません", item);
      return null;
    }
    if (!item.propertyId) {
      console.warn("物件をスキップ: Property ID がありません", item);
      return null;
    }

    // Detect if property is for Sale or Rent
    const isSale = item.isSale === true || item.hasOwnProperty("saleInfoId");

    const title = item.buildingName;
    const price = formatPrice(item.propertyPrice);
    const detailUrl = `${detailBaseUrl}${item.buildingMasterId}`;
    const address = getAddress(item);
    const traffic = getTrafficInfo(item);
    const area = formatArea(item.exclusiveSize);

    // No default image - let the renderer handle fallback
    let thumbnailUrl = null;
    const supplierId = item.supplierId;
    const buildingId = item.buildingId;
    const propertyId = item.propertyId;

    // 優先度1: 物件データで指定された「建物」の代表画像 (`delegateImgBuilding`) を使用
    if (item.delegateImgBuilding && item.delegateImgBuilding > 0) {
      const imageNumber = item.delegateImgBuilding;
      if (imageNumber === 1) {
        thumbnailUrl = `${imageBaseUrl}${supplierId}/c-${supplierId}-${buildingId}-g.jpg`;
      } else {
        const adjustedNumber = imageNumber - 1;
        thumbnailUrl = `${imageBaseUrl}${supplierId}/c-${supplierId}-${buildingId}-${adjustedNumber}.jpg`;
      }
    }
    // 優先度2: 「建物」の代表画像がない場合、「部屋」の代表画像 (`delegateImg`) を使用
    // 注意: Sale物件はdelegateImgがない場合が多いので、Rent物件のみを対象とする
    else if (!isSale && item.delegateImg && item.delegateImg > 0) {
      const imageNumber = item.delegateImg;
      const adjustedNumber = Math.max(1, imageNumber - 1);

      const propertyImage = item.propertyImages?.find(
        (img) => img.number === imageNumber
      );
      if (propertyImage && propertyImage.category === "layout") {
        if (imageNumber === 1) {
          thumbnailUrl = `${imageBaseUrl}${supplierId}/r-${supplierId}-${propertyId}-m.jpg`;
        } else {
          thumbnailUrl = `${imageBaseUrl}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
        }
      } else {
        thumbnailUrl = `${imageBaseUrl}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
      }
    }
    // 優先度3: 代表画像が全くない場合、利用可能な全画像 (`images`) のリストから探す
    else if (item.images && item.images.length > 0) {
      const selectedImage =
        item.images.find((img) => img.category === "exterior") ||
        item.images.find((img) => img.category === "layout") ||
        item.images[0];
      if (selectedImage) {
        const imageNumber = selectedImage.number;
        const category = selectedImage.category;

        if (category === "exterior") {
          const adjustedNumber = imageNumber - 1;
          thumbnailUrl =
            imageNumber === 1
              ? `${imageBaseUrl}${supplierId}/c-${supplierId}-${buildingId}-g.jpg`
              : `${imageBaseUrl}${supplierId}/c-${supplierId}-${buildingId}-${adjustedNumber}.jpg`;
        } else {
          // layout or interior
          const adjustedNumber = imageNumber - 1;
          thumbnailUrl =
            category === "layout" && imageNumber === 1
              ? `${imageBaseUrl}${supplierId}/r-${supplierId}-${propertyId}-m.jpg`
              : `${imageBaseUrl}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
        }
      }
    }
    // No image found - thumbnailUrl remains null, let renderer handle fallback

    return {
      title,
      price,
      detailUrl,
      address,
      traffic,
      area,
      thumbnailUrl,
    };
  }

  // Process all properties and return array of processed data
  function processProperties(list, detailBaseUrl, imageBaseUrl) {
    if (!list || !list.length) {
      return [];
    }
    // Filter out null values (invalid properties) and only return valid ones
    return list
      .map((item) => processPropertyData(item, detailBaseUrl, imageBaseUrl))
      .filter((item) => item !== null);
  }

  // Main function to fetch and return processed property data
  async function fetchPropertyData(container) {
    // Validate required data attributes
    if (!container.dataset.api) {
      throw new Error("API base URL is required. Set data-api attribute.");
    }
    if (!container.dataset.detailUrl) {
      throw new Error(
        "Detail page base URL is required. Set data-detailUrl attribute."
      );
    }
    if (!container.dataset.imageBaseUrl) {
      throw new Error(
        "Image base URL is required. Set data-imageBaseUrl attribute."
      );
    }

    const apiBase = container.dataset.api;
    const detailBaseUrl = container.dataset.detailUrl;
    const imageBaseUrl = container.dataset.imageBaseUrl;

    let url;

    // Check if data-query is provided for custom query parameters
    if (container.dataset.query) {
      // Use custom query string
      url = `${apiBase}?${container.dataset.query}`;

      // If limit is specified, request more properties to account for filtering
      const queryParams = new URLSearchParams(container.dataset.query);
      const limit = queryParams.get("limit");
      if (limit) {
        const limitNum = parseInt(limit);
        if (limitNum > 0) {
          // Request 2x the limit to account for properties that might be filtered out
          queryParams.set("limit", (limitNum * 2).toString());
          url = `${apiBase}?${queryParams.toString()}`;
        }
      }
    } else {
      // Use individual data attributes (backward compatibility)
      if (!container.dataset.supplier) {
        throw new Error(
          "Supplier ID is required. Set data-supplier attribute."
        );
      }
      if (!container.dataset.prop) {
        throw new Error("Property type is required. Set data-prop attribute.");
      }

      const supplier = container.dataset.supplier;
      const prop = container.dataset.prop;
      url = `${apiBase}?sup=${supplier}&prop=${prop}`;

      if (container.dataset.limit) {
        url += `&limit=${container.dataset.limit}`;
      }
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `APIエラー: ステータス ${response.status} が返されました。`
        );
        return []; // Return empty array instead of throwing
      }

      const data = await response.json();
      const processedData = processProperties(
        data,
        detailBaseUrl,
        imageBaseUrl
      );

      // Log if we filtered out any invalid properties
      if (data && data.length > processedData.length) {
        console.warn(
          `Filtered out ${
            data.length - processedData.length
          } invalid properties from ${data.length} total properties`
        );
      }

      // If we requested more properties to account for filtering, limit the results
      if (container.dataset.query) {
        const queryParams = new URLSearchParams(container.dataset.query);
        const originalLimit = queryParams.get("limit");
        if (originalLimit) {
          const limitNum = parseInt(originalLimit);
          if (limitNum > 0 && processedData.length > limitNum) {
            return processedData.slice(0, limitNum);
          }
        }
      }

      return processedData;
    } catch (error) {
      console.error("物件情報の読み込みに失敗しました:", error);
      return []; // Return empty array instead of throwing to prevent widget crash
    }
  }

  // Initialize widget - returns data instead of rendering HTML
  function init() {
    loadCSS();

    // Return a promise that resolves with property data for each container
    return Promise.all(
      document.querySelectorAll(".rals-widget").map(async (container) => {
        // Validate required data attributes before processing
        if (!container.dataset.api) {
          throw new Error("API base URL is required. Set data-api attribute.");
        }
        if (!container.dataset.detailUrl) {
          throw new Error(
            "Detail page base URL is required. Set data-detailUrl attribute."
          );
        }
        if (!container.dataset.imageBaseUrl) {
          throw new Error(
            "Image base URL is required. Set data-imageBaseUrl attribute."
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

  // Performance optimization: Render properties in batches
  async function renderPropertiesBatch(
    container,
    properties,
    templateHTML,
    startIndex = 0,
    batchSize = 50
  ) {
    const endIndex = Math.min(startIndex + batchSize, properties.length);
    const batch = properties.slice(startIndex, endIndex);

    const cardsHTML = batch
      .map((property) => {
        // Create a temporary div to parse the template
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = templateHTML;
        const card = tempDiv.firstElementChild;

        // Handle image with fallback
        const img = card.querySelector(".property-img");
        if (img) {
          if (property.thumbnailUrl && property.thumbnailUrl.trim() !== "") {
            img.src = property.thumbnailUrl;
            // Add error handler for when the image URL doesn't exist (like in reference code)
            img.onerror = function () {
              console.log(
                `Image failed to load: ${property.thumbnailUrl}, using fallback`
              );
              this.style.display = "none";
              // Create fallback text element if it doesn't exist
              let fallbackText = this.nextElementSibling;
              if (
                !fallbackText ||
                !fallbackText.classList.contains("rals-alt-text")
              ) {
                fallbackText = document.createElement("div");
                fallbackText.className = "rals-alt-text";
                fallbackText.textContent = property.title || "Property Image";
                this.parentNode.appendChild(fallbackText);
              }
              fallbackText.style.display = "block";
            };
          } else {
            // Use fallback from container data attribute (set by widget-renderer.js)
            img.src = container.dataset.fallbackImageUrl;
          }
          img.alt = property.title || "Property Image";
        }
        // If property-img element doesn't exist in template, it won't be displayed (graceful handling)

        // Handle property title - controlled by HTML template data attributes
        const title = card.querySelector(".property-title");
        if (title) {
          if (property.title && property.title.trim() !== "") {
            title.textContent = property.title;
          } else {
            title.style.display = "none";
          }
        }
        // If property-title element doesn't exist in template, it won't be displayed (graceful handling)

        // Handle rent price - replace {price} placeholder
        const rent = card.querySelector(".property-rent");
        if (rent) {
          if (property.price && property.price.trim() !== "") {
            rent.textContent = property.price;
            rent.style.display = "block";
          } else {
            rent.style.display = "none";
          }
        }
        // If rent element doesn't exist in template, it won't be displayed (graceful handling)

  
        // Handle property details 
        const details = card.querySelector(".property-details");
        if (details) {
          // Clear any template placeholders like {traffic}, {address}, etc.
          details.innerHTML = "";

          const contentToAdd = [];
          if (property.traffic) {
            contentToAdd.push({ type: "text", value: property.traffic });
          }
          if (property.address) {
            contentToAdd.push({ type: "text", value: property.address });
          }
          if (property.area) {
            contentToAdd.push({ type: "text", value: property.area });
          }

          if (contentToAdd.length > 0) {
            contentToAdd.forEach((item, index) => {
              // Add the text node
              details.appendChild(document.createTextNode(item.value));

              // Add a <br> tag after each item except the last one
              if (index < contentToAdd.length - 1) {
                details.appendChild(document.createElement("br"));
              }
            });
            details.style.display = "block";
          } else {
            // Hide the details section if there is no content to show
            details.style.display = "none";
          }
        }
        // If property-details element doesn't exist in template, it won't be displayed (graceful handling)

        // Handle detail link - replace placeholder
        const link = card.querySelector(".property-detail-btn");
        if (link) {
          if (property.detailUrl && property.detailUrl.trim() !== "") {
            link.href = property.detailUrl;
            // Use text from container data attribute or default
            link.textContent =
              container.dataset.detailButtonText || "物件詳細を見る";
            link.style.display = "block";
          } else {
            link.style.display = "none";
          }
        }
        // If property-detail-btn element doesn't exist in template, it won't be displayed (graceful handling)

        return card.outerHTML;
      })
      .join("");

    return cardsHTML;
  }

  // Main function to render widget with data
  async function renderWidget(container) {
    try {
      // Get the template from HTML BEFORE clearing the container
      const template = container.querySelector(".property-card");
      if (!template) {
        console.error("Template not found in HTML");
        return;
      }

      // Store the template HTML for later use
      const templateHTML = template.outerHTML;

      // Show loading message
      const loadingMessage =
        container.dataset.loadingMessage || "物件を読み込み中...";
      container.innerHTML = `<p>${loadingMessage}</p>`;

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

      // Performance optimization: Check if we have a large dataset
      const isLargeDataset = properties.length > 100;
      const batchSize = isLargeDataset ? 50 : properties.length;

      // Add large dataset attribute for CSS optimizations
      if (isLargeDataset) {
        container.setAttribute("data-large-dataset", "true");
      }

      if (isLargeDataset) {
        // For large datasets, show progressive loading
        container.innerHTML = `
          <div class="properties-grid">
            <div class="property-cards"></div>
            <div class="loading-progress" style="text-align: center; padding: 2rem; color: #666;">
              Loading ${properties.length} properties... (0/${properties.length})
            </div>
          </div>
        `;

        const cardsContainer = container.querySelector(".property-cards");
        const progressElement = container.querySelector(".loading-progress");

        // Render in batches to prevent browser freezing
        for (let i = 0; i < properties.length; i += batchSize) {
          const cardsHTML = await renderPropertiesBatch(
            container,
            properties,
            templateHTML,
            i,
            batchSize
          );
          cardsContainer.insertAdjacentHTML("beforeend", cardsHTML);

          // Update progress
          const loaded = Math.min(i + batchSize, properties.length);
          progressElement.textContent = `Loading ${properties.length} properties... (${loaded}/${properties.length})`;

          // Allow browser to process other tasks
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Remove progress indicator
        progressElement.remove();
      } else {
        // For small datasets, render all at once
        const cardsHTML = await renderPropertiesBatch(
          container,
          properties,
          templateHTML,
          0,
          properties.length
        );
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

  // Expose the main function globally
  window.RalsWidget3 = {
    init,
    fetchPropertyData,
    processPropertyData,
    processProperties,
    renderWidget,
    renderPropertiesBatch,
    initAllWidgets,
  };

  // Don't auto-initialize - let the HTML handle it
  // if (document.readyState === 'loading') {
  //   document.addEventListener('DOMContentLoaded', init);
  // } else {
  //   init();
  // }
})();
