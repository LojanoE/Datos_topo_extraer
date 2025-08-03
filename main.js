// Función para extraer datos del texto OCR
function extraerDatos(texto) {
  const datos = {
    N: 'NO ENCONTRADO', E: 'NO ENCONTRADO',
    Elevation: 'NO ENCONTRADO', Stn: 'NO ENCONTRADO',
    'Nombre Punto': 'NO ENCONTRADO', Código: 'NO ENCONTRADO',
    STK: 'NO ENCONTRADO', ABS: 'NO ENCONTRADO'
  };

  // Patrones para N, E, Elevation, Stn
  const patrones = {
    N: /N\s*[:=]?\s*(\d+\.\d+)/,
    E: /E\s*[:=]?\s*(\d+\.\d+)/,
    Elevation: /Elevation\s*[:=]?\s*(\d+\.\d+)/,
    Stn: /Stn[:=]?\s*([A-Za-z0-9+\-.]+)/
  };
  Object.keys(patrones).forEach(k => {
    const m = texto.match(patrones[k]);
    if (m) datos[k] = m[1];
  });

  // Nombre Punto y Código si contienen 'STK_'
  texto.split(/\r?\n/).forEach(line => {
    if (line.includes('STK_')) {
      const parts = line.trim().split(/\s+/);
      datos['Nombre Punto'] = parts[0];
      if (parts.length > 1) datos.Código = parts.slice(1).join(' ');
    }
  });

  // Si Código sigue sin hallarse, buscar línea siguiente a encabezado 'Código'
  if (datos.Código === 'NO ENCONTRADO') {
    const lines = texto.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/C[oó]digo/i.test(line) && lines[i+1]) {
        const cand = lines[i+1].trim();
        const len = cand.split(/\s+/).length;
        if (len > 1 && len < 6) datos.Código = cand;
      }
    });
  }

  // Combinar Nombre Punto + Código en STK
  if (datos['Nombre Punto'] !== 'NO ENCONTRADO' || datos.Código !== 'NO ENCONTRADO') {
    datos.STK = `${datos['Nombre Punto']} ${datos.Código}`.trim();
  }

  // Función truncar sin redondeo a 2 decimales
  function truncar(val) {
    const f = parseFloat(val);
    if (isNaN(f)) return val;
    return Math.floor(f * 100) / 100;
  }
  // Truncar N, E, Elevation
  ['N','E','Elevation'].forEach(k => datos[k] = truncar(datos[k]));

  // Truncar parte numérica de Stn y calcular ABS
  const mStn = datos.Stn.match(/(.+\+)(\d+\.\d+)/);
  if (mStn) datos.Stn = mStn[1] + truncar(mStn[2]);

  const mAbs = datos.Stn.match(/K([+-]?\d+)\+(\d+\.\d+)/);
  if (mAbs) {
    const km = parseInt(mAbs[1], 10), m = parseFloat(mAbs[2]);
    let total = (km >= 0 ? 1 : -1) * (Math.abs(km) * 100 + m);
    datos.ABS = Math.floor(total * 100) / 100;
  }

  return datos;
}

// Manejar el clic del botón para procesar imágenes y generar Excel
async function procesar() {
  const input = document.getElementById('files');
  const archivos = input.files;
  const filas = [];
  const cuerpo = document.querySelector('#tabla tbody');
  cuerpo.innerHTML = '';

  for (const file of archivos) {
    const buffer = await file.arrayBuffer();
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    const d = extraerDatos(text);
    filas.push({ Archivo: file.name, ...d });

    // Mostrar en tabla HTML en nuevo orden
    const tr = document.createElement('tr');
    ['Archivo','N','E','Elevation','ABS','Stn','Nombre Punto','Código','STK'].forEach(campo => {
      const td = document.createElement('td');
      td.textContent = filas[filas.length - 1][campo];
      tr.appendChild(td);
    });
    cuerpo.appendChild(tr);
  }

  // Generar y descargar Excel con SheetJS y encabezados en orden
  const ws = XLSX.utils.json_to_sheet(filas, { header: ['Archivo','N','E','Elevation','ABS','Stn','Nombre Punto','Código','STK'] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Coordenadas');
  XLSX.writeFile(wb, 'datos_extraidos.xlsx');
}

document.getElementById('procesar').addEventListener('click', procesar);
