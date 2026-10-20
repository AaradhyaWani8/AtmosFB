# Atmos

Atmos is a React/Vite climate dashboard with a separate Express API in `server/`.
WeatherAPI.com provides live current conditions and the five-day weather outlook;
MongoDB stores shared station readings, admin forecast adjustments, warnings, and
discrepancy reports.

## Run the API locally

Requirements: Node.js 20+ and a MongoDB instance.

1. Install backend dependencies:

   ```powershell
   npm install --prefix server
   ```

2. Create a private server environment file from the safe template:

   ```powershell
   Copy-Item server\.env.example server\.env
   ```

   Set `MONGODB_URI` in `server\.env` to your local or hosted MongoDB URI. To
   enable live weather requests, set `WEATHERAPI_KEY` to your WeatherAPI.com key.
   Keep these values private; do not put them in Postman exports or source control.
   The server reads `PORT` (default `3000`), `CORS_ORIGIN` (default
   `http://localhost:5173`), and `SESSION_TTL_DAYS` (default `7`) from this file.

3. Start the API:

   ```powershell
   npm run dev --prefix server
   ```

   The API is available under `http://localhost:3000/api`. Health check:
   `GET http://localhost:3000/api/health`. A healthy response requires MongoDB
   to be connected.

## Set up the first administrator

Open the website, choose **Login → Admin login → Create the first admin**, and
enter a name, email, and password of at least 12 characters. The API atomically
allows only one initial administrator setup; the option disappears once setup
has been claimed or an administrator exists. This prevents an open public admin
registration route. Additional admin privileges must be granted by an existing
administrator to an account, not by selecting the Admin tab.

## Postman setup and walkthrough

1. Start MongoDB and the API as described above.
2. In Postman, choose **Import** and import `Atmos API.postman_collection.json`
   and `Atmos Local.postman_environment.json`.
3. Select the **Atmos Local** environment. Its `baseUrl` defaults to
   `http://localhost:3000/api`, and `location` defaults to `Pune`.
4. Set `testPassword` to a private value with at least 12 characters. Register
   creates a regular test account and its test script saves the bearer `token`.
   Run **Register user**, then **Get my profile**. To avoid a duplicate email,
   registration is safe to rerun with a new email; change `testEmail` if needed.
5. On first setup, create the initial admin from the website's **Login → Admin
   login** page. The same page lets you select User or Admin login; the API
   verifies the selected role and the selector cannot grant privileges. New
   user registrations always create regular users. Set `adminEmail` and
   `adminPassword` in the local Postman environment's **Current value** fields,
   then run **Login as provisioned admin** in the **Admin APIs** folder. Its
   test saves `adminToken`.
6. Run the admin-only create/update/delete requests for official weather
   records, stations, forecasts, and alerts. Their create requests save resource
   IDs for the following read, update, and delete requests. They change database
   data; use a local/test database.
7. Submit a discrepancy report as a regular user, then approve it as admin.
   Submit a second report before using the reject request.
8. Run the validation, unauthorized, forbidden, and missing-record requests to
   confirm the expected `400`, `401`, `403`, and `404` responses. Run **Logout**
   after other requests that use `token`; a logged-out token will no longer work.
9. WeatherAPI requests require `WEATHERAPI_KEY` configured on the server. The key
   is never sent by Postman. Without it, these requests return `503`.

## Dashboard roles and shared data

- The dashboard requires a signed-in user. The overview shows live current
  conditions; it no longer displays the local-only station manager.
- **Station Monitoring** reads station measurements from MongoDB. Admins can
  create and update station records; those same records are visible to users.
- **Prediction** combines the WeatherAPI five-day temperature outlook with
  administrator-published heatwave probability, confidence, and risk for each
  forecast date. Admin edits are stored in MongoDB and shown to all users.
- **Warnings** shows published advisories to users. Admins can publish and
  expire shared warnings.
- **Discrepancies** lets users submit and track their own reports. Admins can
  review all user reports and approve or reject them.
- Regular users have read-only access to official weather data; write routes
  remain protected by server-side admin authorization.

The exported environment intentionally contains blank secret values. Use
Postman's local/current values for credentials and tokens, and do not export or
share an environment after filling them.

## API route summary

All application routes are prefixed with `/api`. JSON errors use an `error`
field. Protected routes require `Authorization: Bearer <token>`; routes marked
admin additionally require the `admin` role.

| Postman folder | Endpoints |
| --- | --- |
| Health Check | `GET /health` |
| WeatherAPI Integration | `GET /weather/current?location=...`, `GET /weather/forecast?location=...&days=1..10`, `GET /weather/search?q=...` |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| User APIs | `GET/PATCH/DELETE /users/me` |
| Weather Records | `GET /weather-records`, `GET /weather-records/:id`, admin `POST/PATCH/DELETE /weather-records[/:id]` |
| Weather Stations | `GET /stations`, `GET /stations/:id`, admin `POST/PATCH/DELETE /stations[/:id]` |
| Forecasts | `GET /forecasts`, `GET /forecasts/:id`, admin `POST/PATCH/DELETE /forecasts[/:id]` |
| Alerts and Advisories | `GET /alerts`, `GET /alerts/:id`, admin `POST/PATCH/DELETE /alerts[/:id]` |
| Discrepancy Reports | `POST/GET /discrepancies`, `GET /discrepancies/:id`, admin `POST /discrepancies/:id/approve` and `/reject` |
| Admin APIs | admin `GET /admin/overview`, `GET /admin/users`, `PATCH/DELETE /admin/users/:id`, `GET /admin/sessions` |

Collection tests cover success responses and the principal validation/authz/not-
found cases. API CRUD access requires MongoDB; the current-weather, forecast,
and search routes proxy WeatherAPI.com and require a server-side key.

## Run backend API tests

```powershell
npm test --prefix server
```

The API test suite starts a temporary MongoDB instance with
`mongodb-memory-server` and stubs the WeatherAPI responses. It does not need a
real database, WeatherAPI key, or external credentials. The frontend can still
be run separately with `npm run dev`.
