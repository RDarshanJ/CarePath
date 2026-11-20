"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { EXERCISE_CONTENT_NOTICE, doseText } from "@carepath/shared";
import { bodyAreas, exerciseCategories, type Exercise } from "@carepath/shared/contracts";
import { Button, Select, Tag, TextInput } from "@carepath/ui";
import { Empty, ListSkeleton, QueryError } from "../../../_components/common";
import { keys, qs, reads } from "../../../_lib/queries";

const areaOptions = [
  { value: "any", label: "Any body area" },
  ...bodyAreas.map((a) => ({ value: a, label: a })),
];
const categoryOptions = [
  { value: "any", label: "Any type" },
  ...exerciseCategories.map((c) => ({ value: c, label: c })),
];

function suggestion(e: Exercise): string {
  const text = doseText({ ...e.defaults, restSeconds: 0 });
  return text ? `Suggested ${text}` : "No suggested dose";
}

/** Exercise library search and filter. Adding puts the exercise at the end of the plan. */
export function ExerciseLibrary({
  inPlan,
  onAdd,
}: {
  inPlan: Set<string>;
  onAdd: (exercise: Exercise) => void;
}) {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [area, setArea] = useState("any");
  const [category, setCategory] = useState("any");
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const signature = qs({
    q: term || undefined,
    bodyArea: area === "any" ? undefined : area,
    category: category === "any" ? undefined : category,
  });
  const list = useInfiniteQuery({
    queryKey: keys.exercises(signature),
    queryFn: ({ pageParam }) =>
      reads.exercises(
        `${signature}${signature ? "&" : "?"}limit=25${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="lib-search" className="text-small font-medium text-ink">
            Search the library
          </label>
          <TextInput
            id="lib-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Exercise name"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="lib-area" className="text-small font-medium text-ink">
              Body area
            </label>
            <Select id="lib-area" options={areaOptions} value={area} onValueChange={setArea} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="lib-type" className="text-small font-medium text-ink">
              Type
            </label>
            <Select
              id="lib-type"
              options={categoryOptions}
              value={category}
              onValueChange={setCategory}
            />
          </div>
        </div>
      </div>

      <p role="status" className="text-small text-ink-muted">
        {list.data
          ? `${items.length} ${items.length === 1 ? "exercise" : "exercises"} shown${list.hasNextPage ? ", more available" : ""}`
          : "Loading exercises"}
      </p>

      {list.isError ? (
        <QueryError error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <ListSkeleton rows={6} label="Loading exercises" />
      ) : items.length === 0 ? (
        <Empty icon="search" title="No exercises match">
          Clear the search or choose a different body area or type.
        </Empty>
      ) : (
        <ul
          aria-label="Exercise library"
          className="flex flex-col divide-y divide-border rounded-container border border-border"
        >
          {items.map((e) => {
            const added = inPlan.has(e.id);
            return (
              <li key={e.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-label font-semibold text-ink">{e.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Tag>{e.bodyArea}</Tag>
                    <Tag>{e.category}</Tag>
                  </div>
                  <p className="mt-1 text-small text-ink-muted">{suggestion(e)}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  iconLeft={added ? "check" : "plus"}
                  aria-label={added ? `${e.name} is in the plan` : `Add ${e.name} to the plan`}
                  aria-disabled={added || undefined}
                  onClick={() => {
                    if (!added) onAdd(e);
                  }}
                >
                  {added ? "In the plan" : "Add"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {list.hasNextPage ? (
        <Button
          variant="secondary"
          size="sm"
          loading={list.isFetchingNextPage}
          loadingLabel="Loading"
          onClick={() => void list.fetchNextPage()}
        >
          Load more exercises
        </Button>
      ) : null}
      <p className="text-small text-ink-muted">{EXERCISE_CONTENT_NOTICE}</p>
    </div>
  );
}
