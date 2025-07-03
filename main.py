import pytesseract
import cv2
from tkinter import Tk, filedialog
from PIL import Image
import re
import os

# Ruta de Tesseract (modifica según tu sistema)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extraer_datos(texto):
    datos = {}
    patrones = {
        'N': r'N\s*[:=]?\s*(\d+\.\d+)',
        'E': r'E\s*[:=]?\s*(\d+\.\d+)',
        'Elevation': r'Elevation\s*[:=]?\s*(\d+\.\d+)',
        'Código': r'Código\s*[:=]?\s*(.+)',
        'Stn': r'Stn:([A-Za-z0-9\+\-\.]+)'
    }

    for key, patron in patrones.items():
        match = re.search(patron, texto)
        if match:
            datos[key] = match.group(1).strip()
        else:
            datos[key] = 'NO ENCONTRADO'

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
        print(f"\n📷 Procesando: {os.path.basename(ruta)}")
        datos = procesar_imagen(ruta)
        for clave, valor in datos.items():
            print(f"{clave}: {valor}")

if __name__ == "__main__":
    main()
