-- Siembra la metadata de la lista (negocio, producto, costos, peso, medidas, fijación, disponibilidad, orden)
-- tomada de los PDF actuales. NO pisa el precio (PVP) de los productos que ya existen: solo completa
-- las columnas nuevas. Para productos que no existan, los crea usando el PVP del PDF como punto de partida.
insert into public.precios
  (codigo, nombre, categoria, precio, ean, negocio, producto, modelo_lista, costo_siva, costo_civa, peso, medidas, fijacion, disponibilidad, orden)
values
  -- ===== CALEFACCIÓN (Paneles) =====
  ('C250STV1',     'Panel Calefactor Slim',           'paneles_calefactores', 69365.55,  '0726798313312', 'CALEFACCION',       'Panel Calefactor Slim',    '250w',                         39293.46,  47545.08,  '5kg',   '0,010 m3', 'Pared',         'NORMAL', 1),
  ('C250STV1TS',   'Panel Calefactor Slim',           'paneles_calefactores', 80571.15,  '0726798313329', 'CALEFACCION',       'Panel Calefactor Slim',    '250w Toallero Simple',         44907.61,  54338.21,  '5kg',   '0,010 m3', 'Pared',         'NORMAL', 2),
  ('C250STV1TD',   'Panel Calefactor Slim',           'paneles_calefactores', 96170.60,  '0726798313336', 'CALEFACCION',       'Panel Calefactor Slim',    '250w Toallero Doble',          53328.84,  64527.89,  '5kg',   '0,010 m3', 'Pared',         'NORMAL', 3),
  ('C500STV1',     'Panel Calefactor Slim',           'paneles_calefactores', 103970.32, '0726798313343', 'CALEFACCION',       'Panel Calefactor Slim',    '500w',                         56135.91,  67924.46,  '7,5kg', '0,019 m3', 'Pared',         'NORMAL', 4),
  ('C500STV1TS',   'Panel Calefactor Slim',           'paneles_calefactores', 124769.59, '0726798313350', 'CALEFACCION',       'Panel Calefactor Slim',    '500w Toallero Simple',         67364.22,  81510.71,  '7,5kg', '0,019 m3', 'Pared',         'NORMAL', 5),
  ('C500STV1TD',   'Panel Calefactor Slim',           'paneles_calefactores', 140369.03, '0726798313367', 'CALEFACCION',       'Panel Calefactor Slim',    '500w Toallero Doble',          72978.37,  88303.83,  '7,5kg', '0,019 m3', 'Pared',         'NORMAL', 6),
  ('F1400BCO',     'Panel Calefactor Firenze',        'paneles_calefactores', 155968.48, '0726798313374', 'CALEFACCION',       'Panel Calefactor Firenze', '1400w Blanco',                 78592.53,  95096.96,  '8,5kg', '0,038 m3', 'Patas / Pared', 'NORMAL', 7),
  ('F1400MV',      'Panel Calefactor Firenze',        'paneles_calefactores', 155968.48, '0726798313381', 'CALEFACCION',       'Panel Calefactor Firenze', '1400w Madera Veteada',         78592.53,  95096.96,  '8,5kg', '0,038 m3', 'Patas / Pared', 'NORMAL', 8),
  ('F1400PA',      'Panel Calefactor Firenze',        'paneles_calefactores', 155968.48, '0726798313404', 'CALEFACCION',       'Panel Calefactor Firenze', '1400w Piedra Azteca',          78592.53,  95096.96,  '8,5kg', '0,038 m3', 'Patas / Pared', 'NORMAL', 9),
  ('F1400PR',      'Panel Calefactor Firenze',        'paneles_calefactores', 155968.48, '0726798313404', 'CALEFACCION',       'Panel Calefactor Firenze', '1400w Piedra Romana',          78592.53,  95096.96,  '8,5kg', '0,038 m3', 'Patas / Pared', 'NORMAL', 10),
  ('F1400MTG',     'Panel Calefactor Firenze',        'paneles_calefactores', 155968.48, '0793969172207', 'CALEFACCION NUEVO', 'Panel Calefactor Firenze', '1400w Marmol Traviatta Gris',  78592.53,  95096.96,  '8,5kg', '0,038 m3', 'Patas / Pared', 'NORMAL', 11),
  ('F1400PCL',     'Panel Calefactor Firenze',        'paneles_calefactores', 155968.48, '0793969172214', 'CALEFACCION NUEVO', 'Panel Calefactor Firenze', '1400w Piedra Cantera Luna',    78592.53,  95096.96,  '8,5kg', '0,038 m3', 'Patas / Pared', 'NORMAL', 12),
  ('F1400MCO',     'Panel Calefactor Firenze',        'paneles_calefactores', 155968.48, '0793969172221', 'CALEFACCION NUEVO', 'Panel Calefactor Firenze', '1400w Marmol Calacatta Ocre',  78592.53,  95096.96,  '8,5kg', '0,038 m3', 'Patas / Pared', 'NORMAL', 13),
  ('F1400SMARTBL', 'Panel Calefactor Firenze Smart',  'paneles_calefactores', 249549.57, '0793969172177', 'CALEFACCION NUEVO', 'Panel Calefactor Firenze Smart', '1400w Smart Wifi - App Temptech', 157190.67, 190200.71, '8,5kg', '0,038 m3', 'Patas / Pared', 'NORMAL', 14),
  -- ===== CALEFONES / CALDERAS =====
  ('KF70SIL',      'Calefón Electrico',               'calefones_calderas', 321685.95,  '0793969172238', 'Climatizacion Agua', 'Calefón Electrico', 'One 3,5/5,5/7Kw 220V Silver',    165585.15,  200358.03,  '2,5',  '230*230*72mm',  'Pared', 'NORMAL', 1),
  ('FE150TBLACK',  'Calefón Electrico',               'calefones_calderas', 414153.55,  '0793969172245', 'Climatizacion Agua', 'Calefón Electrico', 'Nova 6/8/9/13,5Kw 220V Black',   213182.07,  257950.31,  '4,1',  '400*225*83mm',  'Pared', 'NORMAL', 2),
  ('FE150TSIL',    'Calefón Electrico',               'calefones_calderas', 414153.55,  '0610985266935', 'Climatizacion Agua', 'Calefón Electrico', 'Nova 6/8/9/13,5Kw 220V Silver',  213182.07,  257950.31,  '4,1',  '400*225*83mm',  'Pared', 'NORMAL', 3),
  ('FE150TBL',     'Calefón Electrico',               'calefones_calderas', 414153.55,  '0610985266942', 'Climatizacion Agua', 'Calefón Electrico', 'Nova 6/8/9/13,5Kw 220V Blanco',  213182.07,  257950.31,  '4,1',  '400*225*83mm',  'Pared', 'NORMAL', 4),
  ('FM318BL',      'Calefón Electrico',               'calefones_calderas', 874712.01,  '0610985266959', 'Climatizacion Agua', 'Calefón Electrico', 'Pulse 9/13,5/18Kw 380V Blanco',  450250.68,  544803.33,  '5,2',  '470*235*115mm', 'Pared', 'NORMAL', 5),
  ('FM324BL',      'Calefón Electrico',               'calefones_calderas', 959932.00,  '0610985266966', 'Climatizacion Agua', 'Calefón Electrico', 'Pulse 12/18/24Kw 380V Blanco',   493936.98,  597663.74,  '5,7',  '470*235*115mm', 'Pared', 'NORMAL', 6),
  ('BF14EBL',      'Caldera Dual',                    'calefones_calderas', 2361311.76, '0610985266973', 'Climatizacion Agua', 'Caldera Dual',      'Core 220-380V 14,4 Kw Blanco',   1701651.65, 2058998.49, '21,7', '750*560*345mm', 'Pared', 'NORMAL', 7),
  ('BF323EBL',     'Caldera Dual',                    'calefones_calderas', 2628242.66, '0610985266980', 'Climatizacion Agua', 'Caldera Dual',      'Core 380V 23 kw Blanco',         2029298.86, 2455451.62, '24,8', '750*560*345mm', 'Pared', 'NORMAL', 8),
  -- ===== ANAFES (sin fijación) =====
  ('K40010', 'Anafe Inducción + Extractor', 'anafes', 1286288.53, '0610985266980', 'Anafes', 'Anafe Inducción + Extractor', '4 Hornallas Touch', 677432.78, 819693.67, '27,7', '770x520x80',   null, 'NORMAL', 1),
  ('K40011', 'Anafe Inducción + Extractor', 'anafes', 1286288.53, '0793969172191', 'Anafes', 'Anafe Inducción + Extractor', '4 Hornallas Knob',  677432.78, 819693.67, '27,7', '770x520x80',   null, 'NORMAL', 2),
  ('DT4',    'Anafe Infrarojo + Extractor', 'anafes', 1165429.20, '0610985266997', 'Anafes', 'Anafe Infrarojo + Extractor', '4 Hornallas Touch', 613781.38, 742675.47, '27,7', '288x510x80',   null, 'NORMAL', 3),
  ('DT4W',   'Anafe Infrarojo + Extractor', 'anafes', 1165429.20, '0610985267000', 'Anafes', 'Anafe Infrarojo + Extractor', '4 Hornallas Knob',  613781.38, 742675.47, '27,7', '288x510x80',   null, 'NORMAL', 4),
  ('DT4-1',  'Anafe Inducción',             'anafes', 475312.30,  '0610985267031', 'Anafes', 'Anafe Inducción',             '4 Hornallas Touch', 245512.55, 297070.19, '12,4', '510x590x85',   null, 'NORMAL', 5),
  ('K1002',  'Anafe Inducción',             'anafes', 265687.39,  '0610985267017', 'Anafes', 'Anafe Inducción',             '2 Hornallas Touch', 137235.22, 166054.62, '6,4',  '288x510x80',   null, 'NORMAL', 6),
  ('K2002',  'Anafe Infrarojo',             'anafes', 243749.90,  '0610985267024', 'Anafes', 'Anafe Infrarojo',             '2 Hornallas Knob',  125903.87, 152343.68, '5,4',  '288x510x80',   null, 'NORMAL', 7),
  ('EXTHUMOS','Extractor Humos',            'anafes', 324657.92,  '0610985267055', 'Anafes', 'Extractor Humos',             '',                  268312.33, 324657.92, null,   null,           null, 'NORMAL', 8)
on conflict (codigo) do update set
  negocio        = excluded.negocio,
  producto       = excluded.producto,
  modelo_lista   = excluded.modelo_lista,
  costo_siva     = excluded.costo_siva,
  costo_civa     = excluded.costo_civa,
  ean            = coalesce(public.precios.ean, excluded.ean),
  peso           = excluded.peso,
  medidas        = excluded.medidas,
  fijacion       = excluded.fijacion,
  disponibilidad = excluded.disponibilidad,
  orden          = excluded.orden;
