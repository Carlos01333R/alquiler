export const formatearFecha = (fechaString: any) => {
  if (!fechaString) return "";

  const [year, month, day] = fechaString.split("-");

  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};