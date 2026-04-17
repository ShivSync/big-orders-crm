# Sprint 7: Discovery Engine

**Status:** PENDING

## Objectives
- Geo-based proactive lead discovery per store territory
- Google Places API integration for nearby businesses
- Apify integration for Google Maps scraping
- Firecrawl for website data enrichment
- Leaflet map visualization of store territories and discovered leads
- Algorithmic scoring (distance, size, competitor proximity, category)

## Database Tables (0 new — uses existing)
- Uses `leads` table with lead_source = 'google_maps'
- Uses `stores` table for territory (lat, lng, territory_radius_km)
- Metadata field on leads stores discovery-specific data (Google place_id, Apify scrape data, enrichment results)

## API Endpoints
- `POST /api/discovery/scan` — trigger scan for a store (calls Google Places + Apify)
- `GET /api/discovery/results/:storeId` — get discovered leads for a store
- `POST /api/discovery/enrich/:leadId` — run Firecrawl on a discovered lead's website

## Key Behaviors
- Per-store scanning: use store lat/lng + territory_radius_km to define search area
- Google Places API: search for schools, universities, companies, clubs, hotels, event venues
- Apify actor: broader Google Maps scrape for additional data
- Firecrawl: scrape discovered organization websites for contact info, event calendar, employee count
- Scoring algorithm: distance from store (closer = higher), org size (larger = higher), category match (schools/hotels = high priority for Big Orders), competitor proximity (if competitor nearby, lower score)
- Dedup: match by phone or Google place_id to avoid duplicate leads
- Auto-creates leads with source = 'google_maps', stage = 'new'

## UI Pages
- `/discovery` — discovery dashboard:
  - Leaflet map showing all stores with territory circles
  - Click store → show discovered leads as pins on map
  - Sidebar: list of discovered leads with score, distance, category
  - "Scan" button per store (triggers API)
  - "Scan All" button (queues all stores)
  - Filter: store, lead_type, score range, distance range
  - Bulk actions: assign leads, change stage
- Discovery results integrate with `/leads` (leads with source = google_maps show discovery metadata)

## Environment Variables
- `GOOGLE_PLACES_API_KEY` — for Places API
- `APIFY_API_KEY` — for Apify actors
- `FIRECRAWL_API_KEY` — for website scraping

## i18n Keys
- `discovery` section: title, scanStore, scanAll, scanning, discovered, score, distance, category, territory, enrichData, noResults, lastScan, leadScore

## Acceptance Tests

### API Tests
- [ ] POST /api/discovery/scan accepts store_id, returns job status
- [ ] GET /api/discovery/results/:storeId returns leads with discovery metadata
- [ ] POST /api/discovery/enrich/:leadId updates lead metadata with scraped data
- [ ] Scan deduplicates by phone and place_id

### Scoring Tests
- [ ] Score increases for closer distance
- [ ] Score increases for larger organization size
- [ ] Score increases for high-priority categories (school, hotel, event_venue)
- [ ] Score decreases for competitor proximity

### Map Tests
- [ ] Store markers render at correct lat/lng
- [ ] Territory circles render with correct radius
- [ ] Lead pins render within territory
- [ ] Click on lead pin shows lead summary

### i18n Tests
- [ ] discovery section in both languages
- [ ] All discovery-specific labels translated

### Build Tests
- [ ] `npm run build` passes
- [ ] /discovery route generates
- [ ] Leaflet CSS/JS loads correctly (no SSR hydration errors)
