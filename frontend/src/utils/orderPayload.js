import { faker } from "@faker-js/faker";

export const ADDRESS_PRESETS = {
  US: {
    label: "🇺🇸 United States",
    address1: "121 Evelyn Rd",
    address2: "",
    city: "Needham Heights",
    province: "Massachusetts",
    country: "United States",
    zip: "02494",
    currency: "USD",
    phones: [
      "+14155552671", "+14155552672", "+14155552673", "+14155552674",
      "+14155552675", "+14155552676", "+14155552677", "+14155552678",
      "+14155552679", "+14155552613", "+14155552623", "+14155552633",
      "+14155552653", "+14155552673",
    ],
  },
  UK: {
    label: "🇬🇧 United Kingdom",
    address1: "42 Victoria Street",
    address2: "",
    city: "London",
    province: "England",
    country: "United Kingdom",
    zip: "SW1H 0NW",
    currency: "GBP",
    phones: [
      "+442071234567", "+442071234568", "+442071234569", "+442079876543",
      "+442079876544", "+447700900123", "+447700900124", "+447700900125",
    ],
  },
  AU: {
    label: "🇦🇺 Australia",
    address1: "1 Martin Place",
    address2: "",
    city: "Sydney",
    province: "New South Wales",
    country: "Australia",
    zip: "2000",
    currency: "AUD",
    phones: [
      "+61212345678", "+61212345679", "+61212345680", "+61298765432",
      "+61298765433", "+61412345678", "+61412345679", "+61412345680",
    ],
  },
  CA: {
    label: "🇨🇦 Canada",
    address1: "123 King Street W",
    address2: "",
    city: "Toronto",
    province: "Ontario",
    country: "Canada",
    zip: "M5X 1A1",
    currency: "CAD",
    phones: [
      "+14165551234", "+14165551235", "+14165551236", "+14165559876",
      "+14165559877", "+16045551234", "+16045551235", "+16045551236",
    ],
  },
  IN: {
    label: "🇮🇳 India",
    address1: "14 Nehru Place",
    address2: "",
    city: "New Delhi",
    province: "Delhi",
    country: "India",
    zip: "110019",
    currency: "INR",
    phones: [
      "+919811234567", "+919811234568", "+919811234569", "+919876543210",
      "+919876543211", "+919312345678", "+919312345679", "+919312345680",
    ],
  },
};

export const buildOrderPayload = ({
  quantity,
  price,
  productId,
  variantId,
  lineItems,
  addressPreset = "US",
  address,          // optional { first_name, last_name, company, address1, ..., phone } — overrides preset
  currency,         // optional explicit currency; falls back to the preset's currency
  firstName = faker.person.firstName(),
  lastName = faker.person.lastName(),
  email = faker.internet.email(),
  company = faker.company.name(),
  vendor = faker.company.name(),
  tags = faker.helpers
    .arrayElements(
      [
        "shopify-helper", "test-order", "sale", "featured", "new",
        "premium", "bestseller", "summer", "winter", "trending",
      ],
      { min: 2, max: 3 },
    )
    .join(","),
  note = "Created from Shopify Helper",
}) => {
  const preset = ADDRESS_PRESETS[addressPreset] ?? ADDRESS_PRESETS.US;

  // Prefer an explicit saved address; fall back to the preset. Any missing field
  // on a saved address falls back to the preset's value so the payload always
  // has a usable country/currency/etc.
  const src = address ?? {};
  const address1 = (src.address1 ?? preset.address1) || "";
  const address2 = (src.address2 ?? preset.address2) || "";
  const city     = (src.city     ?? preset.city)     || "";
  const province = (src.province ?? preset.province) || "";
  const country  = (src.country  ?? preset.country)  || "";
  const zip      = (src.zip      ?? preset.zip)      || "";
  const resolvedCurrency = currency ?? preset.currency ?? "USD";
  const phone    = src.phone || faker.helpers.arrayElement(preset.phones);
  const resolvedFirst   = src.first_name || firstName;
  const resolvedLast    = src.last_name  || lastName;
  const resolvedCompany = src.company    || company;

  // Accept either a list of products (multi-product orders) or the legacy
  // single variantId/quantity/price triple.
  const rows = Array.isArray(lineItems) && lineItems.length
    ? lineItems
    : [{ variantId, quantity, price }];

  const line_items = rows
    .filter((row) => String(row.variantId ?? "").trim() !== "")
    .map((row) => ({
      variant_id: Number(row.variantId),
      quantity: Number(row.quantity),
      price: Number(row.price),
    }));

  const finalAddress = {
    first_name: resolvedFirst,
    last_name: resolvedLast,
    company: resolvedCompany,
    address1,
    address2,
    city,
    province,
    country,
    zip,
    phone,
  };

  return {
    email,
    phone,
    currency: resolvedCurrency,
    financial_status: "paid",
    note,
    tags,
    source_name: "shopify-helper",
    billing_address:  finalAddress,
    shipping_address: finalAddress,
    line_items,
  };
};
