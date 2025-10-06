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

    // Performance optimization: Render properties in batches
    async function renderPropertiesBatch(container, properties, templateHTML, startIndex = 0, batchSize = 50) {
        const endIndex = Math.min(startIndex + batchSize, properties.length);
        const batch = properties.slice(startIndex, endIndex);
        
        const cardsHTML = batch.map(property => {
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
            
            // Handle property title - controlled by HTML template data attributes
            const title = card.querySelector('.property-title');
            if (title) {
                const showInTemplate = title.dataset.show === 'true';
                const fieldName = title.dataset.field;
                const shouldShow = showInTemplate && property.title && property.title.trim() !== '';
                
                if (shouldShow && fieldName === 'title') {
                    title.textContent = property.title;
                    title.style.display = 'block';
                } else {
                    title.style.display = 'none';
                }
            }
            
            // Handle rent price - controlled by HTML template data attributes
            const rent = card.querySelector('.property-rent');
            if (rent) {
                const showInTemplate = rent.dataset.show === 'true';
                const fieldName = rent.dataset.field;
                const shouldShow = showInTemplate && property.price && property.price.trim() !== '';
                
                if (shouldShow && fieldName === 'price') {
                    rent.textContent = property.price;
                    rent.style.display = 'block';
                } else {
                    rent.style.display = 'none';
                }
            }
            
            // Handle property details - controlled by HTML template data attributes
            const details = card.querySelector('.property-details');
            if (details) {
                const showInTemplate = details.dataset.show === 'true';
                const fieldsToShow = details.dataset.fields ? details.dataset.fields.split(',') : [];
                let detailsContent = '';
                
                if (showInTemplate && fieldsToShow.includes('traffic') && property.traffic && property.traffic.trim() !== '') {
                    detailsContent += `${property.traffic}<br>`;
                }
                if (showInTemplate && fieldsToShow.includes('address') && property.address && property.address.trim() !== '') {
                    detailsContent += `${property.address}<br>`;
                }
                if (showInTemplate && fieldsToShow.includes('area') && property.area && property.area.trim() !== '') {
                    detailsContent += property.area;
                }
                
                if (detailsContent.trim() !== '') {
                    details.innerHTML = detailsContent;
                    details.style.display = 'block';
                } else {
                    details.style.display = 'none';
                }
            }
            
            // Handle detail link - controlled by HTML template data attributes
            const link = card.querySelector('.property-detail-btn');
            if (link) {
                const showInTemplate = link.dataset.show === 'true';
                const fieldName = link.dataset.field;
                const shouldShow = showInTemplate && property.detailUrl && property.detailUrl.trim() !== '';
                
                if (shouldShow && fieldName === 'detailUrl') {
                    link.href = property.detailUrl;
                    link.textContent = COMPANY_CONFIG.texts.detailButtonText;
                    link.style.display = 'block';
                } else {
                    link.style.display = 'none';
                }
            }
            
            return card.outerHTML;
        }).join('');
        
        return cardsHTML;
    }

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
            let properties;
            try {
                properties = await window.RalsWidget3.fetchPropertyData(container);
            } catch (error) {
                console.error('Error fetching property data:', error);
                container.innerHTML = `<p>${COMPANY_CONFIG.texts.errorMessage}</p>`;
                return;
            }
            
            if (!properties || properties.length === 0) {
                container.innerHTML = `<p>${COMPANY_CONFIG.texts.noPropertiesMessage}</p>`;
                return;
            }
            
            // Add container class
            container.classList.add('rals-widget-container');
            
            // Performance optimization: Check if we have a large dataset
            const isLargeDataset = properties.length > 100;
            const batchSize = isLargeDataset ? 50 : properties.length;
            
            // Add large dataset attribute for CSS optimizations
            if (isLargeDataset) {
                container.setAttribute('data-large-dataset', 'true');
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
                
                const cardsContainer = container.querySelector('.property-cards');
                const progressElement = container.querySelector('.loading-progress');
                
                // Render in batches to prevent browser freezing
                for (let i = 0; i < properties.length; i += batchSize) {
                    const cardsHTML = await renderPropertiesBatch(container, properties, templateHTML, i, batchSize);
                    cardsContainer.insertAdjacentHTML('beforeend', cardsHTML);
                    
                    // Update progress
                    const loaded = Math.min(i + batchSize, properties.length);
                    progressElement.textContent = `Loading ${properties.length} properties... (${loaded}/${properties.length})`;
                    
                    // Allow browser to process other tasks
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                
                // Remove progress indicator
                progressElement.remove();
            } else {
                // For small datasets, render all at once
                const cardsHTML = await renderPropertiesBatch(container, properties, templateHTML, 0, properties.length);
                container.innerHTML = `
                    <div class="properties-grid">
                        <div class="property-cards">
                            ${cardsHTML}
                        </div>
                    </div>
                `;
            }
            
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
