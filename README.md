# KINGSLANDING CTF

Portal web del laboratorio educativo descrito en `../docs/actividad-1-seguridad-en-la-nube.md`.

## Ejecutar localmente

Requiere Node.js y npm.

```bash
npm install --legacy-peer-deps
npm run dev
```

La etapa final necesita la bandera configurada en el servidor. Para desarrollo, define una bandera temporal antes de iniciar el portal:

```powershell
$env:KINGSLANDING_FINAL_FLAG = 'TEST{reemplazar-en-el-laboratorio}'
npm run dev
```

En Linux/macOS, usa `export KINGSLANDING_FINAL_FLAG='...'` antes de `npm run dev`. No guardes la bandera real en el código del navegador ni en un archivo versionado. Configura el valor definitivo en el entorno protegido del servicio antes de distribuir la VM.

Para validar la compilación:

```bash
npm run build
```

La compilación se sirve con `npm start`; el servidor escucha en el puerto `5000` por defecto. El endpoint de validación solo devuelve el resultado, nunca la bandera esperada.

## Alcance actual

El portal presenta ocho etapas en una ambientación narrativa, con animaciones y transiciones, un acertijo de cifrado César y una secuencia lógica interactiva, además de la pista web del Cuervo, la búsqueda SQLite del Consejo y la validación final de una bandera por texto o archivo `.txt`. Los dos acertijos nuevos no agregan vulnerabilidades. La búsqueda usa una consulta parametrizada y la base se persiste en `.local/council.sqlite` durante el desarrollo. El instalador FTP autenticado de solo lectura publica el mensaje cifrado de Varys; ejecútalo de nuevo en Ubuntu para actualizar ese archivo. La OVA no está generada.

La ruta ofrece dos vistas intercambiables: un mundo 3D original (Three.js y WebGL) y el mapa clásico de fantasía medieval. El escenario 3D incluye un muro helado, castillos con estandartes y un trono de hierro estilizado. En el mundo 3D puedes elegir **Vista del mapa** o el prototipo **Primera persona**. En primera persona, haz clic en el escenario para mirar con el ratón y camina con WASD o las flechas; Escape libera el ratón. También puedes girar con los botones, sin usar el ratón. Al acercarte a una torre se abre su tarjeta y se libera el ratón; ciérrala y vuelve a hacer clic en el escenario para mirar otra vez. Los botones numerados permiten visitar etapas sin caminar. Usa **Cerrar** o Escape para volver a explorar y **Ver reto** para abrir nuevamente la tarjeta de la etapa actual. Si WebGL no está disponible, utiliza el mapa clásico, que también admite teclado y botones. El prototipo aún no tiene colisiones con árboles o edificios. Ninguna vista bloquea etapas ni guarda el progreso al recargar la página; la animación decorativa respeta la preferencia del sistema para reducir movimiento.

El botón **Sonido ambiental** activa o desactiva un acompañamiento medieval original generado en el navegador. Comienza apagado, incluye un control de volumen y no requiere conexión a Internet ni archivos de audio. Revisa también que la pestaña y el dispositivo no estén silenciados.

En **Mundo 3D**, usa **Pantalla completa** para ampliar el juego. El botón **Salir de pantalla completa** lo devuelve a la página; Escape también puede salir de pantalla completa según el navegador.

## Despliegue en Ubuntu

La guía para preparar una VM Host-Only está en [`../docs/preparacion-virtualbox.md`](../docs/preparacion-virtualbox.md). El bundle de producción se genera con `bash deploy/ubuntu/build-bundle.sh`; la instalación del servicio está documentada en [`deploy/ubuntu/README.md`](deploy/ubuntu/README.md).

## Recursos

La fotografía de la pantalla de victoria es “Harlech Castle Gatehouse Tower, Merionethshire, Wales - 25-07-2017.jpg”, de Cmao20, bajo licencia CC BY-SA 4.0. Las fuentes tipográficas están incluidas localmente para que la interfaz funcione sin depender de una conexión externa.