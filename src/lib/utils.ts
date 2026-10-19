export function formatRut(rut: string): string {
  // Limpiar el RUT de cualquier caracter que no sea número o K/k
  const cleanRut = rut.replace(/[^0-9kK]/g, "").toUpperCase();

  if (cleanRut.length < 2) return cleanRut;

  // Separar el cuerpo del dígito verificador
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Agregar los puntos de mil al cuerpo
  let formattedBody = "";
  for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) {
      formattedBody = "." + formattedBody;
    }
    formattedBody = body[i] + formattedBody;
  }

  return `${formattedBody}-${dv}`;
}
