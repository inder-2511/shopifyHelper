import { faker } from "@faker-js/faker";
import { ADDRESS_PRESETS } from "../../utils/orderPayload";

// The Shopify helper's built-in address presets, keyed by the ISO code PrestaShop uses.
// (Shopify's "UK" is PrestaShop's "GB".)
const PRESET_ISO = { US: "US", UK: "GB", AU: "AU", CA: "CA", IN: "IN" };

export const presetOptions = () =>
  Object.entries(ADDRESS_PRESETS).map(([key, p]) => ({
    value: key,
    label: `${p.label} — ${p.address1}, ${p.city}, ${p.zip}`,
  }));

const norm = (s) => String(s ?? "").trim().toLowerCase();

const findCountry = (countries, { iso, name }) => {
  const list = countries?.items ?? [];
  if (iso) {
    const byIso = list.find((c) => norm(c.iso) === norm(iso));
    if (byIso) return byIso;
  }
  if (name) {
    // Saved addresses may hold a name ("United States") or an ISO code ("US").
    return list.find((c) => norm(c.name) === norm(name)) ?? list.find((c) => norm(c.iso) === norm(name));
  }
  return undefined;
};

const findState = (states, country, province) => {
  if (!country || !province) return undefined;
  const list = (states?.items ?? []).filter((s) => String(s.countryId) === String(country.id));
  return list.find((s) => norm(s.name) === norm(province)) ?? list.find((s) => norm(s.iso) === norm(province));
};

/**
 * Turn a dropdown choice ("US" preset or "saved:<id>") into the fields the
 * PrestaShop order endpoint needs, mapping country / province to the store's ids.
 * Returns { fields, warnings }. `fields.id_country` is "" if it couldn't be matched.
 */
export function resolveAddressChoice(choice, savedAddresses, refData) {
  const warnings = [];
  let src;
  let iso;

  if (String(choice).startsWith("saved:")) {
    src = savedAddresses.find((a) => a.id === choice.slice(6));
  }
  if (!src) {
    const preset = ADDRESS_PRESETS[choice] ?? ADDRESS_PRESETS.US;
    src = { ...preset, phone: faker.helpers.arrayElement(preset.phones) };
    iso = PRESET_ISO[ADDRESS_PRESETS[choice] ? choice : "US"];
  }

  const country = findCountry(refData?.countries, { iso, name: src.country });
  if (!country) {
    warnings.push(
      refData
        ? `Country "${src.country}" wasn't found in this store — pick one manually.`
        : "Store data isn't loaded yet, so the country can't be matched."
    );
  }
  const state = findState(refData?.states, country, src.province);
  if (country?.containsStates && !state) {
    warnings.push(`"${country.name}" needs a state and "${src.province || "—"}" wasn't found in this store's list.`);
  }

  return {
    warnings,
    fields: {
      alias: src.name || "Helper address",
      company: src.company || "",
      address1: src.address1 || "",
      address2: src.address2 || "",
      city: src.city || "",
      postcode: src.zip || "",
      phone: src.phone || "",
      id_country: country ? String(country.id) : "",
      id_state: state ? String(state.id) : "",
      firstname: src.first_name || "",
      lastname: src.last_name || "",
    },
  };
}

/** Random-but-valid customer details, like the Shopify helper's faker defaults. */
export const randomCustomer = () => {
  const firstname = faker.person.firstName().replace(/[^\p{L} '-]/gu, "") || "Test";
  const lastname = faker.person.lastName().replace(/[^\p{L} '-]/gu, "") || "Customer";
  return {
    firstname,
    lastname,
    email: faker.internet.email({ firstName: firstname, lastName: lastname, provider: "example.com" }).toLowerCase(),
  };
};
