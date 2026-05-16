import pandas as pd

# 1. Definimos las alergias principales y las palabras clave de los ingredientes que las detonan
datos_alergias = {
    "Alergia_Afeccion": [
        "Intolerancia a la Lactosa / Lácteos", 
        "Celiaquía / Gluten", 
        "Alergia a Frutos Secos", 
        "Alergia a Cacahuetes", 
        "Alergia al Marisco", 
        "Alergia al Pescado",
        "Alergia al Huevo",
        "Alergia a la Soja"
    ],
    "Ingredientes_Desencadenantes": [
        "milk, cheese, butter, cream, yogurt, whey, casein, ghee, parmesan, mozzarella, cheddar",
        "wheat, flour, barley, rye, oats, malt, bread, pasta, dough, crust, soy sauce, crumb",
        "almond, walnut, pecan, cashew, pistachio, hazelnut, macadamia, pine nut",
        "peanut, peanut butter, peanut oil",
        "shrimp, crab, lobster, prawn, mussel, oyster, clam, scallop",
        "salmon, tuna, cod, tilapia, mahi, halibut, trout, anchovy, fish",
        "egg, eggs, mayonnaise, meringue, yolk, egg white",
        "soy, soybean, tofu, edamame, miso, tempeh, soy sauce"
    ]
}
# 2. Creamos el DataFrame
df_alergenos = pd.DataFrame(datos_alergias)
# 3. Lo guardamos en un CSV para tenerlo archivado
df_alergenos.to_csv('alergenos_alimenticios.csv', index=False)
# Mostramos cómo queda el dataset
print(df_alergenos)