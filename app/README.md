# Schulferienklar App

This directory contains the Vite and React app for Schulferienklar.

## Development

Install dependencies:

npm install

Start the local development server:

npm run dev

## Build

Create a standard production build:

npm run build

## SEO build

Generate static SEO pages:

npm run generate:seo

Run the full checked SEO build:

npm run build:seo:checked

The checked SEO build runs data validation, generates SEO pages, validates the generated SEO output, and then creates the Vite production build.

## Validation

Run linting:

npm run lint

Validate holiday and public holiday data:

npm run validate:data

Validate generated SEO pages:

npm run validate:seo-pages
