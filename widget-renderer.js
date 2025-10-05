// Widget Renderer - Handles complex data fetching and rendering logic
(function() {
    'use strict';

    // Main function to render widget with data
    async function renderWidget(container) {
        try {
            // Get the template from HTML BEFORE clearing the container
            const template = container.querySelector('.property-card');
            if (!template) {
                console.error('Template not found in HTML');
                return;
            }
            
            // Store the template HTML for later use
            const templateHTML = template.outerHTML;
            
            // Show loading message
            container.innerHTML = '<p>物件を読み込み中...</p>';
            
            // Fetch property data using the widget
            const properties = await window.RalsWidget3.fetchPropertyData(container);
            
            if (!properties || properties.length === 0) {
                container.innerHTML = '<p>No properties found.</p>';
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
                            
                            // Handle image with fallback
                            const img = card.querySelector('.property-img');
                            if (img) {
                                if (property.thumbnailUrl && property.thumbnailUrl.trim() !== '') {
                                    img.src = property.thumbnailUrl;
                                } else {
                                    img.src = 'https://ralsnet.example.formatline.com/app/plugins/wp-rengodb/assets/img/noimg.png';
                                }
                                img.alt = property.title || 'Property Image';
                            }
                            
                            // Handle rent price - only show if available
                            const rent = card.querySelector('.property-rent');
                            if (rent) {
                                if (property.price && property.price.trim() !== '') {
                                    rent.textContent = property.price;
                                    rent.style.display = 'block';
                                } else {
                                    rent.style.display = 'none';
                                }
                            }
                            
                            // Handle property details - only show if available
                            const details = card.querySelector('.property-details');
                            if (details) {
                                let detailsContent = '';
                                
                                if (property.traffic && property.traffic.trim() !== '') {
                                    detailsContent += `${property.traffic}<br>`;
                                }
                                if (property.address && property.address.trim() !== '') {
                                    detailsContent += `${property.address}<br>`;
                                }
                                if (property.area && property.area.trim() !== '') {
                                    detailsContent += property.area;
                                }
                                
                                if (detailsContent.trim() !== '') {
                                    details.innerHTML = detailsContent;
                                    details.style.display = 'block';
                                } else {
                                    details.style.display = 'none';
                                }
                            }
                            
                            // Handle detail link - only show if available
                            const link = card.querySelector('.property-detail-btn');
                            if (link) {
                                if (property.detailUrl && property.detailUrl.trim() !== '') {
                                    link.href = property.detailUrl;
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
            container.innerHTML = '<p>物件情報の読み込みに失敗しました。しばらくしてから再度お試しください。</p>';
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

    // Expose renderWidget function globally for manual use
    window.RalsWidgetRenderer = {
        renderWidget,
        initAllWidgets
    };

})();
