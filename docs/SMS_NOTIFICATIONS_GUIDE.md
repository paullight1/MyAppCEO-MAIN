# Automated SMS Progress Notifications Guide

This guide explains the automated SMS notification system that keeps project owners informed about every milestone in their app's development lifecycle.

## 1. System Overview
The MVPLab Backend is integrated with **Twilio** to send real-time SMS alerts whenever an Admin updates the progress of an app. This ensures CEOs are informed even when they are not logged into the dashboard.

---

## 2. Notification Triggers
Notifications are sent automatically when:
- **Phase Shift:** The app moves from one major stage to another (e.g., *Design* → *Development*).
- **Milestone Completion:** A specific feature or sub-task is marked as 100% complete.
- **Urgent Alerts:** Critical issues or blockers detected by the SDK/PostHog.
- **Launch Day:** Final confirmation when the app is live on the Marketplace.

---

## 3. Configuration Setup

### User Enrollment
1. Go to **Settings > Profile**.
2. Verify your Phone Number.
3. Toggle "SMS Progress Updates" to **ON**.

### API Webhook (Technical)
The backend triggers the `sms_service` when the `app_lifecycle` table is updated:
```typescript
// Backend Trigger Example
if (progressChanged) {
  await smsService.send({
    to: ceo.phone,
    message: `[MVPLab] Progress Update: "${app.name}" is now 75% complete. Currently: ${step.label}.`
  });
}
```

---

## 4. Message Templates
| Event | SMS Template |
|-------|--------------|
| New Step | "Great news! Your app [AppName] has entered the [StepName] phase." |
| Alert | "Urgent: [Severity] issue detected in [AppName]. Check CEO Dashboard for details." |
| Launch | "Congratulations! [AppName] is now LIVE on the MVPLab Marketplace. 🚀" |

---

## 5. Frequency & Quiet Hours
- **Default:** Immediate delivery.
- **Quiet Hours:** Notifications between 10 PM and 8 AM are queued and sent as a summary the following morning, unless marked as **CRITICAL**.

---

## 6. Opting Out
To stop receiving updates, reply **STOP** to any message or update your notification preferences in the dashboard.
