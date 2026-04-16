#!/usr/bin/env node

// Script to update version.json with current timestamp
// This should be run during the build process

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const versionJsonPath = path.join(publicDir, 'version.json');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('📁 Created public directory:', publicDir);
}

// Get current timestamp
const now = new Date();
const timestamp = now.toISOString();
const buildId = `lascanta-v${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}-${now.getHours()}${now.getMinutes()}`;

// Create version object
const versionInfo = {
  version: timestamp,
  build: buildId,
  timestamp: timestamp
};

// Write to version.json
fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2));

console.log('✅ Version updated:', versionInfo);
console.log('📁 File written to:', versionJsonPath);
