export const pageIdGen = (stop: number) => {
  return [...Array(stop)].map((_, i) => i + 1);
};
