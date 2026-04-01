"use server";

export async function searchDNI(dni: string) {
  if (!dni || dni.length !== 8) {
    return { success: false, error: "DNI debe tener 8 dígitos" };
  }

  const token = process.env.APIS_PERU_TOKEN;
  if (!token) {
    return { success: false, error: "Servicio de RENIEC no configurado (Falta Token)." };
  }

  try {
    // Modificado para usar apisperu.com
    const res = await fetch(`https://dniruc.apisperu.com/api/v1/dni/${dni}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      },
      // Usamos cache dinámico
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: "DNI no encontrado en RENIEC" };
      }
      return { success: false, error: "Error de consulta al servidor de RENIEC" };
    }

    const data = await res.json();
    
    // Concatenamos nombre completo
    const fullName = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`;
    
    return {
      success: true,
      name: fullName.trim(),
      raw: data,
    };
  } catch (error) {
    console.error("Error consultando API DNI:", error);
    return { success: false, error: "Servicio no disponible" };
  }
}
