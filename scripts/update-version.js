#!/usr/bin/env node

// Script to update version.json with current timestamp
// This should be run during the build process

const fs = require('fs');
const path = require('path');

const versionJsonPath = path.join(__dirname, '../apps/web/public/version.json');

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
