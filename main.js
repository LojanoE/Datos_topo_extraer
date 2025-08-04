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

  const patrones = {
    N: /N\s*[:=]?\s*(\d+\.\d+)/,
    E: /E\s*[:=]?\s*(\d+\.\d+)/,
    Elevation: /Elevation\s*[:=]?\s*(\d+\.\d+)/,
    Stn: /Stn[:=]?\s*([A-Za-z0-9+\-.]+)/
  };
  Object.entries(patrones).forEach(([k, re]) => {
    const m = texto.match(re);
    if (m) datos[k] = m[1];
  });

  texto.split(/\r?\n/).forEach(line => {
    if (line.includes('STK_')) {
      const parts = line.trim().split(/\s+/);
      datos['Nombre Punto'] = parts[0];
      if (parts.length > 1) datos.Código = parts.slice(1).join(' ');
    }
  });

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

  if (datos['Nombre Punto'] !== 'NO ENCONTRADO' || datos.Código !== 'NO ENCONTRADO') {
    datos.STK = `${datos['Nombre Punto']} ${datos.Código}`.trim();
  }

  const truncar = s => {
    const f = parseFloat(s);
    return isNaN(f) ? s : Math.floor(f * 100) / 100;
  };
  ['N','E','Elevation'].forEach(k => datos[k] = truncar(datos[k]));

  const mStn = datos.Stn.match(/(.+\+)(\d+\.\d+)/);
  if (mStn) datos.Stn = mStn[1] + truncar(mStn[2]);

  const mAbs = datos.Stn.match(/K([+-]?\d+)\+(\d+\.\d+)/);
  if (mAbs) {
    const km = parseInt(mAbs[1], 10);
    const m = parseFloat(mAbs[2]);
    const total = (km >= 0 ? 1 : -1) * (Math.abs(km) * 100 + m);
    datos.ABS = Math.floor(total * 100) / 100;
  }

  return datos;
}

async function procesar() {
  const files = document.getElementById('files').files;
  const rows = [];
  const tbody = document.querySelector('#tabla tbody');
  tbody.innerHTML = '';

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    const d = extraerDatos(text);
    rows.push({ Archivo: file.name, ...d });

    const tr = document.createElement('tr');
    ['Archivo','N','E','Elevation','ABS','Stn','Nombre Punto','Código','STK']
      .forEach(col => {
        const td = document.createElement('td');
        td.textContent = rows[rows.length-1][col];
        tr.appendChild(td);
      });
    tbody.appendChild(tr);
  }

  const ws = XLSX.utils.json_to_sheet(rows, { header: ['Archivo','N','E','Elevation','ABS','Stn','Nombre Punto','Código','STK'] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Coordenadas');
  XLSX.writeFile(wb, 'datos_extraidos.xlsx');
}

document.getElementById('procesar').addEventListener('click', procesar);
