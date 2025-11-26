import os
import pandas as pd
from datetime import datetime
import subprocess
import sys
import time
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, as_completed

try:
    from mutagen import File
    TIENE_MUTAGEN = True
except ImportError:
    TIENE_MUTAGEN = False
    print("Instala mutagen: pip install mutagen")

#############################################################################
## CAMBIAR LA LINEA 233 O 237 PARA BUSCAR EN OTRA CARPETA DE RED O SERVIDOR ##
#############################################################################

def conectar_carpeta_red():
    """
    Conecta a la carpeta compartida en la red
    """
    ruta_red = r"\\110.238.64.237\informa"
    
    try:
        if os.path.exists(ruta_red):
            print(f"✅ Conexión establecida a: {ruta_red}")
            return True
        else:
            print(f"❌ No se pudo acceder a: {ruta_red}")
            print("💡 Intentando conectar con credenciales...")
            
            contraseña = "1nf0rm4#1Vr"
            comando = f'net use {ruta_red} {contraseña}'
            resultado = subprocess.run(comando, shell=True, capture_output=True, text=True)
            
            if resultado.returncode == 0:
                print("✅ Conexión establecida con credenciales")
                return True
            else:
                print(f"❌ Error al conectar: {resultado.stderr}")
                return False
                
    except Exception as e:
        print(f"❌ Error al conectar a la carpeta de red: {e}")
        return False

def obtener_duracion_rapida(ruta_archivo):
    """
    Versión rápida para obtener duración - omite el procesamiento detallado
    """
    try:
        if TIENE_MUTAGEN:
            audio = File(ruta_archivo)
            if audio is not None and hasattr(audio.info, 'length'):
                duracion_segundos = audio.info.length
                minutos = int(duracion_segundos // 60)
                segundos = int(duracion_segundos % 60)
                return f"{minutos}:{segundos:02d}"
        return "N/D"
    except:
        return "Error"

def procesar_archivo_individual(args):
    """
    Procesa un solo archivo - optimizado para paralelismo
    """
    carpeta_audios, archivo = args
    try:
        ruta_completa = os.path.join(carpeta_audios, archivo)
        nombre_completo, extension = os.path.splitext(archivo)
        
        # Procesar nombre (filtro rápido)
        # Importante: solo verificar que el índice 3 sea '19', no importa cuántos bloques tenga
        partes = nombre_completo.split('-')
        if len(partes) < 4 or partes[3] != '19':  # Mínimo 4 partes y el índice 3 debe ser '19'
            return None
        
        # Stats rápidos
        stat_info = os.stat(ruta_completa)
        tamaño_bytes = stat_info.st_size
        
        # Duración solo si es necesario
        duracion = "N/D"
        if TIENE_MUTAGEN:
            try:
                audio = File(ruta_completa)
                if audio and hasattr(audio.info, 'length'):
                    duracion_segundos = audio.info.length
                    duracion = f"{int(duracion_segundos // 60)}:{int(duracion_segundos % 60):02d}"
            except:
                pass
        
        # Extraer campos básicos (siempre presentes)
        resultado = {
            'nombre_completo': archivo,
            'peso_kb': round(tamaño_bytes / 1024, 2),
            'peso_mb': round(tamaño_bytes / (1024 * 1024), 2),
            'duracion': duracion,
            'tipo_archivo': extension.upper().replace('.', ''),
            'fecha_modificacion': datetime.fromtimestamp(stat_info.st_mtime),
            'ruta': ruta_completa,
            'fecha': partes[0] if len(partes) > 0 else '',
            'hora': partes[1] if len(partes) > 1 else '',
            'tipo_llamada': partes[2] if len(partes) > 2 else '',
            'codigo': partes[3] if len(partes) > 3 else '',
            'extension': partes[4] if len(partes) > 4 else '',
            'numero_celular': partes[5] if len(partes) > 5 else ''
        }
        
        # Si hay más partes, agregarlas como campos adicionales
        if len(partes) > 6:
            resultado['numero_adicional'] = partes[6] if len(partes) > 6 else ''
        if len(partes) > 7:
            resultado['campo_extra'] = '-'.join(partes[7:])  # Unir todas las partes adicionales
        
        return resultado
    except Exception as e:
        return None

def obtener_archivos_audio_rapido(carpeta_audios):
    """
    Obtiene lista de archivos de audio con pre-filtrado
    """
    formatos_audio = ('.mp3', '.wav', '.gsm')
    
    print("📁 Escaneando carpeta rápidamente...")
    archivos_audio = []
    
    for archivo in os.listdir(carpeta_audios):
        if archivo.lower().endswith(formatos_audio):
            # Pre-filtro rápido por nombre - solo verificar que índice 3 sea '19'
            nombre_sin_ext = os.path.splitext(archivo)[0]
            partes = nombre_sin_ext.split('-')
            if len(partes) >= 4 and partes[3] == '19':  # Mínimo 4 partes y el índice 3 debe ser '19'
                archivos_audio.append(archivo)
    
    print(f"🎵 Archivos de audio filtrados: {len(archivos_audio)}")
    return archivos_audio

def procesar_lote_paralelo(carpeta_audios, archivos_lote, numero_lote, total_lotes):
    """
    Procesa un lote usando múltiples procesos
    """
    print(f"\n🔄 Procesando lote {numero_lote}/{total_lotes} ({len(archivos_lote)} archivos) en paralelo...")
    
    # Preparar argumentos
    args_list = [(carpeta_audios, archivo) for archivo in archivos_lote]
    
    # Usar todos los cores disponibles (ajustable)
    num_procesos = min(mp.cpu_count(), 8)  # Máximo 8 procesos
    
    datos_lote = []
    with ProcessPoolExecutor(max_workers=num_procesos) as executor:
        # Enviar todos los trabajos
        future_to_archivo = {
            executor.submit(procesar_archivo_individual, args): args[1] 
            for args in args_list
        }
        
        # Recolectar resultados
        procesados = 0
        for i, future in enumerate(as_completed(future_to_archivo)):
            try:
                resultado = future.result()
                if resultado:
                    datos_lote.append(resultado)
                    procesados += 1
                
                if (i + 1) % 100 == 0:
                    print(f"   📊 Progreso: {i + 1}/{len(archivos_lote)} - {procesados} válidos")
            except Exception as e:
                print(f"   ⚠️  Error procesando archivo: {e}")
        
        print(f"   ✅ Lote procesado: {procesados}/{len(archivos_lote)} archivos válidos")
    
    return datos_lote

def guardar_lote_eficiente(datos_lote, archivo_excel, numero_lote):
    """
    Guarda lotes de manera más eficiente
    """
    try:
        if not datos_lote or len(datos_lote) == 0:
            print(f"⚠️  Lote {numero_lote} vacío, no se guarda")
            return False
            
        df_lote = pd.DataFrame(datos_lote)
        
        if numero_lote == 1:
            # Primer lote - crear archivo
            df_lote.to_excel(archivo_excel, index=False, engine='openpyxl')
            print(f"✅ Lote {numero_lote} guardado - {len(datos_lote)} archivos procesados (archivo creado)")
        else:
            # Lotes subsiguientes - modo append eficiente
            try:
                if os.path.exists(archivo_excel):
                    df_existente = pd.read_excel(archivo_excel, engine='openpyxl')
                    df_combinado = pd.concat([df_existente, df_lote], ignore_index=True)
                    df_combinado.to_excel(archivo_excel, index=False, engine='openpyxl')
                    print(f"✅ Lote {numero_lote} guardado - {len(datos_lote)} archivos procesados (agregados al archivo)")
                else:
                    # Si el archivo no existe, crearlo
                    df_lote.to_excel(archivo_excel, index=False, engine='openpyxl')
                    print(f"✅ Lote {numero_lote} guardado - {len(datos_lote)} archivos procesados (archivo recreado)")
            except Exception as e:
                print(f"⚠️  Error combinando lote {numero_lote}: {e}")
                # Backup: guardar lote individual
                nombre_backup = f"backup_lote_{numero_lote}.xlsx"
                df_lote.to_excel(nombre_backup, index=False)
                print(f"💾 Backup guardado: {nombre_backup}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error guardando lote {numero_lote}: {e}")
        import traceback
        traceback.print_exc()
        return False

def procesar_carpeta_completa_optimizada(carpeta_audios, archivo_salida, tamano_lote=500):
    """
    Versión optimizada del procesamiento
    """
    if not os.path.exists(carpeta_audios):
        print(f"❌ Error: La carpeta '{carpeta_audios}' no existe")
        return False
    
    try:
        # Obtener archivos ya filtrados
        archivos_audio = obtener_archivos_audio_rapido(carpeta_audios)
        
        if not archivos_audio:
            print("❌ No se encontraron archivos que cumplan los criterios")
            return False
        
        # Dividir en lotes más grandes
        lotes = [archivos_audio[i:i + tamano_lote] for i in range(0, len(archivos_audio), tamano_lote)]
        total_lotes = len(lotes)
        
        print(f"📦 Total de lotes a procesar: {total_lotes} (de {tamano_lote} archivos cada uno)")
        print(f"⚡ Usando {min(mp.cpu_count(), 8)} procesos en paralelo")
        
        # Procesar cada lote en paralelo
        total_procesados = 0
        for i, lote in enumerate(lotes, 1):
            inicio_tiempo = time.time()
            
            # Procesar lote en paralelo
            datos_lote = procesar_lote_paralelo(carpeta_audios, lote, i, total_lotes)
            
            # Guardar lote 19
            if datos_lote:
                guardar_lote_eficiente(datos_lote, archivo_salida, i)
                total_procesados += len(datos_lote)
            
            # Estadísticas
            tiempo_lote = time.time() - inicio_tiempo
            archivos_por_segundo = len(datos_lote) / tiempo_lote if tiempo_lote > 0 else 0
            
            print(f"⏱️  Lote {i}: {tiempo_lote:.1f}s ({archivos_por_segundo:.1f} archivos/segundo)")
            
            if i < total_lotes:
                tiempo_restante = ((total_lotes - i) * tiempo_lote) / 60
                print(f"📈 Estimado: {tiempo_restante:.1f} minutos restantes")
            
            print("-" * 50)
        
        print(f"🎉 Procesamiento completado! Total: {total_procesados} archivos")
        return True
        
    except Exception as e:
        print(f"❌ Error en el procesamiento: {e}")
        return False

def main():
    print("🎵 PROCESADOR DE AUDIOS POR LOTES - VERSIÓN OPTIMIZADA")
    print("=" * 50)
    
    # Configuración
    print("\n🔧 Selecciona la configuración:")
    print("1. Servidor Local (E:/ProcesoAudios/2025/11/21)")
    print("2. Carpeta de Red (\\\\110.238.64.237\\informa\\2025\\11\\17)")
    
    opcion = input("Ingresa tu opción (1 o 2): ").strip()
    
    if opcion == "1":
        carpeta_audios = r"E:/ProcesoAudios/2025/11/21"  # <--- CAMBIAR NUMERO DE CARPETA A ESCANEAR(SERVIDOR LOCAL)
        archivo_salida = "reporte2025.xlsx"
        nombre_reporte = "servidor_local"
    elif opcion == "2":
        carpeta_audios = r"\\110.238.64.237\informa\2025\11\17"  # <---- CAMBIAR LA CARPETA A ESCANEAR(CARPETA DE RED/COMPARTIDOS)
        archivo_salida = "reporte_red_17_11_2025.xlsx"
        nombre_reporte = "carpeta_red"
        
        print("🔗 Conectando a la carpeta de red...")
        if not conectar_carpeta_red():
            print("❌ No se pudo establecer conexión con la carpeta de red")
            return
    else:
        print("❌ Opción no válida")
        return
    
    # Configurar tamaño de lote
    try:
        tamano_lote = int(input("Tamaño de lote (recomendado 500): ") or "500")
    except:
        tamano_lote = 500
    
    if not TIENE_MUTAGEN:
        print("💡 Para obtener la duración, instala: pip install mutagen")
    
    print("\n🎵 Iniciando procesamiento OPTIMIZADO...")
    print(f"📁 Carpeta: {carpeta_audios}")
    print(f"📦 Tamaño de lote: {tamano_lote} archivos")
    print(f"💾 Archivo de salida: {archivo_salida}")
    print("🔍 Filtrando solo archivos con código '19'")
    print(f"⚡ Procesadores disponibles: {mp.cpu_count()}")
    
    # Iniciar procesamiento
    inicio_total = time.time()
    exito = procesar_carpeta_completa_optimizada(carpeta_audios, archivo_salida, tamano_lote)
    
    if exito:
        tiempo_total = (time.time() - inicio_total) / 60
        print(f"\n⏱️  Tiempo total de procesamiento: {tiempo_total:.1f} minutos")
        
        # Mostrar resumen final
        try:
            df_final = pd.read_excel(archivo_salida)
            print(f"📊 Total de archivos procesados: {len(df_final)}")
            
            print("\n📈 Resumen por tipo:")
            resumen = df_final['tipo_archivo'].value_counts()
            for tipo, cantidad in resumen.items():
                print(f"  {tipo}: {cantidad} archivos")
                
        except Exception as e:
            print(f"⚠️  No se pudo leer el archivo final: {e}")

if __name__ == "__main__":
    main()