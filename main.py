import os

from lib.epa import EpaWrangler
from lib.ees import EesWrangler
from lib.gastos import GastosWrangler

DATA_SOURCE = 'data_source'
DATA_OUTPUT = 'data_output'

INPUT_CSV_TTRABAJO = os.path.join(DATA_SOURCE, '6091-tiempo-trabajo.csv')
INPUT_CSV_EPA = os.path.join(DATA_SOURCE,'66031-epa.csv')
INPUT_CSV_EES = os.path.join(DATA_SOURCE,'28191-ees.csv')
INPUT_CSV_GASTOS = os.path.join(DATA_SOURCE,'25143-gastos.csv')

OUTPUT_JSON_COMUNIDADES_FILE = os.path.join(DATA_OUTPUT,'comunidades.json')
OUTPUT_JSON_TIEMPO_TRABAJO_FILE = os.path.join(DATA_OUTPUT, 'tiempo_trabajo_por_comunidad.json')
OUTPUT_JSON_EPA = os.path.join(DATA_OUTPUT,'epa.json')
OUTPUT_JSON_EES = os.path.join(DATA_OUTPUT,'ees.json')
OUTPUT_JSON_GASTOS = os.path.join(DATA_OUTPUT, 'gastos.json')

DICT_CAN_CAID = {
    'Andalucía':                   '01',
    'Aragón':                      '02',
    'Asturias, Principado de':     '03',
    'Balears, Illes':              '04',
    'Canarias':                    '05',
    'Cantabria':                   '06',
    'Castilla y León':             '07',
    'Castilla - La Mancha':        '08',
    'Cataluña':                    '09',
    'Comunitat Valenciana':        '10',
    'Extremadura':                 '11',
    'Galicia':                     '12',
    'Madrid, Comunidad de':        '13',
    'Murcia, Región de':           '14',
    'Navarra, Comunidad Foral de': '15',
    'País Vasco':                  '16',
    'Rioja, La':                   '17',
}

os.makedirs(DATA_OUTPUT, exist_ok=True)

if __name__ == "__main__":
    print("\nInfografía y Visualización - PEC4 (parte 1)")
    print("Por: Antonio Miguel García del Río")
    print("\nProcesado de datos:")

    epa = EpaWrangler()
    epa.cargar_datos_csv(INPUT_CSV_EPA)
    epa.guardar_en_json(OUTPUT_JSON_EPA)
    #epa.print_data()

    ees = EesWrangler()
    ees.cargar_datos_csv(INPUT_CSV_EES, DICT_CAN_CAID)
    ees.guardar_en_json(OUTPUT_JSON_EES)
    #ees.print_data()

    gastos = GastosWrangler()
    gastos.cargar_datos_csv(INPUT_CSV_GASTOS)
    gastos.guardar_en_json(OUTPUT_JSON_GASTOS)

    print("\n")