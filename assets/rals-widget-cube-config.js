(function() {
    'use strict';

    const COMPANY_CONFIG = {
        apiBaseUrl: 'https://ralsnet.example.formatline.com/wp-json/rengodb/v1/search-properties',
        detailPageBaseUrl: 'https://ralsnet.example.formatline.com/property/',
        imageBaseUrl: 'https://pic.cbiz.ne.jp/pic/',
        fallbackImageUrl: 'https://ralsnet.example.formatline.com/app/plugins/wp-rengodb/assets/img/noimg.png',
 
        
        // Custom Styling
        customColors: {
            mainColor: '#e74c3c',
            hoverColor: '#e55a2b',
            cardBg: 'white'
        },
        
        // Text Customization
        texts: {
            loadingMessage: '物件を読み込み中...',
            noPropertiesMessage: '物件が見つかりません。',
            errorMessage: '物件情報の読み込みに失敗しました。しばらくしてから再度お試しください。',
            detailButtonText: '物件詳細を見る'
        }
    };

    // Apply company configuration to a widget container
    function applyCompanyConfig(container) {
        if (!container.dataset.api) {
            container.dataset.api = COMPANY_CONFIG.apiBaseUrl;
        }
        if (!container.dataset.detailUrl) {
            container.dataset.detailUrl = COMPANY_CONFIG.detailPageBaseUrl;
        }
        if (!container.dataset.imageBaseUrl) {
            container.dataset.imageBaseUrl = COMPANY_CONFIG.imageBaseUrl;
        }
        if (!container.dataset.fallbackImageUrl) {
            container.dataset.fallbackImageUrl = COMPANY_CONFIG.fallbackImageUrl;
        }

        if (!container.dataset.loadingMessage) {
            container.dataset.loadingMessage = COMPANY_CONFIG.texts.loadingMessage;
        }
        if (!container.dataset.noPropertiesMessage) {
            container.dataset.noPropertiesMessage = COMPANY_CONFIG.texts.noPropertiesMessage;
        }
        if (!container.dataset.errorMessage) {
            container.dataset.errorMessage = COMPANY_CONFIG.texts.errorMessage;
        }
        if (!container.dataset.detailButtonText) {
            container.dataset.detailButtonText = COMPANY_CONFIG.texts.detailButtonText;
        }
   
        if (COMPANY_CONFIG.customColors.mainColor) {
            container.style.setProperty('--rals-main-color', COMPANY_CONFIG.customColors.mainColor);
        }
        if (COMPANY_CONFIG.customColors.hoverColor) {
            container.style.setProperty('--rals-hover-color', COMPANY_CONFIG.customColors.hoverColor);
        }
        if (COMPANY_CONFIG.customColors.cardBg) {
            container.style.setProperty('--rals-card-bg', COMPANY_CONFIG.customColors.cardBg);
        }
    }

    // Enhanced render widget function that applies company config first
    async function renderWidgetWithCompanyConfig(container) {
        // Apply company-specific configuration
        applyCompanyConfig(container);
        
        // Use the core rendering function from RalsWidget3
        return await window.RalsWidget3.renderWidget(container);
    }

    // Auto-initialize all widgets when DOM is ready
    function initAllWidgets() {
        const containers = document.querySelectorAll('.rals-widget');
        containers.forEach(container => {
            renderWidgetWithCompanyConfig(container);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllWidgets);
    } else {
        initAllWidgets();
    }

    // Function to override configuration for different companies
    function setCompanyConfig(newConfig) {
        Object.assign(COMPANY_CONFIG, newConfig);
    }

    // Expose functions globally
    window.RalsWidgetRenderer = {
        renderWidget: renderWidgetWithCompanyConfig,
        initAllWidgets,
        setCompanyConfig,
        getConfig: () => COMPANY_CONFIG,
        applyCompanyConfig
    };

})();
