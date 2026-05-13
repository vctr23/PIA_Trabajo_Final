import time
import csv
import requests
import json
from bs4 import BeautifulSoup

# Rutas de archivos
RUTA_CLASES = r"c:\Users\coast\Documents\PIA_Trabajo_Final\food-101\meta\classes.txt"
RUTA_OUTPUT = r"c:\Users\coast\Documents\PIA_Trabajo_Final\ingredientes_allrecipes.csv"

def obtener_ingredientes_allrecipes(clase_comida):
    # 1. Formateamos el nombre para la búsqueda: 'apple_pie' -> 'apple pie'
    query = clase_comida.replace('_', ' ')
    url_busqueda = f"https://www.allrecipes.com/search?q={query}"
    
    # Cabecera simulando un navegador real
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    try:
        # Hacemos la búsqueda
        res_busqueda = requests.get(url_busqueda, headers=headers)
        if res_busqueda.status_code != 200:
            return "Error en la búsqueda (Código no 200)"

        soup_busqueda = BeautifulSoup(res_busqueda.text, 'html.parser')
        
        # 2. Buscamos el primer resultado que sea una receta
        enlace_receta = None
        for a in soup_busqueda.find_all('a', href=True):
            if 'https://www.allrecipes.com/recipe/' in a['href']:
                enlace_receta = a['href']
                break
                
        if not enlace_receta:
            return "No se encontraron recetas"

        # 3. Accedemos a la página de la receta
        res_receta = requests.get(enlace_receta, headers=headers)
        soup_receta = BeautifulSoup(res_receta.text, 'html.parser')

        # 4. Buscamos el JSON-LD donde guardan los ingredientes estructurados
        scripts_json = soup_receta.find_all('script', type='application/ld+json')
        
        for script in scripts_json:
            if not script.string:
                continue
                
            try:
                datos = json.loads(script.string)
            except json.JSONDecodeError:
                continue
                
            # A veces Allrecipes guarda los datos como una lista de diccionarios
            if isinstance(datos, list):
                for item in datos:
                    tipos = item.get('@type', [])
                    # Si el tipo es 'Recipe' o una lista que contiene 'Recipe'
                    if 'Recipe' == tipos or (isinstance(tipos, list) and 'Recipe' in tipos):
                        ingredientes = item.get('recipeIngredient', [])
                        return " | ".join(ingredientes) # Los unimos separados por ' | '
            
            # Ocasionalmente puede venir dentro de un bloque @graph
            elif isinstance(datos, dict) and '@graph' in datos:
                for item in datos['@graph']:
                    tipos = item.get('@type', [])
                    if 'Recipe' == tipos or (isinstance(tipos, list) and 'Recipe' in tipos):
                        ingredientes = item.get('recipeIngredient', [])
                        return " | ".join(ingredientes)

        return "Receta encontrada pero sin JSON estructurado de ingredientes"

    except Exception as e:
        return f"Error de conexión: {e}"

def main():
    try:
        with open(RUTA_CLASES, 'r', encoding='utf-8') as f:
            clases = [linea.strip() for linea in f.readlines()]
    except FileNotFoundError:
        print("¡Error! No se ha encontrado el archivo classes.txt.")
        return

    # Abrimos el CSV
    with open(RUTA_OUTPUT, 'w', newline='', encoding='utf-8-sig') as archivo_csv:
        writer = csv.writer(archivo_csv)
        writer.writerow(['Clase_Plato', 'Ingredientes_Allrecipes'])
        
        print(f"Iniciando scraping de AllRecipes para {len(clases)} platos...\n")
        
        for plato in clases:
            print(f"Buscando: {plato}...")
            ingredientes = obtener_ingredientes_allrecipes(plato)
            writer.writerow([plato, ingredientes])
            
            # Cortamos a 100 caracteres la salida en consola para que no sea inmensa
            resumen = ingredientes[:100] + '...' if len(ingredientes) > 100 else ingredientes
            print(f"  -> {resumen}")
            
            # Pausa obligatoria de 1 a 2 segundos para que no nos bloquee AllRecipes
            time.sleep(1.5)

    print(f"\nLos datos se han guardado en: {RUTA_OUTPUT}")

if __name__ == "__main__":
    main()
