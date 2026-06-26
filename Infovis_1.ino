#include "HX711.h"

const int LOADCELL_DOUT_PIN = 2;
const int LOADCELL_SCK_PIN = 3;

HX711 scale;

// Factor de Calibración
const float FACTOR_CALIBRACION = -660.0;

void setup() {
  Serial.begin(9600); 
  
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Dejamos un segundo para que todo se estabilice mecánicamente
  delay(1000); 
  
  // Taramos la balanza
  scale.tare(); 
  
  // Aplicamos factor de calibración
  scale.set_scale(FACTOR_CALIBRACION); 
}

void loop() {
  // get_units(5) toma el promedio de 5 lecturas rápidas para evitar saltos bruscos
  float pesoGramos = scale.get_units(5);
  
  // Por ruido eléctrico menor, a veces en reposo puede marcar -0.3 o valores similares.
  // Con esto nos aseguramos de que el dashboard web reciba un 0 limpio si no hay nada encima.
  if (pesoGramos < 0.2) {
    pesoGramos = 0.0;
  }

  // Imprimimos solo el número entero para que el backend de la web lo procese sin problemas
  Serial.println((int)pesoGramos); 
  
  // Enviamos datos cada 500ms para mantener una actualización fluida en el mapa interactivo
  delay(500); 
}