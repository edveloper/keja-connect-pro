import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { normalizeKenyanPhone } from "@/lib/phone-validation";

type DatasetType = "tenants" | "units" | "properties";
type RawRow = Record<string, unknown>;

type WorkbookSheet = {
  name: string;
  rows: string[][];
};

type PropertyImportRow = { name: string; numberingStyle?: "numbers" | "letters" | "block_unit" | "floor_unit"; streetAddress?: string; neighborhood?: string; townCity?: string; county?: string; landmark?: string; postalCode?: string; };
type UnitImportRow = { propertyName: string; unitNumber: string; };
type TenantImportRow = { name: string; phone?: string; propertyName: string; unitNumber: string; rentAmount: number; leaseStart: string; openingBalance: number; securityDeposit: number; isProrated: boolean; firstMonthOverride: number | null; };
type ParseResult = { properties: PropertyImportRow[]; units: UnitImportRow[]; tenants: TenantImportRow[]; warnings: string[]; errors: string[]; };

const PROPERTY_SHEET_NAMES = ["properties", "property", "buildings", "estates"];
const UNIT_SHEET_NAMES = ["units", "unit"];
const TENANT_SHEET_NAMES = ["tenants", "tenant", "occupants"];
const NO_COLUMN = "__none__";

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const toText = (value: unknown) => String(value ?? "").trim();
const parseNumber = (value: string, fallback = 0) => {
  if (!value) return fallback;
  const parsed = Number(value.toString().replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const parseBoolean = (value: string, fallback = false) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;
  return fallback;
};
const parseDate = (value: string) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const maybe = new Date(value);
  if (Number.isNaN(maybe.getTime())) return new Date().toISOString().slice(0, 10);
  return maybe.toISOString().slice(0, 10);
};

const pickSheetName = (sheetNames: string[], candidates: string[]) => {
  const normalized = sheetNames.map((n) => ({ original: n, normalized: normalizeKey(n) }));
  for (const candidate of candidates) {
    const wanted = normalizeKey(candidate);
    const exact = normalized.find((s) => s.normalized === wanted);
    if (exact) return exact.original;
  }
  for (const candidate of candidates) {
    const wanted = normalizeKey(candidate);
    const contains = normalized.find((s) => s.normalized.includes(wanted));
    if (contains) return contains.original;
  }
  return null;
};

const detectHeaderRow = (rows: string[][]) => {
  const hints = ["house", "unit", "customer", "tenant", "rent", "balance", "property"];
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const combined = rows[i].map((c) => normalizeKey(c)).join(" ");
    const score = hints.reduce((acc, hint) => (combined.includes(hint) ? acc + 1 : acc), 0);
    if (score >= 2) return i + 1;
  }
  return 1;
};

const firstText = (row: Record<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    const hit = row[normalizeKey(alias)];
    if (hit && hit.trim()) return hit.trim();
  }
  return "";
};

const normalizeObjectRow = (row: RawRow) => {
  const normalized: Record<string, string> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeKey(key)] = toText(value);
  });
  return normalized;
};

const tenantFields = [
  { key: "tenantName", label: "Tenant Name", required: true },
  { key: "unitNumber", label: "Unit / House #", required: true },
  { key: "propertyName", label: "Property Name" },
  { key: "phone", label: "Phone" },
  { key: "rentAmount", label: "Rent Amount" },
  { key: "openingBalance", label: "Opening Balance / Arrears" },
  { key: "securityDeposit", label: "Security Deposit" },
  { key: "leaseStart", label: "Lease Start Date" },
  { key: "isProrated", label: "Prorated?" },
  { key: "firstMonthOverride", label: "First Month Charge" },
  { key: "comments", label: "Comments / Notes" },
];

const unitsFields = [
  { key: "unitNumber", label: "Unit Number", required: true },
  { key: "propertyName", label: "Property Name" },
];

const propertiesFields = [
  { key: "name", label: "Property Name", required: true },
  { key: "streetAddress", label: "Street Address" },
  { key: "neighborhood", label: "Neighborhood" },
  { key: "townCity", label: "Town/City" },
  { key: "county", label: "County" },
  { key: "landmark", label: "Landmark" },
  { key: "postalCode", label: "Postal Code" },
  { key: "numberingStyle", label: "Numbering Style" },
];

const inferFieldMappings = (columns: Array<{ index: number; label: string }>, dataset: DatasetType) => {
  const find = (aliases: string[]) => {
    const hit = columns.find((c) => aliases.some((a) => normalizeKey(c.label).includes(normalizeKey(a))));
    return hit ? String(hit.index) : NO_COLUMN;
  };

  if (dataset === "tenants") {
    return {
      tenantName: find(["tenant", "customer", "name"]),
      unitNumber: find(["house", "unit"]),
      propertyName: find(["property", "building", "apartment"]),
      phone: find(["phone", "mobile"]),
      rentAmount: find(["rent due", "rent", "monthly rent"]),
      openingBalance: find(["balance", "arrears", "opening"]),
      securityDeposit: find(["deposit", "security"]),
      leaseStart: find(["lease", "start"]),
      isProrated: find(["prorated", "pro rated"]),
      firstMonthOverride: find(["first month", "override"]),
      comments: find(["comment", "remarks", "notes"]),
    };
  }
  if (dataset === "units") {
    return {
      unitNumber: find(["unit", "house"]),
      propertyName: find(["property", "building", "apartment"]),
    };
  }
  return {
    name: find(["property", "building", "name"]),
    streetAddress: find(["street", "address"]),
    neighborhood: find(["neighborhood", "estate", "area"]),
    townCity: find(["town", "city"]),
    county: find(["county"]),
    landmark: find(["landmark"]),
    postalCode: find(["postal", "zip"]),
    numberingStyle: find(["numbering style", "style"]),
  };
};

const datasetFields = (dataset: DatasetType) => {
  if (dataset === "tenants") return tenantFields;
  if (dataset === "units") return unitsFields;
  return propertiesFields;
};

async function createTenantAndCharges(row: TenantImportRow, unitId: string, userId: string) {
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: row.name,
      phone: row.phone || "",
      rent_amount: row.rentAmount,
      unit_id: unitId,
      lease_start: row.leaseStart,
      opening_balance: row.openingBalance,
      security_deposit: row.securityDeposit,
      first_month_override: row.firstMonthOverride,
      is_prorated: row.isProrated,
      user_id: userId,
    })
    .select()
    .single();

  if (tenantError) throw tenantError;

  if (row.openingBalance > 0) {
    await supabase.rpc("create_opening_balance_charge", {
      p_tenant_id: tenant.id,
      p_amount: row.openingBalance,
      p_effective_month: row.leaseStart.slice(0, 7),
      p_note: "Opening balance - imported onboarding data",
    });
  }

  const currentMonth = new Date();
  const start = new Date(row.leaseStart);
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const charges: Array<{ tenant_id: string; amount: number; charge_month: string; type: "rent"; note: string }> = [];

  let cursor = new Date(startMonth);
  let first = true;
  while (cursor <= endMonth) {
    const month = cursor.toISOString().slice(0, 7);
    const amount = first && row.isProrated && row.firstMonthOverride != null ? row.firstMonthOverride : row.rentAmount;
    charges.push({
      tenant_id: tenant.id,
      amount,
      charge_month: month,
      type: "rent",
      note: first ? "First month rent (imported)" : "Monthly rent (imported)",
    });
    first = false;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  if (charges.length > 0) await supabase.from("charges").insert(charges);
}

export function OnboardingImportPanel() {
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [sheets, setSheets] = useState<WorkbookSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [mappingDataset, setMappingDataset] = useState<DatasetType>("tenants");
  const [defaultPropertyName, setDefaultPropertyName] = useState("");
  const [skipVacantRows, setSkipVacantRows] = useState(true);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const importableCount = useMemo(() => !result ? 0 : result.properties.length + result.units.length + result.tenants.length, [result]);
  const selectedSheetRows = useMemo(() => sheets.find((s) => s.name === selectedSheet)?.rows ?? [], [sheets, selectedSheet]);
  const columnOptions = useMemo(() => {
    const header = selectedSheetRows[headerRow - 1] ?? [];
    return header
      .map((label, index) => ({ index, label: toText(label) || `Column ${index + 1}` }))
      .filter((c) => c.label.trim().length > 0);
  }, [selectedSheetRows, headerRow]);

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetNames = workbook.SheetNames ?? [];
      const workbookSheets: WorkbookSheet[] = sheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "" }) as string[][],
      }));
      setSheets(workbookSheets);
      if (workbookSheets.length > 0) {
        setSelectedSheet(workbookSheets[0].name);
        setHeaderRow(detectHeaderRow(workbookSheets[0].rows));
      }

      const propertySheetName = pickSheetName(sheetNames, PROPERTY_SHEET_NAMES);
      const unitSheetName = pickSheetName(sheetNames, UNIT_SHEET_NAMES);
      const tenantSheetName = pickSheetName(sheetNames, TENANT_SHEET_NAMES);

      const warnings: string[] = [];
      const errors: string[] = [];
      const properties: PropertyImportRow[] = [];
      const units: UnitImportRow[] = [];
      const tenants: TenantImportRow[] = [];

      if (!propertySheetName && !unitSheetName && !tenantSheetName) {
        warnings.push("No standard tab names found. Use manual mapping below.");
      }

      if (propertySheetName) {
        const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[propertySheetName], { defval: "" });
        rows.forEach((raw, idx) => {
          const row = normalizeObjectRow(raw);
          const name = firstText(row, ["name", "property", "property name", "building"]);
          if (!name) {
            warnings.push(`Properties row ${idx + 2}: missing property name. Skipped.`);
            return;
          }
          const styleRaw = firstText(row, ["numbering style", "numbering_style", "style"]);
          const style = ["numbers", "letters", "block_unit", "floor_unit"].includes(styleRaw)
            ? (styleRaw as PropertyImportRow["numberingStyle"])
            : "numbers";
          properties.push({
            name,
            numberingStyle: style,
            streetAddress: firstText(row, ["street", "street address", "address"]),
            neighborhood: firstText(row, ["neighborhood", "estate", "area"]),
            townCity: firstText(row, ["town", "city", "town_city"]),
            county: firstText(row, ["county"]),
            landmark: firstText(row, ["landmark"]),
            postalCode: firstText(row, ["postal code", "postal_code", "postcode"]),
          });
        });
      }

      if (unitSheetName) {
        const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[unitSheetName], { defval: "" });
        rows.forEach((raw, idx) => {
          const row = normalizeObjectRow(raw);
          const propertyName = firstText(row, ["property", "property name", "building"]);
          const unitNumber = firstText(row, ["unit", "unit number", "unit_number", "house"]);
          if (!propertyName || !unitNumber) {
            warnings.push(`Units row ${idx + 2}: missing property/unit. Skipped.`);
            return;
          }
          units.push({ propertyName, unitNumber });
        });
      }

      if (tenantSheetName) {
        const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[tenantSheetName], { defval: "" });
        rows.forEach((raw, idx) => {
          const row = normalizeObjectRow(raw);
          const name = firstText(row, ["name", "tenant", "tenant name", "full name"]);
          const propertyName = firstText(row, ["property", "property name", "building"]);
          const unitNumber = firstText(row, ["unit", "unit number", "unit_number", "house"]);
          if (!name || !propertyName || !unitNumber) {
            warnings.push(`Tenants row ${idx + 2}: missing name/property/unit. Skipped.`);
            return;
          }
          const phoneRaw = firstText(row, ["phone", "phone number", "mobile"]);
          const rentRaw = firstText(row, ["rent", "rent amount", "rent_due"]);
          const openingRaw = firstText(row, ["opening balance", "opening_balance", "arrears", "balance"]);
          const depositRaw = firstText(row, ["security deposit", "security_deposit", "deposit"]);
          const proratedRaw = firstText(row, ["is prorated", "is_prorated", "prorated"]);
          const firstMonthRaw = firstText(row, ["first month override", "first_month_override", "first month charge"]);
          const leaseRaw = firstText(row, ["lease start", "lease_start", "start date"]);
          const isProrated = parseBoolean(proratedRaw, false);
          tenants.push({
            name,
            phone: phoneRaw ? normalizeKenyanPhone(phoneRaw) : "",
            propertyName,
            unitNumber,
            rentAmount: parseNumber(rentRaw, 0),
            leaseStart: parseDate(leaseRaw),
            openingBalance: parseNumber(openingRaw, 0),
            securityDeposit: parseNumber(depositRaw, 0),
            isProrated,
            firstMonthOverride: isProrated ? parseNumber(firstMonthRaw, 0) : null,
          });
        });
      }

      setResult({ properties, units, tenants, warnings, errors });
    } catch (error) {
      setResult({
        properties: [],
        units: [],
        tenants: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : "Failed to parse file"],
      });
    } finally {
      setIsParsing(false);
    }
  };

  const applyManualMapping = () => {
    const rows = selectedSheetRows;
    const warnings: string[] = [];
    const errors: string[] = [];
    const properties: PropertyImportRow[] = [];
    const units: UnitImportRow[] = [];
    const tenants: TenantImportRow[] = [];

    if (rows.length === 0) {
      setResult({ properties, units, tenants, warnings, errors: ["Selected sheet has no rows."] });
      return;
    }

    const fields = datasetFields(mappingDataset);
    for (const f of fields.filter((x) => x.required)) {
      if (!mapping[f.key] || mapping[f.key] === NO_COLUMN) errors.push(`Map required field: ${f.label}.`);
    }
    if (mappingDataset !== "properties" && (!mapping.propertyName || mapping.propertyName === NO_COLUMN) && !defaultPropertyName.trim()) {
      errors.push("Provide default property name when property column is not mapped.");
    }
    if (errors.length > 0) {
      setResult({ properties, units, tenants, warnings, errors });
      return;
    }

    const getValue = (row: string[], key: string) => {
      const mapped = mapping[key];
      if (!mapped || mapped === NO_COLUMN) return "";
      const idx = Number(mapped);
      return Number.isFinite(idx) ? toText(row[idx]) : "";
    };

    rows.slice(headerRow).forEach((row, idx) => {
      const line = headerRow + idx + 1;
      if (row.every((c) => !toText(c))) return;

      if (mappingDataset === "tenants") {
        const name = getValue(row, "tenantName");
        const unitNumber = getValue(row, "unitNumber");
        const propertyName = getValue(row, "propertyName") || defaultPropertyName.trim();
        const comments = getValue(row, "comments");
        if (!name || !unitNumber || !propertyName) {
          warnings.push(`Row ${line}: missing tenant/unit/property. Skipped.`);
          return;
        }
        if (skipVacantRows && (normalizeKey(comments).includes("vacant") || normalizeKey(name) === "vacant")) return;
        tenants.push({
          name,
          phone: (() => { const v = getValue(row, "phone"); return v ? normalizeKenyanPhone(v) : ""; })(),
          propertyName,
          unitNumber,
          rentAmount: parseNumber(getValue(row, "rentAmount"), 0),
          leaseStart: parseDate(getValue(row, "leaseStart")),
          openingBalance: parseNumber(getValue(row, "openingBalance"), 0),
          securityDeposit: parseNumber(getValue(row, "securityDeposit"), 0),
          isProrated: parseBoolean(getValue(row, "isProrated"), false),
          firstMonthOverride: (() => { const v = getValue(row, "firstMonthOverride"); return v ? parseNumber(v, 0) : null; })(),
        });
      }

      if (mappingDataset === "units") {
        const unitNumber = getValue(row, "unitNumber");
        const propertyName = getValue(row, "propertyName") || defaultPropertyName.trim();
        if (!unitNumber || !propertyName) {
          warnings.push(`Row ${line}: missing unit/property. Skipped.`);
          return;
        }
        units.push({ unitNumber, propertyName });
      }

      if (mappingDataset === "properties") {
        const name = getValue(row, "name");
        if (!name) {
          warnings.push(`Row ${line}: missing property name. Skipped.`);
          return;
        }
        properties.push({
          name,
          streetAddress: getValue(row, "streetAddress"),
          neighborhood: getValue(row, "neighborhood"),
          townCity: getValue(row, "townCity"),
          county: getValue(row, "county"),
          landmark: getValue(row, "landmark"),
          postalCode: getValue(row, "postalCode"),
          numberingStyle: ["numbers", "letters", "block_unit", "floor_unit"].includes(getValue(row, "numberingStyle"))
            ? (getValue(row, "numberingStyle") as PropertyImportRow["numberingStyle"])
            : "numbers",
        });
      }
    });

    if (mappingDataset === "tenants") {
      const p = new Set<string>();
      const u = new Set<string>();
      tenants.forEach((t) => {
        p.add(t.propertyName.trim().toLowerCase());
        u.add(`${t.propertyName.trim().toLowerCase()}::${t.unitNumber.trim().toLowerCase()}`);
      });
      p.forEach((nameKey) => {
        const ref = tenants.find((t) => t.propertyName.trim().toLowerCase() === nameKey);
        if (ref) properties.push({ name: ref.propertyName, numberingStyle: "numbers" });
      });
      u.forEach((unitKey) => {
        const [propertyNameKey, unitNumberKey] = unitKey.split("::");
        const ref = tenants.find((t) => t.propertyName.trim().toLowerCase() === propertyNameKey && t.unitNumber.trim().toLowerCase() === unitNumberKey);
        if (ref) units.push({ propertyName: ref.propertyName, unitNumber: ref.unitNumber });
      });
    }

    setResult({ properties, units, tenants, warnings, errors });
  };

  useEffect(() => {
    if (columnOptions.length === 0) return;
    setMapping(inferFieldMappings(columnOptions, mappingDataset));
  }, [columnOptions, mappingDataset]);

  const runImport = async () => {
    if (!result) return;
    if (result.errors.length > 0) {
      toast({ title: "Cannot import", description: "Resolve parser errors first.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const importWarnings = [...result.warnings];
      let createdProperties = 0;
      let createdUnits = 0;
      let createdTenants = 0;

      const { data: existingProperties } = await supabase
        .from("properties")
        .select("id, name")
        .eq("user_id", userId);

      const propertyMap = new Map<string, string>();
      (existingProperties ?? []).forEach((p) => propertyMap.set(p.name.trim().toLowerCase(), p.id));

      for (const row of result.properties) {
        const key = row.name.trim().toLowerCase();
        if (propertyMap.has(key)) {
          if (!skipDuplicates) importWarnings.push(`Property "${row.name}" exists. Skipped.`);
          continue;
        }
        const { data, error } = await supabase
          .from("properties")
          .insert({
            user_id: userId,
            name: row.name,
            street_address: row.streetAddress || null,
            neighborhood: row.neighborhood || null,
            town_city: row.townCity || null,
            county: row.county || null,
            landmark: row.landmark || null,
            postal_code: row.postalCode || null,
            numbering_style: row.numberingStyle || "numbers",
          })
          .select("id, name")
          .single();
        if (error) {
          importWarnings.push(`Property "${row.name}" failed: ${error.message}`);
          continue;
        }
        propertyMap.set(data.name.trim().toLowerCase(), data.id);
        createdProperties += 1;
      }

      const propertyIds = Array.from(propertyMap.values());
      const { data: existingUnits } = propertyIds.length
        ? await supabase.from("units").select("id, property_id, unit_number").in("property_id", propertyIds)
        : { data: [] as Array<{ id: string; property_id: string; unit_number: string }> };

      const unitMap = new Map<string, string>();
      (existingUnits ?? []).forEach((u) => unitMap.set(`${u.property_id}::${u.unit_number.trim().toLowerCase()}`, u.id));

      for (const row of result.units) {
        const propertyId = propertyMap.get(row.propertyName.trim().toLowerCase());
        if (!propertyId) {
          importWarnings.push(`Unit "${row.unitNumber}" skipped: property "${row.propertyName}" not found.`);
          continue;
        }
        const unitKey = `${propertyId}::${row.unitNumber.trim().toLowerCase()}`;
        if (unitMap.has(unitKey)) {
          if (!skipDuplicates) importWarnings.push(`Unit "${row.propertyName}/${row.unitNumber}" exists. Skipped.`);
          continue;
        }
        const { data, error } = await supabase
          .from("units")
          .insert({ property_id: propertyId, unit_number: row.unitNumber })
          .select("id")
          .single();
        if (error) {
          importWarnings.push(`Unit "${row.propertyName}/${row.unitNumber}" failed: ${error.message}`);
          continue;
        }
        unitMap.set(unitKey, data.id);
        createdUnits += 1;
      }

      for (const row of result.tenants) {
        const propertyId = propertyMap.get(row.propertyName.trim().toLowerCase());
        if (!propertyId) {
          importWarnings.push(`Tenant "${row.name}" skipped: property "${row.propertyName}" not found.`);
          continue;
        }
        const unitId = unitMap.get(`${propertyId}::${row.unitNumber.trim().toLowerCase()}`);
        if (!unitId) {
          importWarnings.push(`Tenant "${row.name}" skipped: unit "${row.unitNumber}" not found.`);
          continue;
        }
        const { data: existingTenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("unit_id", unitId)
          .eq("name", row.name)
          .maybeSingle();
        if (existingTenant && skipDuplicates) continue;
        if (existingTenant && !skipDuplicates) {
          importWarnings.push(`Tenant "${row.name}" already exists in ${row.propertyName}/${row.unitNumber}.`);
          continue;
        }
        try {
          await createTenantAndCharges(row, unitId, userId);
          createdTenants += 1;
        } catch (error) {
          importWarnings.push(`Tenant "${row.name}" failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      setResult((prev) => (prev ? { ...prev, warnings: importWarnings } : prev));
      toast({
        title: "Import complete",
        description: `Created ${createdProperties} properties, ${createdUnits} units, ${createdTenants} tenants.`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unexpected import error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="surface-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Onboarding Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="onboarding-file">Upload XLSX/CSV</Label>
          <Input
            id="onboarding-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              await parseFile(file);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Standard tabs work (`Properties`, `Units`, `Tenants`). For custom formats, use mapping below.
          </p>
        </div>

        {fileName ? (
          <div className="rounded-lg border border-border px-3 py-2 text-xs">
            Loaded file: <span className="font-semibold">{fileName}</span>
          </div>
        ) : null}

        {sheets.length > 0 ? (
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-sm font-semibold">Manual Heading Mapping</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Dataset</Label>
                <Select
                  value={mappingDataset}
                  onValueChange={(v) => {
                    const dataset = v as DatasetType;
                    setMappingDataset(dataset);
                    setMapping(inferFieldMappings(columnOptions, dataset));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenants">Tenants</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                    <SelectItem value="properties">Properties</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sheet</Label>
                <Select
                  value={selectedSheet}
                  onValueChange={(sheet) => {
                    setSelectedSheet(sheet);
                    const rows = sheets.find((s) => s.name === sheet)?.rows ?? [];
                    setHeaderRow(detectHeaderRow(rows));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sheets.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Header Row</Label>
                <Input type="number" min={1} value={headerRow} onChange={(e) => setHeaderRow(Math.max(1, Number(e.target.value || 1)))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default Property Name</Label>
                <Input value={defaultPropertyName} onChange={(e) => setDefaultPropertyName(e.target.value)} placeholder="If property column missing" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="skip-vacant" checked={skipVacantRows} onCheckedChange={(v) => setSkipVacantRows(Boolean(v))} />
              <Label htmlFor="skip-vacant" className="text-xs">Skip rows marked VACANT</Label>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {datasetFields(mappingDataset).map((f) => (
                <div key={f.key} className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-xs">{f.label}{f.required ? <span className="text-destructive"> *</span> : null}</Label>
                  <Select value={mapping[f.key] || NO_COLUMN} onValueChange={(v) => setMapping((prev) => ({ ...prev, [f.key]: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COLUMN}>Not mapped</SelectItem>
                      {columnOptions.map((c) => (
                        <SelectItem key={`${c.index}-${c.label}`} value={String(c.index)}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full" onClick={applyManualMapping}>
              Apply Mapping
            </Button>
          </div>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border p-2 text-center"><p className="text-[10px] uppercase text-muted-foreground">Properties</p><p className="text-lg font-bold">{result.properties.length}</p></div>
              <div className="rounded-lg border border-border p-2 text-center"><p className="text-[10px] uppercase text-muted-foreground">Units</p><p className="text-lg font-bold">{result.units.length}</p></div>
              <div className="rounded-lg border border-border p-2 text-center"><p className="text-[10px] uppercase text-muted-foreground">Tenants</p><p className="text-lg font-bold">{result.tenants.length}</p></div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="skip-duplicates" checked={skipDuplicates} onCheckedChange={(v) => setSkipDuplicates(Boolean(v))} />
              <Label htmlFor="skip-duplicates" className="text-xs">Skip duplicates automatically</Label>
            </div>

            {result.errors.length > 0 ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-sm font-semibold flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Parser Errors</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {result.errors.slice(0, 8).map((err, i) => <li key={`${err}-${i}`}>{err}</li>)}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 p-3">
                <p className="text-sm font-semibold flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Ready to import</p>
                <p className="text-xs text-emerald-700/80 mt-1">{importableCount} rows are ready.</p>
              </div>
            )}

            {result.warnings.length > 0 ? (
              <div className="space-y-2">
                <Badge variant="outline">{result.warnings.length} warnings</Badge>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border p-2 text-xs space-y-1">
                  {result.warnings.slice(0, 24).map((warn, i) => <p key={`${warn}-${i}`}>{warn}</p>)}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <Button className="w-full" disabled={!result || result.errors.length > 0 || isParsing || isImporting} onClick={runImport}>
          <Upload className="h-4 w-4 mr-2" />
          {isParsing ? "Parsing..." : isImporting ? "Importing..." : "Import Onboarding Data"}
        </Button>
      </CardContent>
    </Card>
  );
}
