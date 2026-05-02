const { enamelPaintProducts, powderCoatedProducts } = require('./product_data.ts');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

const templates = [
  ...enamelPaintProducts.map((p, i) => ({
    name: p.name + " (EP)",
    sku: "EP-" + slugify(p.name) + "-" + i,
    category: p.category,
    material: "Steel",
    color: "Enamel Paint",
    costPrice: Math.round(p.price * 0.7),
    sellingPrice: p.price,
    description: p.description,
    size: p.size
  })),
  ...powderCoatedProducts.map((p, i) => ({
    name: p.name + " (PC)",
    sku: "PC-" + slugify(p.name) + "-" + i,
    category: p.category,
    material: "Steel",
    color: "Powder Coated",
    costPrice: Math.round(p.price * 0.7),
    sellingPrice: p.price,
    description: p.description,
    size: p.size
  }))
];

console.log(JSON.stringify(templates, null, 2));
