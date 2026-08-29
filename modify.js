import fs from 'fs';

const buffer = fs.readFileSync('random_v2.bin');

buffer.write('TWIG_VCS', 100000);

fs.writeFileSync('random_v2.bin', buffer);

console.log('Modified');