#!/usr/bin/env node

// Script to copy service worker to dist directory after build
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swSourcePath = path.join(__dirname, '../public/sw.js');
const swDestPath = path.join(__dirname, '../dist/sw.js');

// Ensure dist directory exists
const distDir = path.dirname(swDestPath);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('📁 Created dist directory:', distDir);
}

// Copy service worker if it exists
if (fs.existsSync(swSourcePath)) {
  fs.copyFileSync(swSourcePath, swDestPath);
  console.log('✅ Service worker copied to:', swDestPath);
} else {
  console.warn('⚠️ Service worker not found at:', swSourcePath);
}

// Copy version.json if it exists
const versionSourcePath = path.join(__dirname, '../public/version.json');
const versionDestPath = path.join(__dirname, '../dist/version.json');

if (fs.existsSync(versionSourcePath)) {
  fs.copyFileSync(versionSourcePath, versionDestPath);
  console.log('✅ Version.json copied to:', versionDestPath);
} else {
  console.warn('⚠️ Version.json not found at:', versionSourcePath);
}
