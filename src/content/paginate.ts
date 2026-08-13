export const pageIdGen = (stop: number) => {
  return [...Array(stop)].map((_, i) => i + 1);
};

export const paginate = <T>(items: T[], perPage: number, page: number): T[] =>
  items.slice((page - 1) * perPage, page * perPage);

export const pageCount = (items: unknown[], perPage: number): number =>
  Math.ceil(items.length / perPage);
