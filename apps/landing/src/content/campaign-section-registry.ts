import type { LocalMedia } from './validation-primitives.js';

export interface CampaignConversionCta {
  label: string;
  action: 'login' | 'register';
}

export interface CampaignHeroSection {
  type: 'campaignHero.v1';
  key: string;
  eyebrow: string;
  headline: string;
  introduction: string;
  image: LocalMedia;
  cta: CampaignConversionCta;
}

export interface CampaignBenefitsSection {
  type: 'campaignBenefits.v1';
  key: string;
  heading: string;
  items: readonly Readonly<{
    key: string;
    title: string;
    description: string;
  }>[];
}

export interface CampaignFaqSection {
  type: 'campaignFaq.v1';
  key: string;
  heading: string;
  items: readonly Readonly<{
    key: string;
    question: string;
    answer: string;
  }>[];
}

export interface CampaignCtaSection {
  type: 'campaignCta.v1';
  key: string;
  heading: string;
  copy: string;
  cta: CampaignConversionCta;
}

export type CampaignSection =
  | CampaignHeroSection
  | CampaignBenefitsSection
  | CampaignFaqSection
  | CampaignCtaSection;

export const campaignSectionKinds = [
  'campaignHero.v1',
  'campaignBenefits.v1',
  'campaignFaq.v1',
  'campaignCta.v1',
] as const;

export function isCampaignSectionKind(
  value: unknown,
): value is CampaignSection['type'] {
  return campaignSectionKinds.includes(value as CampaignSection['type']);
}
