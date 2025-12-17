(function () {
    'use strict';

   

    // 会社の設定をウィジェットコンテナに適用する
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

    async function renderWidgetWithCompanyConfig(container) {
        applyCompanyConfig(container);

        // Use the core rendering function from RalsWidget3
        return await window.RalsWidget3.renderWidget(container);
    }

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
    function setCompanyConfig(newConfig) {
        Object.assign(COMPANY_CONFIG, newConfig);
    }

    // 関数をグローバルに公開する
    window.RalsWidgetRenderer = {
        renderWidget: renderWidgetWithCompanyConfig,
        initAllWidgets,
        setCompanyConfig,
        getConfig: () => COMPANY_CONFIG,
        applyCompanyConfig
    };

})();
