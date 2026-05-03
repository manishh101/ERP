const fs = require('fs');

let content = fs.readFileSync('scratch/product_data.ts', 'utf8');

const updates = [
  // Enamel Paint Items
  {
    find: /\{ name: "Dressing -Normal", size: "72x36x19"/,
    replace: (match) => match.replace('"72x36x19"', '"72x38x19"')
  },
  {
    find: /\{ name: "Three Door Almirah", size: "72x48x19"/,
    replace: (match) => match.replace('"72x48x19"', '"72x40x19"')
  },
  {
    find: /\{ name: "One Locker Office Almirah", size: "68x34x17"/,
    replace: (match) => match.replace('"68x34x17"', '"66x34x17"')
  },
  {
    find: /\{ name: "One Locker Office Almirah- HV", size: "68x34x17"/,
    replace: (match) => match.replace('"68x34x17"', '"66x34x17"')
  },
  {
    find: /\{ name: "One Locker Office Almirah - HV", size: "78x38x19"/,
    replace: (match) => match.replace('"78x38x19"', '"76x36x19"')
  },
  {
    find: /\{ name: "Filing Cabinet - 3 Drawer", size: "42x18x24", price: 16050,/,
    replace: (match) => match.replace('16050', '18050')
  },
  
  // Powder Coated Items
  {
    find: /\{ name: "Shreeman Shreemati - super", size: "72x42x19", price: 20800,/,
    replace: (match) => match.replace('20800', '26800')
  },
  {
    find: /\{ name: "Shreeman Shreemati - super", size: "72x42x19", price: 20300,/,
    replace: (match) => match.replace('20300', '29300')
  },
  {
    find: /\{ name: "Sansaar Model \(78\"\)", size: "78x38x20"/,
    replace: (match) => match.replace('"78x38x20"', '"78x36x20"')
  },
  {
    find: /\{ name: "Two Door Dressing", size: "72x38x19"/,
    replace: (match) => match.replace('"72x38x19"', '"72x36x19"')
  },
  {
    find: /\{ name: "Three Door One Locker One Drawer Mirror", size: "72x54x19", price: 28700,/,
    replace: (match) => match.replace('28700', '26700')
  },
  {
    find: /\{ name: "One Locker Office Almirah", size: "66x34x17", price: 12850,/,
    replace: (match) => match.replace('12850', '12950')
  },
  {
    find: /\{ name: "One Locker Office Almirah", size: "78x36x19"/,
    replace: (match) => match.replace('"78x36x19"', '"78x38x19"')
  },
  {
    find: /\{ name: "Single Table \(30\" x 48\"\)", size: "48x24x30", price: 9100, description: "3 drawer"/,
    replace: (match) => match.replace('9100', '8100')
  }
];

updates.forEach(u => {
  content = content.replace(u.find, u.replace);
});

fs.writeFileSync('scratch/product_data.ts', content, 'utf8');
console.log('product_data.ts updated');
