#!/usr/bin/env node
import { build } from 'esbuild';
import { glob } from 'glob';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Build script for AppSync resolver functions
 * Compiles TypeScript files from backend/src/gql-functions to backend/lib/gql-functions
 */

const buildAppsyncFunctions = async () => {
  console.log('Building AppSync functions...');

  try {
    // Find all AppSync function files
    const files = await glob('backend/src/gql-functions/**/*.ts', {
      ignore: ['**/*.spec.ts', '**/*.test.ts'],
    });

    if (files.length === 0) {
      console.log('No AppSync functions found to build.');
      return;
    }

    console.log(`Found ${files.length} AppSync function(s) to build`);

    // Ensure output directory exists
    await mkdir('backend/lib/gql-functions', { recursive: true });

    // Build each file
    for (const file of files) {
      const outfile = file.replace('backend/src/gql-functions', 'backend/lib/gql-functions').replace('.ts', '.js');

      // Ensure output directory exists
      await mkdir(dirname(outfile), { recursive: true });

      await build({
        entryPoints: [file],
        bundle: true,
        platform: 'node',
        target: 'es2020',
        format: 'esm',
        outfile,
        external: ['@aws-appsync/utils'],
        minify: false,
        sourcemap: false,
      });

      console.log(`Built: ${file} -> ${outfile}`);
    }

    console.log('AppSync functions built successfully!');
  } catch (error) {
    console.error('Error building AppSync functions:', error);
    process.exit(1);
  }
};

// Run the build
buildAppsyncFunctions();
