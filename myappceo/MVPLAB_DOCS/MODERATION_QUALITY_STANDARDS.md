# Moderation & Quality Standards

## Overview
Lists the criteria for app approval and manual review red flags to ensure marketplace integrity.

## 1. Minimum Quality Standards
- **Functionality:** App must perform as described in the listing. No "under construction" pages.
- **Design:** Clean, modern UI. No broken layouts or placeholder images.
- **Performance:** App must load in under 3 seconds on standard connections.
- **Security:** No hardcoded secrets, open vulnerabilities, or malicious code.

## 2. Manual Review Red Flags
- Inconsistent revenue proof.
- Obfuscated code in the repository.
- Use of trademarked names without authorization.
- Excessive or intrusive data collection.

## 3. Approval Tiering
| Tier | Description | Requirement |
|------|-------------|-------------|
| **Verified** | High-quality, vetted by experts. | Manual code review & revenue audit. |
| **Standard** | General listings. | Automated checks & basic manual review. |
| **Experimental** | New/Beta projects. | Low entry barrier; high risk warning. |

## 4. Rejection Workflow
1. Moderator flags specific violations.
2. System sends automated feedback to Seller.
3. Seller has 48 hours to rectify and resubmit before the listing is archived.

## Implementation Notes
- Automated scan for common vulnerabilities (e.g., using Snyk or GitHub Advanced Security) before manual review.
