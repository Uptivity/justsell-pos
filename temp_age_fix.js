const fs = require('fs');

// Read the original file
let content = fs.readFileSync('src/tests/unit/services/ageVerification.test.ts', 'utf8');

// Replace all the Date mocking patterns
content = content.replace(
  /const mockToday = new Date\('([^']+)'\)\s+jest\.spyOn\(global, 'Date'\)\.mockImplementation\(\(\) => mockToday\)/g,
  "const mockToday = new Date('$1')\n      const OriginalDate = Date\n      global.Date = class extends Date {\n        constructor(dateString) {\n          if (dateString) {\n            super(dateString)\n          } else {\n            super(mockToday)\n          }\n        }\n        static now() { return mockToday.getTime() }\n      }"
);

content = content.replace(/global\.Date\.mockRestore\(\)/g, "global.Date = OriginalDate");

// Write the fixed file
fs.writeFileSync('src/tests/unit/services/ageVerification.test.ts', content);
console.log('Fixed Date mocking in age verification tests');
