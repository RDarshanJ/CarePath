/**
 * Resolution of references inside one Bundle (FHIR R4 bundle rules, research HD section 5):
 * by fullUrl first, then by resource type and id, then conditional references by identifier.
 * More than one match is ambiguous.
 */
import type { Bundle, Identifier, Resource } from "@medplum/fhirtypes";
import { parseReference, type ParsedReference } from "../references.js";

export interface IndexedEntry {
  index: number;
  fullUrl: string | null;
  resource: Resource & { identifier?: Identifier[] };
}

export type BundleResolution =
  | { kind: "entry"; index: number; type: string }
  | { kind: "ambiguous"; count: number }
  | { kind: "none" };

export class BundleIndex {
  readonly entries: IndexedEntry[];
  private byFullUrl = new Map<string, number[]>();
  private byTypeId = new Map<string, number[]>();
  private byIdentifier = new Map<string, number[]>();

  constructor(bundle: Bundle) {
    this.entries = (bundle.entry ?? []).flatMap((e, index) =>
      e.resource
        ? [{ index, fullUrl: e.fullUrl ?? null, resource: e.resource as IndexedEntry["resource"] }]
        : [],
    );
    const push = (m: Map<string, number[]>, k: string, i: number) =>
      m.set(k, [...(m.get(k) ?? []), i]);
    for (const e of this.entries) {
      if (e.fullUrl) push(this.byFullUrl, e.fullUrl.toLowerCase(), e.index);
      if (e.resource.id)
        push(this.byTypeId, `${e.resource.resourceType}/${e.resource.id}`, e.index);
      for (const id of e.resource.identifier ?? []) {
        if (!id.value) continue;
        push(
          this.byIdentifier,
          `${e.resource.resourceType}|${id.system ?? ""}|${id.value}`,
          e.index,
        );
        push(this.byIdentifier, `${e.resource.resourceType}||${id.value}`, e.index);
      }
    }
  }

  entry(index: number): IndexedEntry | undefined {
    return this.entries.find((e) => e.index === index);
  }

  resolve(raw: string): BundleResolution {
    return this.resolveParsed(parseReference(raw), raw);
  }

  resolveParsed(p: ParsedReference, raw: string): BundleResolution {
    let hits: number[] = [];
    if (p.kind === "uuid") hits = this.byFullUrl.get(`urn:uuid:${p.value}`) ?? [];
    else if (p.kind === "relative") {
      hits = this.byTypeId.get(`${p.type}/${p.id}`) ?? [];
      if (!hits.length) {
        hits = [...this.byFullUrl.entries()]
          .filter(([url]) => url.endsWith(`/${p.type}/${p.id}`.toLowerCase()))
          .flatMap(([, v]) => v);
      }
    } else if (p.kind === "absolute") hits = this.byFullUrl.get(raw.toLowerCase()) ?? [];
    else if (p.kind === "conditional") {
      hits = this.byIdentifier.get(`${p.type}|${p.system ?? ""}|${p.value}`) ?? [];
    }
    const unique = [...new Set(hits)];
    if (unique.length > 1) return { kind: "ambiguous", count: unique.length };
    if (unique.length === 0) return { kind: "none" };
    const e = this.entry(unique[0]!)!;
    return { kind: "entry", index: e.index, type: e.resource.resourceType };
  }
}
