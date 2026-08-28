export const SITE_CONFIG = {
  name: "Rapid Home Relief",
  tagline: "Fast Home Flood & Emergency Restoration Services",
  phone: {
    display: "702-491-9899",
    tel: "tel:7024919899",
    raw: "7024919899",
  },
  guarantee: {
    title: "Same-Day Arrival Guarantee",
    shortLabel: "Same-Day Guarantee",
    text: "Same-Day Arrival Guarantee: If our restoration specialist isn't at your property the same day, we pay you $100.",
    disclaimer: "*Applies to emergency service requests submitted before 3:00 PM local time.",
    payoutAmount: 100,
    cutoffTimeDisplay: "3:00 PM local time",
    cutoffHourLocal: 15, // 3:00 PM
  },
  timezone: "America/Los_Angeles", // Las Vegas local time (PST/PDT)
} as const;

export const DISPATCH_PHONE_DISPLAY = SITE_CONFIG.phone.display;
export const DISPATCH_PHONE_TEL = SITE_CONFIG.phone.tel;
export const GUARANTEE_TITLE = SITE_CONFIG.guarantee.title;
export const GUARANTEE_TEXT = SITE_CONFIG.guarantee.text;
export const GUARANTEE_DISCLAIMER = SITE_CONFIG.guarantee.disclaimer;
