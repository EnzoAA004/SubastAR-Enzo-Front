# Checklist Manual QA Frontend

## Configuracion

- [ ] Crear `.env` desde `.env.example`.
- [ ] Configurar `EXPO_PUBLIC_API_URL` para Web, emulador o dispositivo.
- [ ] Configurar `cloudinaryConfig.cloudName` y un `cloudinaryConfig.unsignedUploadPreset` en `src/services/cloudinary.ts`.
- [ ] Confirmar que no exista `CLOUDINARY_API_SECRET` en variables o codigo del frontend.
- [ ] Levantar backend y base no productiva con datos de prueba.
- [ ] Ejecutar `npm install`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npx tsc --noEmit`.
- [ ] Ejecutar `npm run web` y, si esta disponible, `npm run android`.

## Acceso

- [ ] Welcome carga correctamente.
- [ ] Login informa los errores devueltos por la API.
- [ ] Login correcto con token navega al home y guarda sesion.
- [ ] Login con email inexistente queda en `/login`, muestra error y no guarda sesion.
- [ ] Continuar como invitado permite explorar subastas.
- [ ] Registro permite cargar DNI frente y dorso.
- [ ] Registro exitoso navega a `/registration-pending` y no queda indefinidamente en enviando.
- [ ] Reenviar codigo de registro reemplaza el anterior, muestra mensaje y aplica cooldown.
- [ ] Cancelar registro pendiente permite empezar de nuevo con el mismo email.
- [ ] Verificacion permite ingresar el codigo recibido.
- [ ] Recuperar contrasena envia codigo, permite actualizar password y vuelve a login.
- [ ] Crear contrasena finaliza el registro cuando backend soporte el contrato.
- [ ] Paso Clave muestra en tiempo real requisitos de seguridad, incluyendo mayuscula, numero, caracter especial y que no comience con numero.
- [ ] Paso Clave mantiene Registrarse deshabilitado hasta que ambas contrasenas validas coincidan.
- [ ] Un `400` al completar registro muestra un mensaje claro sobre requisitos de contrasena.

## Subastas

- [ ] Inicio muestra `SubastAR`.
- [ ] Explorar subastas navega al listado.
- [ ] Catalogo, detalle y vivo muestran imagenes reales de lotes cuando `imagenes` trae URLs.
- [ ] Lotes con varias imagenes muestran carrusel con flechas, dots y autoavance.
- [ ] Filtros aplican estado, categoria y moneda.
- [ ] Las tarjetas muestran `Proximas` visualmente como `Proximas` con acento en la UI.
- [ ] Datos de subasta abre catalogo y subasta en vivo cuando corresponde.
- [ ] Catalogo abre detalle de lote con imagen.
- [ ] Subasta con categoria backend `otro` aparece en el listado y se muestra como `Otro`.
- [ ] Catalogo muestra lotes `disponible` aunque no tengan imagen y permite refrescar manualmente.
- [ ] Detalle de lote conserva `auctionId`; si falta, muestra un mensaje claro para volver al catalogo.
- [ ] Subasta en vivo muestra `item_actual` aunque venga resumido o sin imagen y permite refrescar manualmente.
- [ ] Subasta en vivo usa la moneda real de la subasta, muestra precio base sin ofertas y accesos rapidos nunca menores a la puja minima.
- [ ] Confirmar puja bloquea montos menores a la minima vigente y conserva el mensaje real si backend rechaza la operacion.
- [ ] Puja en vivo muestra falta de medio o restriccion real si corresponde.
- [ ] Confirmar puja refleja respuesta o error real de la API.
- [ ] Resultado se valida solo cuando el endpoint backend este disponible.

## Bienes Y Pagos

- [ ] Alta de tarjeta y cuenta bancaria envia datos reales.
- [ ] Alta de cheque permite subir su foto.
- [ ] Subir bien abre seleccion de categoria.
- [ ] Cantidad de elementos es obligatoria.
- [ ] Fotos permiten cargar de 6 a 8 imagenes en Web y Android.
- [ ] Al continuar, las fotos aparecen en Cloudinary dentro de `subastar/bienes`.
- [ ] El backend recibe metadata JSON de Cloudinary para fotos, sin archivos binarios.
- [ ] Si Cloudinary rechaza una imagen, se muestra el error y no se avanza a documentos.
- [ ] Documentos permiten aceptar declaracion legal y adjuntar archivos.
- [ ] Solicitud confirma y muestra el codigo devuelto por API.
- [ ] Detalle completo del bien muestra galeria con imagen principal y miniaturas seleccionables.
- [ ] Detalle completo muestra documentos adjuntos o un estado vacio sin romper la pantalla.
- [ ] Editar informacion adicional y precio base sugerido refresca el detalle al guardar.
- [ ] Editar precio base sugerido permite seleccionar `ARS` o `USD`.
- [ ] Al guardar cambios del bien, se muestra un overlay bloqueante hasta completar el refetch del detalle.
- [ ] Galeria del detalle completo rota cada 4 segundos y permite navegar con botones, dots y miniaturas.

## Perfil

- [ ] Perfil muestra secciones y estado de cuenta.
- [ ] Historial abre correctamente y aclara que solo expone compras ganadas.
- [ ] Metricas abre correctamente.
- [ ] Datos personales muestra categoria.
- [ ] Mis bienes abre y filtra estados.
- [ ] Mis compras abre correctamente.
- [ ] Multas abre estado de cuenta.
- [ ] Seguros y Polizas aclara que se deriva de compras asociadas.

## Compras, Chat Y Seguros

- [ ] Detalle compra abre entrega y factura.
- [ ] Factura muestra metadata de compra, vista previa estilada y descarga `factura-{id}.txt`.
- [ ] Descargar factura baja el TXT en web y abre el menu de guardado o compartir en Android/iOS.
- [ ] Entrega permite coordinar por chat.
- [ ] Chat abre conversaciones tocando toda la fila.
- [ ] Chat muestra `Bot - Notificaciones` como conversacion normal y sin card separada de notificaciones.
- [ ] `Bot - Notificaciones` fusiona entradas `bot` y `notificaciones`, muestra badge rojo y abre el centro de avisos.
- [ ] Abrir `Bot - Notificaciones` lista avisos, los marca como leidos y limpia el punto rojo del tab Chat.
- [ ] Envio de mensaje solo se prueba si el endpoint fue incorporado.
- [ ] Compra con `poliza_id` abre su poliza y muestra `numero_poliza` cuando esta disponible.
- [ ] Compra sin `poliza_id` pero con `numero_poliza` usa ese numero para consultar la poliza.
- [ ] Seguros y Polizas deduplica las compras por identificador de poliza.
- [ ] Poliza permite consultar contacto y solicitar ampliacion.

## Fallos Reales

- [ ] Un `401` de sesion autenticada vuelve al acceso sin romper navegacion.
- [ ] Un `403` de puja presenta el estado restringido.
- [ ] Errores JSON con `message`, `error`, `errors` o `errores` se muestran legibles.
- [ ] Errores de texto plano no rompen la pantalla.
- [ ] DNI solicita acceso a galeria y muestra un mensaje claro si se rechaza.
- [ ] Fotos del bien solicitan acceso a galeria y muestran un mensaje claro si se rechaza.
- [ ] Documentos abren selector para PDF o imagen y muestran un mensaje claro si falla.
- [ ] Foto de cheque solicita acceso a galeria y muestra un mensaje claro si se rechaza.
- [ ] Backend apagado redirige a `/offline` y muestra estado recuperable con reintento.
- [ ] Reintentar conexion consulta `GET /health/ping`; si responde `pong`, invalida queries y vuelve al inicio.
