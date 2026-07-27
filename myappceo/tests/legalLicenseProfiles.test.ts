import { describe, expect, it } from 'vitest';
import { LEGAL_LICENSE_PROFILES, getLicenseApplicationProfile } from '../src/utils/legalLicenseProfiles';

describe('legal license profiles', () => {
  it('exposes an official application page for every tracked profile', () => {
    for (const [code, profile] of Object.entries(LEGAL_LICENSE_PROFILES)) {
      expect(profile.officialApplicationUrl, `${code} should define an official application URL`).toMatch(/^https?:\/\//);
      expect(profile.requiredDocuments.length, `${code} should define required documents`).toBeGreaterThan(0);
      expect(profile.applicationFields.length, `${code} should define application fields`).toBeGreaterThan(0);
    }
  });

  it('retains the CAC profile as the fallback for unknown regulators', () => {
    expect(getLicenseApplicationProfile('UNKNOWN_LICENSE')).toBe(LEGAL_LICENSE_PROFILES.CAC_COMPANY_REGISTRATION);
  });

  it('provides direct requirements links for profiles that need a filing page', () => {
    expect(LEGAL_LICENSE_PROFILES.FCCPC_DML.officialRequirementsUrl).toMatch(/^https?:\/\//);
    expect(LEGAL_LICENSE_PROFILES.SEC_CROWDFUNDING.officialRequirementsUrl).toMatch(/^https?:\/\//);
    expect(LEGAL_LICENSE_PROFILES.NOTAP_TECH_TRANSFER.officialRequirementsUrl).toMatch(/^https?:\/\//);
  });
});
