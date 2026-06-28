import { $, $$ } from '../utils/helpers.js';
import { fetchJSON } from '../utils/helpers.js';

export async function initProductsPage() {
  const grid = $('.products__grid');
  const filtersContainer = $('.products__filters');

  if (!grid) return;

  try {
    const products = await fetchJSON('/data/products.json');
    renderProducts(grid, products);
    initFilters(filtersContainer, grid, products);
  } catch {
    renderFallbackProducts(grid);
  }
}

function renderProducts(grid, products) {
  grid.innerHTML = products.map(product => `
    <article class="product-card reveal reveal--fade-up" data-category="${product.category}">
      <div class="product-card__image">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        ${product.tag ? `<span class="product-card__tag">${product.tag}</span>` : ''}
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${product.category}</span>
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__desc">${product.description}</p>
        ${product.sizes ? `
          <div class="product-card__sizes">
            ${product.sizes.map(size => `<span class="product-card__size">${size}</span>`).join('')}
          </div>
        ` : ''}
        <div class="product-card__footer">
          <a href="#" class="card__link">
            اعرف المزيد
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </article>
  `).join('');
}

function initFilters(container, grid, products) {
  if (!container) return;

  const categories = ['الكل', ...new Set(products.map(p => p.category))];
  container.innerHTML = categories.map((cat, i) => `
    <button class="products__filter ${i === 0 ? 'products__filter--active' : ''}"
            data-filter="${cat}">
      ${cat}
    </button>
  `).join('');

  $$('.products__filter', container).forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.products__filter', container).forEach(b => b.classList.remove('products__filter--active'));
      btn.classList.add('products__filter--active');

      const filter = btn.dataset.filter;
      $$('.product-card', grid).forEach(card => {
        const match = filter === 'الكل' || card.dataset.category === filter;
        card.style.display = match ? '' : 'none';
      });
    });
  });
}

function renderFallbackProducts(grid) {
  grid.innerHTML = '<p class="text-center text-secondary">المنتجات قريباً.</p>';
}
