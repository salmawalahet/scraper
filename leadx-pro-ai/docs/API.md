# LeadX Pro AI – API Reference

All requests to the backend must be made against `http://localhost:3001/api`.

---

## 🔐 Authentication Module

### 1. Register User
- **Endpoint**: `POST /auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "Alex Mercer"
  }
  ```

### 2. Login User
- **Endpoint**: `POST /auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
- **Response**: Returns access/refresh token pair and user profile details.

---

## 💼 Scrape Jobs Module

### 1. Create Scrape Job
- **Endpoint**: `POST /jobs`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "name": "Boston Dentist Scraping",
    "target_url": "https://boston-dentists-list.example.com",
    "search_query": "dentist",
    "config": {
      "maxPages": 25,
      "maxLeads": 100,
      "browser": "puppeteer"
    }
  }
  ```

### 2. List Jobs
- **Endpoint**: `GET /jobs?page=1&limit=10&status=pending`

---

## 👥 Leads Module

### 1. Query & Search Leads
- **Endpoint**: `GET /leads`
- **Query Params**:
  - `search`: Filter by company name, email, website
  - `verificationStatus`: `verified`, `unverified`, `pending`
  - `leadPriority`: `high`, `medium`, `low`
  - `hasEmail`: `true`

---

## 💾 Exports Module

### 1. Create Data Export
- **Endpoint**: `POST /exports`
- **Request Body**:
  ```json
  {
    "format": "CSV",
    "filters": {
      "hasEmail": true
    }
  }
  ```

### 2. Download File
- **Endpoint**: `GET /exports/:id/download`
- **Response**: Streaming blob binary.
