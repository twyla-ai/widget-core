var documentation = require('documentation');
var fs = require('fs');

documentation
  .build(['./src/index.js'], { shallow: false })
  .then(documentation.formats.md)
  .then(output => {
    // output is a string of Markdown data
    fs.writeFileSync('./API.md', output);
  });
