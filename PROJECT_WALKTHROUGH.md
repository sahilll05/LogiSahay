# LogiSahay Project Walkthrough & Architecture (Detailed)

**LogiSahay** is a logistics intelligence and management platform designed specifically for Indian micro-sellers. It is constructed as a monorepo-style project with two highly decoupled applications: a **Next.js Frontend** and a **FastAPI (Python) Backend**. 

This document serves as a deep dive into the architecture, pipelines, dependencies, technologies, and every endpoint that integrates the two core applications together.

---

## ??? 1. High-Level Technology Stack & Infrastructure

### **Frontend (/frontend)**
* **Framework:** Next.js 16.2.4
* **Bundler:** Turbopack
* **Language:** TypeScript
* **Styling:** Tailwind CSS + PostCSS
* **UI Components:** Shadcn/ui (Radix Primitives)
* **State Management:** Zustand (src/store/useStore.ts)
* **API Client:** Native etch with strict TypeScript Interfaces (src/lib/api.ts)

### **Backend (/backend)**
* **Framework:** FastAPI 0.109+
* **Server:** Uvicorn
* **Language:** Python 3.10+
* **Data Validation:** Pydantic
* **Architecture:** Domain-Driven Design (Clean Architecture)

### **Core Infrastructure**
* **Primary Database:** Supabase (PostgreSQL) - Handles user data, shipments, bookings, NDR records.
* **Database Migrations:** SQL files stored in supabase/migrations/
* **Caching Engine:** Redis - Powers fast retrieval of dashboard metrics and repetitive courier API calls.
* **Environment:** Managed via .env variables injected directly into FastAPI settings (src/infrastructure/config/settings.py) and Next.js public envs.

---

## ?? 2. Backend Architecture Pipeline

The Python backend is structured strictly on **Clean Architecture** principles. Code execution flows from the outside-in, meaning the inner Core (Domain) knows nothing about the outer Delivery (API) or Infrastructure layers.

### **The Request Pipeline**
1. **API Layer (src/adapters/api/):** 
   - HTTP requests are received here. The routers rely purely on Pydantic models to validate JSON incoming requests. 
   - *Example:* dashboard_router.py receives a GET request for metrics.
2. **Use Case Layer (src/application/use_cases/):** 
   - The router triggers a corresponding use case file (e.g., compare_rates.py or create_booking.py).
   - This layer contains all the *Business Rules* and orchestrates the database, cache, and third-party APIs.
3. **Infrastructure Layer (src/infrastructure/):** 
   - Called by the Use Case to do the "dirty work."
   - Communicates with **Redis** (
edis_client.py), **Supabase** (supabase_client.py), and **Third-Party APIs** (like Delhivery or WhatsApp via external/).
4. **Domain Layer (src/domain/):** 
   - Data models pass through here. It houses the interfaces, custom errors (uth_errors.py), and pure entity definitions (ooking.py, 
ate.py).

---

## ?? 3. Detailed API Endpoints & Frontend Integration

The Next.js frontend strictly communicates with the backend through src/lib/api.ts. Below are the documented core endpoints, methods, and their associated data structures.

### **A. Core & General Endpoints**
* **Endpoint:** GET /health
  * **Frontend Method:** pi.health()
  * **Description:** Used to check the uptime of the backend, verifying connections to Redis, Supabase, and identifying the current environment.
  * **Returns:** { status, redis, supabase, whatsapp_mode, app_env }

### **B. Shipments & Rate Comparison**
* **Endpoint:** POST /shipments/rates/compare
  * **Frontend Method:** pi.compareRates(params)
  * **Payload:** { pickup_pin, delivery_pin, weight_kg, is_cod }
  * **Description:** The core rate checking mechanism. The backend runs this through compare_rates.py which standardizes rates from multiple logistics providers.
  * **Returns:** Detailed list of CourierRate objects, a market_analysis (min, max, avg), and the 
ecommended courier.

* **Endpoint:** GET /shipments/geocoding/{pincode}
  * **Frontend Method:** pi.getPinCoords(pincode)
  * **Description:** Reverses a pincode into lat/lng coordinates using the backend geocoding service. Essential for routing maps visually in the Next.js RouteMap.tsx.
  * **Returns:** PinCoords (city, state, lat, lng).

* **Endpoint:** GET /api/dashboard/shipments
  * **Frontend Method:** pi.getShipments(page, status)
  * **Description:** Paginated endpoint returning shipments from the database.

### **C. Analytics & Dashboard**
* **Endpoint:** GET /api/dashboard/metrics
  * **Frontend Method:** pi.getDashboardMetrics()
  * **Description:** Heavy lifting aggregation endpoint. Fetches total shipments, live NDRs, delivery counts, and estimated revenue. Data is heavily cached using Redis to prevent slow DB lookups.
  * **Returns:** DashboardMetrics data structure.

### **D. NDR (Non-Delivery Reports) Management**
* **Endpoint:** GET /api/ndr/cases?filter={status}
  * **Frontend Method:** pi.getNDRCases(filter)
  * **Description:** Fetches tracking cases marked as NDR. Filters support 'open', 'resolved', or 'rto'.
  * **Returns:** Array of NDRCase.

* **Endpoint:** POST /api/ndr/cases/{caseId}/action
  * **Frontend Method:** pi.actionNDRCase(caseId, action, note)
  * **Payload:** { action: 'resend_whatsapp' | 'reattempt' | 'initiate_rto', note }
  * **Description:** Allows the seller to trigger physical operations via API. 
esend_whatsapp triggers the whatsapp_sender.py on the backend to shoot an SMS to the buyer instantly.

### **E. WhatsApp Bot Integration**
* **Endpoint:** GET /api/whatsapp/stats
  * **Frontend Method:** pi.getWhatsAppStats()
  * **Description:** Returns the total quota and limit of automated WhatsApp messages sent this month.

* **Endpoint:** POST /api/whatsapp/test-send
  * **Frontend Method:** pi.testWhatsAppSend(to, message)
  * **Description:** Used safely for testing webhook/bot setups via a simulation mode before launching.

---

## ?? 4. Frontend Application Flow

The frontend relies heavily on modern React standard practices inside src/.

### **Routing (src/app/)**
The application uses intuitive file-system routing:
* /dashboard � Main control center mapping to getDashboardMetrics().
* /rates � UI for injecting params to compareRates().
* /ndr � Tabular view managing non-delivered orders.
* /whatsapp � Telemetry on buyer interactions.
* /pinmap � Spatial visualization utilizing getPinCoords().

### **State and Context (src/store/useStore.ts)**
Instead of Redux, the app uses **Zustand**. Zustand acts as a very lightweight global memory. Once a hefty API request (like Rates) is fetched via pi.ts, it is injected into the Zustand store. This guarantees that unmounting/remounting components within the dashboard don't trigger unnecessary HTTP calls.

### **UI & Styling**
The src/components/ui/ folder holds granular, pure components (like Sheet, Button, Table, Card) constructed primarily with Radix UI (Shadcn). These are headless accessible components merged with standard **Tailwind Utility Classes**. 
Composite structures like Sidebar.tsx and MetricCard.tsx import these primitives.

## ?? 5. Getting Started (Development)

**Running the Backend:**
`ash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
`
*Note: Backend needs .env with a REDIS_URL and SUPABASE config to operate normally.*

**Running the Frontend:**
`ash
cd frontend
npm install
npm run dev
`
*Note: The frontend will automatically detect http://localhost:8000 via its pi.ts file fallback, and starts on port 3000 or 3001.*
