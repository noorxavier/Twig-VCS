import fs from 'fs';
import crypto from 'crypto';

fs.writeFileSync(
    'random.bin',
    crypto.randomBytes(
        5 * 1024 * 1024
    )
);