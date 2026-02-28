export const buildNameSearchFilter = (searchText: string) => {
  const trimmed = searchText.trim();
  return trimmed ? { "name@ilike": `%${trimmed}%` } : {};
};
