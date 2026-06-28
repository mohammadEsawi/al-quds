import { $, $$ } from '../utils/helpers.js';
import { fetchJSON } from '../utils/helpers.js';

export async function initProductsPage() {
  const grid = $('.products__grid');
  if (!grid) return;

  try {
    const products = await fetchJSON('/data/products.json');
    renderProducts(grid, products);
  } catch {
    grid.innerHTML = '<p class="text-center text-secondary">المنتجات قريباً.</p>';
  }
}

function renderProducts(grid, products) {
  grid.innerHTML = products.map(product => `
    <article class="product-card reveal reveal--fade-up" data-category="مياه شرب">
      <div class="product-card__image">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        ${product.tag ? `<span class="product-card__tag">${product.tag}</span>` : ''}
      </div>
      <div class="product-card__body">
        <span class="product-card__category">مياه شرب معبأة</span>
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__desc">${product.description}</p>
        <div class="product-card__sizes">
          <span class="product-card__size">${product.size}</span>
        </div>
      </div>
    </article>
  `).join('');
}
