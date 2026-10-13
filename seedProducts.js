const Product = require("./models/Product");

const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const marketProducts = [
  ["Echo wireless headphones", "Deep bass · 40 hour battery", 8499, 12999, "Electronics", "Tech Avenue", "photo-1505740420928-5e560c06d30e"],
  ["Nova smartwatch", "AMOLED display · fitness tracking", 11999, 16999, "Electronics", "Smart Life PK", "photo-1523275335684-37898b6baf30"],
  ["Portable Bluetooth speaker", "Water resistant · rich stereo sound", 4599, 6499, "Electronics", "Sound House", "photo-1608043152269-423dbba4e7e1"],
  ["Everyday leather tote", "Soft grain finish · room for everything", 3899, 5500, "Fashion", "Sunday Studio", "photo-1548036328-c9fa89d128fa"],
  ["Classic white sneakers", "Lightweight everyday comfort", 5799, 7999, "Fashion", "Street Form", "photo-1542291026-7eec264c27ff"],
  ["Linen blend shirt", "Relaxed fit · breathable fabric", 2799, 3999, "Fashion", "Thread & Co.", "photo-1598033129183-c4f50c736f10"],
  ["Stoneware coffee set", "Hand finished · set of two", 2499, 3499, "Home & Kitchen", "Clay Corner", "photo-1514228742587-6b1558fcca3d"],
  ["Minimal table lamp", "Warm ambient light · linen shade", 4299, 5999, "Home & Kitchen", "Room Edit", "photo-1507473885765-e6ed057f782c"],
  ["Cotton cushion covers", "Textured weave · set of two", 1499, 2200, "Home & Kitchen", "Soft Spaces", "photo-1584100936595-c0654b55a2e2"],
  ["Daily glow skincare set", "Gentle cleanser and hydrating serum", 3299, 4699, "Beauty", "Glow Lab", "photo-1608248543803-ba4f8c70ae0b"],
  ["Botanical perfume", "Fresh floral notes · 50 ml", 4599, 6200, "Beauty", "Scent Stories", "photo-1541643600914-78b084683601"],
  ["Silk touch hair brush", "Gentle detangling · all hair types", 1199, 1699, "Beauty", "Daily Ritual", "photo-1522335789203-aabd1fc54bc9"],
  ["Training yoga mat", "Non slip grip · includes carry strap", 2999, 4200, "Sports & Outdoors", "Move More", "photo-1544367567-0f2fcb009e0b"],
  ["Insulated travel bottle", "Keeps drinks cold for 24 hours", 1899, 2799, "Sports & Outdoors", "Trail Supply", "photo-1602143407151-7111542de6e8"],
  ["Weekend hiking backpack", "Lightweight · 28 litre capacity", 6499, 8900, "Sports & Outdoors", "Open Trail", "photo-1553062407-98eeb64c6a62"],
  ["Wooden building blocks", "60 piece creative play set", 2199, 2999, "Toys & Games", "Little Wonder", "photo-1599623560574-39d485900c95"],
  ["Family puzzle night", "1000 piece illustrated puzzle", 1499, 2100, "Toys & Games", "Playroom", "photo-1704027689069-747471f0a40a"],
  ["Kids art starter kit", "Colour pencils · sketchbook · paints", 1799, 2599, "Toys & Games", "Make & Play", "photo-1513364776144-60967b0f800f"],
  ["The quiet garden", "A thoughtful guide to growing at home", 1299, 1800, "Books", "Paper House", "photo-1544947950-fa07a98d237f"],
  ["Stories from the sea", "Illustrated hardback · 240 pages", 1599, 2200, "Books", "Paper House", "photo-1512820790803-83ca734da794"],
  ["The little recipe journal", "Write down the meals you love", 899, 1300, "Books", "Good Reads", "photo-1543002588-bfa74002ed7e"],
  ["Compact car care kit", "Interior and exterior cleaning essentials", 2599, 3700, "Automotive", "Road Ready", "photo-1486262715619-67b85e0b08d3"],
  ["Magnetic phone mount", "One hand fitting · strong dashboard grip", 1199, 1799, "Automotive", "Drive Daily", "photo-1503376780353-7e6692767b70"],
  ["LED emergency torch", "USB rechargeable · compact glovebox size", 999, 1499, "Automotive", "Road Ready", "photo-1506617420156-8e4536971650"],
  ["Artisan tea discovery box", "Six loose leaf favourites · 120 g", 1699, 2400, "Grocery", "Leaf & Kettle", "photo-1544787219-7f47ccb76574"],
  ["Single origin coffee", "Freshly roasted · medium profile · 250 g", 1399, 1900, "Grocery", "Morning Ritual", "photo-1447933601403-0c6688de566e"],
  ["Raw honey gift jar", "Small batch · wildflower honey · 500 g", 1299, 1800, "Grocery", "Bee Kind", "photo-1587049352851-8d4e89133924"],
  ["Classic field watch", "Japanese quartz · brushed steel case", 8499, 11999, "Watches", "Atelier Horloger", "photo-1523275335684-37898b6baf30"],
  ["Automatic dress watch", "Exhibition back · sapphire crystal", 22999, 29999, "Watches", "Atelier Horloger", "photo-1524805444758-089113d48a6d"],
  ["Slim everyday watch", "Minimal dial · genuine leather strap", 6999, 9500, "Watches", "Atelier Horloger", "photo-1508685096489-7aacd43bd3b1"],
];

const seedProducts = marketProducts.map(([name, description, price, compareAtPrice, category, storeName, image]) => ({
  name, description, price, compareAtPrice, category, storeName, image: photo(image), stock: 8 + (name.length % 18), featured: compareAtPrice > price * 1.3,
}));

const originalWatchPrices = new Map([
  ["The Meridian", [680, 189000]], ["No. 04 Chronograph", [540, 149000]],
  ["The Field Notes", [395, 109000]], ["Atelier No. 08", [890, 249000]],
  ["The Grand Tour", [760, 209000]], ["Sunday, Always", [460, 129000]],
]);

async function seedProductsIfEmpty() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(seedProducts);
    console.log(`Seeded ${seedProducts.length} marketplace products`);
    return;
  }

  for (const [name, [oldPrice, newPrice]] of originalWatchPrices) {
    await Product.collection.updateOne({ name, price: oldPrice }, { $set: { price: newPrice } });
  }

  // Repair the image on existing seeded records without overwriting seller edits.
  await Product.collection.updateOne(
    { name: "Family puzzle night", image: photo("photo-1606503153255-59d8b8b8218b") },
    { $set: { image: photo("photo-1704027689069-747471f0a40a") } },
  );

  const existingNames = await Product.distinct("name");
  const knownNames = new Set(existingNames);
  const missingProducts = seedProducts.filter((product) => !knownNames.has(product.name));
  if (missingProducts.length) {
    await Product.insertMany(missingProducts);
    console.log(`Added ${missingProducts.length} marketplace products to the catalog`);
  }
}

module.exports = { seedProductsIfEmpty };
