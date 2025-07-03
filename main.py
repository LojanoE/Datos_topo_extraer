import pytesseract
import cv2
from tkinter import Tk, filedialog
from PIL import Image
import re
import os

# Ruta de Tesseract (modifica según tu sistema)
pytesseract.pytesseract.tesseract_cmd = r'C:\Users\LojanoE\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'

def extraer_datos(texto):
    print("🔍 Texto OCR detectado:\n", texto)

    datos = {}
    patrones = {
        'N': r'N\s*[:=]?\s*(\d+\.\d+)',
        'E': r'E\s*[:=]?\s*(\d+\.\d+)',
        'Elevation': r'Elevation\s*[:=]?\s*(\d+\.\d+)',
        'Stn': r'Stn:([A-Za-z0-9\+\-\.]+)',
    }

    for key, patron in patrones.items():
        match = re.search(patron, texto)
        if match:
            datos[key] = match.group(1).strip()
        else:
            datos[key] = 'NO ENCONTRADO'

    # Captura de "Código" incluso si está mal escaneado como "Cédigo"
    codigo_match = re.search(r'(?:Código|C[eé]digo)[\s:\.=]*\n?([A-Z0-9_\-]+.*)', texto, re.IGNORECASE)
    if not codigo_match:
        # Alternativamente buscar línea después de "Nombre Punto"
        nombre_match = re.search(r'Nombre Punto.*?\n(.*)', texto)
        if nombre_match:
            datos['Código'] = nombre_match.group(1).strip()
        else:
            datos['Código'] = 'NO ENCONTRADO'
    else:
        datos['Código'] = codigo_match.group(1).strip()

    return datos



def seleccionar_imagenes():
    Tk().withdraw()
    rutas = filedialog.askopenfilenames(title="Selecciona imágenes", filetypes=[("JPG", "*.jpg *.jpeg"), ("PNG", "*.png")])
    return rutas

def procesar_imagen(ruta):
    img = cv2.imread(ruta)
    texto = pytesseract.image_to_string(img)
    return extraer_datos(texto)

def main():
    rutas = seleccionar_imagenes()
    for ruta in rutas:
        datos = procesar_imagen(ruta)
        print(f"\n📷 Procesando: {os.path.basename(ruta)}")
        print(f"N: {datos['N']}")
        print(f"E: {datos['E']}")
        print(f"Elevation: {datos['Elevation']}")
        print(f"Stn: {datos['Stn']}")
        print(f"Código: {datos['Código']}")


if __name__ == "__main__":
    main()
