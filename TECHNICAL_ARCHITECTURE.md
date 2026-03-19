# Share Bazaar - Technical Architecture & Decisions

This document outlines the technical architecture, design decisions, and tradeoffs made for the **Share Bazaar** application—a microservices-based stock trading platform. 

## Executive Summary
Share Bazaar is composed of a Spring Boot microservices backend and a React/Vite frontend. It implements domain-driven design by separating concerns into specific services (Auth, Stock, Trade, Portfolio) routed through an API Gateway, with real-time capabilities via WebSockets.

---

## 1. Global Architectural Decisions

### 1.1. Microservices Architecture
- **Decision:** Split the backend into bounded contexts (Auth, Stock, Portfolio, Trade).
- **Tradeoffs:** 
  - *Pros:* Independent scaling (e.g., trade-service might scale differently than auth-service), isolated development, easier team distribution.
  - *Cons:* Significantly higher operational complexity, requires service discovery, distributed tracing, and complex local setup.

### 1.2. Shared Database (PostgreSQL)
- **Decision:** All services currently connect to a single PostgreSQL database (`jdbc:postgresql://localhost:5432/sharebazaar`).
- **Tradeoffs:**
  - *Pros:* Easier local development, simplified backups, allows cross-domain joins if strictly necessary (though an anti-pattern in pure microservices).
  - *Cons:* Creates a distributed monolith. If the DB goes down, the entire system crashes. Highly couples services at the data layer. 
  - *Future Migration:* Move to a "Database per Service" pattern where each service has its own logical database or schema.

### 1.3. Service Discovery (Netflix Eureka)
- **Decision:** Use Spring Cloud Netflix Eureka for service registry.
- **Tradeoffs:**
  - *Pros:* Services can find each other dynamically without hardcoded IPs, easing load balancing and scaling.
  - *Cons:* Requires running and maintaining a separate `discovery-server`. *(Note: Currently represents technical debt as the Eureka server is missing from the local setup, causing initial boot connection refusals).*

### 1.4. Shared Core Library (`core-shared`)
- **Decision:** Extract common DTOs, global exception handlers, and utilities into a `core-shared` Maven module.
- **Tradeoffs:**
  - *Pros:* DRY (Don't Repeat Yourself), ensures consistent error payloads and domain objects across services.
  - *Cons:* Tight coupling. A change in `core-shared` requires a synchronized rebuild/deploy of multiple microservices.

---

## 2. Service-by-Service Breakdown

### 2.1. API Gateway (`api-gateway`)
- **Role:** Forwarding requests to underlying services (e.g., `/auth/**` to `auth-service`).
- **Framework:** Spring Cloud Gateway.
- **Decisions & Tradeoffs:**
  - *Stateless Routing:* Uses non-blocking Netty. High performance but harder to debug than standard Spring MVC.
  - *Gateway as a Single Point of Entry:* Prevents direct client-to-service communication. Simplifies CORS and potential global rate-limiting.

### 2.2. Authentication Service (`auth-service`)
- **Role:** User registration, login, and JWT issuance.
- **Framework & Tools:** Spring Security, JWT (jjwt).
- **Decisions & Tradeoffs:**
  - *Stateless JWT Authentication:* 
    - *Pros:* API Gateway or downstream services can eagerly validate users without hitting the Auth database. Extremely scalable.
    - *Cons:* Token invalidation (logout/banning) is difficult without implementing a centralized cache/blocklist (like Redis), meaning a compromised token is valid until expiration.

### 2.3. Stock Service (`stock-service`)
- **Role:** Managing company listings, stock prices, and broadcasting real-time price updates.
- **Framework & Tools:** Spring Boot, Spring WebSocket/STOMP.
- **Decisions & Tradeoffs:**
  - *Real-Time Updates via WebSockets:* Uses STOMP over WebSockets.
    - *Pros:* Excellent for live ticker updates without overwhelming the server via HTTP polling.
    - *Cons:* Stateful protocol. If `stock-service` scales horizontally, WebSocket sessions must be managed with a proper message broker (like RabbitMQ or Redis Pub/Sub) to fan out updates to all nodes.

### 2.4. Trade Service (`trade-service`)
- **Role:** Executing buy/sell orders and matching trades.
- **Framework & Tools:** Spring Boot.
- **Decisions & Tradeoffs:**
  - *Manual DDL Auto-update (`ddl-auto: update`):* Schema is managed dynamically via Hibernate.
    - *Pros:* Fast prototyping.
    - *Cons:* Risky for production data. Should eventually migrate to Flyway or Liquibase for versioned schema migrations.
  - *Potential Bottleneck:* Trade execution usually requires strict transactional boundaries. A shared DB helps with ACID compliance here, but limits scaling limits of order-matching throughput.

### 2.5. Portfolio Service (`portfolio-service`)
- **Role:** Tracking user asset holdings, calculating net worth, and historical performance.
- **Decisions & Tradeoffs:**
  - *Data Aggregation:* Needs to query both user assets and current stock prices to calculate real-time net worth.
  - *Tradeoff:* Relying on synchronous HTTP calls to `stock-service` to get live prices can cause cascading failures. Eventual consistency via message queues (e.g., Kafka) would be more resilient.

---

## 3. Frontend Architecture

### 3.1. React + Vite
- **Role:** Single Page Application (SPA) client.
- **Decisions & Tradeoffs:**
  - *Vite as Bundler:* 
    - *Pros:* Extremely fast HMR (Hot Module Replacement) and build times.
    - *Cons:* Still establishing maturity compared to Webpack, though widely adopted.
  - *Axios for HTTP:* Provides interceptors (ideal for attaching JWTs) out of the box compared to the native `fetch` API.
  - *SockJS & StompJS:* Fallback mechanisms for WebSockets ensure real-time connections work even in restricted network environments.

---

## 4. Current Technical Debt & Next Steps

1. **Missing Eureka Server:** Services currently throw `Connection refused` for port `8761`. A standalone `discovery-server` module needs to be created.
2. **Database Monolith:** The system uses a single Postgres instance and database (`sharebazaar`). To achieve true microservice decoupling, each service needs its own isolated database schema.
3. **Configuration Management:** Secrets (like `JWT_SECRET`) and database credentials are hardcoded in `application.yml`. A configuration server (e.g., Spring Cloud Config) or environment variables/Vault should be introduced.
4. **Inter-Service Communication:** Currently heavily reliant on synchronous calls or shared models. Introducing an event bus (Kafka/RabbitMQ) would decouple services further (especially between `trade-service` and `portfolio-service`).