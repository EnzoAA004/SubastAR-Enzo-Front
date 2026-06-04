# Contrato Frontend / Backend - SubastAR

Esta matriz documenta las rutas consumidas por `src/services/http.ts` y los datos que el frontend espera. No acredita que el backend publicado implemente cada operacion: la verificacion funcional debe realizarse contra una instancia levantada con una base de prueba.

Estados usados:

- `Confirmar backend`: el frontend tiene consumo implementado, pendiente de prueba real.
- `Parcial`: el flujo visible depende de datos derivados o de un endpoint mas completo.
- `Pendiente backend`: existe UI condicionada a una incorporacion del backend auxiliar.

## Autenticacion

| Flujo | Metodo | Endpoint Front | Body enviado | Respuesta esperada | Estado |
|---|---|---|---|---|---|
| Login | `POST` | `/auth/login` | `{ email, password }` | `{ access_token, token_type, usuario }` | Confirmar backend |
| Registro con DNI | `POST` | `/auth/registro` | multipart: datos, `foto_dni_frente`, `foto_dni_dorso` | `{ message }` | Confirmar backend |
| Reenviar codigo registro | `POST` | `/auth/registro/reenviar-codigo` | `{ email }` | `{ message }` | Confirmar backend |
| Cancelar registro pendiente | `POST` | `/auth/registro-pendiente/cancelar` | `{ email }` | `{ message }` | Confirmar backend |
| Verificar codigo | `POST` | `/auth/verificar-codigo` | `{ email, codigo }` | `{ message, tokenVerificacion }` o variante `token_verificacion` | Pendiente backend |
| Completar registro | `POST` | `/auth/completar-registro` | `{ token_verificacion, password, password_confirmacion }` | `{ access_token, usuario }` | Pendiente backend |
| Solicitar recuperacion password | `POST` | `/auth/recuperar-password` | `{ email }` | `{ message }` | Confirmar backend |
| Confirmar recuperacion password | `POST` | `/auth/recuperar-password/confirmar` | `{ email, codigo, password, password_confirmacion }` | `{ message }` | Confirmar backend |
| Logout | `POST` | `/auth/logout` | sin body | sin contenido | Confirmar backend |

## Subastas Y Pujas

| Flujo | Metodo | Endpoint Front | Body enviado | Respuesta esperada | Estado |
|---|---|---|---|---|---|
| Listar/filtrar subastas | `GET` | `/subastas?busqueda=&estado=&categoria=&moneda=` | query opcional | lista de subastas | Confirmar backend |
| Datos de subasta | `GET` | `/subastas/{id}` | - | detalle de subasta | Confirmar backend |
| Catalogo | `GET` | `/subastas/{id}/catalogo` | - | lista de lotes | Confirmar backend |
| Detalle de lote | `GET` | `/subastas/{id}/catalogo/{itemId}` | - | lote | Confirmar backend |
| Estado en vivo | `GET` | `/subastas/{id}/en-vivo` | - | lote actual, ofertas e historial | Confirmar backend |
| Registrar puja | `POST` | `/subastas/{id}/pujas` | `{ monto, medio_pago_id }` | puja creada | Confirmar backend |
| Historial de lote | `GET` | `/subastas/{id}/pujas/{itemId}` | - | lista de pujas | Confirmar backend |
| Resultado de lote | `GET` | `/subastas/{id}/resultado/{itemId}` | - | resultado ganador/no ganador | Pendiente backend |

## Perfil Y Medios De Pago

| Flujo | Metodo | Endpoint Front | Body enviado | Respuesta esperada | Estado |
|---|---|---|---|---|---|
| Perfil | `GET` | `/usuarios/me` | - | datos personales | Confirmar backend |
| Editar datos | `PATCH` | `/usuarios/me` | `{ domicilio, pais_origen }` | perfil actualizado | Confirmar backend |
| Estado de cuenta | `GET` | `/usuarios/me/estado-cuenta` | - | estado y multa | Confirmar backend |
| Metricas | `GET` | `/usuarios/me/metricas` | - | metricas del usuario | Confirmar backend |
| Listar pagos | `GET` | `/usuarios/me/medios-pago` | - | lista de medios | Confirmar backend |
| Agregar pago | `POST` | `/usuarios/me/medios-pago` | multipart segun tipo; cheque puede incluir `foto_cheque` | medio creado | Confirmar backend |
| Eliminar pago | `DELETE` | `/usuarios/me/medios-pago/{id}` | - | sin contenido | Confirmar backend |

## Bienes

| Flujo | Metodo | Endpoint Front | Body enviado | Respuesta esperada | Estado |
|---|---|---|---|---|---|
| Iniciar solicitud | `POST` | `/bienes/solicitudes` | `{ tipo }` | codigo y paso actual | Confirmar backend |
| Guardar datos | `PUT` | `/bienes/solicitudes/{codigo}/datos` | datos del bien | estado de solicitud | Confirmar backend |
| Cargar fotos | `POST` | `/bienes/solicitudes/{codigo}/fotos` | JSON `{ fotos: [{ asset_id, public_id, version, format, resource_type, bytes, width, height, original_filename, secure_url }] }` (6 a 8 desde UI) | estado de solicitud | Pendiente backend |
| Cargar documentos | `POST` | `/bienes/solicitudes/{codigo}/documentos` | multipart `declara_propiedad`, `documentos` | estado de solicitud | Confirmar backend |
| Confirmar solicitud | `POST` | `/bienes/solicitudes/{codigo}/confirmar` | - | codigo de bien y estado | Confirmar backend |
| Mis bienes | `GET` | `/bienes/mis-bienes?estado=` | query opcional | lista de bienes | Confirmar backend |
| Detalle de bien | `GET` | `/bienes/mis-bienes/{id}` | - | bien | Confirmar backend |
| Editar datos de bien | `PATCH` | `/bienes/mis-bienes/{id}` | `{ informacion_adicional, precio_base_sugerido, divisa_precio_base_sugerido }` | bien actualizado | Pendiente backend |
| Condiciones del bien | `POST` | `/bienes/mis-bienes/{id}/aceptar-condiciones` | `{ acepta }` | `{ message }` | Confirmar backend |

## Compras Y Seguros

| Flujo | Metodo | Endpoint Front | Body enviado | Respuesta esperada | Estado |
|---|---|---|---|---|---|
| Mis compras | `GET` | `/compras` | - | lista de compras | Confirmar backend |
| Detalle compra | `GET` | `/compras/{id}` | - | compra con entrega y posibles `poliza_id`, `numero_poliza` | Confirmar backend |
| Regularizar pago | `POST` | `/compras/{id}/regularizar-pago` | `{ medio_pago_id }` | compra actualizada | Confirmar backend |
| Datos factura | `GET` | `/compras/{id}/factura` | - | `{ message, url }` | Confirmar backend |
| Descargar factura | `GET` | `/compras/{id}/factura/download` | - | contenido descargable/texto | Confirmar backend |
| Consultar poliza | `GET` | `/seguros/{id}` | - | poliza y contacto | Confirmar backend |
| Ampliar poliza | `POST` | `/seguros/{id}/ampliar` | `{ nuevo_valor_asegurado }` | poliza actualizada | Confirmar backend |
| Historial de participaciones | `GET` | `/compras` | - | solo ganadas asociadas a compras | Parcial |
| Seguros y Polizas | `GET` | `/compras` | - | polizas derivadas de compras con `poliza_id`, `numero_poliza` | Parcial |

## Chat

| Flujo | Metodo | Endpoint Front | Body enviado | Respuesta esperada | Estado |
|---|---|---|---|---|---|
| Conversaciones | `GET` | `/chat/conversaciones` | - | lista de conversaciones | Confirmar backend |
| Resumen de notificaciones | `GET` | `/chat/notificaciones/resumen` | - | total no leidas y desglose por tipo | Confirmar backend |
| Listar notificaciones | `GET` | `/chat/notificaciones` | - | lista de avisos del usuario | Confirmar backend |
| Marcar notificaciones leidas | `POST` | `/chat/notificaciones/marcar-leidas` | `{ tipos? }` | sin contenido | Confirmar backend |
| Mensajes | `GET` | `/chat/conversaciones/{tipo}` | - | lista de mensajes | Confirmar backend |
| Enviar mensaje | `POST` | `/chat/conversaciones/{tipo}/mensajes` | `{ contenido }` | mensaje creado | Pendiente backend |

## Integracion Tecnica

- El frontend verifica recuperacion de conectividad con `GET /health/ping`, que debe responder `{ "message": "pong" }`.
- La URL base se configura con `EXPO_PUBLIC_API_URL`; ver `.env.example`.
- La carga unsigned de fotos a Cloudinary se configura en `src/services/cloudinary.ts` con `cloudinaryConfig.cloudName` y `cloudinaryConfig.unsignedUploadPreset`.
- El frontend nunca debe recibir ni exponer `CLOUDINARY_API_SECRET`.
- Las fotos se suben primero a `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` dentro de `subastar/bienes`; el backend recibe metadata JSON, no binarios.
- Para persistencia de fotos, `asset_id` y `public_id` son las referencias principales. `secure_url` es un dato auxiliar para lectura o preview.
- El JWT se adjunta como `Authorization: Bearer <token>` y el frontend elimina sesion ante `401` autenticado.
- Para `FormData`, el frontend no fija manualmente `Content-Type`; el runtime genera el boundary.
- Los archivos se envian con `uri`, `name` y `type`, con valores de respaldo para Web y Android.
