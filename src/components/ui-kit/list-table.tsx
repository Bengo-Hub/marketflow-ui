"use client";

import { DataTable, type DataTableProps } from "@bengo-hub/shared-ui-lib/data-table";
import { cn } from "@/lib/utils";

/** Server paging as MarketFlow's list endpoints return it ({data, total, page, limit}). */
export interface ListPaging {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}

/**
 * The app's list surface: shared-ui-lib's DataTable (desktop table, phone cards, sorting,
 * filters, selection, column chooser, CSV) in the glass card, with row dividers and
 * server paging taken from a ListPaging. Pages pass columns and rows; nothing else is
 * re-implemented per page.
 */
export function ListTable<T>({ paging, className, ...props }: DataTableProps<T> & { paging?: ListPaging }) {
  const pages = paging ? Math.max(1, Math.ceil(paging.total / Math.max(1, paging.limit))) : undefined;
  return (
    <DataTable<T>
      gridLines="rows"
      loadingRows={6}
      maxBodyHeight={false}
      {...props}
      className={cn("glass rounded-[1.25rem] p-2", className)}
      {...(paging ? { page: paging.page, totalPages: pages, total: paging.total, onPageChange: paging.onPage } : {})}
    />
  );
}
