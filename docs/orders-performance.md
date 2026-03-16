# Orders Analytics Performance Notes

This document explains indexes and aggregation performance for the Orders module.

## Collections
- `users`
- `orders`
- `cakes`

## Key Indexes

Defined in [backend/models/Order.ts](backend/models/Order.ts):
- `{ userId: 1, createdAt: -1 }`
- `{ status: 1, createdAt: -1 }`
- `{ totalValue: -1 }`
- `{ "items.cakeId": 1 }`
- `{ "items.category": 1, createdAt: -1 }`

Defined in [backend/models/Cake.ts](backend/models/Cake.ts):
- `{ category: 1, available: 1 }`
- `{ price: 1, available: 1 }`

## Aggregations

### Top 5 users by total order value
Route: `GET /orders/top-users`

Pipeline steps:
1. Group by `userId` and sum `totalValue`
2. Sort descending by revenue
3. Limit 5
4. Join with `users` to fetch email

### Category-wise sales
Route: `GET /orders/category-sales`

Pipeline steps:
1. Unwind `items`
2. Group by `items.category`
3. Sum revenue using `quantity * unitPrice`
4. Sort descending by revenue

## Explain / Execution Stats

Use API endpoint:
- `GET /orders/perf/explain`

It returns:
- `topUsersExplain`
- `categoryExplain`

Use these fields when reviewing:
- `executionStats.totalDocsExamined`
- `executionStats.totalKeysExamined`
- `executionStats.executionTimeMillis`

## How to Validate
1. Seed realistic order volume.
2. Call `/orders/top-users` and `/orders/category-sales`.
3. Call `/orders/perf/explain`.
4. Verify key scan/doc scan ratio improves with indexes.
