import csv
import re
import json
from tabulate import tabulate

class EpaWrangler:
    """
    Clase para manejar la carga de archivos Encuesta Población Activa (EPA) CSV y su procesamiento.

    Métodos:
    --------
    cargar_datos_csv(ruta_csv):
        Intenta abrir un archivo CSV y leer sus filas.
        Maneja errores si el archivo no existe o tiene problemas de formato.

    Uso:
    ----
    converter = EpaConverter()
    converter.cargar_datos_csv("archivo.csv")
    """

    encabezados = ['id_comunidad', 'año', 'genero', 'nombre_comunidad', 'tasa_empleo']
    filas_ordenadas = []

    def cargar_datos_csv(self, ruta_csv):
        """
        Carga y procesa un archivo CSV.

        Parámetros:
        -----------
        ruta_csv : str
            Ruta del archivo CSV a cargar.

        Excepciones:
        ------------
        - FileNotFoundError: Si el archivo no existe.
        - csv.Error: Si hay errores en la estructura del CSV.
        - Exception: Para manejar otros errores inesperados.

        Ejemplo de uso:
        ---------------
        converter = EpaConverter()
        converter.cargar_datos_csv("datos.csv")
        """

        print(f"\n- RUTA CSV {ruta_csv}")
        filas = []
        try:
            # Intentar abrir el archivo CSV
            with open(
                ruta_csv,
                mode="r",
                encoding="utf-8",
            ) as archivo:
                patron_comunidad = re.compile(r"^(\d+)\s+(.+)$")
                lector = csv.reader(archivo, delimiter=";")
                head = next(lector)
                print(f"CSV HEAD {head}")
                for fila in lector:
                    genero = fila[0]
                    if genero not in ["Hombres", "Mujeres"]:
                        continue
                    comunidad = str(fila[1])
                    match = patron_comunidad.match(comunidad)
                    if not match:
                        continue
                    edad = fila[2]
                    if edad != 'Total':
                        continue
                    id_comunidad = match.group(1)
                    nombre_comunidad = match.group(2).strip()

                    try:
                        year_str = fila[3]
                        year = int(year_str)
                    except ValueError:
                        year = 0

                    try:
                        tasa_empleo_str = fila[4]
                        tasa_empleo = float(tasa_empleo_str.replace(',', '.'))
                    except ValueError:
                        tasa_empleo = 0
                    filas.append([id_comunidad, year, genero, nombre_comunidad, tasa_empleo])
        except FileNotFoundError:
            print(f"Error: El archivo '{ruta_csv}' no existe.")
        except csv.Error as e:
            print(f"Error al procesar el archivo CSV: {e}")
        except Exception as e:
            print(f"Ocurrió un error inesperado: {e}")

        self.filas_ordenadas = sorted(filas, key=lambda x: (x[0], x[1], x[2]))
        #print(filas_ordenadas)  # Imprimir cada fila

    def print_data(self):
        print(tabulate(self.filas_ordenadas, headers=self.encabezados, tablefmt="grid"))

    def guardar_en_json(self, ruta_json):
        print('GUARDAR JSON EN', ruta_json)
        obj = [dict(zip(self.encabezados, fila)) for fila in self.filas_ordenadas]
        with open(ruta_json, mode="w", encoding="utf-8") as archivo:
            json.dump(obj, archivo, indent=4, ensure_ascii=False)