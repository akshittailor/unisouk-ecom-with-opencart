# 🚀 Unisouk Ecom With Opencart

## 🏗 System Architecture

 [High Level Digram] (https://drive.google.com/file/d/1dqY5MXDsPltQ5ptGFa8Rb1M3Ar7wQyjL/view?usp=drive_link)
 [Nest Flow](https://drive.google.com/file/d/1_rcp6nKGraAyMWCJqjSW43JY-vIm39ni/view)

### The Modular Monolith Approach
- I chose a Modular Monolith for this demo to ensure clean separation of concerns while minimizing operational overhead.
- Module 1 (Products): Full CRUD + Complex Option/Variant handling.
- Module 2 (Orders): Order lifecycle management with status-driven event triggers.
- Module 3 (Inventory): Real-time async sync using a Queue-Worker Pattern.
- Async Inventory Sync Engine
- Core: Powered by BullMQ + Redis.
- Behavior: Non-blocking HTTP responses. When an order status updates, a job is enqueued to deduct stock at the variant/option level.
- Resilience: Implemented exponential backoff to handle external API failures gracefully.

 ### Problem
- OpenCart 4.1.0.2 API documentation and behavior are inconsistent for workflows.
### Decision
- Implement a custom OpenCart adapter layer with stable REST-like routes (`custom/*`) and bridge-secret auth.
### Why This Architecture
- Keeps app business logic clean and testable.
- Isolates OpenCart-specific SQL and route quirks inside adapter layer.
- Reduces coupling to undocumented default API flow.
### Async Inventory Sync
[Sequence Digram](https://drive.google.com/file/d/1l7gcLt_uZz_c0CvSQBu6G8ays5N5VWft/view?usp=drive_link)
- Updates order status.
- If status moves to processing/confirmed, A enqueues sync job (BullMQ + Redis).
- Worker deducts stock at option-value level when variant selection exists.
- Non-blocking HTTP response improves API latency and reliability.
### Risk Management
- Negative stock: policy-based (`reject` or `clamp`).
- OpenCart failures: surfaced as mapped API errors and retriable job pattern at queue layer.
- Missing adapter routes/auth issues: exposed by capability probe endpoint.
### Time-Constraint Tradeoff
- No internal DB persistence layer as of now.
- Current integration uses OpenCart as operational source while keeping our APP modular boundaries ready for DB introduction.


## 📖 The "Troubleshooting" Engineering Journey
- Insight: In a real-world SaaS environment, documentation often fails where code begins. This project represents a 48-hour intensive troubleshooting sprint to bypass the undocumented inconsistencies of OpenCart 4.1.0.x.
After testing multiple distributions (OC 3.0.3.8 to 4.1.0.3) across local Docker and ScalaHosting environments, I identified a critical failure in the native OC4 API session/IP validation (resulting in persistent 403 Forbidden errors).

- My Strategic Pivot: I engineered a Custom PHP Adapter Layer to interface directly with OpenCart’s internal model layer. This ensures 100% reliability for the NestJS sync engine while maintaining clean domain boundaries.


## 🛠 Setup & Installation

### Startup Using Docker
```
  docker-compose up -d --build
```

## OpenCart Configuration (The Manual Steps)

- Access OpenCart at http://localhost:8080 and follow these precise steps:

| Step | Action      | Details                                                          |
| ---- | ----------- | ---------------------------------------------------------------- |
| 1    | DB Setup    | Use host: opencart-db, username: user, password: password, DB name: opencart  |
| 2    | Admin Creds | Username: admin, Password: admin, Email: admin@example.com       |
| 3    | Storage     | Move storage directory and rename to storage_cart                |s
| 4    | Security    | Rename admin directory to "ecart" |

- After these steps again you will be redirected admin panel login page. login using Admin creds.


## 🤖 AI-Augmented Development
- I leveraged an AI to accelerate delivery:
  - Troubleshooting: Utilized AI Studio (Gemini) for deep-log analysis of OpenCart’s PHP routing errors.
  - Adapter Generation: Employed Codex AI to map legacy PHP models to our custom adapter.

## 🧪 Testing and API Documentation
  Once the app is running, visit:
  👉 http://localhost:3000/api/docs (Swagger UI)
  Execution

## Unit Tests
```
  npm run test
```
