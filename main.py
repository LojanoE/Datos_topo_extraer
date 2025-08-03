import pytesseract
import cv2
from tkinter import Tk, filedialog
import re
import os
import math
import pandas as pd

# Ajusta esta ruta si tu instalación de Tesseract está en otro lugar
pytesseract.pytesseract.tesseract_cmd = (
    r'C:\Users\LojanoE\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'
)

def extraer_datos(texto):
    datos = {
        'N': 'NO ENCONTRADO',
        'E': 'NO ENCONTRADO',
        'Elevation': 'NO ENCONTRADO',
        'Stn': 'NO ENCONTRADO',
        'Nombre Punto': 'NO ENCONTRADO',
        'Código': 'NO ENCONTRADO',
        'STK': 'NO ENCONTRADO',
        'ABS': 'NO ENCONTRADO'
    }

    # 1) Extraer N, E, Elevation, Stn
    patrones = {
        'N':        r'N\s*[:=]?\s*(\d+\.\d+)',
        'E':        r'E\s*[:=]?\s*(\d+\.\d+)',
        'Elevation':r'Elevation\s*[:=]?\s*(\d+\.\d+)',
        'Stn':      r'Stn[:=]?\s*([A-Za-z0-9\+\-\.]+)'
    }
    for k, p in patrones.items():
        m = re.search(p, texto)
        if m:
            datos[k] = m.group(1).strip()

    # 2) Extraer Nombre Punto y Código desde la línea que contiene 'STK_'
    for line in texto.splitlines():
        if 'STK_' in line:
            parts = line.strip().split()
            datos['Nombre Punto'] = parts[0]
            if len(parts) > 1:
                datos['Código'] = ' '.join(parts[1:])
            break

    # 3) Si Código sigue sin detectarse, buscar encabezado "Código"
    if datos['Código'] == 'NO ENCONTRADO':
        lines = texto.splitlines()
        for i, line in enumerate(lines):
            if re.search(r'(Código|C[eé]digo)', line, re.IGNORECASE):
                if i + 1 < len(lines):
                    cand = lines[i + 1].strip()
                    if 1 < len(cand.split()) < 6:
                        datos['Código'] = cand
                break

    # 4) Combinar Nombre Punto + Código en STK
    np_ = datos['Nombre Punto']
    cd_ = datos['Código']
    if np_ != 'NO ENCONTRADO' or cd_ != 'NO ENCONTRADO':
        datos['STK'] = f"{np_} {cd_}".strip()

    # 5) Función para truncar sin redondear a 2 decimales
    def truncar(val_str):
        try:
            f = float(val_str)
            t = math.floor(f * 100) / 100
            return f"{t:.2f}"
        except:
            return val_str

    # Truncar N, E, Elevation
    datos['N'] = truncar(datos['N'])
    datos['E'] = truncar(datos['E'])
    datos['Elevation'] = truncar(datos['Elevation'])

    # 6) Truncar la parte numérica de Stn (ej. K3+38.6054 → K3+38.60)
    m_stn = re.match(r'(.+\+)(\d+\.\d+)', datos['Stn'])
    if m_stn:
        prefix, num = m_stn.groups()
        datos['Stn'] = f"{prefix}{truncar(num)}"

    # 7) Calcular ABS a partir de 'Stn'
    m_abs = re.match(r'K([+-]?\d+)\+(\d+\.\d+)', datos['Stn'])
    if m_abs:
        km_str, m_str = m_abs.groups()
        km_int = int(km_str)
        m_f = float(m_str)
        total = (abs(km_int) * 100 + m_f) if km_int >= 0 else -(abs(km_int) * 100 + m_f)
        total_trunc = math.floor(total * 100) / 100
        datos['ABS'] = f"{total_trunc:.2f}"

    return datos

def seleccionar_imagenes():
    Tk().withdraw()
    return filedialog.askopenfilenames(
        title="Selecciona imágenes",
        filetypes=[("Imágenes", "*.jpg *.jpeg *.png")]
    )

def procesar_imagen(ruta):
    img = cv2.imread(ruta)
    texto = pytesseract.image_to_string(img)
    return extraer_datos(texto)

def main():
    rutas = seleccionar_imagenes()
    registros = []

    for ruta in rutas:
        datos = procesar_imagen(ruta)
        print(f"\n📷 Procesando: {os.path.basename(ruta)}")
        print(f"N: {datos['N']}")
        print(f"E: {datos['E']}")
        print(f"Elevation: {datos['Elevation']}")
        print(f"Stn: {datos['Stn']}")
        print(f"Nombre Punto: {datos['Nombre Punto']}")
        print(f"Código: {datos['Código']}")
        print(f"STK: {datos['STK']}")
        print(f"ABS: {datos['ABS']}")

        registros.append(datos)

    # Crear DataFrame y exportar a Excel
    df = pd.DataFrame(registros, columns=[
        'N', 'E', 'Elevation', 'Stn',
        'Nombre Punto', 'Código', 'STK', 'ABS'
    ])
    output_path = "datos_extraidos.xlsx"
    df.to_excel(output_path, index=False)

    # Abrir el archivo Excel automáticamente (Windows)
    os.startfile(output_path)

    print(f"\n✅ Datos exportados y abierto en '{output_path}'")

if __name__ == "__main__":
    main()
