(function () {
  function loadCSS() {
    return;
  }

  // Format price in 万 format with comma-separated remainder
  function formatPrice(price) {
    if (!price) return '価格未定';

    const man = Math.floor(price / 10000);
    const remainder = price % 10000;

    if (remainder === 0) {
      return `${man}万円`;
    } else {
      // Format remainder with commas
      const formattedRemainder = remainder.toLocaleString('ja-JP');
      return `${man}万${formattedRemainder}円`;
    }
  }

  // Format area in 坪 (tsubo) format like uchiike
  function formatArea(area) {
    if (!area) return '';

    // Convert from square meters to tsubo (坪)
    // 1 tsubo = 3.30579 square meters
    const tsubo = area / 3.30579;
    const roundedTsubo = Math.round(tsubo * 10) / 10; // Round to 1 decimal place

    return `${roundedTsubo}坪(${area}㎡)`;
  }

  // Get traffic information from jsonTraffic field (like uchiike does)
  function getTrafficInfo(item) {
    if (item.jsonTraffic && Array.isArray(item.jsonTraffic) && item.jsonTraffic.length > 0) {
      // Sort by walking time to get the closest station first
      const sortedTraffic = item.jsonTraffic
        .filter(traffic => traffic.transport_min_station !== null || traffic.transport_min_bus !== null)
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
    if (item.trafficDataStr && item.trafficDataStr.trim() !== '') {
      const trafficItems = item.trafficDataStr.split(' / ');
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

    return '';
  }

  // Get address in the same format as uchiike
  function getAddress(item) {
    const addressParts = [];
    if (item.area1Name) addressParts.push(item.area1Name);
    if (item.area2Name) addressParts.push(item.area2Name);
    if (item.area3Name) addressParts.push(item.area3Name);
    if (item.area4) addressParts.push(item.area4);
    return addressParts.join('');
  }

  // Process property data and return structured data object
  function processPropertyData(item, detailBaseUrl, imageBaseUrl) {
    // Validate required fields - return null for invalid data instead of throwing
    if (!item.buildingName) {
      console.warn('物件をスキップ: Building Name がありません', item);
      return null;
    }
    if (!item.buildingMasterId) {
      console.warn('物件をスキップ: Building Master ID がありません', item);
      return null;
    }
    if (!item.supplierId) {
      console.warn('物件をスキップ: Supplier ID がありません', item);
      return null;
    }
    if (!item.buildingId) {
      console.warn('物件をスキップ: Building ID がありません', item);
      return null;
    }
    if (!item.propertyId) {
      console.warn('物件をスキップ: Property ID がありません', item);
      return null;
    }

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
    else if (item.delegateImg && item.delegateImg > 0) {
      const imageNumber = item.delegateImg;
      const adjustedNumber = Math.max(1, imageNumber - 1);
      const propertyImage = item.propertyImages?.find(img => img.number === imageNumber);
      if (propertyImage && propertyImage.category === 'layout') {
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
      const selectedImage = item.images.find(img => img.category === 'exterior') || item.images[0];
      if (selectedImage) {
        const imageNumber = selectedImage.number;
        const category = selectedImage.category;
        if (category === 'exterior') {
          if (imageNumber === 1) {
            thumbnailUrl = `${imageBaseUrl}${supplierId}/c-${supplierId}-${buildingId}-g.jpg`;
          } else {
            const adjustedNumber = imageNumber - 1;
            thumbnailUrl = `${imageBaseUrl}${supplierId}/c-${supplierId}-${buildingId}-${adjustedNumber}.jpg`;
          }
        } else if (category === 'layout') {
          if (imageNumber === 1) {
            thumbnailUrl = `${imageBaseUrl}${supplierId}/r-${supplierId}-${propertyId}-m.jpg`;
          } else {
            const adjustedNumber = imageNumber - 1;
            thumbnailUrl = `${imageBaseUrl}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
          }
        } else {
          const adjustedNumber = Math.max(1, imageNumber - 1);
          thumbnailUrl = `${imageBaseUrl}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
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
      thumbnailUrl
    };
  }

  // Process all properties and return array of processed data
  function processProperties(list, detailBaseUrl, imageBaseUrl) {
    if (!list || !list.length) {
      return [];
    }
    // Filter out null values (invalid properties) and only return valid ones
    return list
      .map(item => processPropertyData(item, detailBaseUrl, imageBaseUrl))
      .filter(item => item !== null);
  }

  // Main function to fetch and return processed property data
  async function fetchPropertyData(container) {
    // Validate required data attributes
    if (!container.dataset.api) {
      throw new Error('API base URL is required. Set data-api attribute.');
    }
    if (!container.dataset.detailUrl) {
      throw new Error('Detail page base URL is required. Set data-detailUrl attribute.');
    }
    if (!container.dataset.imageBaseUrl) {
      throw new Error('Image base URL is required. Set data-imageBaseUrl attribute.');
    }
    
    const apiBase = container.dataset.api;
    const detailBaseUrl = container.dataset.detailUrl;
    const imageBaseUrl = container.dataset.imageBaseUrl;
    
    let url;
    
    // Check if data-query is provided for custom query parameters
    if (container.dataset.query) {
      // Use custom query string
      url = `${apiBase}?${container.dataset.query}`;
    } else {
      // Use individual data attributes (backward compatibility)
      if (!container.dataset.supplier) {
        throw new Error('Supplier ID is required. Set data-supplier attribute.');
      }
      if (!container.dataset.prop) {
        throw new Error('Property type is required. Set data-prop attribute.');
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
        console.error(`APIエラー: ステータス ${response.status} が返されました。`);
        return []; // Return empty array instead of throwing
      }
      
      const data = await response.json();
      const processedData = processProperties(data, detailBaseUrl, imageBaseUrl);
      
      // Log if we filtered out any invalid properties
      if (data && data.length > processedData.length) {
        console.warn(`Filtered out ${data.length - processedData.length} invalid properties from ${data.length} total properties`);
      }
      
      return processedData;
    } catch (error) {
      console.error('物件情報の読み込みに失敗しました:', error);
      return []; // Return empty array instead of throwing to prevent widget crash
    }
  }

  // Initialize widget - returns data instead of rendering HTML
  function init() {
    loadCSS();
    
    // Return a promise that resolves with property data for each container
    return Promise.all(
      document.querySelectorAll('.rals-widget').map(async (container) => {
        // Validate required data attributes before processing
        if (!container.dataset.api) {
          throw new Error('API base URL is required. Set data-api attribute.');
        }
        if (!container.dataset.detailUrl) {
          throw new Error('Detail page base URL is required. Set data-detailUrl attribute.');
        }
        if (!container.dataset.imageBaseUrl) {
          throw new Error('Image base URL is required. Set data-imageBaseUrl attribute.');
        }

        const customColor = container.dataset.color;
        const customHoverColor = container.dataset.hoverColor;
        const customCardBg = container.dataset.cardBg;

        if (customColor) {
          container.style.setProperty('--rals-main-color', customColor);
        }
        if (customHoverColor) {
          container.style.setProperty('--rals-hover-color', customHoverColor);
        }
        if (customCardBg) {
          container.style.setProperty('--rals-card-bg', customCardBg);
        }

        try {
          const propertyData = await fetchPropertyData(container);
          return {
            container,
            data: propertyData
          };
        } catch (error) {
          return {
            container,
            data: [],
            error: error.message
          };
        }
      })
    );
  }

  // Expose the main function globally
  window.RalsWidget3 = {
    init,
    fetchPropertyData,
    processPropertyData,
    processProperties
  };

  // Don't auto-initialize - let the HTML handle it
  // if (document.readyState === 'loading') {
  //   document.addEventListener('DOMContentLoaded', init);
  // } else {
  //   init();
  // }
})();
