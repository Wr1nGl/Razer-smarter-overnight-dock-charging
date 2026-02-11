#include <WiFi.h>
#include "mouse_controller.h"
#include <Arduino.h>
#include "config.h"

Mouse_controller *mouse_controller = new Mouse_controller();

void setup() {
    Serial.begin(115200);
    WiFi.begin(WIFI_NAME, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED){
        Serial.print(".");
        delay(1000);
    } 
    Serial.println("Wifi connected");

    pinMode(MUX_SELECT_PIN, OUTPUT);
    digitalWrite(MUX_SELECT_PIN, LOW);
}

void loop() {
    mouse_controller->loop();
}