# Responde Mapping Tools Plan

## Hosting Constraint

The Responde web application will later be deployed to Hostinger Business Web Hosting.

Shared web hosting can run Laravel, MySQL, and compiled React assets, but it is not suitable for hosting resource-intensive routing engines such as OSRM, Valhalla, or GraphHopper. Those routing engines normally require a VPS, Docker support, additional memory, and a continuously running process.

## Recommended Mapping Stack

### Map Display

- **Leaflet** — free and open-source JavaScript mapping library.
- **React Leaflet** — React components for using Leaflet in the web application.
- **OpenStreetMap** — free map data and public map tiles with no account or API key required.

The public OpenStreetMap tile service is appropriate for development and light usage. It has a fair-use policy and should not be treated as an unlimited production tile service.

### Nearest Response Station

The Laravel backend will use the **Haversine formula** to calculate straight-line distances between the emergency location and available response stations.

This calculation:

- Is fully free.
- Requires no external account or API key.
- Can run on Hostinger Business Web Hosting.
- Can shortlist the nearest stations before road routing is requested.

Station availability and emergency type should also be considered so the nearest suitable and active response unit is selected.

### Fastest Road Route

A road-routing engine is needed to calculate actual driving distance, estimated travel time, and the fastest route.

#### Development Option

- **OSRM public demo server**
- No account or API key required.
- Uses OpenStreetMap road data.
- Suitable only for development and testing.
- Not guaranteed for production use and may be rate-limited or unavailable.

#### Hostinger Business Production Option

- Use an external routing service such as OpenRouteService.
- Its free tier requires an account and API key.
- Keep the routing URL and API key in environment configuration so the provider can be changed later.

#### Future Fully Self-Hosted Option

If Responde is moved to a VPS:

- Install **OSRM** on the VPS.
- Download Philippines OpenStreetMap data from Geofabrik.
- Route requests through the self-hosted OSRM server.
- No routing account, API key, or per-request fee will be required.

## Proposed Implementation Stages

### MVP

1. Display maps using Leaflet and OpenStreetMap tiles.
2. Store the latitude and longitude of LGUs, stations, responders, and emergencies.
3. Use Laravel and the Haversine formula to identify nearby suitable stations.
4. Use the OSRM public demo only during development and testing.

### Hostinger Deployment

1. Deploy Laravel, MySQL, and compiled React assets to Hostinger.
2. Continue using Leaflet and OpenStreetMap for light map usage.
3. Use an external routing API when production road routing and ETA are required.

### Future VPS Upgrade

1. Deploy a self-hosted OSRM routing service.
2. Configure it with Philippines OpenStreetMap data.
3. Change the routing base URL in the application configuration.
4. Retain the existing Leaflet user interface and Laravel nearest-station algorithm.

## Configuration Principle

Mapping and routing endpoints must be stored in configuration files and environment variables. Development and production services should not be hardcoded, allowing Responde to switch from a public routing service to a self-hosted OSRM server without redesigning the application.

