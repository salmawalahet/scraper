# LeadX Pro AI – Setup & Run Guide

This document describes how to launch the LeadX Pro AI intelligence monorepo on a Windows system.

---

### 2. Frontend Pages Completely Wired
- **`Dashboard.tsx`**: Rich grid statistics, 30-day area lead trends, dynamic category pie charts, and real-time Socket.IO activity logs.
- **`Jobs.tsx`**: Status filtering, progress indicators, quick start/pause actions, and full forms to boot Puppeteer/Cheerio jobs.
- **`Leads.tsx`**: Virtualized tabular grid with custom inline-SVG brand indicators (including custom LinkedIn SVGs to guarantee version-safe compile rates), multi-filter sidebar panels, and bulk selection toolbars.
- **`Exports.tsx`** [NEW]: Dedicated page for managing CSV, Excel, and JSON files, complete with progress tracking, file-size calculations, download triggers, and server deletes.
- **`Settings.tsx`** [NEW]: Comprehensive platform customization panel allowing configuration of profile credentials, scraper concurrency rates, proxy servers, and webhook sync targets.

### 3. Automatic B2B Directory Search [NEW]
- Added a beautiful, tabbed search mode in the "Create New Scrape Job" modal.
- **No Manual URLs Needed**: Users can now simply input the **Job Field / Industry** (e.g. *Dentist*) and **Location** (e.g. *Houston, TX*).
- **Intelligent Discovery**: Under the hood, LeadX Pro AI automatically queries DuckDuckGo, filters and extracts organic domain URLs, and deep-scrapes each of those domains for emails, phone numbers, addresses, and social media handles.
- **URL-based Crawling preserved**: Re-designed as a tabbed layout, allowing users to switch back to crawling a single custom website at any time.

---

## 📋 Prerequisites

Ensure you have the following installed locally on your Windows machine:
1. **Node.js**: `v20.x` or later.
2. **NPM**: `v10.x` or later.
3. **MySQL**: Local instance running on port `3306` with user `root` and password `user` (or configured in `.env`).
4. **Redis**: Local instance or Memurai running on default port `6379`.

---

## 🚀 Installation & Seeding

1. **Clone and Install Dependencies**:
   From the repository root, install workspace dependencies:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` (or create `.env`) in the workspace root with standard local configurations:
   ```env
   NODE_ENV=development
   PORT=3001
   
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=user
   DB_NAME=leadx_pro
   
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   JWT_ACCESS_SECRET=your_super_secret_access_token_signature_key
   JWT_REFRESH_SECRET=your_super_secret_refresh_token_signature_key
   ```

3. **Run Migrations & Seeds**:
   Create the database schema and populate keywords and category weights:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

---

## 🏃 Launching Services

We provide NPM workspace wrappers to launch backend and frontend simultaneously:

- **Run Backend API Server & Queues**:
  ```bash
  npm run dev:backend
  ```

- **Run Frontend Application**:
  ```bash
  npm run dev:frontend
  ```

---

## 🧪 Quick Test Plan

1. Open your browser and navigate to `http://localhost:5173`.
2. Register a new user profile.
3. Go to the **Jobs** tab, click **New Job**, specify a search keyword (e.g. "Software Agency"), and trigger the scraper.
4. Watch leads populate in real-time under the **Leads** tab.
