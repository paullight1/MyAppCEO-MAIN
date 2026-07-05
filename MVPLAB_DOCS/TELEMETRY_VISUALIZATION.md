# Telemetry Visualization (App Detail View)

## Overview
Specifies the charting system and metrics for real-time app performance monitoring. These visualizations are integrated into the [App Management Detail](./APP_MANAGEMENT_DETAIL.md) layout.

## 1. Key Performance Indicators (KPIs)

The following metrics are visualized using **Recharts**:

| Chart Type | Metric | Description | Data Source |
|------------|--------|-------------|-------------|
| **Area Chart** | **Revenue** | Daily revenue over time (7d, 30d, 90d). | Financial API / Stripe |
| **Bar Chart** | **DAU** | Daily Active Users vs. Monthly Active Users. | Usage API / Redis |
| **Line Chart** | **Retention** | User cohort retention over 30 days. | Analytics API |
| **Area Chart** | **Latency** | 99th percentile response time (ms). | System Health API |

## 2. Recharts Configuration
To ensure a consistent UI across the [CEO Dashboard](./CEO_DASHBOARD_CORE.md), all charts should use the following theme:

```typescript
const telemetryTheme = {
  colors: {
    primary: '#1A1A2E',
    accent: '#0F3460',
    highlight: '#E94560',
    success: '#22C55E',
  },
  components: {
    ResponsiveContainer: { width: '100%', height: 300 },
    Tooltip: { cursor: { strokeDasharray: '3 3' }, contentStyle: { borderRadius: '8px' } },
  },
};
```

## 3. Real-time Synchronization
- **WebSocket Feed:** Live updates for "DAU" and "Latency" via a `/telemetry/live/:appId` socket.
- **Polling:** 5-minute fallback polling for financial data (Revenue/Retention).
- **Drill-down:** Clicking a chart bar or line point should open a detailed table view of the raw data.

## 4. Visualization Components
- **`MetricCard`:** A wrapper for the chart with a title, value, and % change indicator.
- **`TimePicker`:** A toggle to switch between 1h, 24h, 7d, 30d views.
- **`Legend`:** A modular legend that allows toggling multiple data series.

## Implementation Notes
- Charts are optimized for mobile using `ResponsiveContainer`.
- Data is normalized via the [Data Aggregation Pipeline](./DATA_AGGREGATION_PIPELINE.md) before being consumed by the frontend.
- Fallback skeleton loaders (from `Shadcn/ui`) are shown while telemetry data is fetching.
