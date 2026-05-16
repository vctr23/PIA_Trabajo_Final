import os
import io
import re
import base64
import numpy as np
import pandas as pd
from PIL import Image
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf
from tensorflow.keras.models import load_model

app = FastAPI()

# Configurar CORS para permitir peticiones desde React (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permitir todos los orígenes durante desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. CARGA DE MODELO Y DATOS EN EL ARRANQUE ---
print("Cargando modelo...")
try:
    modelo = load_model("modelo_food101.keras")
    print("Modelo cargado con éxito.")
except Exception as e:
    print(f"Error al cargar el modelo: {e}")
    modelo = None

# Obtener los nombres de las clases dinámicamente según el tamaño de salida del modelo
data_dir = 'food-101/images'
if os.path.exists(data_dir):
    todas_las_clases = [d for d in os.listdir(data_dir) if not d.startswith('.') and os.path.isdir(os.path.join(data_dir, d))]
    todas_las_clases = sorted(todas_las_clases)
    num_classes = modelo.output_shape[-1] if modelo else len(todas_las_clases)
    nombres_clases = todas_las_clases[:num_classes]
else:
    nombres_clases = []

# Cargar datasets
try:
    df_ingredientes = pd.read_csv('ingredientes_allrecipes_limpio.csv')
    df_alergenos = pd.read_csv('alergenos_alimenticios.csv')
except Exception as e:
    print("No se encontraron los datasets de ingredientes o alérgenos.")
    df_ingredientes = pd.DataFrame()
    df_alergenos = pd.DataFrame()

# --- 2. DEFINICIÓN DE PETICIONES ---
class ImageRequest(BaseModel):
    image: str

@app.post("/predict")
async def predict(request: ImageRequest):
    if not modelo:
        return {"error": "El modelo no está disponible en el servidor."}
    
    # 1. Decodificar la imagen Base64 enviada por React
    # Formato esperado: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    header, encoded = request.image.split(",", 1)
    imagen_bytes = base64.b64decode(encoded)
    imagen_pil = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")
    
    # Nos aseguramos de que es 180x180 por si el frontend falla
    imagen_pil = imagen_pil.resize((180, 180))
    
    # Convertir a numpy array y añadir dimensión de lote: (1, 180, 180, 3)
    img_array = np.array(imagen_pil)
    img_array = np.expand_dims(img_array, axis=0)
    
    # 2. Hacer predicción
    predicciones = modelo.predict(img_array)[0]
    indice_predicho = int(np.argmax(predicciones))
    
    if len(nombres_clases) > 0:
        plato_predicho = nombres_clases[indice_predicho]
    else:
        plato_predicho = f"Clase_{indice_predicho}"
    
    porcentaje = predicciones[indice_predicho] * 100

    # 3. Cruzar con el Dataset de Ingredientes
    ingredientes_plato = ["Ingredientes desconocidos"]
    descripcion_texto = f"Nuestro modelo está {porcentaje:.2f}% seguro de que esto es {plato_predicho.replace('_', ' ').title()}."
    
    if not df_ingredientes.empty:
        recetas = df_ingredientes[df_ingredientes['Clase_Plato'] == plato_predicho]
        if not recetas.empty:
            ingredientes_receta = recetas.iloc[0]['Ingredientes_Allrecipes']
            ingredientes_plato = [ing.strip().title() for ing in str(ingredientes_receta).split('|')]
            
            # 4. Cruzar con el Dataset de Alérgenos
            alertas = []
            lista_ingredientes_lower = [ing.lower() for ing in ingredientes_plato]
            
            for _, fila in df_alergenos.iterrows():
                alergia = fila['Alergia_Afeccion']
                peligros = [p.strip().lower() for p in fila['Ingredientes_Desencadenantes'].split(',')]
                
                peligros_encontrados = []
                for ing in lista_ingredientes_lower:
                    for peligro in peligros:
                        patron = r'\b' + re.escape(peligro) + r'\b'
                        if re.search(patron, ing):
                            peligros_encontrados.append(ing.title())
                
                if peligros_encontrados:
                    alertas.append(f"❌ {alergia} (Contiene: {', '.join(set(peligros_encontrados))})")
            
            if alertas:
                descripcion_texto = f"El modelo está {porcentaje:.2f}% seguro de que es {plato_predicho.replace('_', ' ').title()}."
            else:
                descripcion_texto = f"El modelo está {porcentaje:.2f}% seguro de que es {plato_predicho.replace('_', ' ').title()}."

    # 5. Respuesta para el frontend
    return {
        "plato": plato_predicho.replace('_', ' ').title(),
        "descripcion": descripcion_texto,
        "ingredientes": ingredientes_plato,
        "alertas": alertas if 'alertas' in locals() else []
    }

if __name__ == "__main__":
    import uvicorn
    # Iniciar servidor en el puerto 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
