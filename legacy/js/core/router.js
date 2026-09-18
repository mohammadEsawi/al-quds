import { getActivePage } from '../utils/helpers.js';

export async function initPageModule() {
  const page = getActivePage();

  switch (page) {
    case 'home': {
      const { initHomePage } = await import('../pages/home.js');
      initHomePage();
      break;
    }
    case 'products': {
      const { initProductsPage } = await import('../pages/products.js');
      initProductsPage();
      break;
    }
    case 'contact': {
      const { initContactPage } = await import('../pages/contact.js');
      initContactPage();
      break;
    }
    case 'gallery': {
      const { initGallery } = await import('../components/gallery.js');
      initGallery();
      break;
    }
  }
}
