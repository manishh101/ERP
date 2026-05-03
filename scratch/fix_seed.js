const fs = require('fs');

let content = fs.readFileSync('server/prisma/seed.ts', 'utf8');

const updates = [
  // Enamel Paint Items
  {
    find: /"name": "Dressing -Normal \(EP\)",[\s\S]*?"size": "72x36x19"/,
    replace: (match) => match.replace('"72x36x19"', '"72x38x19"')
  },
  {
    find: /"name": "Three Door Almirah \(EP\)",[\s\S]*?"size": "72x48x19"/,
    replace: (match) => match.replace('"72x48x19"', '"72x40x19"')
  },
  {
    find: /"name": "One Locker Office Almirah \(EP\)",[\s\S]*?"size": "68x34x17"/,
    replace: (match) => match.replace('"68x34x17"', '"66x34x17"')
  },
  {
    find: /"name": "One Locker Office Almirah- HV \(EP\)",[\s\S]*?"size": "68x34x17"/,
    replace: (match) => match.replace('"68x34x17"', '"66x34x17"')
  },
  {
    find: /"name": "One Locker Office Almirah - HV \(EP\)",[\s\S]*?"size": "78x38x19"/,
    replace: (match) => match.replace('"78x38x19"', '"76x36x19"')
  },
  {
    find: /"name": "Filing Cabinet - 3 Drawer \(EP\)",[\s\S]*?"sellingPrice": 16050,/,
    replace: (match) => match.replace('16050', '18050').replace('12038', '13537')
  },
  
  // Powder Coated Items
  {
    find: /"name": "Shreeman Shreemati - super \(PC\)",[\s\S]*?"sellingPrice": 20800,/,
    replace: (match) => match.replace('20800', '26800').replace('15600', '20100')
  },
  {
    find: /"name": "Shreeman Shreemati - super \(PC\)",[\s\S]*?"sellingPrice": 20300,/,
    replace: (match) => match.replace('20300', '29300').replace('15225', '21975')
  },
  {
    find: /"name": "Sansaar Model \(78\"\) \(PC\)",[\s\S]*?"size": "78x38x20"/,
    replace: (match) => match.replace('"78x38x20"', '"78x36x20"')
  },
  {
    find: /"name": "Two Door Dressing \(PC\)",[\s\S]*?"size": "72x38x19"/,
    replace: (match) => match.replace('"72x38x19"', '"72x36x19"')
  },
  {
    find: /"name": "Three Door One Locker One Drawer Mirror \(PC\)",[\s\S]*?"sellingPrice": 28700,/,
    replace: (match) => match.replace('28700', '26700').replace('21525', '20025')
  },
  {
    find: /"name": "One Locker Office Almirah \(PC\)",[\s\S]*?"sellingPrice": 12850,/,
    replace: (match) => match.replace('12850', '12950').replace('9638', '9712')
  },
  {
    find: /"name": "One Locker Office Almirah \(PC\)",[\s\S]*?"size": "78x36x19"/,
    replace: (match) => match.replace('"78x36x19"', '"78x38x19"')
  },
  {
    find: /"name": "Single Table \(30\" x 48\"\) \(PC\)",[\s\S]*?"description": "3 drawer",[\s\S]*?"size": "48x24x30"/,
    replace: (match) => match.replace('9100', '8100').replace('6825', '6075')
  }
];

updates.forEach(u => {
  content = content.replace(u.find, u.replace);
});

fs.writeFileSync('server/prisma/seed.ts', content, 'utf8');
console.log('Seed file updated');
