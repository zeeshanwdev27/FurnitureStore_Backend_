const sampleProducts = [
  // Sofas
  {
    name: "Modern Gray Sofa",
    description: "Comfortable 3-seater modern sofa with premium fabric.",
    price: 347.99,
    image: {
      url: "https://m.media-amazon.com/images/I/71Agxv80+fL._AC_SX679_.jpg",
      filename: "gray-sofa.jpg"
    },
    category: "Sofas"
  },
  {
    name: "L-Shaped Sectional",
    description: "Spacious L-shaped sectional perfect for large living rooms.",
    price: 799.99,
    image: {
      url: "https://m.media-amazon.com/images/I/51QyiDR4ZML._AC_SX679_.jpg",
      filename: "sectional-sofa.jpg"
    },
    category: "Sofas"
  },
  {
    name: "Vintage Leather Sofa",
    description: "Classic 2-seater leather sofa with a vintage look.",
    price: 1629.99,
    image: {
      url: "https://m.media-amazon.com/images/I/816LF8QgkOL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "leather-sofa.jpg"
    },
    category: "Sofas"
  },
  {
    name: "Sleeper Sofa Bed",
    description: "Convertible sofa bed for small apartments.",
    price: 549.99,
    image: {
      url: "https://m.media-amazon.com/images/I/915kp3br1TL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "sleeper-sofa.jpg"
    },
    category: "Sofas"
  },
  {
    name: "Recliner Sofa",
    description: "Plush recliner sofa with adjustable backrests.",
    price: 699.99,
    image: {
      url: "https://m.media-amazon.com/images/I/71Z53c4fDtL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "recliner-sofa.jpg"
    },
    category: "Sofas"
  },

  // Chairs
  {
    name: "Wooden Dining Chair",
    description: "Classic oak dining chair with padded seat.",
    price: 126.99,
    image: {
      url: "https://m.media-amazon.com/images/I/61zygvkB+dL._AC_SX679_.jpg",
      filename: "dining-chair.jpg"
    },
    category: "Chairs"
  },
  {
    name: "Office Ergonomic Chair",
    description: "Adjustable mesh back office chair with lumbar support.",
    price: 36.98,
    image: {
      url: "https://m.media-amazon.com/images/I/716tq9Y8WOL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "office-chair.jpg"
    },
    category: "Chairs"
  },
  {
    name: "Navy Blue Accent Armchair",
    description: "Stylish armchair with tufted back and wooden legs.",
    price: 156.99,
    image: {
      url: "https://m.media-amazon.com/images/I/71h0dBpnDRL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "accent-chair.jpg"
    },
    category: "Chairs"
  },
  {
    name: "Rocking Chair",
    description: "Traditional wooden rocking chair for indoor use.",
    price: 89.99,
    image: {
      url: "https://m.media-amazon.com/images/I/61xVp6jUvmL._AC_SX679_.jpg",
      filename: "rocking-chair.jpg"
    },
    category: "Chairs"
  },
  {
    name: "Lounge Chair",
    description: "Contemporary fabric lounge chair with curved design.",
    price: 68.29,
    image: {
      url: "https://m.media-amazon.com/images/I/61HuraGElsL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "lounge-chair.jpg"
    },
    category: "Chairs"
  },

  // Tables
  {
    name: "Wooden Coffee Table",
    description: "Rustic coffee table with solid pinewood top.",
    price: 61.99,
    image: {
      url: "https://m.media-amazon.com/images/I/71EnvG1FKAL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "coffee-table.jpg"
    },
    category: "Tables"
  },
  {
    name: "Dining Table Set",
    description: "6-seater dining table with matching chairs.",
    price: 169.99,
    image: {
      url: "https://m.media-amazon.com/images/I/61AFXRTCuFL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "dining-table.jpg"
    },
    category: "Tables"
  },
  {
    name: "Round Side Table",
    description: "Compact round table perfect for living rooms.",
    price: 35.59,
    image: {
      url: "https://m.media-amazon.com/images/I/71nIh7HupvL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "side-table.jpg"
    },
    category: "Tables"
  },
  {
    name: "Work Desk",
    description: "Spacious study desk with drawers and shelves.",
    price: 21.59,
    image: {
      url: "https://m.media-amazon.com/images/I/71n6HWe0rmL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "work-desk.jpg"
    },
    category: "Tables"
  },
  {
    name: "Wide Rectangular Glass Console Table",
    description: "Sleek console table with tempered glass top.",
    price: 170.78,
    image: {
      url: "https://m.media-amazon.com/images/I/61E7A4RyfgL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      filename: "console-table.jpg"
    },
    category: "Tables"
  }
];

export default { data: sampleProducts };
