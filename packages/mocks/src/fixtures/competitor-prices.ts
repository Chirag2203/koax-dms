/**
 * Competitor price fixture — SPEC-INVENTORY-AGING-001 §7 (L7).
 *
 * Static v1 data for ~8 VINs from the vehicles fixture.
 * In v2, a real scraper replaces this; the selector signature is unchanged.
 *
 * Scraped date is set to 2026-04-28 for test stability.
 */

export interface CompetitorPrice {
  vin: string;
  competitorName: string;
  listedPrice: number;
  scrapedAt: string; // ISO date
}

export const competitorPrices: CompetitorPrice[] = [
  // Porsche 911 Carrera S (WP0AB2A91MS247831) — comparable BN ask ~14.8M
  {
    vin: 'WP0AB2A91MS247831',
    competitorName: 'Autohangar Mumbai',
    listedPrice: 13_500_000,
    scrapedAt: '2026-04-28',
  },
  {
    vin: 'WP0AB2A91MS247831',
    competitorName: 'Big Boy Toyz Delhi',
    listedPrice: 14_200_000,
    scrapedAt: '2026-04-28',
  },

  // Porsche Panamera 4 (WP0ZZZ97ZNS112045) — comparable BN ask ~16.8M
  {
    vin: 'WP0ZZZ97ZNS112045',
    competitorName: 'Luxury Cars Bangalore',
    listedPrice: 15_800_000,
    scrapedAt: '2026-04-28',
  },
  {
    vin: 'WP0ZZZ97ZNS112045',
    competitorName: 'Autohangar Mumbai',
    listedPrice: 16_200_000,
    scrapedAt: '2026-04-28',
  },

  // Porsche Macan S (WP1ZZZ95ZNS078234) — comparable BN ask ~8.6M
  {
    vin: 'WP1ZZZ95ZNS078234',
    competitorName: 'Evolve Automotive',
    listedPrice: 7_800_000,
    scrapedAt: '2026-04-28',
  },
  {
    vin: 'WP1ZZZ95ZNS078234',
    competitorName: 'VehiclePlus Chennai',
    listedPrice: 8_100_000,
    scrapedAt: '2026-04-28',
  },

  // Mercedes-Benz GLE 450 (WDC1930561A456789) — comparable BN ask ~11.7M
  {
    vin: 'WDC1930561A456789',
    competitorName: 'AutoNation Hyderabad',
    listedPrice: 10_900_000,
    scrapedAt: '2026-04-28',
  },
  {
    vin: 'WDC1930561A456789',
    competitorName: 'Big Boy Toyz',
    listedPrice: 11_300_000,
    scrapedAt: '2026-04-28',
  },

  // Mercedes-Benz S-Class S500 (WDD2221971A012345) — comparable BN ask ~20.5M
  {
    vin: 'WDD2221971A012345',
    competitorName: 'Evolve Automotive',
    listedPrice: 19_500_000,
    scrapedAt: '2026-04-28',
  },
  {
    vin: 'WDD2221971A012345',
    competitorName: 'Luxury Cars Pune',
    listedPrice: 20_000_000,
    scrapedAt: '2026-04-28',
  },

  // Porsche 718 Cayman GT4 (WP0ZZZ98ZMS561902)
  {
    vin: 'WP0ZZZ98ZMS561902',
    competitorName: 'Big Boy Toyz Mumbai',
    listedPrice: 12_200_000,
    scrapedAt: '2026-04-28',
  },

  // Porsche Taycan 4S (WP0AAA1X8PSA12345)
  {
    vin: 'WP0AAA1X8PSA12345',
    competitorName: 'Autohangar Delhi',
    listedPrice: 18_500_000,
    scrapedAt: '2026-04-28',
  },
  {
    vin: 'WP0AAA1X8PSA12345',
    competitorName: 'EV Premium Cars',
    listedPrice: 17_900_000,
    scrapedAt: '2026-04-28',
  },

  // Mercedes-Benz GLS 600 (WDC2229601A234567)
  {
    vin: 'WDC2229601A234567',
    competitorName: 'Luxury Cars Bangalore',
    listedPrice: 17_200_000,
    scrapedAt: '2026-04-28',
  },
];
