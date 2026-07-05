# User Roles & Permissions (RBAC)

## Overview
Detailed Role-Based Access Control (RBAC) matrix for the MVPLAB platform.

## 1. Role Definitions
| Role | Description |
|------|-------------|
| **Admin** | MVPLAB internal staff with full system access. |
| **CEO** | Project owner; can buy/sell apps and view all portfolio data. |
| **Investor** | Read-only access to specific projects; views performance metrics. |
| **Co-founder** | Full access to a specific project; cannot sell the app. |
| **Developer** | Technical access; can push code and view telemetry. |

## 2. Permission Matrix
| Feature | Admin | CEO | Investor | Developer |
|---------|-------|-----|----------|-----------|
| Create Listing | Yes | Yes | No | No |
| Approve Offer | Yes | Yes | No | No |
| View Telemetry | Yes | Yes | Yes | Yes |
| Delete Project | Yes | Yes | No | No |
| Manage Team | Yes | Yes | No | No |

## 3. Implementation Logic
- **Middleware:** `checkRole(['admin', 'ceo'])` on protected routes.
- **Database Schema:** `roles` table linked to `users` via a join table for multi-role support.

## Implementation Notes
- Role assignments are auditable.
- Permission checks happen at both the UI layer (conditional rendering) and the API layer (authorization guards).
