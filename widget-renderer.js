// Widget Renderer - Handles complex data fetching and rendering logic
// Company-wise configuration system
(function() {
    'use strict';

    // COMPANY CONFIGURATION - Adjust these settings per company
    const COMPANY_CONFIG = {
        // API Configuration
        apiBaseUrl: 'https://ralsnet.example.formatline.com/wp-json/rengodb/v1/search-properties',
        detailPageBaseUrl: 'https://ralsnet.example.formatline.com/property/',
        imageBaseUrl: 'https://pic.cbiz.ne.jp/pic/',
        fallbackImageUrl: 'https://ralsnet.example.formatline.com/app/plugins/wp-rengodb/assets/img/noimg.png',
        
        // Default Query Parameters
        defaultSupplier: '1370',
        defaultProp: '2',
        defaultLimit: '16',
        
        // Display Configuration
        showPrice: true,
        showTraffic: true,
        showAddress: true,
        showArea: true,
        showDetailButton: true,
        
        // Custom Styling
        customColors: {
            mainColor: '#e74c3c',
            hoverColor: '#e55a2b',
            cardBg: 'white'
        },
        
        // Text Customization
        texts: {
            loadingMessage: '物件を読み込み中...',
            noPropertiesMessage: 'No properties found.',
            errorMessage: '物件情報の読み込みに失敗しました。しばらくしてから再度お試しください。',
            detailButtonText: '物件詳細を見る'
        }
    };

    // Main function to render widget with data
    async function renderWidget(container) {
        try {
            // Set data attributes from company configuration if not already set
            if (!container.dataset.api) {
                container.dataset.api = COMPANY_CONFIG.apiBaseUrl;
            }
            if (!container.dataset.detailUrl) {
                container.dataset.detailUrl = COMPANY_CONFIG.detailPageBaseUrl;
            }
            if (!container.dataset.imageBaseUrl) {
                container.dataset.imageBaseUrl = COMPANY_CONFIG.imageBaseUrl;
            }
            
            // Get the template from HTML BEFORE clearing the container
            const template = container.querySelector('.property-card');
            if (!template) {
                console.error('Template not found in HTML');
                return;
            }
            
            // Store the template HTML for later use
            const templateHTML = template.outerHTML;
            
            // Show loading message using config
            container.innerHTML = `<p>${COMPANY_CONFIG.texts.loadingMessage}</p>`;
            
            // Apply custom styling from config
            if (COMPANY_CONFIG.customColors.mainColor) {
                container.style.setProperty('--rals-main-color', COMPANY_CONFIG.customColors.mainColor);
            }
            if (COMPANY_CONFIG.customColors.hoverColor) {
                container.style.setProperty('--rals-hover-color', COMPANY_CONFIG.customColors.hoverColor);
            }
            if (COMPANY_CONFIG.customColors.cardBg) {
                container.style.setProperty('--rals-card-bg', COMPANY_CONFIG.customColors.cardBg);
            }
            
            // Fetch property data using the widget
            const properties = await window.RalsWidget3.fetchPropertyData(container);
            
            if (!properties || properties.length === 0) {
                container.innerHTML = `<p>${COMPANY_CONFIG.texts.noPropertiesMessage}</p>`;
                return;
            }
            
            // Add container class
            container.classList.add('rals-widget-container');
            
            // Recreate the structure
            container.innerHTML = `
                <div class="properties-grid">
                    <div class="property-cards">
                        ${properties.map(property => {
                            // Create a temporary div to parse the template
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = templateHTML;
                            const card = tempDiv.firstElementChild;
                            
                            // Handle image with fallback using config
                            const img = card.querySelector('.property-img');
                            if (img) {
                                if (property.thumbnailUrl && property.thumbnailUrl.trim() !== '') {
                                    img.src = property.thumbnailUrl;
                                } else {
                                    img.src = COMPANY_CONFIG.fallbackImageUrl;
                                }
                                img.alt = property.title || 'Property Image';
                            }
                            
                            // Handle rent price - only show if available and enabled in config
                            const rent = card.querySelector('.property-rent');
                            if (rent) {
                                if (COMPANY_CONFIG.showPrice && property.price && property.price.trim() !== '') {
                                    rent.textContent = property.price;
                                    rent.style.display = 'block';
                                } else {
                                    rent.style.display = 'none';
                                }
                            }
                            
                            // Handle property details - only show if available and enabled in config
                            const details = card.querySelector('.property-details');
                            if (details) {
                                let detailsContent = '';
                                
                                if (COMPANY_CONFIG.showTraffic && property.traffic && property.traffic.trim() !== '') {
                                    detailsContent += `${property.traffic}<br>`;
                                }
                                if (COMPANY_CONFIG.showAddress && property.address && property.address.trim() !== '') {
                                    detailsContent += `${property.address}<br>`;
                                }
                                if (COMPANY_CONFIG.showArea && property.area && property.area.trim() !== '') {
                                    detailsContent += property.area;
                                }
                                
                                if (detailsContent.trim() !== '') {
                                    details.innerHTML = detailsContent;
                                    details.style.display = 'block';
                                } else {
                                    details.style.display = 'none';
                                }
                            }
                            
                            // Handle detail link - only show if available and enabled in config
                            const link = card.querySelector('.property-detail-btn');
                            if (link) {
                                if (COMPANY_CONFIG.showDetailButton && property.detailUrl && property.detailUrl.trim() !== '') {
                                    link.href = property.detailUrl;
                                    link.textContent = COMPANY_CONFIG.texts.detailButtonText;
                                    link.style.display = 'block';
                                } else {
                                    link.style.display = 'none';
                                }
                            }
                            
                            return card.outerHTML;
                        }).join('')}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading properties:', error);
            container.innerHTML = `<p>${COMPANY_CONFIG.texts.errorMessage}</p>`;
        }
    }

    // Auto-initialize all widgets when DOM is ready
    function initAllWidgets() {
        const containers = document.querySelectorAll('.rals-widget');
        containers.forEach(container => {
            renderWidget(container);
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

    // Expose functions globally for manual use
    window.RalsWidgetRenderer = {
        renderWidget,
        initAllWidgets,
        setCompanyConfig,
        getConfig: () => COMPANY_CONFIG
    };

})();
