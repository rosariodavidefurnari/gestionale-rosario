import { describe, expect, it } from "vitest";

import {
  computeQuoteItemsTotal,
  getQuoteItemLineTotal,
  hasQuoteItems,
  sanitizeQuoteItems,
  transformQuoteFormData,
} from "./quoteItems";

describe("quoteItems", () => {
  it("sanitizes item rows and removes blank descriptions", () => {
    expect(
      sanitizeQuoteItems([
        {
          description: "  Riprese matrimonio  ",
          quantity: 2,
          unit_price: 350,
        },
        {
          description: "   ",
          quantity: 1,
          unit_price: 100,
        },
      ]),
    ).toEqual([
      {
        description: "Riprese matrimonio",
        quantity: 2,
        unit_price: 350,
      },
    ]);
  });

  it("computes totals from sanitized quote items", () => {
    expect(
      computeQuoteItemsTotal([
        {
          description: "Riprese",
          quantity: 2,
          unit_price: 350,
        },
        {
          description: "Montaggio",
          quantity: 1,
          unit_price: 250,
        },
      ]),
    ).toBe(950);

    expect(
      getQuoteItemLineTotal({
        quantity: 3,
        unit_price: 120,
      }),
    ).toBe(360);
  });

  it("detects when a quote has usable items", () => {
    expect(
      hasQuoteItems([
        {
          description: "Riprese",
          quantity: 1,
          unit_price: 500,
        },
      ]),
    ).toBe(true);

    expect(
      hasQuoteItems([
        {
          description: "   ",
          quantity: 1,
          unit_price: 0,
        },
      ]),
    ).toBe(false);
  });

  it("transforms quote form data so amount follows item totals when items exist", () => {
    expect(
      transformQuoteFormData({
        amount: 100,
        quote_items: [
          {
            description: "Riprese",
            quantity: 2,
            unit_price: 300,
          },
        ],
      }),
    ).toEqual({
      amount: 600,
      quote_items: [
        {
          description: "Riprese",
          quantity: 2,
          unit_price: 300,
        },
      ],
    });

    expect(
      transformQuoteFormData({
        amount: 450,
        quote_items: [],
      }),
    ).toEqual({
      amount: 450,
      quote_items: [],
    });
  });
});
