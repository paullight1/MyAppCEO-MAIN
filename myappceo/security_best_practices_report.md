# Security Review: App Store Integration

## Executive Summary

I reviewed the app-store import and deployment flows before production release. I found two production-relevant issues:

1. A stored link execution / phishing issue in deployment records because `storeUrl` is accepted as a plain string and later rendered as a clickable external link without scheme validation.
2. A public external-app catalog endpoint that fans out into multiple outbound requests per call, which can be abused for resource exhaustion and third-party rate-limit pressure.

I did not find evidence of raw HTML injection in the store metadata rendering paths I checked, but the two issues above should be addressed before a prod push.

## High Severity

### SEC-001: Deployment `storeUrl` is stored and rendered without URL validation

**Location**
- [apps/MVPLAB_BACKEND/src/modules/development/dto/development.dto.ts](/Users/MAC/Desktop/Desktop/app-projects/project-2025/mvplab/MVPLABX/apps/MVPLAB_BACKEND/src/modules/development/dto/development.dto.ts#L148)
- [apps/MVPLAB_BACKEND/src/modules/development/development.service.ts](/Users/MAC/Desktop/Desktop/app-projects/project-2025/mvplab/MVPLABX/apps/MVPLAB_BACKEND/src/modules/development/development.service.ts#L500)
- [src/pages/AppDashboardPage.tsx](/Users/MAC/Desktop/Desktop/app-projects/project-2025/mvplab/MVPLABX/apps/MyAppCEO/src/pages/AppDashboardPage.tsx#L595)

**Evidence**
- `CreateDeploymentDto.storeUrl` and `UpdateDeploymentDto.storeUrl` are typed as strings only, with no HTTP/HTTPS validation.
- `DevelopmentService.createDeployment()` persists `dto.storeUrl` directly into `deploymentRecords`.
- The dashboard renders `dep.storeUrl` as `<a href={dep.storeUrl} target="_blank" rel="noopener noreferrer">`.

**Impact**
- Any user who can create or edit deployments can persist a `javascript:` or otherwise malicious link.
- When another workspace member opens the dashboard and clicks the link, the browser can execute attacker-controlled script or navigate to a phishing destination.

**Fix**
- Validate `storeUrl` and `downloadUrl` in the backend with `@IsUrl({ protocols: ['http', 'https'], require_protocol: true })`.
- Add a frontend allowlist check before rendering the link, so existing bad rows are not clickable.

**Mitigation**
- If you cannot patch immediately, hide the link unless it matches an explicit `http(s)` allowlist and strip existing bad values from stored deployment rows.

**False positive notes**
- If deployment creation is truly restricted to fully trusted admins only, the exploitability drops, but the issue still matters because the stored value is rendered back into the app shell.

## Medium Severity

### SEC-002: Public external-apps search is an outbound request amplifier

**Location**
- [apps/MVPLAB_BACKEND/src/modules/external-apps/external-apps.controller.ts](/Users/MAC/Desktop/Desktop/app-projects/project-2025/mvplab/MVPLABX/apps/MVPLAB_BACKEND/src/modules/external-apps/external-apps.controller.ts#L12)
- [apps/MVPLAB_BACKEND/src/modules/external-apps/external-apps.module.ts](/Users/MAC/Desktop/Desktop/app-projects/project-2025/mvplab/MVPLABX/apps/MVPLAB_BACKEND/src/modules/external-apps/external-apps.module.ts#L5)
- [apps/MVPLAB_BACKEND/src/modules/external-apps/external-apps.service.ts](/Users/MAC/Desktop/Desktop/app-projects/project-2025/mvplab/MVPLABX/apps/MVPLAB_BACKEND/src/modules/external-apps/external-apps.service.ts#L258)
- [apps/MVPLAB_BACKEND/src/modules/external-apps/external-apps.service.ts](/Users/MAC/Desktop/Desktop/app-projects/project-2025/mvplab/MVPLABX/apps/MVPLAB_BACKEND/src/modules/external-apps/external-apps.service.ts#L394)

**Evidence**
- The controller has no auth guard; the module only wires the controller and service.
- `searchGooglePlayApps()` iterates query terms, fetches a Google Play search page per term, then fetches each resolved app detail page.
- `fetchText()` and `fetchJson()` do not impose an abort timeout, so a slow upstream can hold the request open.

**Impact**
- A single incoming request can fan out into many outbound HTTP calls.
- An attacker can repeat the request until throttling is hit, causing backend egress/cost amplification, slow responses, and rate-limit pressure on upstream store endpoints.

**Fix**
- Require auth or stronger per-user quotas for this endpoint.
- Add a hard cap on total external fetches per request and an abort timeout for upstream calls.
- Cache search/detail responses or move Google Play resolution behind a preindexed provider so one user request does not trigger many live fetches.

**Mitigation**
- Keep the global throttle, but do not rely on it alone for this route.
- Prefer provider-backed or cached catalog data for production use.

**False positive notes**
- The route is throttled globally, so this is not an infinite flood path. The issue is request amplification and outbound cost, not total absence of rate limiting.

