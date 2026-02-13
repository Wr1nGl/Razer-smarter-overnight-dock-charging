#include <ArduinoJson.h>
#include "mouse.h"
#include "config.h"

Mouse::Mouse(){
  this->http_client = new Http_client(this);
}

void Mouse::parse_data(){
    int firstBrace = this->http_client->payloadBuffer.indexOf('{');
    int lastBrace = this->http_client->payloadBuffer.lastIndexOf('}');

    if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
        String cleanJson = this->http_client->payloadBuffer.substring(firstBrace, lastBrace + 1);

        DynamicJsonDocument doc(1024);
        DeserializationError err = deserializeJson(doc, cleanJson);

        if (!err) {
            this->battery_level = doc["battery_level"].as<int>();
            this->battery_max_charge_level = doc["battery_max_charge_level"].as<int>();
            this->charge_gain = doc["charge_gain"].as<float>();
            this->charge_time = doc["charge_time"].as<int>();
            this->cooldown_time = doc["cooldown_time"].as<int>();
            
            Serial.printf("Received:");
            Serial.printf("battery_level: %d%%\n", doc["battery_level"].as<int>());
            Serial.printf("battery_max_charge_level: %d%%\n", doc["battery_max_charge_level"].as<int>());
            Serial.printf("charge_gain: %.2f%%\n", doc["charge_gain"].as<float>());
            Serial.printf("charge_time: %d min\n", doc["charge_time"].as<int>());
            Serial.printf("cooldown_time: %d min\n", doc["cooldown_time"].as<int>());
            /*
            Serial.printf("Saved:");
            Serial.printf("battery_level: %d%%\n", this->battery_level);
            Serial.printf("battery_max_charge_level: %d%%\n", this->battery_max_charge_level);
            Serial.printf("charge_gain: %.2f%%\n", this->charge_gain);
            Serial.printf("charge_time: %d%%\n", this->charge_time);
            Serial.printf("cooldown_time: %d%%\n", this->cooldown_time);
            */
            this->http_client->reset_retry_counter();
        } else {
            //Serial.print("JSON Error: ");
            //Serial.println(err.c_str());
        }
    } else {
        //Serial.println("No valid JSON found in response.");
    }

    this->http_client->payloadBuffer = ""; 
}

void Mouse::read_data(){
  this->http_client->connect();
}

void Mouse::setMux(int state) {
  digitalWrite(MUX_SELECT_PIN, state);
}

int Mouse::getCooldown_time() {
  return this->cooldown_time;
}

int Mouse::getCharge_time() {
  return this->charge_time;
}

int Mouse::getBattery_level() {
  return this->battery_level;
}

int Mouse::getBattery_max_charge_level() {
  return this->battery_max_charge_level;
}

float Mouse::getCharge_gain() {
  return this->charge_gain;
}

Http_client *Mouse::getHttp_client() {
  return this->http_client;
}

void Mouse::loop(int timeout){
  //make call every X seconds
  if (millis() - this->http_client->getLastRequest() > timeout*1000) {
      this->read_data();
  }
}