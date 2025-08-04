
// OCR y parseo de coordenadas en JavaScript
function extraerDatos(texto) {
  const datos = {
    N: 'NO ENCONTRADO',
    E: 'NO ENCONTRADO',
    Elevation: 'NO ENCONTRADO',
    Stn: 'NO ENCONTRADO',
    'Nombre Punto': 'NO ENCONTRADO',
    Código: 'NO ENCONTRADO',
    STK: 'NO ENCONTRADO',
    ABS: 'NO ENCONTRADO'
  };

  // Capturar Elevation (línea que comienza con "Elevation")
  const elevMatch = texto.match(/^Elevation\s*[:=]?\s*(\d+\.\d+)/mi);
  if (elevMatch) datos.Elevation = elevMatch[1];

  // Capturar N (línea que comienza con "N")
  const nMatch = texto.match(/^N\s*[:=]?\s*(\d+\.\d+)/m);
  if (nMatch) datos.N = nMatch[1];

  // Capturar E (línea que comienza con "E" pero no "Elevation")
  const eMatch = texto.match(/^E\s*[:=]?\s*(\d+\.\d+)/m);
  if (eMatch) datos.E = eMatch[1];

  // Buscar línea con STK_ para Nombre Punto y Código
  texto.split(/\r?\n/).forEach(line => {
    if (line.includes('STK_')) {
      const parts = line.trim().split(/\s+/);
      datos['Nombre Punto'] = parts[0];
      if (parts.length > 1) datos.Código = parts.slice(1).join(' ');
    }
  });

  // Si no se encontró Código, buscar línea tras encabezado "Código"
  if (datos.Código === 'NO ENCONTRADO') {
    const lines = texto.split(/\r?\n/);
    for (let i = 0; i < lines.length - 1; i++) {
      if (/C[oó]digo/i.test(lines[i])) {
        const cand = lines[i + 1].trim();
        const parts = cand.split(/\s+/);
        if (parts.length > 1 && parts.length < 6) {
          datos.Código = cand;
        }
        break;
      }
    }
  }

  // Combinar Nombre Punto + Código en STK
  if (datos['Nombre Punto'] !== 'NO ENCONTRADO' || datos.Código !== 'NO ENCONTRADO') {
    datos.STK = `${datos['Nombre Punto']} ${datos.Código}`.trim();
  }

  // Función para truncar sin redondear a 2 decimales
  const truncar = valStr => {
    const f = parseFloat(valStr);
    if (isNaN(f)) return valStr;
    return Math.floor(f * 100) / 100;
  };

  // Truncar N, E, Elevation
  ['N', 'E', 'Elevation'].forEach(key => {
    datos[key] = truncar(datos[key]);
  });

  // Ajustar Stn y calcular ABS
  const stnMatch = datos.Stn.match(/(.+\+)(\d+\.\d+)/);
  if (stnMatch) {
    datos.Stn = stnMatch[1] + truncar(stnMatch[2]);
  }

  const absMatch = datos.Stn.match(/K([+-]?\d+)\+(\d+\.\d+)/);
  if (absMatch) {
    const km = parseInt(absMatch[1], 10);
    const m = parseFloat(absMatch[2]);
    const total = (Math.abs(km) * 100 + m) * (km >= 0 ? 1 : -1);
    datos.ABS = truncar(total);
  }

  return datos;
}

// Procesar imágenes, poblar tabla y descargar Excel
async function procesar() {
  const files = document.getElementById('files').files;
  const rows = [];
  const tbody = document.querySelector('#tabla tbody');
  tbody.innerHTML = '';

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    const datos = extraerDatos(text);
    rows.push({ Archivo: file.name, ...datos });

    const tr = document.createElement('tr');
    ['Archivo','N','E','Elevation','ABS','Stn','Nombre Punto','Código','STK'].forEach(col => {
      const td = document.createElement('td');
      td.textContent = rows[rows.length - 1][col];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  // Generar y descargar Excel con SheetJS
  const ws = XLSX.utils.json_to_sheet(rows, { header: ['Archivo','N','E','Elevation','ABS','Stn','Nombre Punto','Código','STK'] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Coordenadas');
  XLSX.writeFile(wb, 'datos_extraidos.xlsx');
}

document.getElementById('procesar').addEventListener('click', procesar);
