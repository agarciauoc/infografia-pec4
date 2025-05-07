import json
import os
import re # Para expresiones regulares
import pandas as pd

# --- Configuración ---

COL_COMUNIDADES = 'CCAA'
COL_TIPO_JORNADA = 'Tipo de jornada'
COL_TIEMPO_TRABAJO = 'Tiempo de trabajo'
COL_PERIODO = 'Periodo'
COL_TOTAL_HORAS = 'Total'

# Crear directorios si no existen
os.makedirs('input_data', exist_ok=True)
os.makedirs('output_data', exist_ok=True)

def cargar_datos_csv(ruta_csv):
    """Carga datos desde un archivo CSV a un DataFrame de Pandas."""
    try:
        df = pd.read_csv(ruta_csv, delimiter=';')
        print(f"Datos cargados exitosamente desde '{ruta_csv}'. Filas: {len(df)}")
        return df
    except FileNotFoundError:
        print(f"Error: El archivo '{ruta_csv}' no fue encontrado.")
        return None
    except Exception as e:
        print(f"Error al cargar el archivo CSV: {e}")
        return None

def extraer_info_comunidades_unicas(df, columna_nombre=COL_COMUNIDADES):
    """
    Extrae nombres únicos de comunidades autónomas que comienzan con un número.
    Devuelve una lista de diccionarios con 'id' y 'name'.
    """
    if df is None or columna_nombre not in df.columns:
        print(f"DataFrame no válido o columna '{columna_nombre}' no encontrada para extraer comunidades.")
        return []

    comunidades_unicas_set = set()
    patron_comunidad = re.compile(r"^(\d+)\s+(.+)$")

    for nombre_completo in df[columna_nombre].dropna().unique():
        nombre_completo_str = str(nombre_completo)
        match = patron_comunidad.match(nombre_completo_str)
        if match:
            id_comunidad = match.group(1)
            nombre_comunidad = match.group(2).strip()
            if nombre_comunidad: # Capitalizar primera letra
                nombre_comunidad = nombre_comunidad[0].upper() + nombre_comunidad[1:]
            comunidades_unicas_set.add((id_comunidad, nombre_comunidad))

    comunidades_extraidas = [
        {"id": id_val, "name": name_val}
        for id_val, name_val in sorted(list(comunidades_unicas_set), key=lambda x: x[0])
    ]
    print(f"Comunidades únicas extraídas: {len(comunidades_extraidas)}")
    return comunidades_extraidas

def procesar_tiempo_trabajo_por_comunidad(df):
    """
    Procesa el DataFrame para extraer datos de tiempo de trabajo por comunidad numerada.
    """
    if df is None:
        print("DataFrame no válido para procesar tiempo de trabajo.")
        return []

    datos_tiempo_trabajo = []
    patron_ca_id = re.compile(r"^(\d+)\s+.*") # Solo para extraer el ID de la comunidad

    for index, row in df.iterrows():
        comunidad_str = str(row.get(COL_COMUNIDADES, ''))
        match_ca_id = patron_ca_id.match(comunidad_str)

        if match_ca_id:
            ca_code = match_ca_id.group(1)

            tipo_jornada = str(row.get(COL_TIPO_JORNADA, ''))
            tiempo_trabajo = str(row.get(COL_TIEMPO_TRABAJO, ''))
            periodo_str = str(row.get(COL_PERIODO, ''))
            total_horas_str = str(row.get(COL_TOTAL_HORAS, ''))

            # Parsear Periodo -> año y trimestre
            año = None
            trimestre = None
            if 'T' in periodo_str and len(periodo_str) >= 5: # Espera formato como "2000T2"
                try:
                    año_parte = periodo_str.split('T')[0]
                    trimestre_parte = 'T' + periodo_str.split('T')[1]
                    if len(año_parte) == 4 and año_parte.isdigit():
                        año = int(año_parte)
                        trimestre = trimestre_parte
                    else:
                        print(f"Advertencia: Formato de año inesperado en Periodo '{periodo_str}' en fila {index}")
                except (IndexError, ValueError) as e:
                    print(f"Advertencia: No se pudo parsear Periodo '{periodo_str}' en fila {index}: {e}")
            else:
                print(f"Advertencia: Formato de Periodo '{periodo_str}' no reconocido en fila {index}")


            # Convertir Horas (Total) a numérico
            horas = None
            if total_horas_str:
                try:
                    # Reemplazar coma por punto y convertir a float
                    horas = float(total_horas_str.replace(',', '.'))
                except ValueError:
                    print(f"Advertencia: No se pudo convertir '{total_horas_str}' a número para horas en fila {index}.")

            registro = {
                "ca_code": ca_code,
                "tipo_jornada": tipo_jornada,
                "tiempo_jornada": tiempo_trabajo,
                "año": año,
                "trimestre": trimestre,
                "horas": horas
            }
            datos_tiempo_trabajo.append(registro)

    print(f"Registros de tiempo de trabajo procesados: {len(datos_tiempo_trabajo)}")
    return datos_tiempo_trabajo

def guardar_json(datos, ruta_json, root_key=None):
    """
    Guarda los datos en un archivo JSON.
    Si se provee root_key, los datos se anidan bajo esa clave.
    """
    if datos is None:
        print(f"No hay datos para guardar en '{ruta_json}'.")
        return

    output_data = {root_key: datos} if root_key else datos

    try:
        with open(ruta_json, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        print(f"Datos guardados exitosamente en '{ruta_json}'")
    except Exception as e:
        print(f"Error al guardar el archivo JSON '{ruta_json}': {e}")
